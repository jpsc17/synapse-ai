"""Cliente administrativo interativo; nunca executa limpeza sem confirmação humana."""

from __future__ import annotations

import argparse
import getpass

import httpx


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", default="http://127.0.0.1:8000/api/v1")
    args = parser.parse_args()
    key = getpass.getpass("ADMIN_API_KEY: ")
    headers = {"X-Admin-Key": key}
    with httpx.Client(base_url=args.api, headers=headers, timeout=60) as client:
        response = client.get("/admin/cleanup/impact")
        response.raise_for_status()
        impact = response.json()
        print(
            f"Impacto: {impact['source_count']} fontes, {impact['plan_count']} planos, "
            f"{impact['decision_count']} decisões, {impact['execution_count']} execuções e "
            f"{impact['file_count']} arquivos."
        )
        phrase = input(f"Digite exatamente '{impact['confirmation_phrase']}' para continuar: ")
        if phrase != impact["confirmation_phrase"]:
            raise SystemExit("Cancelado; nenhum dado foi alterado.")
        final = input("Confirma a criação do backup e a limpeza? Digite SIM: ")
        if final != "SIM":
            raise SystemExit("Cancelado; nenhum dado foi alterado.")
        result = client.post("/admin/cleanup", json={"confirmation": phrase})
        result.raise_for_status()
        print(result.json())


if __name__ == "__main__":
    main()
