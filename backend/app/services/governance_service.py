import time
from typing import Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import AnalysisPlanModel, GovernanceDecisionModel, PipelineExecutionModel, DataSourceModel
from app.services.discovery_service import DiscoveryService
from app.services.n8n_client import n8n_client, N8NIntegrationError

class GovernanceViolationError(Exception):
    """Exceção levantada quando regras de governança de dados são violadas."""
    pass

class DuplicateExecutionError(Exception):
    """Exceção levantada quando uma execução duplicada é detectada."""
    pass

class GovernanceService:
    @classmethod
    def record_decision(
        cls,
        db: Session,
        plan_id: str,
        approved: bool,
        reason: str = None,
        approver: str = "Engenheiro de Dados (Operador)"
    ) -> GovernanceDecisionModel:
        """
        Registra formalmente a aprovação ou rejeição de um plano de relacionamento.
        """
        plan = db.query(AnalysisPlanModel).filter(AnalysisPlanModel.id == plan_id).first()
        if not plan:
            raise ValueError(f"Plano de análise '{plan_id}' não encontrado.")

        if plan.status == "EXECUTED":
            raise GovernanceViolationError("Este plano já foi executado no pipeline e não pode ter sua decisão alterada.")

        suggested = plan.suggested_relation or {}
        if approved and suggested.get("classificacao") == "REJEITADO":
            raise GovernanceViolationError(
                "Aprovação bloqueada: a relação principal foi classificada como exploratória/rejeitada pelo motor. "
                "Revise outras correspondências ou execute uma nova descoberta com fontes adequadas."
            )

        # Cria o registro de decisão de governança
        decision = GovernanceDecisionModel(
            plan_id=plan.id,
            approved=approved,
            reason=reason or ("Aprovado para reconciliação" if approved else "Rejeitado pelo operador"),
            approver=approver,
            decided_at=datetime.utcnow()
        )
        db.add(decision)

        # Atualiza status do plano
        plan.status = "APPROVED" if approved else "REJECTED"
        db.commit()
        db.refresh(decision)
        return decision

    @classmethod
    async def execute_approved_join(
        cls,
        db: Session,
        plan_id: str
    ) -> PipelineExecutionModel:
        """
        Executa o JOIN seguro através do workflow n8n (WvgldAqi81hUMq58).
        
        REGRAS MANDATÓRIAS DE GOVERNANÇA:
        1. O plano precisa ter sido formalmente aprovado (status == 'APPROVED').
        2. Planos rejeitados ou pendentes de decisão são bloqueados.
        3. O cliente NÃO pode passar mapeamentos arbitrários; a execução utiliza
           estritamente as colunas e fontes seladas no plano aprovado.
        4. Previne execuções duplicadas acidentais.
        """
        plan = db.query(AnalysisPlanModel).filter(AnalysisPlanModel.id == plan_id).first()
        if not plan:
            raise ValueError(f"Plano de análise '{plan_id}' não encontrado.")

        # Validação estrita de status
        if plan.status != "APPROVED":
            if plan.status == "PENDING_APPROVAL":
                raise GovernanceViolationError(
                    "Tentativa de execução bloqueada: o plano ainda está PENDENTE de aprovação humana de governança."
                )
            elif plan.status in ("REJECTED", "REJEITADO"):
                raise GovernanceViolationError(
                    "Tentativa de execução bloqueada: o plano foi formalmente REJEITADO e não pode ser processado."
                )
            elif plan.status == "EXECUTED":
                # Verifica execução existente para evitar re-execução acidental duplicada
                existing_exec = db.query(PipelineExecutionModel).filter(
                    PipelineExecutionModel.plan_id == plan.id,
                    PipelineExecutionModel.status == "SUCCESS"
                ).first()
                if existing_exec:
                    return existing_exec
            else:
                raise GovernanceViolationError(f"Status do plano inválido para execução: {plan.status}")

        source_a = db.query(DataSourceModel).filter(DataSourceModel.id == plan.source_a_id).first()
        source_b = db.query(DataSourceModel).filter(DataSourceModel.id == plan.source_b_id).first()

        if not source_a or not source_b:
            raise ValueError("Fontes de dados vinculadas ao plano não foram localizadas.")

        # Carrega os dados das fontes
        records_a = DiscoveryService._load_source_records(source_a)
        records_b = DiscoveryService._load_source_records(source_b)

        # Mapeamento do plano selado
        rel = plan.suggested_relation or {}
        col_a = rel.get("sourceColumn")
        col_b = rel.get("targetColumn")

        # Prepara registros preservando todos os atributos originais e provendo chaves
        formatted_a = []
        for r in records_a:
            item = dict(r)
            if col_a and col_a in r:
                item["_key"] = r[col_a]
                item["MATVINC"] = r[col_a] # Alias não-destrutivo para compatibilidade
            formatted_a.append(item)

        formatted_b = []
        for r in records_b:
            item = dict(r)
            if col_b and col_b in r:
                item["_key"] = r[col_b]
                item["matricula"] = r[col_b] # Alias não-destrutivo para compatibilidade
            formatted_b.append(item)

        start_time = time.time()

        # Invoca o webhook real do Data Bridge no n8n de forma agnóstica
        n8n_result = await n8n_client.trigger_data_bridge_webhook(
            base_a=formatted_a,
            base_b=formatted_b,
            key_a=col_a,
            key_b=col_b,
            funcionarios=formatted_a,
            pagamentos=formatted_b
        )

        duration_ms = int((time.time() - start_time) * 1000)

        resumo = n8n_result.get("resumo", {})
        matched = n8n_result.get("matched") or n8n_result.get("funcionariosComPagamento", [])
        unmatched_a = n8n_result.get("unmatchedA") or n8n_result.get("funcionariosSemPagamento", [])
        unmatched_b = n8n_result.get("unmatchedB") or n8n_result.get("pagamentosSemFuncionario", [])

        # Salva o registro de execução com auditoria completa
        execution = PipelineExecutionModel(
            plan_id=plan.id,
            status="SUCCESS",
            workflow_id="WvgldAqi81hUMq58",
            summary=resumo,
            matched_records_count=len(matched),
            unmatched_a_count=len(unmatched_a),
            unmatched_b_count=len(unmatched_b),
            result_data={
                "matched": matched,
                "unmatched_a": unmatched_a,
                "unmatched_b": unmatched_b,
                "raw_n8n_response": n8n_result
            },
            duration_ms=duration_ms,
            executed_at=datetime.utcnow()
        )

        plan.status = "EXECUTED"
        db.add(execution)
        db.commit()
        db.refresh(execution)

        return execution
