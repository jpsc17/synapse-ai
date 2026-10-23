"""Gera exports n8n sanitizados usando os manifests e códigos auditados locais."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = ROOT / "deploy" / "n8n" / "workflows"
WORKFLOWS = (
    (
        ROOT / "backend" / "n8n_backups" / "LHJTja7RuShTAcJo_SYNAPSE_-_Intelligent_Discovery_POC.json",
        ROOT / "backend" / "n8n_workflows" / "intelligent_discovery.js",
        OUTPUT_DIR / "intelligent-discovery.json",
    ),
    (
        ROOT / "backend" / "n8n_backups" / "WvgldAqi81hUMq58_SYNAPSE_-_Data_Bridge_POC.json",
        ROOT / "backend" / "n8n_workflows" / "data_bridge.js",
        OUTPUT_DIR / "data-bridge.json",
    ),
)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for template_path, source_path, output_path in WORKFLOWS:
        workflow = json.loads(template_path.read_text(encoding="utf-8"))
        code_nodes = [node for node in workflow["nodes"] if node.get("type") == "n8n-nodes-base.code"]
        if len(code_nodes) != 1:
            raise RuntimeError(f"Esperado exatamente um nó Code em {template_path.name}.")
        if any(node.get("credentials") for node in workflow["nodes"]):
            raise RuntimeError(f"Export recusado: credencial encontrada em {template_path.name}.")
        code_nodes[0]["parameters"]["jsCode"] = source_path.read_text(encoding="utf-8")
        sanitized = {
            "id": workflow["id"],
            "name": workflow["name"],
            "nodes": workflow["nodes"],
            "connections": workflow["connections"],
        }
        output_path.write_text(
            json.dumps(sanitized, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(output_path.relative_to(ROOT))


if __name__ == "__main__":
    main()
