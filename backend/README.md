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

Edit `.env`: set `DATABASE_URL`, at least one LLM key (`OPENAI_API_KEY` or `ANTHROPIC_API_KEY` per `LLM_PROVIDER`), and `ADMIN_API_KEY`. If passwords contain special characters, URL-encode them in `DATABASE_URL`.

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
