import unittest
from pathlib import Path
import httpx
from app.database import SessionLocal
from app.models import AnalysisPlanModel

BASE_URL = "http://localhost:8000/api/v1"
FIXTURES_DIR = Path(__file__).parent / "fixtures"

class TestSynapseGovernanceEdgeCases(unittest.TestCase):
    def setUp(self):
        self.client = httpx.Client(base_url=BASE_URL, timeout=15.0)

    def tearDown(self):
        self.client.close()

    @staticmethod
    def _remove_plan(plan_id: str):
        with SessionLocal() as db:
            plan = db.query(AnalysisPlanModel).filter(AnalysisPlanModel.id == plan_id).first()
            if plan:
                db.delete(plan)
                db.commit()

    def test_rejection_flow_blocks_execution(self):
        """Valida que um plano formalmente REJEITADO não pode ser executado."""
        sources = self.client.get("/sources").json()
        self.assertGreaterEqual(len(sources), 2)
        s_a, s_b = sources[0]["id"], sources[1]["id"]

        # Gera novo plano de análise
        plan_resp = self.client.post("/discovery/analyze", json={"source_a_id": s_a, "source_b_id": s_b})
        self.assertEqual(plan_resp.status_code, 200)
        plan_id = plan_resp.json()["plan_id"]
        self.addCleanup(self._remove_plan, plan_id)

        # Rejeita formalmente o plano
        decide_resp = self.client.post("/governance/decide", json={
            "plan_id": plan_id,
            "approved": False,
            "reason": "Rejeição deliberada em auditoria de integridade.",
            "approver": "Auditor Responsável"
        })
        self.assertEqual(decide_resp.status_code, 200)
        self.assertEqual(decide_resp.json()["status"], "REJECTED")

        # Tenta executar o plano rejeitado -> Deve retornar 403 Forbidden
        exec_resp = self.client.post("/pipelines/execute", json={"plan_id": plan_id})
        self.assertEqual(exec_resp.status_code, 403)
        self.assertIn("REJEITADO", exec_resp.json()["detail"])

    def test_tamper_proofing_approved_columns(self):
        """
        Valida que o endpoint de execução só aceita plan_id selado no banco,
        impedindo que o cliente injete colunas ou joins arbitrários.
        """
        # Tenta passar payload com propriedades maliciosas além do plan_id
        exec_resp = self.client.post("/pipelines/execute", json={
            "plan_id": "non-existent-id",
            "malicious_source_col": "SENHA",
            "malicious_target_col": "SALDO"
        })
        # Deve falhar com 404 (plano não encontrado), comprovando que o backend consulta o banco
        self.assertEqual(exec_resp.status_code, 404)

    def test_invalid_file_extension_rejected(self):
        """Valida que arquivos com extensão não permitida (.exe, .sh, .py) são bloqueados."""
        resp = self.client.post(
            "/sources/upload",
            files={"file": ("script.py", b"print('hack')", "text/x-python")}
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("não suportada", resp.json()["detail"])

if __name__ == "__main__":
    unittest.main()
