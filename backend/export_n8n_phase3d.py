import json
import sqlite3
from datetime import datetime
from pathlib import Path


WORKFLOW_IDS = ("LHJTja7RuShTAcJo", "WvgldAqi81hUMq58")
N8N_DATABASE = "file:C:/Users/J P/.n8n/database.sqlite?mode=ro"

connection = sqlite3.connect(N8N_DATABASE, uri=True)
connection.row_factory = sqlite3.Row

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup_dir = Path("backend/n8n_backups") / f"pre_phase3d_{timestamp}"
source_dir = Path("backend/n8n_workflows")
backup_dir.mkdir(parents=True, exist_ok=False)
source_dir.mkdir(parents=True, exist_ok=True)

for workflow_id in WORKFLOW_IDS:
    row = connection.execute(
        "select w.*, p.publishedVersionId, h.nodes as publishedNodes, "
        "h.connections as publishedConnections "
        "from workflow_entity w "
        "left join workflow_published_version p on p.workflowId = w.id "
        "left join workflow_history h on h.workflowId = w.id "
        "and h.versionId = p.publishedVersionId where w.id = ?",
        (workflow_id,),
    ).fetchone()
    if row is None:
        raise RuntimeError(f"Workflow {workflow_id} não encontrado")

    data = dict(row)
    for field in ("nodes", "connections", "settings", "staticData", "pinData", "meta", "nodeGroups"):
        if data.get(field):
            data[field] = json.loads(data[field])
    for field in ("publishedNodes", "publishedConnections"):
        if data.get(field):
            data[field] = json.loads(data[field])

    backup_path = backup_dir / f"{workflow_id}.json"
    backup_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    nodes = data["nodes"]
    code_node = next(node for node in nodes if node.get("type") == "n8n-nodes-base.code")
    source_path = source_dir / (
        "intelligent_discovery.js" if workflow_id.startswith("LHJ") else "data_bridge.js"
    )
    source_path.write_text(code_node["parameters"]["jsCode"], encoding="utf-8")

print(backup_dir)
