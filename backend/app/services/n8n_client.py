import logging
import httpx
from typing import Dict, Any, List, Optional
from urllib.parse import urlsplit
from app.config import settings

logger = logging.getLogger("synapse.n8n_client")

class N8NIntegrationError(Exception):
    """Exceção levantada quando a integração com n8n falha ou retorna erro."""
    pass


def safe_endpoint_destination(url: str) -> str:
    """Retorna apenas esquema, host e porta, removendo credenciais, caminho e query."""
    try:
        parsed = urlsplit(url)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            return "endpoint inválido"
        hostname = parsed.hostname
        if ":" in hostname:
            hostname = f"[{hostname}]"
        port = f":{parsed.port}" if parsed.port is not None else ""
        return f"{parsed.scheme}://{hostname}{port}"
    except ValueError:
        return "endpoint inválido"


class N8NClient:
    def __init__(self, transport: Optional[httpx.AsyncBaseTransport] = None):
        self.base_url = settings.N8N_BASE_URL
        self.discovery_url = settings.N8N_DISCOVERY_WEBHOOK_URL
        self.data_bridge_url = settings.N8N_DATA_BRIDGE_WEBHOOK_URL
        self.timeout = settings.N8N_TIMEOUT_SECONDS
        self.transport = transport

    @staticmethod
    def _webhook_headers() -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if settings.N8N_WEBHOOK_AUTH_HEADER and settings.N8N_WEBHOOK_AUTH_VALUE:
            headers[settings.N8N_WEBHOOK_AUTH_HEADER] = settings.N8N_WEBHOOK_AUTH_VALUE
        return headers

    async def check_health(self) -> Dict[str, Any]:
        """Verifica a conectividade HTTP real com a instância do n8n."""
        destination = safe_endpoint_destination(self.base_url)
        try:
            async with httpx.AsyncClient(timeout=3.0, transport=self.transport) as client:
                resp = await client.get(f"{self.base_url}/healthz")
                # Alguns n8n usam /healthz ou respondem 200 no base
                if resp.status_code in [200, 302, 401]:
                    return {"reachable": True, "status_code": resp.status_code, "url": destination}
                # Tenta requisição simples na raiz
                root_resp = await client.get(self.base_url)
                return {"reachable": True, "status_code": root_resp.status_code, "url": destination}
        except Exception as error:
            error_type = type(error).__name__
            logger.warning("Falha ao checar saúde do n8n; destino=%s; tipo=%s", destination, error_type)
            return {"reachable": False, "error": error_type, "url": destination}

    async def _post_webhook(
        self,
        workflow_name: str,
        url: str,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        destination = safe_endpoint_destination(url)
        try:
            async with httpx.AsyncClient(timeout=self.timeout, transport=self.transport) as client:
                response = await client.post(url, json=payload, headers=self._webhook_headers())

            if response.status_code == 401:
                raise N8NIntegrationError(
                    f"{workflow_name}: HTTP 401 (não autenticado) retornado por {destination}."
                )
            if response.status_code == 403:
                raise N8NIntegrationError(
                    f"{workflow_name}: HTTP 403 (acesso negado) retornado por {destination}."
                )
            if response.status_code == 404:
                raise N8NIntegrationError(
                    f"{workflow_name}: HTTP 404; webhook não encontrado ou inativo em {destination}."
                )
            if response.status_code != 200:
                raise N8NIntegrationError(
                    f"{workflow_name}: HTTP {response.status_code} retornado por {destination}."
                )

            try:
                data = response.json()
            except ValueError as error:
                raise N8NIntegrationError(
                    f"{workflow_name}: resposta inválida de {destination}; JSON malformado."
                ) from error
            if not isinstance(data, dict):
                raise N8NIntegrationError(
                    f"{workflow_name}: resposta inválida de {destination}; esperado objeto JSON."
                )
            return data
        except httpx.TimeoutException as error:
            logger.error("Timeout no n8n; workflow=%s; destino=%s", workflow_name, destination)
            raise N8NIntegrationError(
                f"{workflow_name}: timeout ao contatar {destination} após {self.timeout}s."
            ) from error
        except httpx.ConnectError as error:
            logger.error(
                "Falha de conexão com o n8n; workflow=%s; destino=%s",
                workflow_name,
                destination,
            )
            raise N8NIntegrationError(
                f"{workflow_name}: não foi possível conectar a {destination}."
            ) from error
        except httpx.RequestError as error:
            logger.error(
                "Falha de transporte HTTP no n8n; workflow=%s; destino=%s; tipo=%s",
                workflow_name,
                destination,
                type(error).__name__,
            )
            raise N8NIntegrationError(
                f"{workflow_name}: falha de transporte HTTP ao contatar {destination}."
            ) from error
        except N8NIntegrationError:
            raise
        except Exception as error:
            logger.error(
                "Erro inesperado na integração n8n; workflow=%s; destino=%s; tipo=%s",
                workflow_name,
                destination,
                type(error).__name__,
            )
            raise N8NIntegrationError(
                f"{workflow_name}: falha inesperada ao contatar {destination}."
            ) from error

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

        destination = safe_endpoint_destination(self.discovery_url)
        logger.info(
            "Chamando n8n Discovery; destino=%s; registros_a=%s; registros_b=%s",
            destination,
            len(base_a),
            len(base_b),
        )
        return await self._post_webhook("n8n Discovery", self.discovery_url, payload)

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

        destination = safe_endpoint_destination(self.data_bridge_url)
        logger.info(
            "Chamando n8n Data Bridge; destino=%s; registros_a=%s; registros_b=%s",
            destination,
            len(records_a),
            len(records_b),
        )
        return await self._post_webhook("n8n Data Bridge", self.data_bridge_url, payload)

n8n_client = N8NClient()
