#!/usr/bin/env python3
"""Generate a one-time password for admin setup. Run from backend/ with venv activated:

    python scripts/generate_admin_otp.py

Prints the OTP once; store it securely, then use /admin/set-password in the app.
"""

from __future__ import annotations

import asyncio
import secrets
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

# Allow `python scripts/generate_admin_otp.py` from backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete
from sqlmodel import select

from app.database import AsyncSessionLocal
from app.models import AdminOtp
from app.services.auth_crypto import hash_secret


async def main() -> None:
    plain = secrets.token_urlsafe(24)
    token_hash = hash_secret(plain)
    expires = datetime.now(UTC) + timedelta(hours=24)

    async with AsyncSessionLocal() as session:
        await session.execute(delete(AdminOtp).where(AdminOtp.used_at.is_(None)))
        session.add(AdminOtp(token_hash=token_hash, expires_at=expires))
        await session.commit()

    print("One-time password (valid 24 hours; will not be shown again):")
    print(plain)


if __name__ == "__main__":
    asyncio.run(main())
