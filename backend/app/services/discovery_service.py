import json
from pathlib import Path
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models import DataSourceModel, AnalysisPlanModel
from app.parsers import parse_file_to_records
from app.services.n8n_client import n8n_client, N8NIntegrationError

class DiscoveryService:
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
        suggested_candidate = None
        if relacao:
            suggested_candidate = {
                "id": f"rel-{relacao['colunaBaseA']}-{relacao['colunaBaseB']}",
                "sourceColumn": relacao["colunaBaseA"],
                "targetColumn": relacao["colunaBaseB"],
                "score": float(relacao.get("score", 0)),
                "classificacao": relacao.get("classificacao", "CANDIDATO_RECOMENDADO"),
                "motivoRejeicao": relacao.get("motivoRejeicao"),
                "explicacao": relacao.get("explicacao"),
                "fatores": relacao.get("fatoresDetalhados", {}),
                "evidencias": relacao.get("evidenciasConcretas", {})
            }

        # Formata a lista completa de candidatos
        all_candidates = []
        if suggested_candidate:
            all_candidates.append(suggested_candidate)

        for comp in comparacoes:
            par = comp.get("par", "")
            if "<->" in par:
                col_a, col_b = [p.strip() for p in par.split("<->")]
                if suggested_candidate and col_a == suggested_candidate["sourceColumn"] and col_b == suggested_candidate["targetColumn"]:
                    continue # Já adicionado como principal
                all_candidates.append({
                    "id": f"rel-{col_a}-{col_b}",
                    "sourceColumn": col_a,
                    "targetColumn": col_b,
                    "score": float(comp.get("score", 0)),
                    "classificacao": comp.get("classificacao", "REJEITADO"),
                    "motivoRejeicao": comp.get("motivoRejeicao"),
                    "explicacao": f"Comparação heurística entre {col_a} e {col_b}.",
                    "fatores": {},
                    "evidencias": {}
                })

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
