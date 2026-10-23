from __future__ import annotations

import secrets
from typing import Optional

from fastapi import Header, HTTPException, status

from app.config import settings


def _bearer_token(authorization: Optional[str]) -> str:
    if not authorization:
        return ""
    scheme, _, token = authorization.partition(" ")
    return token.strip() if scheme.lower() == "bearer" else ""


def _matches(candidate: str, configured: str) -> bool:
    return bool(candidate and configured and secrets.compare_digest(candidate, configured))


def access_role(authorization: Optional[str], x_admin_key: Optional[str] = None) -> str | None:
    token = _bearer_token(authorization)
    if _matches(token, settings.ADMIN_API_KEY) or _matches(x_admin_key or "", settings.ADMIN_API_KEY):
        return "admin"
    if _matches(token, settings.OPERATOR_API_KEY):
        return "operator"
    return None


def require_operator(
    authorization: Optional[str] = Header(default=None),
    x_admin_key: Optional[str] = Header(default=None),
) -> str:
    if not settings.AUTH_REQUIRED:
        return "development"
    role = access_role(authorization, x_admin_key)
    if role not in {"operator", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação de operador obrigatória.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return role


def require_admin(
    authorization: Optional[str] = Header(default=None),
    x_admin_key: Optional[str] = Header(default=None),
) -> str:
    role = access_role(authorization, x_admin_key)
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Autorização administrativa obrigatória.",
        )
    return role
