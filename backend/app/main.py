import os
import sqlite3
import tempfile
import zipfile
import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, text

from app.config import settings, validate_n8n_webhook_urls
from app.database import engine, Base, get_db
from app.models import DataSourceModel, AnalysisPlanModel, GovernanceDecisionModel, PipelineExecutionModel, AdministrativeAuditModel
from app.schemas import (
    DataSourceResponse,
    DataSourceRenameRequest,
    DataSourcePreviewResponse,
    DataSourceDependenciesResponse,
    DataSourceDeleteRequest,
    DataSourceBulkDeleteRequest,
    DataSourceDeleteResponse,
    DataSourceArchiveRequest,
    DataSourceBulkImpactRequest,
    DataSourceBulkImpactResponse,
    AdministrativeCleanupRequest,
    AdministrativeCleanupImpactResponse,
    AnalyzeRequest,
    AnalysisPlanResponse,
    GovernanceDecisionRequest,
    GovernanceDecisionResponse,
    PipelineExecuteRequest,
    PipelineExecutionResponse,
    PipelineExecutionSummaryResponse,
    HealthResponse,
    SystemMetricsResponse
)
from app.parsers import parse_file_to_records
from app.services.n8n_client import n8n_client, N8NIntegrationError
from app.services.discovery_service import DiscoveryService
from app.services.governance_service import GovernanceService, GovernanceViolationError
from app.services.source_admin_service import source_impact, remove_unshared_source_file, audit_event
from app.security import access_role, require_operator

# Cria tabelas no banco de dados SQLite
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend de Orquestração, Governança e Integração com n8n do SYNAPSE AI.",
    docs_url=None if settings.ENVIRONMENT.lower() == "production" else "/docs",
    redoc_url=None if settings.ENVIRONMENT.lower() == "production" else "/redoc",
    openapi_url=None if settings.ENVIRONMENT.lower() == "production" else "/openapi.json",
)

# Configuração de CORS para permitir requisições do frontend Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

def serialize_data_source(source: DataSourceModel) -> DataSourceResponse:
    return DataSourceResponse(
        id=source.id,
        name=source.name,
        sourceType=source.source_type,
        description=f"Fonte {source.name} com {source.row_count} registros.",
        rowCount=source.row_count,
        columnCount=source.column_count,
        status=source.status,
        updatedAt=source.updated_at,
        isCustomUpload=source.is_custom_upload,
        columns=source.columns_meta or [],
    )

def require_destructive_access(
    authorization: Optional[str] = Header(default=None),
    x_admin_key: Optional[str] = Header(default=None),
) -> None:
    if not settings.DESTRUCTIVE_OPERATIONS_ENABLED:
        raise HTTPException(status_code=403, detail="Operações destrutivas estão desabilitadas neste ambiente.")
    if settings.AUTH_REQUIRED and access_role(authorization, x_admin_key) != "admin":
        raise HTTPException(status_code=403, detail="Autorização administrativa obrigatória.")


def require_maintenance_access(
    authorization: Optional[str] = Header(default=None),
    x_admin_key: Optional[str] = Header(default=None),
) -> None:
    if settings.ENVIRONMENT.lower() == "production":
        raise HTTPException(status_code=404, detail="Recurso não disponível.")
    if access_role(authorization, x_admin_key) != "admin":
        raise HTTPException(status_code=403, detail="Autorização administrativa obrigatória.")
    if not settings.ADMIN_MAINTENANCE_ENABLED:
        raise HTTPException(status_code=403, detail="Limpeza administrativa desabilitada.")

def administrative_cleanup_impact(db: Session) -> dict[str, Any]:
    managed_files = {
        str(Path(path).resolve())
        for (path,) in db.query(DataSourceModel.file_path).filter(
            DataSourceModel.is_custom_upload == True, DataSourceModel.file_path.isnot(None)
        ).all()
        if Path(path).exists()
    }
    return {
        "enabled": settings.ADMIN_MAINTENANCE_ENABLED,
        "environment": settings.ENVIRONMENT,
        "source_count": db.query(DataSourceModel).count(),
        "plan_count": db.query(AnalysisPlanModel).count(),
        "decision_count": db.query(GovernanceDecisionModel).count(),
        "execution_count": db.query(PipelineExecutionModel).count(),
        "file_count": len(managed_files),
        "confirmation_phrase": "LIMPAR AMBIENTE DE DESENVOLVIMENTO",
    }


def create_cleanup_backup(db: Session, impact: dict[str, Any]) -> Path:
    if not settings.DATABASE_URL.startswith("sqlite:///"):
        raise HTTPException(
            status_code=409,
            detail="Limpeza recusada: configure e valide um backup PostgreSQL externo antes desta operação.",
        )
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_path = settings.BACKUP_DIR / f"pre_cleanup_{timestamp}.zip"
    upload_root = settings.UPLOAD_DIR.resolve()
    with zipfile.ZipFile(backup_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("manifest.json", json.dumps(impact, ensure_ascii=False, indent=2))
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as temporary:
            snapshot_path = Path(temporary.name)
        try:
            raw_connection = db.connection().connection.driver_connection
            with sqlite3.connect(snapshot_path) as snapshot:
                raw_connection.backup(snapshot)
            archive.write(snapshot_path, arcname="database/synapse.db")
        finally:
            snapshot_path.unlink(missing_ok=True)
        for (raw_path,) in db.query(DataSourceModel.file_path).filter(
            DataSourceModel.is_custom_upload == True, DataSourceModel.file_path.isnot(None)
        ).all():
            file_path = Path(raw_path).resolve()
            if file_path.exists() and (file_path.parent == upload_root or upload_root in file_path.parents):
                archive.write(file_path, arcname=f"uploads/{file_path.name}")
    return backup_path


def seed_initial_datasets_if_empty(db: Session):
    """Inicializa datasets sintéticos padrão caso o banco esteja limpo."""
    if db.query(DataSourceModel).count() == 0:
        # Base A: Funcionários (CSV sintético)
        content_a = """MATVINC,NOME_SERVIDOR,SETOR,CARGO
1001,Ana Silva,TI,Analista de Sistemas
1002,Bruno Costa,RH,Especialista em Gestao
1003,Carla Dias,Financeiro,Auditora Fiscal
1005,Eduarda Lima,TI,Arquiteta de Software
"""
        file_a_path = settings.UPLOAD_DIR / "funcionarios_seed.csv"
        file_a_path.write_text(content_a, encoding="utf-8")
        records_a, cols_a = parse_file_to_records(content_a.encode("utf-8"), "funcionarios_seed.csv")

        ds_a = DataSourceModel(
            id="ds-postgres-comercial",
            name="PostgreSQL (Comercial / RH)",
            file_path=str(file_a_path),
            source_type="postgresql",
            row_count=len(records_a),
            column_count=len(cols_a),
            columns_meta=cols_a,
            status="ACTIVE",
            is_custom_upload=False
        )

        # Base B: Pagamentos (CSV sintético simulando Excel)
        content_b = """matricula_funcional,valor_pagamento,competencia,cod_banco
1001,2500.0,2026-10,1
1002,3100.0,2026-10,104
1004,2800.0,2026-10,341
1005,4200.0,2026-10,237
"""
        file_b_path = settings.UPLOAD_DIR / "pagamentos_seed.csv"
        file_b_path.write_text(content_b, encoding="utf-8")
        records_b, cols_b = parse_file_to_records(content_b.encode("utf-8"), "pagamentos_seed.csv")

        ds_b = DataSourceModel(
            id="ds-excel-pagamentos",
            name="Excel (Remuneração & Benefícios)",
            file_path=str(file_b_path),
            source_type="excel",
            row_count=len(records_b),
            column_count=len(cols_b),
            columns_meta=cols_b,
            status="ACTIVE",
            is_custom_upload=False
        )

        db.add_all([ds_a, ds_b])
        db.commit()

@app.on_event("startup")
def startup_event():
    validate_n8n_webhook_urls(settings.ENVIRONMENT)
    if settings.AUTH_REQUIRED and not settings.OPERATOR_API_KEY:
        raise RuntimeError("OPERATOR_API_KEY deve estar configurada quando AUTH_REQUIRED=true.")
    if settings.ENVIRONMENT.lower() in {"staging", "production"} and not (
        settings.N8N_WEBHOOK_AUTH_HEADER and settings.N8N_WEBHOOK_AUTH_VALUE
    ):
        raise RuntimeError(
            "N8N_WEBHOOK_AUTH_HEADER e N8N_WEBHOOK_AUTH_VALUE são obrigatórias em staging/produção."
        )
    if os.getenv("SEED_DEMO_DATA", "false").lower() == "true":
        with next(get_db()) as db:
            seed_initial_datasets_if_empty(db)

# ----------------- ENDPOINTS DA API -----------------

@app.get("/api/v1/health", response_model=HealthResponse)
async def get_health(db: Session = Depends(get_db)):
    """Verifica a saúde do backend, do banco configurado e da conexão com o n8n."""
    try:
        db.execute(text("SELECT 1"))
    except Exception as error:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível.") from error
    n8n_status = await n8n_client.check_health()
    return HealthResponse(
        status="ONLINE",
        version=settings.VERSION,
        database="CONNECTED",
        n8n_integration=n8n_status,
        timestamp=datetime.utcnow()
    )


@app.get("/api/v1/auth/status")
def authentication_status(
    authorization: Optional[str] = Header(default=None),
    x_admin_key: Optional[str] = Header(default=None),
):
    return {
        "required": settings.AUTH_REQUIRED,
        "authenticated": access_role(authorization, x_admin_key) is not None,
        "role": access_role(authorization, x_admin_key),
    }


@app.post("/api/v1/auth/verify")
def verify_authentication(role: str = Depends(require_operator)):
    return {"authenticated": True, "role": role}

@app.get("/api/v1/admin/cleanup/impact", response_model=AdministrativeCleanupImpactResponse)
def get_cleanup_impact(
    db: Session = Depends(get_db),
    _: None = Depends(require_maintenance_access),
):
    return AdministrativeCleanupImpactResponse(**administrative_cleanup_impact(db))


@app.post("/api/v1/admin/cleanup")
def execute_administrative_cleanup(
    request: AdministrativeCleanupRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_maintenance_access),
):
    impact = administrative_cleanup_impact(db)
    if request.confirmation != impact["confirmation_phrase"]:
        raise HTTPException(status_code=400, detail="Frase de confirmação inválida; nenhuma alteração foi realizada.")
    backup_path = create_cleanup_backup(db, impact)
    managed_paths = {
        Path(raw_path).resolve()
        for (raw_path,) in db.query(DataSourceModel.file_path).filter(
            DataSourceModel.is_custom_upload == True, DataSourceModel.file_path.isnot(None)
        ).all()
    }
    db.query(PipelineExecutionModel).delete(synchronize_session=False)
    db.query(GovernanceDecisionModel).delete(synchronize_session=False)
    db.query(AnalysisPlanModel).delete(synchronize_session=False)
    db.query(DataSourceModel).delete(synchronize_session=False)
    audit_event(db, "DEVELOPMENT_ENVIRONMENT_CLEANED", None, {**impact, "backup": backup_path.name})
    db.commit()
    upload_root = settings.UPLOAD_DIR.resolve()
    file_results: dict[str, str] = {}
    for file_path in managed_paths:
        if file_path.exists() and (file_path.parent == upload_root or upload_root in file_path.parents):
            file_path.unlink()
            file_results[str(file_path)] = "deleted"
        else:
            file_results[str(file_path)] = "preserved"
    return {"status": "completed", "backup": str(backup_path), "impact": impact, "files": file_results}


@app.get("/api/v1/metrics", response_model=SystemMetricsResponse)
def get_system_metrics(
    db: Session = Depends(get_db), _role: str = Depends(require_operator)
):
    """Retorna indicadores reais e consolidados diretamente do banco SQLite."""
    total_sources = db.query(DataSourceModel).filter(DataSourceModel.status != "ARCHIVED").count()
    total_plans = db.query(AnalysisPlanModel).count()
    approved_plans = db.query(GovernanceDecisionModel).filter(GovernanceDecisionModel.approved == True).count()
    pending_plans = db.query(AnalysisPlanModel).filter(AnalysisPlanModel.status == "PENDING_APPROVAL").count()
    completed_executions = db.query(PipelineExecutionModel).count()
    successful_pipelines = db.query(PipelineExecutionModel).filter(PipelineExecutionModel.status == "SUCCESS").count()

    # Métricas calculadas exclusivamente a partir dos dados persistidos.
    executions = db.query(PipelineExecutionModel).all()
    if executions:
        total_matched = sum(e.matched_records_count for e in executions)
        total_records = sum((e.matched_records_count + e.unmatched_a_count) for e in executions)
        taxa_match = round((total_matched / total_records * 100), 1) if total_records > 0 else 0.0
    else:
        taxa_match = 0.0

    column_null_ratios = [
        float(column.get("nullRatio", 0.0))
        for source in db.query(DataSourceModel).filter(DataSourceModel.status != "ARCHIVED").all()
        for column in (source.columns_meta or [])
    ]
    qualidade = round(
        100.0 * (1.0 - sum(column_null_ratios) / len(column_null_ratios)), 1
    ) if column_null_ratios else 0.0

    return SystemMetricsResponse(
        totalFontes=total_sources,
        relacionamentosIdentificados=total_plans,
        planosAprovados=approved_plans,
        planosPendentes=pending_plans,
        pipelinesExecutados=successful_pipelines,
        execucoesConcluidas=completed_executions,
        taxaAutoMatch=taxa_match,
        qualidadeMedia=qualidade,
        tempoMedioDescoberta=None,
    )

@app.get("/api/v1/sources", response_model=List[DataSourceResponse])
def list_data_sources(
    include_archived: bool = Query(False),
    db: Session = Depends(get_db),
    _role: str = Depends(require_operator),
):
    """Retorna fontes ativas por padrão; arquivadas só entram sob solicitação explícita."""
    query = db.query(DataSourceModel)
    if not include_archived:
        query = query.filter(DataSourceModel.status != "ARCHIVED")
    sources = query.order_by(DataSourceModel.created_at.desc()).all()
    return [serialize_data_source(source) for source in sources]

@app.get("/api/v1/sources/{source_id}", response_model=DataSourceResponse)
def get_data_source(
    source_id: str,
    db: Session = Depends(get_db),
    _role: str = Depends(require_operator),
):
    """Retorna os detalhes de uma fonte específica."""
    s = db.query(DataSourceModel).filter(DataSourceModel.id == source_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Fonte de dados não encontrada.")
    return serialize_data_source(s)

@app.get("/api/v1/sources/{source_id}/preview", response_model=DataSourcePreviewResponse)
def preview_data_source(
    source_id: str, limit: int = 20, db: Session = Depends(get_db),
    _role: str = Depends(require_operator),
):
    """Retorna uma amostra real do arquivo associado à fonte, limitada a 100 linhas."""
    source = db.query(DataSourceModel).filter(DataSourceModel.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Fonte de dados não encontrada.")
    if not source.file_path:
        raise HTTPException(status_code=409, detail="Esta fonte não possui arquivo local para pré-visualização.")
    file_path = Path(source.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=410, detail="O arquivo físico desta fonte não está disponível.")
    try:
        records, _ = parse_file_to_records(file_path.read_bytes(), file_path.name)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    safe_limit = max(1, min(limit, 100))
    return DataSourcePreviewResponse(
        source=serialize_data_source(source),
        records=records[:safe_limit],
        limit=safe_limit,
    )

@app.patch("/api/v1/sources/{source_id}", response_model=DataSourceResponse)
def rename_data_source(
    source_id: str, request: DataSourceRenameRequest, db: Session = Depends(get_db),
    _role: str = Depends(require_operator),
):
    source = db.query(DataSourceModel).filter(DataSourceModel.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Fonte de dados não encontrada.")
    new_name = request.name.strip()
    if not new_name:
        raise HTTPException(status_code=422, detail="O nome da fonte não pode ficar vazio.")
    source.name = new_name
    db.commit()
    db.refresh(source)
    return serialize_data_source(source)

@app.get("/api/v1/sources/{source_id}/dependencies", response_model=DataSourceDependenciesResponse)
def source_dependencies(
    source_id: str, db: Session = Depends(get_db), _role: str = Depends(require_operator)
):
    source = db.query(DataSourceModel).filter(DataSourceModel.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Fonte de dados não encontrada.")
    return DataSourceDependenciesResponse(**source_impact(db, source_id))


@app.post("/api/v1/sources/bulk-impact", response_model=DataSourceBulkImpactResponse)
def source_bulk_impact(
    request: DataSourceBulkImpactRequest, db: Session = Depends(get_db),
    _role: str = Depends(require_operator),
):
    source_ids = list(dict.fromkeys(request.source_ids))
    found_ids = {row[0] for row in db.query(DataSourceModel.id).filter(DataSourceModel.id.in_(source_ids)).all()}
    missing = [source_id for source_id in source_ids if source_id not in found_ids]
    if missing:
        raise HTTPException(status_code=404, detail=f"Fontes não encontradas: {', '.join(missing)}")
    impacts = [source_impact(db, source_id) for source_id in source_ids]
    return DataSourceBulkImpactResponse(
        total=len(impacts),
        deletable=sum(item["recommended_action"] == "DELETE" for item in impacts),
        resolvable=sum(item["recommended_action"] == "RESOLVE_PLANS" for item in impacts),
        archivable=sum(item["recommended_action"] == "ARCHIVE" for item in impacts),
        blocked=sum(item["recommended_action"] == "BLOCKED" for item in impacts),
        items=[DataSourceDependenciesResponse(**item) for item in impacts],
    )


@app.post("/api/v1/sources/{source_id}/archive", response_model=DataSourceResponse)
def archive_data_source(
    source_id: str, request: DataSourceArchiveRequest, db: Session = Depends(get_db),
    _role: str = Depends(require_operator),
):
    if not request.confirm:
        raise HTTPException(status_code=400, detail="O arquivamento exige confirmação explícita.")
    source = db.query(DataSourceModel).filter(DataSourceModel.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Fonte de dados não encontrada.")
    if source.status != "ARCHIVED":
        source.status = "ARCHIVED"
        audit_event(db, "SOURCE_ARCHIVED", source.id, source_impact(db, source.id))
        db.commit()
        db.refresh(source)
    return serialize_data_source(source)


@app.post("/api/v1/sources/{source_id}/restore", response_model=DataSourceResponse)
def restore_data_source(
    source_id: str, request: DataSourceArchiveRequest, db: Session = Depends(get_db),
    _role: str = Depends(require_operator),
):
    if not request.confirm:
        raise HTTPException(status_code=400, detail="A restauração exige confirmação explícita.")
    source = db.query(DataSourceModel).filter(DataSourceModel.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Fonte de dados não encontrada.")
    if source.status == "ARCHIVED":
        source.status = "ACTIVE"
        audit_event(db, "SOURCE_RESTORED", source.id)
        db.commit()
        db.refresh(source)
    return serialize_data_source(source)

@app.post("/api/v1/sources/{source_id}/delete", response_model=DataSourceDeleteResponse)
def delete_data_source(
    source_id: str,
    request: DataSourceDeleteRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_destructive_access),
):
    if not request.confirm:
        raise HTTPException(status_code=400, detail="A exclusão exige confirmação explícita.")
    source = db.query(DataSourceModel).filter(DataSourceModel.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Fonte de dados não encontrada.")
    impact = source_impact(db, source_id)
    plan_count = impact["analysis_plan_count"]
    execution_count = impact["execution_count"]
    if plan_count and not (request.delete_eligible_plans and impact["can_resolve_and_delete"]):
        raise HTTPException(
            status_code=409,
            detail=f"Exclusão bloqueada: a fonte participa de {plan_count} plano(s) e {execution_count} execução(ões).",
        )
    deleted_plan_ids: list[str] = []
    if plan_count:
        deleted_plan_ids = [item["plan_id"] for item in impact["plans"]]
        db.query(AnalysisPlanModel).filter(AnalysisPlanModel.id.in_(deleted_plan_ids)).delete(synchronize_session=False)
    file_result = remove_unshared_source_file(db, source)
    audit_event(db, "SOURCE_DELETED", source.id, {"deleted_plan_ids": deleted_plan_ids, "file_result": file_result})
    db.delete(source)
    db.commit()
    return DataSourceDeleteResponse(
        deleted_ids=[source_id], deleted_count=1, deleted_plan_ids=deleted_plan_ids,
        file_results={source_id: file_result},
    )

@app.post("/api/v1/sources/delete-batch", response_model=DataSourceDeleteResponse)
def delete_data_sources_batch(
    request: DataSourceBulkDeleteRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_destructive_access),
):
    if not request.confirm:
        raise HTTPException(status_code=400, detail="A exclusão em lote exige confirmação explícita.")
    source_ids = list(dict.fromkeys(request.source_ids))
    sources = db.query(DataSourceModel).filter(DataSourceModel.id.in_(source_ids)).all()
    found_ids = {source.id for source in sources}
    missing_ids = [source_id for source_id in source_ids if source_id not in found_ids]
    if missing_ids:
        raise HTTPException(status_code=404, detail=f"Fontes não encontradas: {', '.join(missing_ids)}")
    blocked = []
    for source in sources:
        impact = source_impact(db, source.id)
        plan_count = impact["analysis_plan_count"]
        execution_count = impact["execution_count"]
        if not impact["can_delete"]:
            blocked.append(f"{source.name} ({source.id[:8]}): {plan_count} plano(s), {execution_count} execução(ões)")
    if blocked:
        raise HTTPException(status_code=409, detail="Exclusão bloqueada por dependências: " + "; ".join(blocked))
    file_results = {}
    for source in sources:
        file_results[source.id] = remove_unshared_source_file(db, source)
        audit_event(db, "SOURCE_DELETED", source.id, {"batch": True, "file_result": file_results[source.id]})
        db.delete(source)
    db.commit()
    return DataSourceDeleteResponse(
        deleted_ids=source_ids, deleted_count=len(source_ids), file_results=file_results
    )

@app.post("/api/v1/sources/upload", response_model=DataSourceResponse)
async def upload_data_source(
    file: UploadFile = File(...),
    custom_name: str = Form(None),
    db: Session = Depends(get_db),
    _role: str = Depends(require_operator),
):
    """
    Realiza o upload seguro de arquivos CSV ou XLSX com parsing e validação.
    """
    original_name = Path(file.filename or "").name
    if not original_name:
        raise HTTPException(status_code=400, detail="O arquivo enviado não possui um nome válido.")
    ext = Path(original_name).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extensão '{ext}' não suportada. Extensões válidas: {settings.ALLOWED_EXTENSIONS}"
        )

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Arquivo excede o limite máximo permitido de {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB."
        )

    try:
        records, columns_meta = parse_file_to_records(content, original_name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    # Salva arquivo em disco com nome seguro
    safe_name = f"{uuid.uuid4().hex}{ext}"
    saved_path = settings.UPLOAD_DIR / safe_name
    saved_path.write_bytes(content)

    display_name = custom_name.strip() if custom_name and custom_name.strip() else Path(original_name).stem

    new_ds = DataSourceModel(
        name=display_name,
        file_path=str(saved_path),
        source_type="excel" if ext in ['.xlsx', '.xls'] else "csv",
        row_count=len(records),
        column_count=len(columns_meta),
        columns_meta=columns_meta,
        status="ACTIVE",
        is_custom_upload=True
    )
    db.add(new_ds)
    db.commit()
    db.refresh(new_ds)

    return serialize_data_source(new_ds)

@app.post("/api/v1/discovery/analyze", response_model=AnalysisPlanResponse)
async def analyze_sources_relationship(
    request: AnalyzeRequest,
    db: Session = Depends(get_db),
    _role: str = Depends(require_operator),
):
    """
    Orquestra a análise de relacionamento entre duas fontes via workflow n8n
    e cria o Plano de Descoberta com ID próprio aguardando aprovação de governança.
    """
    try:
        plan = await DiscoveryService.run_discovery_analysis(
            db=db,
            source_a_id=request.source_a_id,
            source_b_id=request.source_b_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except N8NIntegrationError as e:
        raise HTTPException(status_code=502, detail=f"Erro no n8n: {str(e)}")

    return AnalysisPlanResponse(
        plan_id=plan.id,
        source_a_id=plan.source_a_id,
        source_b_id=plan.source_b_id,
        source_a_name=db.query(DataSourceModel).filter(DataSourceModel.id == plan.source_a_id).first().name,
        source_b_name=db.query(DataSourceModel).filter(DataSourceModel.id == plan.source_b_id).first().name,
        status=plan.status,
        suggested_relation=plan.suggested_relation,
        all_candidates=plan.all_candidates or [],
        total_comparisons=len(plan.all_candidates or []),
        created_at=plan.created_at,
        updated_at=plan.updated_at
    )

@app.get("/api/v1/discovery/{analysis_id}", response_model=AnalysisPlanResponse)
def get_analysis_plan(
    analysis_id: str, db: Session = Depends(get_db), _role: str = Depends(require_operator)
):
    """Recupera os detalhes de um plano de relacionamento por ID."""
    plan = db.query(AnalysisPlanModel).filter(AnalysisPlanModel.id == analysis_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano de análise não encontrado.")
    return AnalysisPlanResponse(
        plan_id=plan.id,
        source_a_id=plan.source_a_id,
        source_b_id=plan.source_b_id,
        source_a_name=db.query(DataSourceModel).filter(DataSourceModel.id == plan.source_a_id).first().name,
        source_b_name=db.query(DataSourceModel).filter(DataSourceModel.id == plan.source_b_id).first().name,
        status=plan.status,
        suggested_relation=plan.suggested_relation,
        all_candidates=plan.all_candidates or [],
        total_comparisons=len(plan.all_candidates or []),
        created_at=plan.created_at,
        updated_at=plan.updated_at
    )

@app.post("/api/v1/governance/decide", response_model=GovernanceDecisionResponse)
def record_governance_decision(
    request: GovernanceDecisionRequest,
    db: Session = Depends(get_db),
    _role: str = Depends(require_operator),
):
    """
    Registra formalmente a aprovação ou rejeição de um plano de relacionamento.
    """
    try:
        decision = GovernanceService.record_decision(
            db=db,
            plan_id=request.plan_id,
            approved=request.approved,
            reason=request.reason,
            approver=request.approver or "Engenheiro de Dados (Operador)"
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except GovernanceViolationError as e:
        raise HTTPException(status_code=409, detail=str(e))

    return GovernanceDecisionResponse(
        decision_id=decision.id,
        plan_id=decision.plan_id,
        approved=decision.approved,
        status="APPROVED" if decision.approved else "REJECTED",
        reason=decision.reason,
        approver=decision.approver,
        decided_at=decision.decided_at
    )

@app.post("/api/v1/pipelines/execute", response_model=PipelineExecutionResponse)
async def execute_approved_pipeline(
    request: PipelineExecuteRequest,
    db: Session = Depends(get_db),
    _role: str = Depends(require_operator),
):
    """
    Executa o JOIN seguro através do workflow n8n (Data Bridge POC).
    Exige plano previamente aprovado pelo comitê de governança.
    """
    try:
        execution = await GovernanceService.execute_approved_join(
            db=db,
            plan_id=request.plan_id
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except GovernanceViolationError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except N8NIntegrationError as e:
        raise HTTPException(status_code=502, detail=f"Falha na integração com n8n: {str(e)}")

    result_data = execution.result_data or {}
    return PipelineExecutionResponse(
        execution_id=execution.id,
        plan_id=execution.plan_id,
        status=execution.status,
        workflow_id=execution.workflow_id,
        summary=execution.summary or {},
        matched_records=result_data.get("matched", []),
        unmatched_source_a=result_data.get("unmatched_a", []),
        unmatched_source_b=result_data.get("unmatched_b", []),
        duration_ms=execution.duration_ms,
        executed_at=execution.executed_at
    )

@app.get("/api/v1/pipelines/executions/{execution_id}", response_model=PipelineExecutionResponse)
def get_pipeline_execution(
    execution_id: str, db: Session = Depends(get_db), _role: str = Depends(require_operator)
):
    """Retorna o resultado auditado de uma execução anterior."""
    execution = db.query(PipelineExecutionModel).filter(PipelineExecutionModel.id == execution_id).first()
    if not execution:
        raise HTTPException(status_code=404, detail="Execução não encontrada.")

    result_data = execution.result_data or {}
    return PipelineExecutionResponse(
        execution_id=execution.id,
        plan_id=execution.plan_id,
        status=execution.status,
        workflow_id=execution.workflow_id,
        summary=execution.summary or {},
        matched_records=result_data.get("matched", []),
        unmatched_source_a=result_data.get("unmatched_a", []),
        unmatched_source_b=result_data.get("unmatched_b", []),
        duration_ms=execution.duration_ms,
        executed_at=execution.executed_at
    )

@app.get("/api/v1/pipelines/executions", response_model=List[PipelineExecutionSummaryResponse])
def list_pipeline_executions(
    limit: int = 50, db: Session = Depends(get_db), _role: str = Depends(require_operator)
):
    """Lista execuções auditáveis com as fontes reais associadas ao plano."""
    safe_limit = max(1, min(limit, 200))
    executions = (
        db.query(PipelineExecutionModel)
        .order_by(PipelineExecutionModel.executed_at.desc())
        .limit(safe_limit)
        .all()
    )
    results = []
    for execution in executions:
        plan = execution.plan
        source_a = db.query(DataSourceModel).filter(DataSourceModel.id == plan.source_a_id).first()
        source_b = db.query(DataSourceModel).filter(DataSourceModel.id == plan.source_b_id).first()
        results.append(PipelineExecutionSummaryResponse(
            execution_id=execution.id,
            plan_id=execution.plan_id,
            source_a_id=plan.source_a_id,
            source_b_id=plan.source_b_id,
            source_a_name=source_a.name if source_a else "Fonte removida",
            source_b_name=source_b.name if source_b else "Fonte removida",
            status=execution.status,
            workflow_id=execution.workflow_id,
            matched_records_count=execution.matched_records_count,
            unmatched_a_count=execution.unmatched_a_count,
            unmatched_b_count=execution.unmatched_b_count,
            duration_ms=execution.duration_ms,
            executed_at=execution.executed_at,
        ))
    return results
