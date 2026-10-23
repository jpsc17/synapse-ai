import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class DataSourceModel(Base):
    __tablename__ = "data_sources"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    file_path = Column(String(1024), nullable=True)
    source_type = Column(String(50), default="csv") # csv, excel, postgresql, snowflake
    row_count = Column(Integer, default=0)
    column_count = Column(Integer, default=0)
    columns_meta = Column(JSON, default=list) # [{ name, type, nullRatio, sampleValues }]
    status = Column(String(50), default="ACTIVE")
    is_custom_upload = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AnalysisPlanModel(Base):
    __tablename__ = "analysis_plans"

    id = Column(String, primary_key=True, default=generate_uuid)
    source_a_id = Column(String, ForeignKey("data_sources.id"), nullable=False)
    source_b_id = Column(String, ForeignKey("data_sources.id"), nullable=False)
    status = Column(String(50), default="PENDING_APPROVAL") # PENDING_APPROVAL, APPROVED, REJECTED, EXECUTED
    suggested_relation = Column(JSON, nullable=True) # { colunaBaseA, colunaBaseB, score, explicacao, fatores, evidencias }
    all_candidates = Column(JSON, default=list)
    raw_n8n_response = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    decisions = relationship("GovernanceDecisionModel", back_populates="plan", cascade="all, delete-orphan")
    executions = relationship("PipelineExecutionModel", back_populates="plan", cascade="all, delete-orphan")

class GovernanceDecisionModel(Base):
    __tablename__ = "governance_decisions"

    id = Column(String, primary_key=True, default=generate_uuid)
    plan_id = Column(String, ForeignKey("analysis_plans.id"), nullable=False)
    approved = Column(Boolean, nullable=False)
    reason = Column(Text, nullable=True)
    approver = Column(String(100), default="Engenheiro de Dados (Operador)")
    decided_at = Column(DateTime, default=datetime.utcnow)

    plan = relationship("AnalysisPlanModel", back_populates="decisions")

class PipelineExecutionModel(Base):
    __tablename__ = "pipeline_executions"

    id = Column(String, primary_key=True, default=generate_uuid)
    plan_id = Column(String, ForeignKey("analysis_plans.id"), nullable=False)
    status = Column(String(50), default="SUCCESS") # SUCCESS, FAILED
    workflow_id = Column(String(100), default="WvgldAqi81hUMq58")
    summary = Column(JSON, default=dict)
    matched_records_count = Column(Integer, default=0)
    unmatched_a_count = Column(Integer, default=0)
    unmatched_b_count = Column(Integer, default=0)
    result_data = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    duration_ms = Column(Integer, default=0)
    executed_at = Column(DateTime, default=datetime.utcnow)

    plan = relationship("AnalysisPlanModel", back_populates="executions")


class AdministrativeAuditModel(Base):
    """Trilha imutável das operações administrativas sobre fontes."""

    __tablename__ = "administrative_audit_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String, nullable=True)
    actor = Column(String(100), default="synapse-operator")
    details = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
