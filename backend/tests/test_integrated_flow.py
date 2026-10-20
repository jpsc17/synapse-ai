import os
import sys
import unittest
from pathlib import Path
import httpx

BASE_URL = "http://localhost:8000/api/v1"
FIXTURES_DIR = Path(__file__).parent / "fixtures"

class TestSynapseIntegratedFlow(unittest.TestCase):
    def setUp(self):
        self.client = httpx.Client(base_url=BASE_URL, timeout=20.0)

    def tearDown(self):
        self.client.close()

    def test_01_health_check(self):
        """Verifica se o backend e a integração com n8n estão saudáveis."""
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "ONLINE")
        self.assertEqual(data["database"], "CONNECTED")
        self.assertTrue(data["n8n_integration"]["reachable"])

    def test_02_upload_csv_and_xlsx(self):
        """Testa o upload real de funcionarios.csv e pagamentos.xlsx."""
        # Upload Base A (CSV)
        csv_path = FIXTURES_DIR / "funcionarios.csv"
        with open(csv_path, "rb") as f:
            resp_a = self.client.post(
                "/sources/upload",
                files={"file": ("funcionarios.csv", f, "text/csv")},
                data={"custom_name": "Base A - Funcionários"}
            )
        self.assertEqual(resp_a.status_code, 200, resp_a.text)
        ds_a = resp_a.json()
        self.assertEqual(ds_a["rowCount"], 3)
        self.assertEqual(ds_a["sourceType"], "csv")
        self.assertIn("MATVINC", [c["name"] for c in ds_a["columns"]])

        # Upload Base B (XLSX)
        xlsx_path = FIXTURES_DIR / "pagamentos.xlsx"
        with open(xlsx_path, "rb") as f:
            resp_b = self.client.post(
                "/sources/upload",
                files={"file": ("pagamentos.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
                data={"custom_name": "Base B - Pagamentos"}
            )
        self.assertEqual(resp_b.status_code, 200, resp_b.text)
        ds_b = resp_b.json()
        self.assertEqual(ds_b["rowCount"], 3)
        self.assertEqual(ds_b["sourceType"], "excel")
        self.assertIn("matricula_funcional", [c["name"] for c in ds_b["columns"]])

        TestSynapseIntegratedFlow.ds_a_id = ds_a["id"]
        TestSynapseIntegratedFlow.ds_b_id = ds_b["id"]

    def test_03_discovery_relationship_analysis(self):
        """Executa a descoberta heurística no n8n e verifica as evidências."""
        resp = self.client.post(
            "/discovery/analyze",
            json={
                "source_a_id": self.ds_a_id,
                "source_b_id": self.ds_b_id
            }
        )
        self.assertEqual(resp.status_code, 200, resp_a_text := resp.text)
        plan = resp.json()
        self.assertEqual(plan["status"], "PENDING_APPROVAL")
        self.assertIsNotNone(plan["suggested_relation"])

        rel = plan["suggested_relation"]
        self.assertEqual(rel["sourceColumn"], "MATVINC")
        self.assertEqual(rel["targetColumn"], "matricula_funcional")
        self.assertGreaterEqual(rel["score"], 70.0)
        self.assertEqual(rel["classificacao"], "CANDIDATO_RECOMENDADO")

        # Evidências do n8n: 1001 e 1002 em comum
        evidencias = rel.get("evidencias", {})
        self.assertIn("1001", [str(v) for v in evidencias.get("valoresEmComum", [])])
        self.assertIn("1002", [str(v) for v in evidencias.get("valoresEmComum", [])])

        TestSynapseIntegratedFlow.plan_id = plan["plan_id"]

    def test_04_negative_execute_unapproved_plan(self):
        """TESTE NEGATIVO: Tentar executar JOIN antes de aprovar o plano DEVE ser bloqueado (403)."""
        resp = self.client.post(
            "/pipelines/execute",
            json={"plan_id": self.plan_id}
        )
        self.assertEqual(resp.status_code, 403)
        self.assertIn("PENDENTE", resp.json()["detail"])

    def test_05_governance_approval(self):
        """Aprova formalmente o plano de relacionamento com justificativa."""
        resp = self.client.post(
            "/governance/decide",
            json={
                "plan_id": self.plan_id,
                "approved": True,
                "reason": "Chave funcional MATVINC validada com matrícula contábil após verificação de 2 registros em comum e cardinalidade consistente.",
                "approver": "Dr. Fernando Souza (Auditor Chefe)"
            }
        )
        self.assertEqual(resp.status_code, 200)
        decision = resp.json()
        self.assertTrue(decision["approved"])
        self.assertEqual(decision["status"], "APPROVED")

    def test_06_execute_approved_join(self):
        """Executa o JOIN no n8n (Data Bridge POC) e confere as 3 categorias esperadas."""
        resp = self.client.post(
            "/pipelines/execute",
            json={"plan_id": self.plan_id}
        )
        self.assertEqual(resp.status_code, 200, resp.text)
        result = resp.json()
        self.assertEqual(result["status"], "SUCCESS")

        matched = result["matched_records"]
        unmatched_a = result["unmatched_source_a"]
        unmatched_b = result["unmatched_source_b"]

        # Conferência 1: Exatamente dois registros com correspondência (1001 e 1002)
        self.assertEqual(len(matched), 2, f"Esperado 2 correspondências, obtido {len(matched)}")
        matrs_matched = [str(r["matricula"]) for r in matched]
        self.assertIn("1001", matrs_matched)
        self.assertIn("1002", matrs_matched)

        # Conferência 2: Exatamente um funcionário sem pagamento (1003 - Carla)
        self.assertEqual(len(unmatched_a), 1)
        self.assertEqual(str(unmatched_a[0]["matricula"]), "1003")

        # Conferência 3: Exatamente um pagamento sem funcionário correspondente (1004)
        self.assertEqual(len(unmatched_b), 1)
        self.assertEqual(str(unmatched_b[0]["matricula"]), "1004")

        TestSynapseIntegratedFlow.execution_id = result["execution_id"]

    def test_07_negative_duplicate_execution_protection(self):
        """TESTE NEGATIVO: Execução duplicada do mesmo plano deve retornar a execução já concluída de forma segura."""
        resp = self.client.post(
            "/pipelines/execute",
            json={"plan_id": self.plan_id}
        )
        self.assertEqual(resp.status_code, 200)
        result = resp.json()
        self.assertEqual(result["execution_id"], self.execution_id)

    def test_08_negative_invalid_file_upload(self):
        """TESTE NEGATIVO: Upload com extensão proibida ou arquivo corrompido deve falhar com 400 ou 422."""
        resp = self.client.post(
            "/sources/upload",
            files={"file": ("malicious.exe", b"fake binary content", "application/octet-stream")},
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("não suportada", resp.json()["detail"])

    def test_09_fetch_execution_audit_history(self):
        """Recupera os detalhes auditados da execução salva."""
        resp = self.client.get(f"/pipelines/executions/{self.execution_id}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["workflow_id"], "WvgldAqi81hUMq58")
        self.assertEqual(data["summary"]["qtdFuncionariosComPagamento"], 2)
        self.assertEqual(data["summary"]["qtdFuncionariosSemPagamento"], 1)
        self.assertEqual(data["summary"]["qtdPagamentosSemFuncionario"], 1)

if __name__ == "__main__":
    unittest.main()
