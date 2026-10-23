from app.services.discovery_service import DiscoveryService


def test_candidate_preserves_its_own_factors_and_evidence():
    payload = {
        "colunaBaseA": "nome_escola",
        "colunaBaseB": "nome_escola",
        "score": 82.5,
        "classificacao": "CANDIDATO_RECOMENDADO",
        "explicacao": "Evidência específica deste par.",
        "fatoresDetalhados": {"consistenciaUnicidade": 0.9},
        "evidenciasConcretas": {
            "qtdValoresEmComum": 9,
            "valoresEmComum": ["Escola A"],
        },
    }

    candidate = DiscoveryService._format_candidate(payload, "source-a", "source-b")

    assert candidate is not None
    assert candidate["fatores"] == {"consistenciaUnicidade": 0.9}
    assert candidate["evidencias"]["valoresEmComum"] == ["Escola A"]
    assert candidate["explicacao"] == "Evidência específica deste par."


def test_candidate_identity_distinguishes_equal_source_names_by_id():
    payload = {
        "par": "codigo_escola <-> codigo_escola",
        "score": 100,
        "classificacao": "CANDIDATO_RECOMENDADO",
        "fatores": {"consistenciaUnicidade": 1},
        "evidencias": {"qtdValoresEmComum": 15},
    }

    first = DiscoveryService._format_candidate(payload, "source-id-1", "source-id-2")
    second = DiscoveryService._format_candidate(payload, "source-id-3", "source-id-4")

    assert first is not None and second is not None
    assert first["id"] != second["id"]
    assert "source-id-1" in first["id"]
    assert "source-id-2" in first["id"]


def test_candidate_without_workflow_evidence_stays_empty():
    payload = {
        "par": "campo_a <-> campo_b",
        "score": 0,
        "classificacao": "REJEITADO",
    }

    candidate = DiscoveryService._format_candidate(payload, "source-a", "source-b")

    assert candidate is not None
    assert candidate["fatores"] == {}
    assert candidate["evidencias"] == {}
    assert "0 valor(es) normalizado(s)" in candidate["explicacao"]
