from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.config import Settings, get_settings
from app.deps import db_session
from app.models import AdminAuth, AdminOtp
from app.schemas import (
    AdminAuthStatusResponse,
    AdminLoginRequest,
    AdminSetPasswordRequest,
    AdminTokenResponse,
)
from app.services.auth_crypto import hash_secret, verify_secret
from app.services.jwt_tokens import create_admin_token

router = APIRouter()


@router.get("/auth/status", response_model=AdminAuthStatusResponse)
async def auth_status(session: AsyncSession = Depends(db_session)) -> AdminAuthStatusResponse:
    row = await session.get(AdminAuth, 1)
    has_pw = bool(row and row.password_hash)
    return AdminAuthStatusResponse(has_password=has_pw)


@router.post("/auth/login", response_model=AdminTokenResponse)
async def admin_login(
    body: AdminLoginRequest,
    session: AsyncSession = Depends(db_session),
    settings: Settings = Depends(get_settings),
) -> AdminTokenResponse:
    if not settings.jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT_SECRET is not configured on the server.",
        )
    row = await session.get(AdminAuth, 1)
    if not row or not row.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No password set yet. Use a one-time password on the set-password page first.",
        )
    if not verify_secret(body.password, row.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password.")
    token = create_admin_token(settings)
    return AdminTokenResponse(access_token=token)


@router.post("/auth/set-password")
async def admin_set_password(
    body: AdminSetPasswordRequest,
    session: AsyncSession = Depends(db_session),
) -> dict[str, str]:
    now = datetime.now(UTC)
    res = await session.execute(
        select(AdminOtp).where(AdminOtp.used_at.is_(None)).order_by(AdminOtp.id.desc())
    )
    rows = res.scalars().all()
    matched: AdminOtp | None = None
    for otp_row in rows:
        if otp_row.expires_at <= now:
            continue
        if verify_secret(body.otp, otp_row.token_hash):
            matched = otp_row
            break
    if matched is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired one-time password.",
        )

    row = await session.get(AdminAuth, 1)
    if row is None:
        row = AdminAuth(id=1, password_hash=hash_secret(body.new_password))
        session.add(row)
    else:
        row.password_hash = hash_secret(body.new_password)

    matched.used_at = now
    await session.commit()
    return {"detail": "Password saved. You can log in now."}
