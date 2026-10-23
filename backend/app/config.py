import os
from pathlib import Path
from typing import List
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

settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.BACKUP_DIR.mkdir(parents=True, exist_ok=True)
