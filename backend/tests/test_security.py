import json
import os
import subprocess
import sys
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import settings
from app.main import app


def test_operator_and_admin_roles_are_enforced_by_backend():
    original = {
        "AUTH_REQUIRED": settings.AUTH_REQUIRED,
        "OPERATOR_API_KEY": settings.OPERATOR_API_KEY,
        "ADMIN_API_KEY": settings.ADMIN_API_KEY,
        "DESTRUCTIVE_OPERATIONS_ENABLED": settings.DESTRUCTIVE_OPERATIONS_ENABLED,
    }
    try:
        settings.AUTH_REQUIRED = True
        settings.OPERATOR_API_KEY = "operator-test-key"
        settings.ADMIN_API_KEY = "admin-test-key"
        settings.DESTRUCTIVE_OPERATIONS_ENABLED = True
        with TestClient(app) as client:
            assert client.get("/api/v1/metrics").status_code == 401
            assert client.get("/api/v1/sources").status_code == 401
            assert client.post("/api/v1/auth/verify").status_code == 401
            operator = client.post(
                "/api/v1/auth/verify", headers={"Authorization": "Bearer operator-test-key"}
            )
            assert operator.status_code == 200
            assert operator.json()["role"] == "operator"
            assert client.get(
                "/api/v1/metrics", headers={"Authorization": "Bearer operator-test-key"}
            ).status_code == 200
            assert client.get(
                "/api/v1/sources", headers={"Authorization": "Bearer operator-test-key"}
            ).status_code == 200
            admin = client.post(
                "/api/v1/auth/verify", headers={"Authorization": "Bearer admin-test-key"}
            )
            assert admin.status_code == 200
            assert admin.json()["role"] == "admin"

            preview = client.get("/api/v1/sources/missing/preview")
            assert preview.status_code == 401
            operator_delete = client.post(
                "/api/v1/sources/missing/delete",
                headers={"Authorization": "Bearer operator-test-key"},
                json={"confirm": True},
            )
            assert operator_delete.status_code == 403
            admin_delete = client.post(
                "/api/v1/sources/missing/delete",
                headers={"Authorization": "Bearer admin-test-key"},
                json={"confirm": True},
            )
            assert admin_delete.status_code == 404
    finally:
        for name, value in original.items():
            setattr(settings, name, value)


def test_cleanup_route_is_hidden_in_production_even_with_admin_key(monkeypatch):
    original_environment = settings.ENVIRONMENT
    original_key = settings.ADMIN_API_KEY
    original_webhook_header = settings.N8N_WEBHOOK_AUTH_HEADER
    original_webhook_value = settings.N8N_WEBHOOK_AUTH_VALUE
    try:
        monkeypatch.setenv(
            "N8N_DISCOVERY_WEBHOOK_URL",
            "https://n8n.example.test/webhook/synapse-intelligent-discovery",
        )
        monkeypatch.setenv(
            "N8N_DATA_BRIDGE_WEBHOOK_URL",
            "https://n8n.example.test/webhook/synapse-data-bridge",
        )
        settings.ENVIRONMENT = "production"
        settings.ADMIN_API_KEY = "admin-test-key"
        settings.N8N_WEBHOOK_AUTH_HEADER = "X-Synapse-Webhook-Key"
        settings.N8N_WEBHOOK_AUTH_VALUE = "test-only-value"
        with TestClient(app) as client:
            response = client.get(
                "/api/v1/admin/cleanup/impact",
                headers={"Authorization": "Bearer admin-test-key"},
            )
            assert response.status_code == 404
    finally:
        settings.ENVIRONMENT = original_environment
        settings.ADMIN_API_KEY = original_key
        settings.N8N_WEBHOOK_AUTH_HEADER = original_webhook_header
        settings.N8N_WEBHOOK_AUTH_VALUE = original_webhook_value


def test_security_headers_and_unknown_cors_origin():
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/health", headers={"Origin": "https://nao-autorizado.example"}
        )
        assert response.status_code == 200
        assert "access-control-allow-origin" not in response.headers
        assert response.headers["x-content-type-options"] == "nosniff"
        assert response.headers["x-frame-options"] == "DENY"
        assert response.headers["referrer-policy"] == "no-referrer"


def test_production_disables_interactive_api_documentation():
    backend_root = Path(__file__).resolve().parents[1]
    environment = os.environ.copy()
    environment.update(
        {
            "ENVIRONMENT": "production",
            "DATABASE_URL": "sqlite:///:memory:",
            "AUTH_REQUIRED": "true",
        }
    )
    completed = subprocess.run(
        [
            sys.executable,
            "-c",
            (
                "import json; from app.main import app; "
                "print(json.dumps([app.docs_url, app.redoc_url, app.openapi_url]))"
            ),
        ],
        cwd=backend_root,
        env=environment,
        check=True,
        capture_output=True,
        text=True,
    )
    assert json.loads(completed.stdout.strip()) == [None, None, None]
