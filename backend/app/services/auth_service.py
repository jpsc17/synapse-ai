from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from sqlalchemy.orm import Session

from app.config import settings
from app.models import EvaluatorLoginAttemptModel, EvaluatorSessionModel


password_hasher = PasswordHasher()


class InvalidCredentialsError(Exception):
    pass


class LoginRateLimitError(Exception):
    def __init__(self, retry_after_seconds: int):
        super().__init__("Limite de tentativas de login excedido.")
        self.retry_after_seconds = max(1, retry_after_seconds)


@dataclass(frozen=True)
class AuthIdentity:
    role: str
    email: str | None = None
    expires_at: datetime | None = None
    session_token_hash: str | None = None


@dataclass(frozen=True)
class IssuedSession:
    token: str
    identity: AuthIdentity


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _login_key(email: str, client_host: str) -> str:
    normalized = f"{client_host.strip().lower()}:{email.strip().lower()}"
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _now() -> datetime:
    return datetime.utcnow()


def _rate_limit_record(db: Session, key_hash: str) -> EvaluatorLoginAttemptModel | None:
    return (
        db.query(EvaluatorLoginAttemptModel)
        .filter(EvaluatorLoginAttemptModel.key_hash == key_hash)
        .with_for_update()
        .first()
    )


def _assert_login_allowed(db: Session, key_hash: str, now: datetime) -> None:
    record = _rate_limit_record(db, key_hash)
    if not record:
        return
    if record.blocked_until and record.blocked_until > now:
        retry_after = int((record.blocked_until - now).total_seconds()) + 1
        raise LoginRateLimitError(retry_after)
    window = timedelta(seconds=max(1, settings.EVALUATOR_LOGIN_WINDOW_SECONDS))
    if record.window_started_at + window <= now:
        record.attempts = 0
        record.window_started_at = now
        record.blocked_until = None
        db.commit()


def _record_failed_login(db: Session, key_hash: str, now: datetime) -> None:
    record = _rate_limit_record(db, key_hash)
    window = timedelta(seconds=max(1, settings.EVALUATOR_LOGIN_WINDOW_SECONDS))
    if not record:
        record = EvaluatorLoginAttemptModel(
            key_hash=key_hash,
            attempts=0,
            window_started_at=now,
        )
        db.add(record)
    elif record.window_started_at + window <= now:
        record.attempts = 0
        record.window_started_at = now
        record.blocked_until = None

    record.attempts += 1
    if record.attempts >= max(1, settings.EVALUATOR_LOGIN_MAX_ATTEMPTS):
        record.blocked_until = now + window
    db.commit()
    if record.blocked_until and record.blocked_until > now:
        raise LoginRateLimitError(int(window.total_seconds()))


def _clear_login_attempts(db: Session, key_hash: str) -> None:
    db.query(EvaluatorLoginAttemptModel).filter(
        EvaluatorLoginAttemptModel.key_hash == key_hash
    ).delete(synchronize_session=False)
    db.commit()


def authenticate_evaluator(
    db: Session,
    email: str,
    password: str,
    client_host: str,
) -> IssuedSession:
    normalized_email = email.strip().lower()
    key_hash = _login_key(normalized_email, client_host)
    now = _now()
    _assert_login_allowed(db, key_hash, now)

    password_valid = False
    if settings.EVALUATOR_PASSWORD_HASH:
        try:
            password_valid = password_hasher.verify(settings.EVALUATOR_PASSWORD_HASH, password)
        except (InvalidHashError, VerificationError):
            password_valid = False

    email_valid = bool(
        normalized_email
        and settings.EVALUATOR_EMAIL
        and secrets.compare_digest(normalized_email, settings.EVALUATOR_EMAIL)
    )
    if not (email_valid and password_valid):
        _record_failed_login(db, key_hash, now)
        raise InvalidCredentialsError("Credenciais inválidas.")

    _clear_login_attempts(db, key_hash)
    token = secrets.token_urlsafe(32)
    token_hash = hash_session_token(token)
    expires_at = now + timedelta(minutes=max(1, settings.EVALUATOR_SESSION_TTL_MINUTES))
    db.add(EvaluatorSessionModel(
        token_hash=token_hash,
        email=normalized_email,
        role="evaluator",
        created_at=now,
        expires_at=expires_at,
    ))
    db.commit()
    return IssuedSession(
        token=token,
        identity=AuthIdentity(
            role="evaluator",
            email=normalized_email,
            expires_at=expires_at,
            session_token_hash=token_hash,
        ),
    )


def resolve_evaluator_session(db: Session, token: str) -> AuthIdentity | None:
    if not token:
        return None
    token_hash = hash_session_token(token)
    session = db.query(EvaluatorSessionModel).filter(
        EvaluatorSessionModel.token_hash == token_hash
    ).first()
    if not session or session.revoked_at is not None or session.expires_at <= _now():
        return None
    return AuthIdentity(
        role=session.role,
        email=session.email,
        expires_at=session.expires_at,
        session_token_hash=session.token_hash,
    )


def revoke_evaluator_session(db: Session, token: str) -> bool:
    if not token:
        return False
    session = db.query(EvaluatorSessionModel).filter(
        EvaluatorSessionModel.token_hash == hash_session_token(token),
        EvaluatorSessionModel.revoked_at.is_(None),
    ).first()
    if not session:
        return False
    session.revoked_at = _now()
    db.commit()
    return True
