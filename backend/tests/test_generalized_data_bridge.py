from pathlib import Path

import httpx
import pytest
from app.database import SessionLocal
from app.models import AnalysisPlanModel, DataSourceModel


BASE_URL = "http://127.0.0.1:8000/api/v1"
FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="module")
def client():
    """Cliente compartilhado somente durante este fluxo de integração."""
    with httpx.Client(base_url=BASE_URL, timeout=25.0) as http_client:
        yield http_client


@pytest.fixture(scope="module")
def uploaded_sources(client):
    """Cria as duas fontes e fornece seus IDs aos testes dependentes."""
    produtos_path = FIXTURES_DIR / "produtos.csv"
    with produtos_path.open("rb") as produtos_file:
        produtos_response = client.post(
            "/sources/upload",
            files={"file": ("produtos.csv", produtos_file, "text/csv")},
            data={"custom_name": "Catálogo de Produtos"},
        )
    assert produtos_response.status_code == 200, produtos_response.text

    vendas_path = FIXTURES_DIR / "vendas.csv"
    with vendas_path.open("rb") as vendas_file:
        vendas_response = client.post(
            "/sources/upload",
            files={"file": ("vendas.csv", vendas_file, "text/csv")},
            data={"custom_name": "Relatório de Vendas"},
        )
    assert vendas_response.status_code == 200, vendas_response.text

    return produtos_response.json(), vendas_response.json()


@pytest.fixture(scope="module")
def approved_plan(client, uploaded_sources):
    """Descobre o relacionamento e aprova o plano usado pelo Data Bridge."""
    produtos, vendas = uploaded_sources
    discovery_response = client.post(
        "/discovery/analyze",
        json={
            "source_a_id": produtos["id"],
            "source_b_id": vendas["id"],
        },
    )
    assert discovery_response.status_code == 200, discovery_response.text
    plan = discovery_response.json()

    decision_response = client.post(
        "/governance/decide",
        json={
            "plan_id": plan["plan_id"],
            "approved": True,
            "reason": "Junção entre catálogo de produtos e vendas validada para conciliação comercial.",
            "approver": "Gestor de Produtos (Auditoria Comercial)",
        },
    )
    assert decision_response.status_code == 200, decision_response.text

    yield plan, decision_response.json()

    with SessionLocal() as db:
        persisted_plan = db.query(AnalysisPlanModel).filter(AnalysisPlanModel.id == plan["plan_id"]).first()
        if persisted_plan:
            db.delete(persisted_plan)
        for source_id in (produtos["id"], vendas["id"]):
            source = db.query(DataSourceModel).filter(DataSourceModel.id == source_id).first()
            if source:
                file_path = Path(source.file_path) if source.file_path else None
                db.delete(source)
                db.flush()
                if file_path and file_path.exists():
                    file_path.unlink()
        db.commit()


def test_01_upload_produtos_and_vendas(uploaded_sources):
    """Upload de produtos.csv e vendas.csv."""
    produtos, vendas = uploaded_sources

    assert produtos["rowCount"] == 4
    assert "cod_produto" in [column["name"] for column in produtos["columns"]]
    assert vendas["rowCount"] == 4
    assert "codigo_item" in [column["name"] for column in vendas["columns"]]


def test_02_discovery_and_governance_approval(approved_plan):
    """Descobre relacionamento e aprova comitê de governança."""
    plan, decision = approved_plan

    assert plan["status"] == "PENDING_APPROVAL"
    assert decision["status"] == "APPROVED"
    assert plan["all_candidates"]
    assert all(candidate["fatores"] for candidate in plan["all_candidates"])
    assert all(candidate["evidencias"] for candidate in plan["all_candidates"])
    assert all(produtos_id in candidate["id"] for candidate in plan["all_candidates"] for produtos_id in [plan["source_a_id"]])
    assert all(vendas_id in candidate["id"] for candidate in plan["all_candidates"] for vendas_id in [plan["source_b_id"]])

    secondary = next(candidate for candidate in plan["all_candidates"] if candidate["id"] != plan["suggested_relation"]["id"])
    assert "qtdValoresEmComum" in secondary["evidencias"]
    assert "consistenciaUnicidade" in secondary["fatores"]


def test_02b_same_source_is_rejected(client, uploaded_sources):
    """Self-join permanece bloqueado pelo contrato do backend."""
    produtos, _vendas = uploaded_sources
    response = client.post(
        "/discovery/analyze",
        json={"source_a_id": produtos["id"], "source_b_id": produtos["id"]},
    )
    assert response.status_code == 400
    assert "distintas" in response.json()["detail"]


def test_03_execute_data_bridge_universal_join(client, approved_plan):
    """Executa o Data Bridge universal e valida as três categorias."""
    plan, _decision = approved_plan
    execution_response = client.post(
        "/pipelines/execute",
        json={"plan_id": plan["plan_id"]},
    )
    assert execution_response.status_code == 200, execution_response.text
    result = execution_response.json()
    assert result["status"] == "SUCCESS"

    matched = result["matched_records"]
    unmatched_a = result["unmatched_source_a"]
    unmatched_b = result["unmatched_source_b"]

    # PROD-101, PROD-102 e PROD-103 têm vendas correspondentes.
    assert len(matched) == 3, f"Esperado 3 correspondências, obtido {len(matched)}"
    matched_keys = [
        record.get("cod_produto")
        or record.get("codigo_item")
        or record.get("matricula")
        for record in matched
    ]
    assert "PROD-101" in matched_keys
    assert "PROD-102" in matched_keys
    assert "PROD-103" in matched_keys
    assert all("descricao_produto" in record and "valor_total" in record for record in matched)
    assert all("valor" not in record for record in matched)

    # PROD-104 (Monitor) não teve vendas: unmatched em A.
    assert len(unmatched_a) == 1
    unmatched_a_key = unmatched_a[0].get("cod_produto") or unmatched_a[0].get("matricula")
    assert unmatched_a_key == "PROD-104"

    # PROD-999 não existe no catálogo: unmatched em B.
    assert len(unmatched_b) == 1
    unmatched_b_key = unmatched_b[0].get("codigo_item") or unmatched_b[0].get("matricula")
    assert unmatched_b_key == "PROD-999"
    assert "valor_total" in unmatched_b[0]
    assert "valor" not in unmatched_b[0]
