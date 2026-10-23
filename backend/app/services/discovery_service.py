import json
from pathlib import Path
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models import DataSourceModel, AnalysisPlanModel
from app.parsers import parse_file_to_records
from app.services.n8n_client import n8n_client, N8NIntegrationError

class DiscoveryService:
    @staticmethod
    def _candidate_id(source_a_id: str, column_a: str, source_b_id: str, column_b: str) -> str:
        """Identidade estável dentro do par de fontes, mesmo com nomes repetidos."""
        return f"rel-{source_a_id}-{column_a}-{source_b_id}-{column_b}"

    @classmethod
    def _format_candidate(
        cls,
        payload: Dict[str, Any],
        source_a_id: str,
        source_b_id: str,
    ) -> Dict[str, Any] | None:
        column_a = payload.get("colunaBaseA")
        column_b = payload.get("colunaBaseB")
        if not column_a or not column_b:
            pair = payload.get("par", "")
            if "<->" not in pair:
                return None
            column_a, column_b = [part.strip() for part in pair.split("<->", 1)]

        factors = payload.get("fatoresDetalhados") or payload.get("fatores") or {}
        evidences = payload.get("evidenciasConcretas") or payload.get("evidencias") or {}
        explanation = payload.get("explicacao")
        if not explanation:
            common_count = evidences.get("qtdValoresEmComum", 0)
            explanation = (
                f"Comparação heurística entre {column_a} e {column_b}: "
                f"{common_count} valor(es) normalizado(s) em comum."
            )

        return {
            "id": cls._candidate_id(source_a_id, column_a, source_b_id, column_b),
            "sourceColumn": column_a,
            "targetColumn": column_b,
            "score": float(payload.get("score", 0)),
            "classificacao": payload.get("classificacao", "REJEITADO"),
            "motivoRejeicao": payload.get("motivoRejeicao"),
            "explicacao": explanation,
            "fatores": factors,
            "evidencias": evidences,
        }

    @staticmethod
    def _load_source_records(source: DataSourceModel) -> List[Dict[str, Any]]:
        """Carrega os registros a partir do arquivo persistido no disco."""
        if not source.file_path or not Path(source.file_path).exists():
            raise ValueError(f"Arquivo da fonte '{source.name}' não foi encontrado no servidor.")
        
        with open(source.file_path, "rb") as f:
            content = f.read()
        
        records, _ = parse_file_to_records(content, Path(source.file_path).name)
        return records

    @classmethod
    async def run_discovery_analysis(
        cls,
        db: Session,
        source_a_id: str,
        source_b_id: str
    ) -> AnalysisPlanModel:
        """
        Executa a descoberta heurística chamando o workflow n8n (LHJTja7RuShTAcJo)
        e persiste o Plano de Análise aguardando aprovação humana obrigatória.
        """
        source_a = db.query(DataSourceModel).filter(DataSourceModel.id == source_a_id).first()
        source_b = db.query(DataSourceModel).filter(DataSourceModel.id == source_b_id).first()

        if not source_a or not source_b:
            raise ValueError("Uma ou ambas as fontes de dados selecionadas não foram encontradas.")

        if source_a.status == "ARCHIVED" or source_b.status == "ARCHIVED":
            raise ValueError("Fontes arquivadas devem ser restauradas antes de participar da descoberta.")

        if source_a_id == source_b_id:
            raise ValueError("Selecione duas fontes de dados distintas para análise de relacionamento.")

        # Carrega dados reais/sintéticos dos arquivos
        records_a = cls._load_source_records(source_a)
        records_b = cls._load_source_records(source_b)

        # Dispara webhook real do n8n (aprovado=False)
        n8n_response = await n8n_client.trigger_discovery_webhook(
            base_a=records_a,
            base_b=records_b,
            aprovado=False
        )

        analise = n8n_response.get("analisePrincipal", {})
        relacao = analise.get("relacaoSugerida")
        comparacoes = analise.get("todasAsComparacoes", [])

        # Formata o melhor candidato para o padrão do frontend
        suggested_candidate = cls._format_candidate(
            relacao, source_a_id, source_b_id
        ) if relacao else None

        # Formata a lista completa de candidatos
        all_candidates = []
        if suggested_candidate:
            all_candidates.append(suggested_candidate)

        for comp in comparacoes:
            candidate = cls._format_candidate(comp, source_a_id, source_b_id)
            if not candidate:
                continue
            if suggested_candidate and candidate["id"] == suggested_candidate["id"]:
                continue  # Já adicionado como principal.
            all_candidates.append(candidate)

        # Cria o Plano de Análise no banco de dados com ID único
        plan = AnalysisPlanModel(
            source_a_id=source_a.id,
            source_b_id=source_b.id,
            status="PENDING_APPROVAL",
            suggested_relation=suggested_candidate,
            all_candidates=all_candidates,
            raw_n8n_response=n8n_response
        )

        db.add(plan)
        db.commit()
        db.refresh(plan)

        return plan
