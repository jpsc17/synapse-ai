import asyncio
import logging

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import settings, validate_n8n_webhook_urls
from app.main import app
from app.services.n8n_client import N8NClient, N8NIntegrationError, safe_endpoint_destination


REMOTE_DISCOVERY_URL = "https://n8n.example.test/webhook/discovery"
REMOTE_DATA_BRIDGE_URL = "https://n8n.example.test/webhook/data-bridge"


def test_development_keeps_local_webhook_compatibility():
    validate_n8n_webhook_urls("development", {})


def test_staging_requires_both_webhook_urls_explicitly():
    with pytest.raises(RuntimeError) as error:
        validate_n8n_webhook_urls("staging", {})

    message = str(error.value)
    assert "N8N_DISCOVERY_WEBHOOK_URL" in message
    assert "N8N_DATA_BRIDGE_WEBHOOK_URL" in message


@pytest.mark.parametrize(
    "local_url",
    [
        "http://localhost:5678/webhook/discovery",
        "http://127.0.0.1:5678/webhook/discovery",
        "http://[::1]:5678/webhook/discovery",
        "http://0.0.0.0:5678/webhook/discovery",
    ],
)
def test_staging_rejects_local_webhook_urls(local_url):
    environ = {
        "N8N_DISCOVERY_WEBHOOK_URL": local_url,
        "N8N_DATA_BRIDGE_WEBHOOK_URL": REMOTE_DATA_BRIDGE_URL,
    }
    with pytest.raises(RuntimeError, match="N8N_DISCOVERY_WEBHOOK_URL.*localhost"):
        validate_n8n_webhook_urls("staging", environ)


def test_production_accepts_explicit_remote_webhook_urls():
    validate_n8n_webhook_urls(
        "production",
        {
            "N8N_DISCOVERY_WEBHOOK_URL": REMOTE_DISCOVERY_URL,
            "N8N_DATA_BRIDGE_WEBHOOK_URL": REMOTE_DATA_BRIDGE_URL,
        },
    )


def test_application_startup_runs_webhook_validation(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging")
    monkeypatch.setenv(
        "N8N_DISCOVERY_WEBHOOK_URL",
        "http://localhost:5678/webhook/discovery",
    )
    monkeypatch.setenv("N8N_DATA_BRIDGE_WEBHOOK_URL", REMOTE_DATA_BRIDGE_URL)

    with pytest.raises(RuntimeError, match="N8N_DISCOVERY_WEBHOOK_URL.*localhost"):
        with TestClient(app):
            pass


def test_safe_destination_removes_credentials_path_query_and_fragment():
    assert safe_endpoint_destination(
        "https://user:password@n8n.example.test:8443/webhook/private?token=secret#fragment"
    ) == "https://n8n.example.test:8443"


def _client_with_response(status_code=200, *, text=None, json_data=None):
    def handler(request):
        if json_data is not None:
            return httpx.Response(status_code, json=json_data, request=request)
        return httpx.Response(status_code, text=text or "", request=request)

    return N8NClient(transport=httpx.MockTransport(handler))


def test_connection_error_reports_remote_destination_without_sensitive_url_parts(caplog):
    sensitive_url = (
        "https://user:password@n8n.remote.example:8443/webhook/discovery?token=hidden"
    )

    def handler(request):
        raise httpx.ConnectError("connection refused", request=request)

    client = N8NClient(transport=httpx.MockTransport(handler))
    client.discovery_url = sensitive_url

    with caplog.at_level(logging.INFO, logger="synapse.n8n_client"):
        with pytest.raises(N8NIntegrationError) as error:
            asyncio.run(client.trigger_discovery_webhook([], []))

    diagnostic = str(error.value)
    assert "https://n8n.remote.example:8443" in diagnostic
    assert "localhost" not in diagnostic
    assert "password" not in diagnostic
    assert "token" not in diagnostic
    assert "hidden" not in diagnostic
    assert "password" not in caplog.text
    assert "hidden" not in caplog.text


def test_timeout_is_distinct_and_reports_data_bridge_destination():
    def handler(request):
        raise httpx.ReadTimeout("timed out", request=request)

    client = N8NClient(transport=httpx.MockTransport(handler))
    client.data_bridge_url = REMOTE_DATA_BRIDGE_URL

    with pytest.raises(N8NIntegrationError) as error:
        asyncio.run(client.trigger_data_bridge_webhook())

    diagnostic = str(error.value)
    assert "timeout" in diagnostic
    assert "https://n8n.example.test" in diagnostic


@pytest.mark.parametrize(
    ("status_code", "expected"),
    [
        (401, "HTTP 401 (não autenticado)"),
        (403, "HTTP 403 (acesso negado)"),
        (404, "HTTP 404; webhook não encontrado ou inativo"),
    ],
)
def test_http_errors_have_specific_safe_diagnostics(status_code, expected):
    client = _client_with_response(status_code, text="sensitive-response-body")
    client.discovery_url = REMOTE_DISCOVERY_URL

    with pytest.raises(N8NIntegrationError) as error:
        asyncio.run(client.trigger_discovery_webhook([], []))

    diagnostic = str(error.value)
    assert expected in diagnostic
    assert "https://n8n.example.test" in diagnostic
    assert "sensitive-response-body" not in diagnostic


@pytest.mark.parametrize(
    "client",
    [
        _client_with_response(200, text="not-json"),
        _client_with_response(200, json_data=[]),
    ],
)
def test_invalid_n8n_responses_are_distinct(client):
    client.discovery_url = REMOTE_DISCOVERY_URL

    with pytest.raises(N8NIntegrationError, match="resposta inválida"):
        asyncio.run(client.trigger_discovery_webhook([], []))


def test_webhook_auth_value_is_never_logged(monkeypatch, caplog):
    secret = "test-secret-that-must-not-appear"
    monkeypatch.setattr(settings, "N8N_WEBHOOK_AUTH_HEADER", "X-Test-Webhook-Key")
    monkeypatch.setattr(settings, "N8N_WEBHOOK_AUTH_VALUE", secret)
    client = _client_with_response(403, text=secret)
    client.data_bridge_url = REMOTE_DATA_BRIDGE_URL

    with caplog.at_level(logging.INFO, logger="synapse.n8n_client"):
        with pytest.raises(N8NIntegrationError) as error:
            asyncio.run(client.trigger_data_bridge_webhook())

    assert secret not in str(error.value)
    assert secret not in caplog.text
