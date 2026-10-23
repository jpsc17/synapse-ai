import time

import httpx


DISCOVERY_WEBHOOK = "http://localhost:5678/webhook/synapse-intelligent-discovery"


def run_discovery(base_a, base_b):
    last_error = None
    for _attempt in range(3):
        try:
            response = httpx.post(
                DISCOVERY_WEBHOOK,
                json={"baseA": base_a, "baseB": base_b, "aprovado": False},
                timeout=60.0,
            )
            if response.status_code == 200:
                return response.json()["analisePrincipal"]
            last_error = AssertionError(response.text)
        except httpx.HTTPError as error:
            last_error = error
        time.sleep(1)
    raise AssertionError(f"Webhook de descoberta não ficou pronto: {last_error}")


def test_every_comparison_has_its_own_explainability_payload():
    analysis = run_discovery(
        [{"codigo": "A-1", "nome": "Escola A"}, {"codigo": "A-2", "nome": "Escola B"}],
        [{"id": "A-1", "nome": "Escola A"}, {"id": "A-2", "nome": "Escola B"}],
    )

    comparisons = analysis["todasAsComparacoes"]
    assert len(comparisons) == 4
    assert all(comparison["fatoresDetalhados"] for comparison in comparisons)
    assert all(comparison["evidenciasConcretas"] for comparison in comparisons)
    assert all(comparison["explicacao"] for comparison in comparisons)


def test_equal_indicator_names_do_not_become_keys_when_values_repeat():
    repeated = ["SIM", "NAO"] * 5
    analysis = run_discovery(
        [{"eja_medio": value} for value in repeated],
        [{"eja_medio": value} for value in repeated],
    )

    candidate = analysis["relacaoSugerida"]
    assert candidate["classificacao"] != "CANDIDATO_RECOMENDADO"
    assert candidate["score"] < 80
    assert candidate["evidenciasConcretas"]["riscoMuitosParaMuitos"] is True
    assert candidate["fatoresDetalhados"]["consistenciaUnicidade"] == 0.2


def test_similar_column_names_with_disjoint_values_are_rejected():
    analysis = run_discovery(
        [{"codigo_escola": "A-1"}, {"codigo_escola": "A-2"}],
        [{"codigo_escola": "B-1"}, {"codigo_escola": "B-2"}],
    )

    candidate = analysis["relacaoSugerida"]
    assert candidate["classificacao"] == "REJEITADO"
    assert candidate["evidenciasConcretas"]["qtdValoresEmComum"] == 0
    assert "Zero sobreposicao" in candidate["motivoRejeicao"]
