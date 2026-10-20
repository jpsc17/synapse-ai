import os
import shutil
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine, Base, get_db
from app.models import DataSourceModel, AnalysisPlanModel, GovernanceDecisionModel, PipelineExecutionModel
from app.schemas import (
    DataSourceResponse,
    AnalyzeRequest,
    AnalysisPlanResponse,
    GovernanceDecisionRequest,
    GovernanceDecisionResponse,
    PipelineExecuteRequest,
    PipelineExecutionResponse,
    HealthResponse
)
from app.parsers import parse_file_to_records
from app.services.n8n_client import n8n_client, N8NIntegrationError
from app.services.discovery_service import DiscoveryService
from app.services.governance_service import GovernanceService, GovernanceViolationError

# Cria tabelas no banco de dados SQLite
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend de Orquestração, Governança e Integração com n8n do SYNAPSE AI."
)

# Configuração de CORS para permitir requisições do frontend Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"], # Permissivo para desenvolvimento local
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    with next(get_db()) as db:
        seed_initial_datasets_if_empty(db)

# ----------------- ENDPOINTS DA API -----------------

@app.get("/api/v1/health", response_model=HealthResponse)
async def get_health(db: Session = Depends(get_db)):
    """Verifica a saúde do backend, do banco SQLite e da conexão com o n8n."""
    n8n_status = await n8n_client.check_health()
    return HealthResponse(
        status="ONLINE",
        version=settings.VERSION,
        database="CONNECTED",
        n8n_integration=n8n_status,
        timestamp=datetime.utcnow()
    )

@app.get("/api/v1/sources", response_model=List[DataSourceResponse])
def list_data_sources(db: Session = Depends(get_db)):
    """Retorna todas as fontes de dados cadastradas."""
    sources = db.query(DataSourceModel).order_by(DataSourceModel.created_at.desc()).all()
    results = []
    for s in sources:
        results.append(
            DataSourceResponse(
                id=s.id,
                name=s.name,
                sourceType=s.source_type,
                description=f"Fonte {s.name} com {s.row_count} registros.",
                rowCount=s.row_count,
                columnCount=s.column_count,
                status=s.status,
                lastSync="Sincronizado",
                isCustomUpload=s.is_custom_upload,
                columns=s.columns_meta or []
            )
        )
    return results

@app.get("/api/v1/sources/{source_id}", response_model=DataSourceResponse)
def get_data_source(source_id: str, db: Session = Depends(get_db)):
    """Retorna os detalhes de uma fonte específica."""
    s = db.query(DataSourceModel).filter(DataSourceModel.id == source_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Fonte de dados não encontrada.")
    return DataSourceResponse(
        id=s.id,
        name=s.name,
        sourceType=s.source_type,
        description=f"Fonte {s.name} com {s.row_count} registros.",
        rowCount=s.row_count,
        columnCount=s.column_count,
        status=s.status,
        lastSync="Sincronizado",
        isCustomUpload=s.is_custom_upload,
        columns=s.columns_meta or []
    )

@app.post("/api/v1/sources/upload", response_model=DataSourceResponse)
async def upload_data_source(
    file: UploadFile = File(...),
    custom_name: str = Form(None),
    db: Session = Depends(get_db)
):
    """
    Realiza o upload seguro de arquivos CSV ou XLSX com parsing e validação.
    """
    ext = Path(file.filename).suffix.lower()
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
        records, columns_meta = parse_file_to_records(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    # Salva arquivo em disco com nome seguro
    timestamp = int(datetime.utcnow().timestamp())
    safe_name = f"{timestamp}_{file.filename}"
    saved_path = settings.UPLOAD_DIR / safe_name
    saved_path.write_bytes(content)

    display_name = custom_name.strip() if custom_name and custom_name.strip() else Path(file.filename).stem

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

    return DataSourceResponse(
        id=new_ds.id,
        name=new_ds.name,
        sourceType=new_ds.source_type,
        description=f"Upload de {file.filename} com {len(records)} registros.",
        rowCount=new_ds.row_count,
        columnCount=new_ds.column_count,
        status=new_ds.status,
        lastSync="agora mesmo",
        isCustomUpload=True,
        columns=columns_meta
    )

@app.post("/api/v1/discovery/analyze", response_model=AnalysisPlanResponse)
async def analyze_sources_relationship(
    request: AnalyzeRequest,
    db: Session = Depends(get_db)
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
        status=plan.status,
        suggested_relation=plan.suggested_relation,
        all_candidates=plan.all_candidates or [],
        total_comparisons=len(plan.all_candidates or []),
        created_at=plan.created_at,
        updated_at=plan.updated_at
    )

@app.get("/api/v1/discovery/{analysis_id}", response_model=AnalysisPlanResponse)
def get_analysis_plan(analysis_id: str, db: Session = Depends(get_db)):
    """Recupera os detalhes de um plano de relacionamento por ID."""
    plan = db.query(AnalysisPlanModel).filter(AnalysisPlanModel.id == analysis_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano de análise não encontrado.")
    return AnalysisPlanResponse(
        plan_id=plan.id,
        source_a_id=plan.source_a_id,
        source_b_id=plan.source_b_id,
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
def get_pipeline_execution(execution_id: str, db: Session = Depends(get_db)):
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
