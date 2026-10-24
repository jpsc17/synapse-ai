from __future__ import annotations

import secrets
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.services.auth_service import AuthIdentity, resolve_evaluator_session


def bearer_token(authorization: Optional[str]) -> str:
    if not authorization:
        return ""
    scheme, _, token = authorization.partition(" ")
    return token.strip() if scheme.lower() == "bearer" else ""


def _matches(candidate: str, configured: str) -> bool:
    return bool(candidate and configured and secrets.compare_digest(candidate, configured))


def access_role(authorization: Optional[str], x_admin_key: Optional[str] = None) -> str | None:
    token = bearer_token(authorization)
    if _matches(token, settings.ADMIN_API_KEY) or _matches(x_admin_key or "", settings.ADMIN_API_KEY):
        return "admin"
    if _matches(token, settings.OPERATOR_API_KEY):
        return "operator"
    return None


def access_identity(
    authorization: Optional[str],
    x_admin_key: Optional[str],
    db: Session,
) -> AuthIdentity | None:
    role = access_role(authorization, x_admin_key)
    if role:
        return AuthIdentity(role=role)
    return resolve_evaluator_session(db, bearer_token(authorization))


def require_identity(
    authorization: Optional[str] = Header(default=None),
    x_admin_key: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> AuthIdentity:
    if not settings.AUTH_REQUIRED:
        return AuthIdentity(role="development")
    identity = access_identity(authorization, x_admin_key, db)
    if not identity:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação obrigatória.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return identity


def require_operator(identity: AuthIdentity = Depends(require_identity)) -> str:
    if identity.role not in {"development", "evaluator", "operator", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso operacional obrigatório.",
        )
    return identity.role


def require_admin(identity: AuthIdentity = Depends(require_identity)) -> str:
    if identity.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Autorização administrativa obrigatória.",
        )
    return identity.role
