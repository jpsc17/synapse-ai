"""Migração explícita e não destrutiva do SQLite local para PostgreSQL.

Por padrão apenas mostra as contagens. A gravação exige --execute e um banco
PostgreSQL de destino vazio. O script nunca remove dados da origem.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from sqlalchemy import MetaData, create_engine, inspect, select

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database import Base
import app.models  # noqa: F401  # registra todos os modelos no metadata


TABLE_ORDER = [
    "data_sources",
    "analysis_plans",
    "governance_decisions",
    "pipeline_executions",
    "administrative_audit_events",
]


def normalized_postgres_url(raw_url: str) -> str:
    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+psycopg://", 1)
    if raw_url.startswith("postgresql://"):
        return raw_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return raw_url


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sqlite", required=True, help="Caminho do arquivo SQLite de origem")
    parser.add_argument("--execute", action="store_true", help="Grava no PostgreSQL de destino")
    args = parser.parse_args()

    sqlite_path = Path(args.sqlite).resolve()
    if not sqlite_path.is_file():
        raise SystemExit(f"SQLite não encontrado: {sqlite_path}")
    source_engine = create_engine(f"sqlite:///{sqlite_path.as_posix()}")
    source_meta = MetaData()
    source_meta.reflect(bind=source_engine)
    counts = {}
    with source_engine.connect() as connection:
        for table_name in TABLE_ORDER:
            counts[table_name] = (
                len(connection.execute(select(source_meta.tables[table_name])).mappings().all())
                if table_name in source_meta.tables else 0
            )
    print("Contagens da origem:")
    for table_name, count in counts.items():
        print(f"- {table_name}: {count}")
    if not args.execute:
        print("Dry-run concluído. Use --execute somente após criar backup e revisar o destino.")
        return

    target_url = os.getenv("TARGET_DATABASE_URL", "")
    if not target_url:
        raise SystemExit("Defina TARGET_DATABASE_URL para o PostgreSQL de destino.")
    target_engine = create_engine(normalized_postgres_url(target_url))
    Base.metadata.create_all(bind=target_engine)
    with target_engine.connect() as connection:
        occupied = {
            table_name: connection.execute(select(Base.metadata.tables[table_name])).first() is not None
            for table_name in TABLE_ORDER
            if table_name in Base.metadata.tables
        }
    if any(occupied.values()):
        raise SystemExit("Migração recusada: o PostgreSQL de destino não está vazio.")

    with source_engine.connect() as source, target_engine.begin() as target:
        for table_name in TABLE_ORDER:
            if table_name not in source_meta.tables or table_name not in Base.metadata.tables:
                continue
            rows = source.execute(select(source_meta.tables[table_name])).mappings().all()
            if rows:
                target.execute(Base.metadata.tables[table_name].insert(), [dict(row) for row in rows])
    print("Migração concluída. A origem SQLite permaneceu inalterada.")


if __name__ == "__main__":
    main()
