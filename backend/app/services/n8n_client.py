import logging
import httpx
from typing import Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger("synapse.n8n_client")

class N8NIntegrationError(Exception):
    """Exceção levantada quando a integração com n8n falha ou retorna erro."""
    pass

class N8NClient:
    def __init__(self):
        self.base_url = settings.N8N_BASE_URL
        self.discovery_url = settings.N8N_DISCOVERY_WEBHOOK_URL
        self.data_bridge_url = settings.N8N_DATA_BRIDGE_WEBHOOK_URL
        self.timeout = settings.N8N_TIMEOUT_SECONDS

    @staticmethod
    def _webhook_headers() -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if settings.N8N_WEBHOOK_AUTH_HEADER and settings.N8N_WEBHOOK_AUTH_VALUE:
            headers[settings.N8N_WEBHOOK_AUTH_HEADER] = settings.N8N_WEBHOOK_AUTH_VALUE
        return headers

    async def check_health(self) -> Dict[str, Any]:
        """Verifica a conectividade HTTP real com a instância do n8n."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{self.base_url}/healthz")
                # Alguns n8n usam /healthz ou respondem 200 no base
                if resp.status_code in [200, 302, 401]:
                    return {"reachable": True, "status_code": resp.status_code, "url": self.base_url}
                # Tenta requisição simples na raiz
                root_resp = await client.get(self.base_url)
                return {"reachable": True, "status_code": root_resp.status_code, "url": self.base_url}
        except Exception as e:
            logger.warning(f"Falha ao checar saúde do n8n: {e}")
            return {"reachable": False, "error": str(e), "url": self.base_url}

    async def trigger_discovery_webhook(
        self,
        base_a: List[Dict[str, Any]],
        base_b: List[Dict[str, Any]],
        aprovado: bool = False
    ) -> Dict[str, Any]:
        """
        Dispara o workflow n8n LHJTja7RuShTAcJo (Intelligent Discovery POC)
        via requisição HTTP POST direta no webhook de produção.
        """
        payload = {
            "baseA": base_a,
            "baseB": base_b,
            "aprovado": aprovado
        }

        logger.info(f"Chamando n8n Discovery Webhook em {self.discovery_url} com {len(base_a)} registros em A e {len(base_b)} em B")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    self.discovery_url,
                    json=payload,
                    headers=self._webhook_headers()
                )

                if response.status_code != 200:
                    raise N8NIntegrationError(
                        f"n8n Discovery retornou status HTTP {response.status_code}: {response.text[:300]}"
                    )

                data = response.json()
                if not isinstance(data, dict):
                    raise N8NIntegrationError("Resposta do n8n em formato inesperado (não é um objeto JSON)")

                return data

        except httpx.TimeoutException:
            logger.error(f"Timeout ao chamar o n8n Discovery ({self.timeout}s)")
            raise N8NIntegrationError(f"Tempo limite excedido ao contatar o n8n ({self.timeout}s).")
        except httpx.ConnectError:
            logger.error("Erro de conexão com o servidor n8n local (porta 5678)")
            raise N8NIntegrationError("Não foi possível conectar ao servidor n8n em http://localhost:5678. Verifique se o n8n está rodando.")
        except Exception as e:
            if isinstance(e, N8NIntegrationError):
                raise
            logger.error(f"Erro inesperado na chamada n8n: {e}")
            raise N8NIntegrationError(f"Falha na integração com n8n: {str(e)}")

    async def trigger_data_bridge_webhook(
        self,
        base_a: Optional[List[Dict[str, Any]]] = None,
        base_b: Optional[List[Dict[str, Any]]] = None,
        key_a: Optional[str] = None,
        key_b: Optional[str] = None,
        funcionarios: Optional[List[Dict[str, Any]]] = None,
        pagamentos: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Dispara o workflow n8n WvgldAqi81hUMq58 (Data Bridge Universal)
        via requisição HTTP POST direta no webhook de produção.
        """
        records_a = base_a if base_a is not None else (funcionarios or [])
        records_b = base_b if base_b is not None else (pagamentos or [])

        payload = {
            "baseA": records_a,
            "baseB": records_b,
            "keyA": key_a,
            "keyB": key_b,
            # Retrocompatibilidade com testes e workflows que esperam chaves legadas
            "funcionarios": records_a,
            "pagamentos": records_b
        }

        logger.info(f"Chamando n8n Data Bridge Webhook em {self.data_bridge_url} com {len(records_a)} registros em A e {len(records_b)} em B (Chaves: {key_a} <-> {key_b})")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    self.data_bridge_url,
                    json=payload,
                    headers=self._webhook_headers()
                )

                if response.status_code != 200:
                    raise N8NIntegrationError(
                        f"n8n Data Bridge retornou status HTTP {response.status_code}: {response.text[:300]}"
                    )

                data = response.json()
                if not isinstance(data, dict):
                    raise N8NIntegrationError("Resposta do n8n em formato inesperado (não é um objeto JSON)")

                return data

        except httpx.TimeoutException:
            logger.error(f"Timeout ao chamar o n8n Data Bridge ({self.timeout}s)")
            raise N8NIntegrationError(f"Tempo limite excedido ao contatar o n8n ({self.timeout}s).")
        except httpx.ConnectError:
            logger.error("Erro de conexão com o servidor n8n local (porta 5678)")
            raise N8NIntegrationError("Não foi possível conectar ao servidor n8n em http://localhost:5678. Verifique se o n8n está rodando.")
        except Exception as e:
            if isinstance(e, N8NIntegrationError):
                raise
            logger.error(f"Erro inesperado no Data Bridge n8n: {e}")
            raise N8NIntegrationError(f"Falha na execução do Data Bridge no n8n: {str(e)}")

n8n_client = N8NClient()
