"""Publica versões auditáveis dos workflows locais da Fase 3D no n8n.

Pré-condição: executar export_n8n_phase3d.py e preservar o diretório de backup.
O script não remove históricos; cria uma nova versão e a marca como publicada.
"""

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path


N8N_DATABASE = Path(
    os.getenv("N8N_DATABASE", str(Path.home() / ".n8n" / "database.sqlite"))
).resolve()
WORKFLOWS = {
    "LHJTja7RuShTAcJo": (
        Path("backend/n8n_workflows/intelligent_discovery.js"),
        "Fase 3D - Evidências e cardinalidade por candidato",
    ),
    "WvgldAqi81hUMq58": (
        Path("backend/n8n_workflows/data_bridge.js"),
        "Fase 3D - Data Bridge genérico sem campos nulos artificiais",
    ),
}


def replace_code(nodes_json: str, source_path: Path) -> str:
    nodes = json.loads(nodes_json)
    code_nodes = [node for node in nodes if node.get("type") == "n8n-nodes-base.code"]
    if len(code_nodes) != 1:
        raise RuntimeError(f"Esperado um nó Code em {source_path}; encontrados {len(code_nodes)}")
    code_nodes[0]["parameters"]["jsCode"] = source_path.read_text(encoding="utf-8")
    return json.dumps(nodes, ensure_ascii=False, separators=(",", ":"))


backup_dirs = sorted(Path("backend/n8n_backups").glob("pre_phase3d_*"))
if not backup_dirs:
    raise RuntimeError("Backup pré-Fase 3D não encontrado; publicação cancelada.")

connection = sqlite3.connect(N8N_DATABASE, timeout=30)
connection.row_factory = sqlite3.Row
published = []

try:
    connection.execute("begin immediate")
    for workflow_id, (source_path, version_name) in WORKFLOWS.items():
        workflow = connection.execute(
            "select * from workflow_entity where id = ?", (workflow_id,)
        ).fetchone()
        if workflow is None:
            raise RuntimeError(f"Workflow {workflow_id} não encontrado")

        nodes_json = replace_code(workflow["nodes"], source_path)
        version_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]

        connection.execute(
            "insert into workflow_history "
            "(versionId, workflowId, authors, createdAt, updatedAt, nodes, connections, "
            "name, autosaved, description, nodeGroups) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                version_id,
                workflow_id,
                "SYNAPSE Fase 3D",
                now,
                now,
                nodes_json,
                workflow["connections"],
                version_name,
                0,
                "Correção funcional auditada da Fase 3D.",
                workflow["nodeGroups"] or "[]",
            ),
        )
        connection.execute(
            "update workflow_entity set nodes = ?, versionId = ?, activeVersionId = ?, "
            "versionCounter = versionCounter + 1, updatedAt = ? where id = ?",
            (nodes_json, version_id, version_id, now, workflow_id),
        )
        connection.execute(
            "update workflow_published_version set publishedVersionId = ?, updatedAt = ? "
            "where workflowId = ?",
            (version_id, now, workflow_id),
        )
        published.append((workflow_id, version_id))

    connection.commit()
finally:
    connection.close()

for workflow_id, version_id in published:
    print(f"{workflow_id}: {version_id}")
