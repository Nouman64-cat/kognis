from datetime import UTC, datetime, timedelta

import jwt

from app.config import Settings


def create_admin_token(settings: Settings) -> str:
    if not settings.jwt_secret:
        raise RuntimeError("JWT_SECRET is not configured")
    now = datetime.now(UTC)
    exp = now + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": "admin",
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
