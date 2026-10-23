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
    updatedAt: datetime
    isCustomUpload: bool = False
    columns: List[ColumnMeta] = Field(default_factory=list)

    class Config:
        from_attributes = True

class DataSourceRenameRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)

class DataSourcePreviewResponse(BaseModel):
    source: DataSourceResponse
    records: List[Dict[str, Any]] = Field(default_factory=list)
    limit: int

class DataSourceDependenciesResponse(BaseModel):
    source_id: str
    analysis_plan_count: int
    decision_count: int
    execution_count: int
    can_delete: bool
    can_resolve_and_delete: bool
    recommended_action: str
    plans: List[Dict[str, Any]] = Field(default_factory=list)

class DataSourceDeleteRequest(BaseModel):
    confirm: bool = False
    delete_eligible_plans: bool = False

class DataSourceBulkDeleteRequest(BaseModel):
    source_ids: List[str] = Field(min_length=1)
    confirm: bool = False

class DataSourceDeleteResponse(BaseModel):
    deleted_ids: List[str] = Field(default_factory=list)
    deleted_count: int
    deleted_plan_ids: List[str] = Field(default_factory=list)
    file_results: Dict[str, str] = Field(default_factory=dict)

class DataSourceArchiveRequest(BaseModel):
    confirm: bool = False

class DataSourceBulkImpactRequest(BaseModel):
    source_ids: List[str] = Field(min_length=1)

class DataSourceBulkImpactResponse(BaseModel):
    total: int
    deletable: int
    resolvable: int
    archivable: int
    blocked: int
    items: List[DataSourceDependenciesResponse] = Field(default_factory=list)

class AdministrativeCleanupRequest(BaseModel):
    confirmation: str

class AdministrativeCleanupImpactResponse(BaseModel):
    enabled: bool
    environment: str
    source_count: int
    plan_count: int
    decision_count: int
    execution_count: int
    file_count: int
    confirmation_phrase: str

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
    source_a_name: Optional[str] = None
    source_b_name: Optional[str] = None
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

class PipelineExecutionSummaryResponse(BaseModel):
    execution_id: str
    plan_id: str
    source_a_id: str
    source_b_id: str
    source_a_name: str
    source_b_name: str
    status: str
    workflow_id: str
    matched_records_count: int
    unmatched_a_count: int
    unmatched_b_count: int
    duration_ms: int
    executed_at: datetime

# Health check
class HealthResponse(BaseModel):
    status: str
    version: str
    database: str
    n8n_integration: Dict[str, Any]
    timestamp: datetime

# Métricas Reais do Sistema (SQLite)
class SystemMetricsResponse(BaseModel):
    totalFontes: int
    relacionamentosIdentificados: int
    planosAprovados: int
    planosPendentes: int
    pipelinesExecutados: int
    execucoesConcluidas: int
    taxaAutoMatch: float
    qualidadeMedia: float
    tempoMedioDescoberta: Optional[str] = None
