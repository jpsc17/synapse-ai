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

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./synapse.db")

    N8N_BASE_URL: str = os.getenv("N8N_BASE_URL", "http://localhost:5678")
    N8N_DISCOVERY_WEBHOOK_URL: str = os.getenv(
        "N8N_DISCOVERY_WEBHOOK_URL", "http://localhost:5678/webhook/synapse-intelligent-discovery"
    )
    N8N_DATA_BRIDGE_WEBHOOK_URL: str = os.getenv(
        "N8N_DATA_BRIDGE_WEBHOOK_URL", "http://localhost:5678/webhook/synapse-data-bridge"
    )
    N8N_TIMEOUT_SECONDS: float = float(os.getenv("N8N_TIMEOUT_SECONDS", "15.0"))

    MAX_UPLOAD_SIZE_BYTES: int = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", "10485760")) # 10MB
    ALLOWED_EXTENSIONS: List[str] = [
        ext.strip().lower()
        for ext in os.getenv("ALLOWED_EXTENSIONS", ".csv,.xlsx,.xls,.tsv").split(",")
        if ext.strip()
    ]

    UPLOAD_DIR: Path = Path(__file__).resolve().parent.parent / "uploads"

settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
