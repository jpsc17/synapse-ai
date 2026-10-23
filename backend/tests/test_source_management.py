from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.config import settings
from app.models import (
    AdministrativeAuditModel,
    AnalysisPlanModel,
    DataSourceModel,
    GovernanceDecisionModel,
    PipelineExecutionModel,
)


@pytest.fixture()
def isolated_client(tmp_path: Path):
    original_admin_key = settings.ADMIN_API_KEY
    settings.ADMIN_API_KEY = "test-admin-key"
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    csv_path = tmp_path / "clientes.csv"
    csv_path.write_text("id,nome\n1,Ana\n2,Bruno\n", encoding="utf-8")
    with TestingSession() as session:
        session.add(DataSourceModel(
            id="source-free",
            name="Clientes",
            file_path=str(csv_path),
            source_type="csv",
            row_count=2,
            column_count=2,
            columns_meta=[
                {"name": "id", "type": "integer", "nullRatio": 0, "uniquenessRatio": 1, "sampleValues": ["1", "2"]},
                {"name": "nome", "type": "string", "nullRatio": 0, "uniquenessRatio": 1, "sampleValues": ["Ana", "Bruno"]},
            ],
            is_custom_upload=False,
        ))
        session.add(DataSourceModel(id="source-dependent", name="Pedidos", source_type="csv", row_count=0, column_count=0))
        session.commit()

    def override_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_db
    with TestClient(app, headers={"Authorization": "Bearer test-admin-key"}) as client:
        yield client, TestingSession
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    settings.ADMIN_API_KEY = original_admin_key


def test_preview_and_rename_use_real_source_data(isolated_client):
    client, _ = isolated_client
    preview = client.get("/api/v1/sources/source-free/preview?limit=1")
    assert preview.status_code == 200
    assert preview.json()["records"] == [{"id": 1, "nome": "Ana"}]

    renamed = client.patch("/api/v1/sources/source-free", json={"name": "Clientes Ativos"})
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "Clientes Ativos"


def test_delete_requires_confirmation_and_blocks_dependencies(isolated_client):
    client, TestingSession = isolated_client
    without_confirmation = client.post("/api/v1/sources/source-free/delete", json={"confirm": False})
    assert without_confirmation.status_code == 400

    with TestingSession() as session:
        session.add(AnalysisPlanModel(
            id="plan-dependent",
            source_a_id="source-dependent",
            source_b_id="source-free",
            status="PENDING_APPROVAL",
        ))
        session.commit()

    dependencies = client.get("/api/v1/sources/source-dependent/dependencies")
    assert dependencies.status_code == 200
    assert dependencies.json()["can_delete"] is False

    blocked = client.post("/api/v1/sources/source-dependent/delete", json={"confirm": True})
    assert blocked.status_code == 409
    assert "1 plano" in blocked.json()["detail"]


def test_confirmed_batch_delete_is_atomic(isolated_client):
    client, TestingSession = isolated_client
    with TestingSession() as session:
        session.add(DataSourceModel(id="source-second-free", name="Itens", source_type="csv", row_count=0, column_count=0))
        session.commit()

    response = client.post("/api/v1/sources/delete-batch", json={
        "source_ids": ["source-free", "source-second-free"],
        "confirm": True,
    })
    assert response.status_code == 200
    assert response.json()["deleted_count"] == 2
    assert client.get("/api/v1/sources/source-free").status_code == 404
    assert client.get("/api/v1/sources/source-second-free").status_code == 404


def test_archive_hides_source_and_restore_makes_it_active_again(isolated_client):
    client, TestingSession = isolated_client
    archived = client.post("/api/v1/sources/source-free/archive", json={"confirm": True})
    assert archived.status_code == 200
    assert archived.json()["status"] == "ARCHIVED"
    assert "source-free" not in {item["id"] for item in client.get("/api/v1/sources").json()}
    assert "source-free" in {
        item["id"] for item in client.get("/api/v1/sources?include_archived=true").json()
    }
    discovery = client.post("/api/v1/discovery/analyze", json={
        "source_a_id": "source-free", "source_b_id": "source-dependent",
    })
    assert discovery.status_code == 400
    assert "arquivadas" in discovery.json()["detail"]

    restored = client.post("/api/v1/sources/source-free/restore", json={"confirm": True})
    assert restored.status_code == 200
    assert restored.json()["status"] == "ACTIVE"
    with TestingSession() as session:
        actions = {event.action for event in session.query(AdministrativeAuditModel).all()}
    assert {"SOURCE_ARCHIVED", "SOURCE_RESTORED"}.issubset(actions)


def test_pending_plan_without_audit_can_be_explicitly_removed(isolated_client):
    client, TestingSession = isolated_client
    with TestingSession() as session:
        session.add(AnalysisPlanModel(
            id="plan-transient",
            source_a_id="source-dependent",
            source_b_id="source-free",
            status="PENDING_APPROVAL",
        ))
        session.commit()

    impact = client.get("/api/v1/sources/source-dependent/dependencies").json()
    assert impact["recommended_action"] == "RESOLVE_PLANS"
    assert impact["can_resolve_and_delete"] is True
    response = client.post("/api/v1/sources/source-dependent/delete", json={
        "confirm": True,
        "delete_eligible_plans": True,
    })
    assert response.status_code == 200
    assert response.json()["deleted_plan_ids"] == ["plan-transient"]
    with TestingSession() as session:
        assert session.get(AnalysisPlanModel, "plan-transient") is None


def test_decisions_and_executions_are_protected_and_recommend_archive(isolated_client):
    client, TestingSession = isolated_client
    with TestingSession() as session:
        session.add(AnalysisPlanModel(
            id="plan-audited",
            source_a_id="source-dependent",
            source_b_id="source-free",
            status="EXECUTED",
        ))
        session.add(GovernanceDecisionModel(id="decision-audited", plan_id="plan-audited", approved=True))
        session.add(PipelineExecutionModel(id="execution-audited", plan_id="plan-audited", status="SUCCESS"))
        session.commit()

    impact = client.get("/api/v1/sources/source-dependent/dependencies").json()
    assert impact["recommended_action"] == "ARCHIVE"
    assert impact["decision_count"] == 1
    assert impact["execution_count"] == 1
    blocked = client.post("/api/v1/sources/source-dependent/delete", json={
        "confirm": True,
        "delete_eligible_plans": True,
    })
    assert blocked.status_code == 409
    assert client.post("/api/v1/sources/source-dependent/archive", json={"confirm": True}).status_code == 200
    with TestingSession() as session:
        assert session.get(GovernanceDecisionModel, "decision-audited") is not None
        assert session.get(PipelineExecutionModel, "execution-audited") is not None


def test_bulk_impact_prevents_silent_partial_deletion(isolated_client):
    client, TestingSession = isolated_client
    with TestingSession() as session:
        session.add(AnalysisPlanModel(
            id="plan-dependent", source_a_id="source-dependent", source_b_id="source-free"
        ))
        session.commit()
    impact = client.post("/api/v1/sources/bulk-impact", json={
        "source_ids": ["source-free", "source-dependent"],
    })
    assert impact.status_code == 200
    assert impact.json()["resolvable"] == 2
    response = client.post("/api/v1/sources/delete-batch", json={
        "source_ids": ["source-free", "source-dependent"], "confirm": True,
    })
    assert response.status_code == 409
    assert client.get("/api/v1/sources/source-free").status_code == 200
    assert client.get("/api/v1/sources/source-dependent").status_code == 200


def test_cleanup_is_inaccessible_in_production(isolated_client):
    client, _ = isolated_client
    original_environment = settings.ENVIRONMENT
    original_enabled = settings.ADMIN_MAINTENANCE_ENABLED
    original_key = settings.ADMIN_API_KEY
    try:
        settings.ENVIRONMENT = "production"
        settings.ADMIN_MAINTENANCE_ENABLED = True
        settings.ADMIN_API_KEY = "test-only-key"
        response = client.get("/api/v1/admin/cleanup/impact", headers={"X-Admin-Key": "test-only-key"})
        assert response.status_code == 404
    finally:
        settings.ENVIRONMENT = original_environment
        settings.ADMIN_MAINTENANCE_ENABLED = original_enabled
        settings.ADMIN_API_KEY = original_key


def test_shared_physical_file_is_preserved(isolated_client):
    client, TestingSession = isolated_client
    with TestingSession() as session:
        shared_path = session.get(DataSourceModel, "source-free").file_path
        session.add(DataSourceModel(
            id="source-shared-file",
            name="Clientes espelhados",
            file_path=shared_path,
            source_type="csv",
            is_custom_upload=True,
        ))
        session.commit()
    response = client.post("/api/v1/sources/source-shared-file/delete", json={"confirm": True})
    assert response.status_code == 200
    assert response.json()["file_results"]["source-shared-file"] == "preserved_shared"
    assert Path(shared_path).exists()


def test_cleanup_is_disabled_by_default(isolated_client):
    client, _ = isolated_client
    original_enabled = settings.ADMIN_MAINTENANCE_ENABLED
    try:
        settings.ADMIN_MAINTENANCE_ENABLED = False
        response = client.get("/api/v1/admin/cleanup/impact", headers={"X-Admin-Key": "anything"})
        assert response.status_code == 403
    finally:
        settings.ADMIN_MAINTENANCE_ENABLED = original_enabled


def test_exploratory_relationship_cannot_be_approved(isolated_client):
    client, TestingSession = isolated_client
    with TestingSession() as session:
        session.add(AnalysisPlanModel(
            id="plan-exploratory",
            source_a_id="source-free",
            source_b_id="source-dependent",
            status="PENDING_APPROVAL",
            suggested_relation={
                "sourceColumn": "nome",
                "targetColumn": "descricao",
                "score": 25.1,
                "classificacao": "REJEITADO",
            },
        ))
        session.commit()
    response = client.post("/api/v1/governance/decide", json={
        "plan_id": "plan-exploratory",
        "approved": True,
        "reason": "Tentativa controlada",
        "approver": "Teste",
    })
    assert response.status_code == 409
    assert "exploratória" in response.json()["detail"]
    with TestingSession() as session:
        assert session.query(GovernanceDecisionModel).filter_by(plan_id="plan-exploratory").count() == 0
