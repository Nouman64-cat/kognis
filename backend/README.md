# Kognis backend

FastAPI + SQLModel + async PostgreSQL (asyncpg) + Alembic.

## Prerequisites

- Python 3.12+ (recommended)
- PostgreSQL with a database created (e.g. `kognis`)

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`: set `DATABASE_URL`, `JWT_SECRET` (random string for admin login tokens), at least one LLM key (`OPENAI_API_KEY` or `ANTHROPIC_API_KEY` per `LLM_PROVIDER`). Optional: `ADMIN_API_KEY` for legacy API access without JWT. If DB passwords contain special characters, URL-encode them in `DATABASE_URL`.

After migrations, create a **one-time password** and set your admin password:

```bash
python scripts/generate_admin_otp.py
```

Then use the frontend `/admin/set-password` (or the API) with that OTP and your new password, and log in at `/admin/login`.

## Database

```bash
alembic upgrade head
```

Run this from `backend/` whenever the schema changes or you use a new database.

## Run

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`

## Quick check

```bash
curl http://localhost:8000/health
```
