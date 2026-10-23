from __future__ import annotations

from pathlib import Path
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import settings
from app.models import (
    AdministrativeAuditModel,
    AnalysisPlanModel,
    DataSourceModel,
    GovernanceDecisionModel,
    PipelineExecutionModel,
)


def source_impact(db: Session, source_id: str) -> dict[str, Any]:
    plans = db.query(AnalysisPlanModel).filter(
        or_(AnalysisPlanModel.source_a_id == source_id, AnalysisPlanModel.source_b_id == source_id)
    ).order_by(AnalysisPlanModel.created_at.desc()).all()
    items: list[dict[str, Any]] = []
    decision_total = 0
    execution_total = 0
    for plan in plans:
        decision_count = db.query(GovernanceDecisionModel).filter(
            GovernanceDecisionModel.plan_id == plan.id
        ).count()
        execution_count = db.query(PipelineExecutionModel).filter(
            PipelineExecutionModel.plan_id == plan.id
        ).count()
        decision_total += decision_count
        execution_total += execution_count
        eligible = decision_count == 0 and execution_count == 0
        items.append({
            "plan_id": plan.id,
            "status": plan.status,
            "decision_count": decision_count,
            "execution_count": execution_count,
            "eligible_for_deletion": eligible,
            "protected_reason": None if eligible else (
                "Execução auditada preservada." if execution_count else "Decisão de governança preservada."
            ),
        })

    plan_count = len(plans)
    eligible_count = sum(1 for item in items if item["eligible_for_deletion"])
    if plan_count == 0:
        action = "DELETE"
    elif eligible_count == plan_count:
        action = "RESOLVE_PLANS"
    elif execution_total or decision_total:
        action = "ARCHIVE"
    else:
        action = "BLOCKED"
    return {
        "source_id": source_id,
        "analysis_plan_count": plan_count,
        "decision_count": decision_total,
        "execution_count": execution_total,
        "can_delete": plan_count == 0,
        "can_resolve_and_delete": bool(plan_count) and eligible_count == plan_count,
        "recommended_action": action,
        "plans": items,
    }


def remove_unshared_source_file(db: Session, source: DataSourceModel) -> str:
    if not source.is_custom_upload or not source.file_path:
        return "not_managed"
    shared_count = db.query(DataSourceModel).filter(
        DataSourceModel.id != source.id,
        DataSourceModel.file_path == source.file_path,
    ).count()
    if shared_count:
        return "preserved_shared"
    upload_root = settings.UPLOAD_DIR.resolve()
    file_path = Path(source.file_path).resolve()
    if upload_root != file_path.parent and upload_root not in file_path.parents:
        return "preserved_outside_upload_dir"
    if not file_path.exists():
        return "already_missing"
    file_path.unlink()
    return "deleted"


def audit_event(
    db: Session,
    action: str,
    resource_id: str | None,
    details: dict[str, Any] | None = None,
    actor: str = "synapse-operator",
) -> None:
    db.add(AdministrativeAuditModel(
        action=action,
        resource_type="data_source",
        resource_id=resource_id,
        actor=actor,
        details=details or {},
    ))
