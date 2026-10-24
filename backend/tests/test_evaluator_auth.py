from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings, validate_evaluator_auth_settings
from app.database import Base, get_db
from app.main import app
from app.models import AnalysisPlanModel, DataSourceModel, EvaluatorSessionModel
from app.services.discovery_service import DiscoveryService
from app.services.governance_service import GovernanceService


@pytest.fixture()
def auth_client(tmp_path):
    test_engine = create_engine(
        f"sqlite:///{(tmp_path / 'auth.db').as_posix()}",
        connect_args={"check_same_thread": False},
    )
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    def isolated_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    original = {
        "AUTH_REQUIRED": settings.AUTH_REQUIRED,
        "OPERATOR_API_KEY": settings.OPERATOR_API_KEY,
        "ADMIN_API_KEY": settings.ADMIN_API_KEY,
        "EVALUATOR_EMAIL": settings.EVALUATOR_EMAIL,
        "EVALUATOR_PASSWORD_HASH": settings.EVALUATOR_PASSWORD_HASH,
        "EVALUATOR_SESSION_TTL_MINUTES": settings.EVALUATOR_SESSION_TTL_MINUTES,
        "EVALUATOR_LOGIN_MAX_ATTEMPTS": settings.EVALUATOR_LOGIN_MAX_ATTEMPTS,
        "EVALUATOR_LOGIN_WINDOW_SECONDS": settings.EVALUATOR_LOGIN_WINDOW_SECONDS,
    }
    settings.AUTH_REQUIRED = True
    settings.OPERATOR_API_KEY = "technical-operator-test-key"
    settings.ADMIN_API_KEY = "technical-admin-test-key"
    settings.EVALUATOR_EMAIL = "avaliador@example.org"
    settings.EVALUATOR_PASSWORD_HASH = PasswordHasher().hash("test-password-only")
    settings.EVALUATOR_SESSION_TTL_MINUTES = 60
    settings.EVALUATOR_LOGIN_MAX_ATTEMPTS = 3
    settings.EVALUATOR_LOGIN_WINDOW_SECONDS = 60
    app.dependency_overrides[get_db] = isolated_db
    try:
        with TestClient(app) as client:
            yield client, TestSession
    finally:
        app.dependency_overrides.clear()
        for name, value in original.items():
            setattr(settings, name, value)
        test_engine.dispose()


def login(client: TestClient, email="avaliador@example.org", password="test-password-only"):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def test_valid_login_session_refresh_and_logout(auth_client):
    client, _ = auth_client
    response = login(client)
    assert response.status_code == 200
    payload = response.json()
    assert payload["user"] == {"email": "avaliador@example.org", "role": "evaluator"}
    assert payload["access_token"]
    assert "test-password-only" not in response.text

    headers = {"Authorization": f"Bearer {payload['access_token']}"}
    session = client.get("/api/v1/auth/session", headers=headers)
    assert session.status_code == 200
    assert session.json()["user"]["role"] == "evaluator"

    assert client.post("/api/v1/auth/logout", headers=headers).status_code == 200
    assert client.get("/api/v1/auth/session", headers=headers).status_code == 401


@pytest.mark.parametrize("email,password", [
    ("avaliador@example.org", "wrong-password"),
    ("nobody@example.org", "test-password-only"),
])
def test_invalid_and_unknown_credentials_share_generic_error(auth_client, email, password):
    client, _ = auth_client
    response = login(client, email, password)
    assert response.status_code == 401
    assert response.json()["detail"] == "E-mail ou senha inválidos."
    assert email not in response.text


def test_login_is_rate_limited_persistently(auth_client):
    client, _ = auth_client
    assert login(client, password="wrong-1").status_code == 401
    assert login(client, password="wrong-2").status_code == 401
    blocked = login(client, password="wrong-3")
    assert blocked.status_code == 429
    assert int(blocked.headers["Retry-After"]) >= 1
    assert login(client).status_code == 429


def test_expired_session_is_rejected(auth_client):
    client, TestSession = auth_client
    token = login(client).json()["access_token"]
    with TestSession() as db:
        session = db.query(EvaluatorSessionModel).one()
        session.expires_at = datetime.utcnow() - timedelta(seconds=1)
        db.commit()
    assert client.get("/api/v1/auth/session", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_evaluator_has_operational_access_but_not_admin_access(auth_client):
    client, _ = auth_client
    token = login(client).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/v1/sources", headers=headers).status_code == 200
    assert client.get("/api/v1/admin/cleanup/impact", headers=headers).status_code == 403


def test_unauthenticated_operational_request_is_denied(auth_client):
    client, _ = auth_client
    assert client.get("/api/v1/sources").status_code == 401


def test_evaluator_can_run_discovery(auth_client, monkeypatch):
    client, TestSession = auth_client
    with TestSession() as db:
        db.add_all([
            DataSourceModel(id="source-a", name="Base A", row_count=2, column_count=1),
            DataSourceModel(id="source-b", name="Base B", row_count=2, column_count=1),
        ])
        db.commit()

    async def fake_discovery(db, source_a_id, source_b_id):
        plan = AnalysisPlanModel(
            id="plan-discovery",
            source_a_id=source_a_id,
            source_b_id=source_b_id,
            status="PENDING_APPROVAL",
            suggested_relation={
                "id": "candidate-id",
                "sourceColumn": "id_colaborador",
                "targetColumn": "codigo_pessoa",
                "score": 0.98,
                "classificacao": "APROVADO",
            },
            all_candidates=[],
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)
        return plan

    monkeypatch.setattr(DiscoveryService, "run_discovery_analysis", fake_discovery)
    token = login(client).json()["access_token"]
    response = client.post(
        "/api/v1/discovery/analyze",
        headers={"Authorization": f"Bearer {token}"},
        json={"source_a_id": "source-a", "source_b_id": "source-b"},
    )
    assert response.status_code == 200
    assert response.json()["plan_id"] == "plan-discovery"


def test_evaluator_can_approve_plan(auth_client):
    client, TestSession = auth_client
    with TestSession() as db:
        db.add_all([
            DataSourceModel(id="source-a", name="Base A"),
            DataSourceModel(id="source-b", name="Base B"),
        ])
        db.add(AnalysisPlanModel(
            id="plan-governance",
            source_a_id="source-a",
            source_b_id="source-b",
            status="PENDING_APPROVAL",
            suggested_relation={"classificacao": "APROVADO"},
        ))
        db.commit()
    token = login(client).json()["access_token"]
    response = client.post(
        "/api/v1/governance/decide",
        headers={"Authorization": f"Bearer {token}"},
        json={"plan_id": "plan-governance", "approved": True, "reason": "Relação validada"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "APPROVED"


def test_evaluator_can_execute_data_bridge(auth_client, monkeypatch):
    client, _ = auth_client

    async def fake_execution(db, plan_id):
        return SimpleNamespace(
            id="execution-test",
            plan_id=plan_id,
            status="SUCCESS",
            workflow_id="WvgldAqi81hUMq58",
            summary={"matched": 2},
            result_data={"matched": [{"id": "1"}], "unmatched_a": [], "unmatched_b": []},
            duration_ms=12,
            executed_at=datetime.utcnow(),
        )

    monkeypatch.setattr(GovernanceService, "execute_approved_join", fake_execution)
    token = login(client).json()["access_token"]
    response = client.post(
        "/api/v1/pipelines/execute",
        headers={"Authorization": f"Bearer {token}"},
        json={"plan_id": "approved-plan"},
    )
    assert response.status_code == 200
    assert response.json()["execution_id"] == "execution-test"


def test_legacy_operator_key_remains_compatible(auth_client):
    client, _ = auth_client
    response = client.post(
        "/api/v1/auth/verify",
        headers={"Authorization": "Bearer technical-operator-test-key"},
    )
    assert response.status_code == 200
    assert response.json() == {"authenticated": True, "role": "operator"}


def test_every_operational_and_administrative_route_has_the_expected_policy():
    expected = {
        ("POST", "/api/v1/auth/verify"): "require_operator",
        ("GET", "/api/v1/metrics"): "require_operator",
        ("GET", "/api/v1/sources"): "require_operator",
        ("GET", "/api/v1/sources/{source_id}"): "require_operator",
        ("GET", "/api/v1/sources/{source_id}/preview"): "require_operator",
        ("PATCH", "/api/v1/sources/{source_id}"): "require_operator",
        ("GET", "/api/v1/sources/{source_id}/dependencies"): "require_operator",
        ("POST", "/api/v1/sources/bulk-impact"): "require_operator",
        ("POST", "/api/v1/sources/{source_id}/archive"): "require_operator",
        ("POST", "/api/v1/sources/{source_id}/restore"): "require_operator",
        ("POST", "/api/v1/sources/upload"): "require_operator",
        ("POST", "/api/v1/discovery/analyze"): "require_operator",
        ("GET", "/api/v1/discovery/{analysis_id}"): "require_operator",
        ("POST", "/api/v1/governance/decide"): "require_operator",
        ("POST", "/api/v1/pipelines/execute"): "require_operator",
        ("GET", "/api/v1/pipelines/executions/{execution_id}"): "require_operator",
        ("GET", "/api/v1/pipelines/executions"): "require_operator",
        ("POST", "/api/v1/sources/{source_id}/delete"): "require_destructive_access",
        ("POST", "/api/v1/sources/delete-batch"): "require_destructive_access",
        ("GET", "/api/v1/admin/cleanup/impact"): "require_maintenance_access",
        ("POST", "/api/v1/admin/cleanup"): "require_maintenance_access",
    }
    observed = {}
    for route in app.routes:
        if not hasattr(route, "dependant"):
            continue
        policies = {
            dependency.call.__name__
            for dependency in route.dependant.dependencies
            if dependency.call is not None
        }
        for method in route.methods or set():
            key = (method, route.path)
            if key in expected:
                observed[key] = expected[key] in policies
    assert set(observed) == set(expected)
    assert all(observed.values())


def test_published_environments_require_argon2_credentials():
    with pytest.raises(RuntimeError, match="EVALUATOR_EMAIL"):
        validate_evaluator_auth_settings("staging", "", "")
    with pytest.raises(RuntimeError, match="hash Argon2"):
        validate_evaluator_auth_settings("production", "avaliador@example.org", "plain-text")
    with pytest.raises(RuntimeError, match="AUTH_REQUIRED"):
        validate_evaluator_auth_settings(
            "staging", "avaliador@example.org", "$argon2id$test-placeholder", False
        )
    validate_evaluator_auth_settings("development", "", "")
