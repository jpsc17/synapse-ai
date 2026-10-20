from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

# Modelos para Fontes de Dados
class ColumnMeta(BaseModel):
    name: str
    type: str
    nullRatio: float = 0.0
    uniquenessRatio: float = 0.0
    sampleValues: List[str] = Field(default_factory=list)

class DataSourceResponse(BaseModel):
    id: str
    name: str
    sourceType: str
    description: Optional[str] = None
    rowCount: int
    columnCount: int
    status: str
    lastSync: str
    isCustomUpload: bool = False
    columns: List[ColumnMeta] = Field(default_factory=list)

    class Config:
        from_attributes = True

# Modelos para Descoberta
class AnalyzeRequest(BaseModel):
    source_a_id: str
    source_b_id: str

class RelationshipCandidateSchema(BaseModel):
    id: str
    sourceColumn: str
    targetColumn: str
    score: float
    classificacao: str
    motivoRejeicao: Optional[str] = None
    explicacao: Optional[str] = None
    fatores: Dict[str, Any] = Field(default_factory=dict)
    evidencias: Dict[str, Any] = Field(default_factory=dict)

class AnalysisPlanResponse(BaseModel):
    plan_id: str
    source_a_id: str
    source_b_id: str
    status: str # PENDING_APPROVAL, APPROVED, REJECTED, EXECUTED
    suggested_relation: Optional[RelationshipCandidateSchema] = None
    all_candidates: List[RelationshipCandidateSchema] = Field(default_factory=list)
    total_comparisons: int = 0
    created_at: datetime
    updated_at: datetime

# Modelos para Governança
class GovernanceDecisionRequest(BaseModel):
    plan_id: str
    approved: bool
    reason: Optional[str] = None
    approver: Optional[str] = "Engenheiro de Dados (Operador)"

class GovernanceDecisionResponse(BaseModel):
    decision_id: str
    plan_id: str
    approved: bool
    status: str
    reason: Optional[str] = None
    approver: str
    decided_at: datetime

# Modelos para Execução do Pipeline / JOIN
class PipelineExecuteRequest(BaseModel):
    plan_id: str

class MatchedRecord(BaseModel):
    matricula: str
    nome: Optional[str] = None
    valor: Optional[float] = None
    status: str

class UnmatchedRecordA(BaseModel):
    matricula: str
    nome: Optional[str] = None
    status: str

class UnmatchedRecordB(BaseModel):
    matricula: str
    valor: Optional[float] = None
    status: str

class PipelineExecutionResponse(BaseModel):
    execution_id: str
    plan_id: str
    status: str
    workflow_id: str = "WvgldAqi81hUMq58"
    summary: Dict[str, Any]
    matched_records: List[Dict[str, Any]] = Field(default_factory=list)
    unmatched_source_a: List[Dict[str, Any]] = Field(default_factory=list)
    unmatched_source_b: List[Dict[str, Any]] = Field(default_factory=list)
    duration_ms: int
    executed_at: datetime

# Health check
class HealthResponse(BaseModel):
    status: str
    version: str
    database: str
    n8n_integration: Dict[str, Any]
    timestamp: datetime
