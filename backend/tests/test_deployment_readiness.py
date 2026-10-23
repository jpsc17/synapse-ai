from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import sessionmaker
from sqlalchemy.schema import CreateTable

from app.config import resolve_database_url, settings
from app.database import Base, get_db
from app.main import app
from app.services.n8n_client import N8NClient


def test_every_metadata_table_compiles_for_postgresql():
    expected = {
        "data_sources",
        "analysis_plans",
        "governance_decisions",
        "pipeline_executions",
        "administrative_audit_events",
    }
    assert expected == set(Base.metadata.tables)
    for table in Base.metadata.sorted_tables:
        ddl = str(CreateTable(table).compile(dialect=postgresql.dialect()))
        assert "CREATE TABLE" in ddl


def test_railway_postgres_url_uses_psycopg_driver():
    assert resolve_database_url("postgres://user:pass@db:5432/synapse") == (
        "postgresql+psycopg://user:pass@db:5432/synapse"
    )


def test_n8n_webhook_auth_header_is_server_side_configurable():
    original_header = settings.N8N_WEBHOOK_AUTH_HEADER
    original_value = settings.N8N_WEBHOOK_AUTH_VALUE
    try:
        settings.N8N_WEBHOOK_AUTH_HEADER = "X-Synapse-Webhook-Key"
        settings.N8N_WEBHOOK_AUTH_VALUE = "test-only-value"
        headers = N8NClient._webhook_headers()
        assert headers["Content-Type"] == "application/json"
        assert headers["X-Synapse-Webhook-Key"] == "test-only-value"
    finally:
        settings.N8N_WEBHOOK_AUTH_HEADER = original_header
        settings.N8N_WEBHOOK_AUTH_VALUE = original_value
    assert resolve_database_url("postgresql://user:pass@db:5432/synapse") == (
        "postgresql+psycopg://user:pass@db:5432/synapse"
    )


def test_upload_filename_cannot_escape_configured_directory(tmp_path):
    original_upload_dir = settings.UPLOAD_DIR
    original_auth_required = settings.AUTH_REQUIRED
    test_engine = create_engine(
        f"sqlite:///{(tmp_path / 'metadata.db').as_posix()}",
        connect_args={"check_same_thread": False},
    )
    test_session = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    def isolated_db():
        db = test_session()
        try:
            yield db
        finally:
            db.close()

    try:
        settings.UPLOAD_DIR = tmp_path / "uploads"
        settings.UPLOAD_DIR.mkdir()
        settings.AUTH_REQUIRED = False
        app.dependency_overrides[get_db] = isolated_db
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/sources/upload",
                files={"file": ("../fora.csv", b"id,nome\n1,Demo\n", "text/csv")},
            )
        assert response.status_code == 200
        saved_files = list(settings.UPLOAD_DIR.iterdir())
        assert len(saved_files) == 1
        assert saved_files[0].parent == settings.UPLOAD_DIR
        assert saved_files[0].name.endswith(".csv")
        assert "fora" not in saved_files[0].name
        assert not (tmp_path / "fora.csv").exists()
    finally:
        app.dependency_overrides.pop(get_db, None)
        test_engine.dispose()
        settings.UPLOAD_DIR = original_upload_dir
        settings.AUTH_REQUIRED = original_auth_required
