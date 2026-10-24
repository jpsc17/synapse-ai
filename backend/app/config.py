import ipaddress
import os
from pathlib import Path
from typing import List, Mapping
from urllib.parse import urlsplit
from dotenv import load_dotenv

# Carrega .env a partir da pasta backend/
env_path = Path(__file__).resolve().parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()


BACKEND_DIR = Path(__file__).resolve().parent.parent


def resolve_database_url(raw_url: str | None) -> str:
    """Resolve o SQLite local sempre em relação ao backend, não ao processo."""
    if not raw_url:
        return f"sqlite:///{(BACKEND_DIR / 'synapse.db').as_posix()}"
    relative_prefix = "sqlite:///./"
    if raw_url.startswith(relative_prefix):
        relative_path = raw_url.removeprefix(relative_prefix)
        return f"sqlite:///{(BACKEND_DIR / relative_path).resolve().as_posix()}"
    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+psycopg://", 1)
    if raw_url.startswith("postgresql://"):
        return raw_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return raw_url


def env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


N8N_WEBHOOK_URL_VARIABLES = (
    "N8N_DISCOVERY_WEBHOOK_URL",
    "N8N_DATA_BRIDGE_WEBHOOK_URL",
)


def _is_local_webhook_host(hostname: str) -> bool:
    normalized = hostname.rstrip(".").lower()
    if normalized == "localhost" or normalized.endswith(".localhost"):
        return True
    try:
        address = ipaddress.ip_address(normalized)
    except ValueError:
        return False
    return address.is_loopback or address.is_unspecified


def validate_n8n_webhook_urls(
    environment: str,
    environ: Mapping[str, str] | None = None,
) -> None:
    """Exige webhooks n8n HTTP(S) explícitos e remotos fora de development."""
    if environment.strip().lower() not in {"staging", "production"}:
        return

    source = os.environ if environ is None else environ
    problems: list[str] = []
    for variable_name in N8N_WEBHOOK_URL_VARIABLES:
        raw_url = source.get(variable_name, "").strip()
        if not raw_url:
            problems.append(f"{variable_name} deve ser configurada explicitamente")
            continue

        try:
            parsed = urlsplit(raw_url)
            hostname = parsed.hostname
            _ = parsed.port
        except ValueError:
            parsed = None
            hostname = None

        if parsed is None or parsed.scheme not in {"http", "https"} or not hostname:
            problems.append(f"{variable_name} deve conter uma URL HTTP(S) válida")
        elif _is_local_webhook_host(hostname):
            problems.append(f"{variable_name} não pode apontar para localhost")

    if problems:
        raise RuntimeError(
            "Configuração dos webhooks n8n inválida: " + "; ".join(problems) + "."
        )


def validate_evaluator_auth_settings(
    environment: str,
    evaluator_email: str,
    evaluator_password_hash: str,
    auth_required: bool = True,
) -> None:
    """Impede ambientes publicados sem credenciais humanas seguras."""
    if environment.strip().lower() not in {"staging", "production"}:
        return

    problems: list[str] = []
    if not auth_required:
        problems.append("AUTH_REQUIRED deve permanecer true")
    if not evaluator_email or "@" not in evaluator_email:
        problems.append("EVALUATOR_EMAIL deve conter um e-mail válido")
    if not evaluator_password_hash:
        problems.append("EVALUATOR_PASSWORD_HASH deve ser configurada")
    elif not evaluator_password_hash.startswith("$argon2"):
        problems.append("EVALUATOR_PASSWORD_HASH deve conter um hash Argon2")
    if problems:
        raise RuntimeError("Configuração do login dos avaliadores inválida: " + "; ".join(problems) + ".")


class Settings:
    PROJECT_NAME: str = "SYNAPSE AI Backend"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    CORS_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if origin.strip()
    ]

    # O caminho padrão não pode depender do diretório de onde uvicorn/pytest foi iniciado.
    # Isso garante que API e rotinas de isolamento apontem para o mesmo arquivo.
    DATABASE_URL: str = resolve_database_url(os.getenv("DATABASE_URL"))

    N8N_BASE_URL: str = os.getenv("N8N_BASE_URL", "http://localhost:5678")
    N8N_DISCOVERY_WEBHOOK_URL: str = os.getenv(
        "N8N_DISCOVERY_WEBHOOK_URL", "http://localhost:5678/webhook/synapse-intelligent-discovery"
    )
    N8N_DATA_BRIDGE_WEBHOOK_URL: str = os.getenv(
        "N8N_DATA_BRIDGE_WEBHOOK_URL", "http://localhost:5678/webhook/synapse-data-bridge"
    )
    N8N_TIMEOUT_SECONDS: float = float(os.getenv("N8N_TIMEOUT_SECONDS", "15.0"))
    N8N_WEBHOOK_AUTH_HEADER: str = os.getenv("N8N_WEBHOOK_AUTH_HEADER", "")
    N8N_WEBHOOK_AUTH_VALUE: str = os.getenv("N8N_WEBHOOK_AUTH_VALUE", "")

    MAX_UPLOAD_SIZE_BYTES: int = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", "10485760")) # 10MB
    ALLOWED_EXTENSIONS: List[str] = [
        ext.strip().lower()
        for ext in os.getenv("ALLOWED_EXTENSIONS", ".csv,.xlsx,.xls,.tsv").split(",")
        if ext.strip()
    ]

    UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR", str(BACKEND_DIR / "uploads"))).resolve()
    BACKUP_DIR: Path = Path(os.getenv("BACKUP_DIR", str(BACKEND_DIR / "backups"))).resolve()

    # Em desenvolvimento a UI pode administrar fontes. Em produção, operações
    # destrutivas só são aceitas com flag explícita e chave enviada por cliente
    # administrativo confiável (nunca embutida no bundle Vite).
    DESTRUCTIVE_OPERATIONS_ENABLED: bool = env_bool(
        "DESTRUCTIVE_OPERATIONS_ENABLED", ENVIRONMENT.lower() in {"development", "local", "test"}
    )
    ADMIN_MAINTENANCE_ENABLED: bool = env_bool("ADMIN_MAINTENANCE_ENABLED", False)
    AUTH_REQUIRED: bool = env_bool(
        "AUTH_REQUIRED", ENVIRONMENT.lower() in {"staging", "production"}
    )
    OPERATOR_API_KEY: str = os.getenv("OPERATOR_API_KEY", "")
    ADMIN_API_KEY: str = os.getenv("ADMIN_API_KEY", "")
    EVALUATOR_EMAIL: str = os.getenv("EVALUATOR_EMAIL", "").strip().lower()
    EVALUATOR_PASSWORD_HASH: str = os.getenv("EVALUATOR_PASSWORD_HASH", "").strip()
    EVALUATOR_SESSION_TTL_MINUTES: int = int(os.getenv("EVALUATOR_SESSION_TTL_MINUTES", "60"))
    EVALUATOR_LOGIN_MAX_ATTEMPTS: int = int(os.getenv("EVALUATOR_LOGIN_MAX_ATTEMPTS", "5"))
    EVALUATOR_LOGIN_WINDOW_SECONDS: int = int(os.getenv("EVALUATOR_LOGIN_WINDOW_SECONDS", "900"))

settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.BACKUP_DIR.mkdir(parents=True, exist_ok=True)
