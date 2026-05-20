# ReCruItAI Slice 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn ReCruItAI's prototype into a real, multi-tenant, deployed product — persistent Supabase-backed data, real Supabase Auth, organization isolation via row-level security, and both apps live on Vercel — delivering the spec's Slice 1 happy path end to end (sign up → create org → invite teammate → post job → add candidate + resume → AI score → move pipeline stages, all surviving a restart).

**Architecture:** The Next.js frontend (`platform-web`) and the FastAPI backend (`backend`) deploy as two separate Vercel projects from one repo. The backend connects to Supabase Postgres through an async psycopg connection pool, verifies Supabase-issued JWTs against the project's JWKS endpoint, and persists everything through a thin `app/repositories/` SQL layer where every query is scoped by `organization_id`. Row-level security enforces org isolation as defense-in-depth. Resume files live in Supabase Storage, not on the (ephemeral) Vercel filesystem.

**Tech Stack:** FastAPI · psycopg 3 (async pool) · PyJWT · Supabase (Postgres + Auth + Storage) · Next.js 16 / React 19 / Tailwind CSS 4 / TypeScript · `@supabase/ssr` · pytest · Playwright · Vercel (Python Fluid Compute + Next.js).

---

## Phases

The plan is one slice executed in five phases. Each phase is committable and testable; later phases depend on earlier ones.

- **Phase A — Backend foundation & migrations.** Apply the 3 SQL migrations to Supabase; add the async psycopg pool, the Supabase config, and lifespan wiring.
- **Phase B — Auth bridge & storage.** JWKS-based Supabase JWT verification, the `Context` dependency, and the Supabase Storage wrapper for resume files.
- **Phase C — Repositories & endpoint refactor.** The `app/repositories/` SQL layer, every endpoint rewritten to persist and to scope by `ctx.org_id`. Tasks C10–C14 add the organization, invitation, member, and application endpoints the frontend needs.
- **Phase D — Frontend auth & data wiring.** `@supabase/ssr`, real signup/login/invite pages, the org switcher, live data on the jobs/candidates/settings pages, and Playwright tests. Tasks D19–D20 add the application + pipeline-stage UI.
- **Phase E — Deployment & E2E smoke-test.** Both apps deployed as two Vercel projects; the happy path verified on the public URLs.

---

## Plan corrections — read before executing

The phases were drafted in parallel; these cross-phase reconciliations take precedence over the individual task text.

1. **Dependencies & config are owned by Phase A.** Phase A Task A1 installs `pyjwt[crypto]` and Task A2 adds the Supabase settings fields. Phase B Tasks B1 and B2 do the same work. Execute A1/A2 normally; when you reach B1/B2, treat them as **verification only** — confirm `pyjwt` imports and the `SUPABASE_*` fields exist, then move on. Do not run a second `pip install` and do not add duplicate config lines. Use `pyjwt[crypto]>=2.8` as the single pinned spec. Keep one config test, `tests/test_config_settings.py` (from A2); do not create `tests/test_config_supabase.py`.

2. **`CORS_ORIGINS` must parse a comma-separated string.** On Vercel (Phase E) `CORS_ORIGINS` is supplied as a comma-separated env string, but it is a list-typed setting. As part of Task A2, add this validator to the `Settings` class in `app/core/config.py`:

   ```python
   from pydantic import field_validator
   # ... inside class Settings:
       @field_validator("CORS_ORIGINS", mode="before")
       @classmethod
       def _split_cors_origins(cls, v):
           if isinstance(v, str):
               return [o.strip() for o in v.split(",") if o.strip()]
           return v
   ```

3. **`Context` carries `email`.** Phase C's `GET /me` needs the user's email. The `Context` dataclass (Phase B) therefore has a 4th field, `email: str`. In `get_current_context`, build it with `email=claims.get("email", "")`. The Phase B `test_auth_context.py` field-set assertion must include `"email"`, and `Context(...)` calls in tests pass an `email=` value. `GET /me` then returns `ctx.email` directly (no `hasattr` guard needed).

4. **Slim Vercel requirements may need iteration (Phase E Task E3).** The backend's resume/interview services may import heavy ML libraries (`spacy`, `transformers`) at module load. If the Vercel build or first request fails with `ModuleNotFoundError`, either add the specific missing package to `requirements-vercel.txt` or make that import lazy. Budget one or two deploy iterations.

5. **Secrets never live in this plan or in git.** Real values — `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, the database password — are set only via `vercel env` (production) and the local, gitignored `backend/.env`. `SUPABASE_DB_URL` is already set locally (session pooler) and verified.

6. **Task numbering.** Tasks are grouped by phase letter. Phase C runs C1–C9 then C10–C14 (organization / invitation / member / application endpoints). Phase D runs D1–D18 then D19–D20 (application + pipeline-stage UI).

---

## Phase A — Backend foundation & migrations

This phase makes the FastAPI backend deployable against Supabase: it applies the 3 SQL migrations to the live Postgres database, adds the connection-pool dependency, wires an async `psycopg` pool with prepared statements disabled, and verifies the two already-merged backend fixes (lazy LLM init, debug-endpoint removal). All backend commands run from the `backend/` directory using `backend/venv/bin/python` and `backend/venv/bin/pytest`.

### Task A1: Add backend dependencies (psycopg pool, pyjwt, httpx)

**Files:**
- Modify: `backend/requirements.txt` (line 130 `psycopg[binary]>=3.2`, and `httpx==0.26.0` already present)

- [ ] **Step 1: Inspect current state of the three packages**
Run from repo root:
```bash
backend/venv/bin/pip list 2>/dev/null | grep -iE "psycopg|pyjwt|^jwt |httpx"
```
Expected output (httpx is already installed via FastAPI's transitive deps but not the pool/jwt packages):
```
NONE_OF_THOSE_INSTALLED
```
(`httpx==0.26.0` is pinned in `requirements.txt` line 49 already; only the pool and JWT packages are missing.)

- [ ] **Step 2: Update `backend/requirements.txt` — add the connection pool extra**
Replace the existing psycopg line. Find this exact line in `backend/requirements.txt`:
```
psycopg[binary]>=3.2
```
Replace it with:
```
psycopg[binary,pool]>=3.2
psycopg-pool>=3.2
pyjwt[crypto]>=2.8
```
(`psycopg[binary,pool]` pulls in `psycopg_pool`; the explicit `psycopg-pool>=3.2` line keeps it visible. `pyjwt[crypto]` is needed by the auth phase. `httpx==0.26.0` is already pinned — do not add it again.)

- [ ] **Step 3: Install the new dependencies into the venv**
Run from the `backend/` directory:
```bash
cd backend && venv/bin/pip install "psycopg[binary,pool]>=3.2" "psycopg-pool>=3.2" "pyjwt[crypto]>=2.8"
```
Expected: pip reports `Successfully installed psycopg-pool-3.x.x pyjwt-2.x.x` (and possibly `cffi`/`cryptography` already satisfied).

- [ ] **Step 4: Verify the new imports work**
Run from the `backend/` directory:
```bash
cd backend && venv/bin/python -c "import psycopg_pool, jwt; print('psycopg_pool', psycopg_pool.__version__); print('pyjwt', jwt.__version__)"
```
Expected output (versions may differ):
```
psycopg_pool 3.2.x
pyjwt 2.x.x
```

- [ ] **Step 5: Commit**
Run from repo root:
```bash
git add backend/requirements.txt
git commit -m "build(backend): add psycopg pool and pyjwt dependencies"
```

### Task A2: Add Supabase/LLM env vars to `Settings`

**Files:**
- Modify: `backend/app/core/config.py:43-55` (insert after `OPENROUTER_API_KEY`, and edit `CORS_ORIGINS`)
- Test: `backend/tests/test_config_settings.py` (create)

- [ ] **Step 1: Write a failing test for the new settings fields**
Create `backend/tests/test_config_settings.py` with this complete content:
```python
"""Settings must expose the Supabase/LLM env vars and not require them at boot."""

import importlib


def test_settings_has_supabase_fields(monkeypatch):
    for k in ["SUPABASE_URL", "SUPABASE_DB_URL", "SUPABASE_SERVICE_ROLE_KEY",
              "OPENROUTER_API_KEY", "CORS_ORIGINS"]:
        monkeypatch.delenv(k, raising=False)
    import app.core.config as config
    importlib.reload(config)
    s = config.Settings()
    # New fields exist and are optional (None when env unset)
    assert s.SUPABASE_URL is None
    assert s.SUPABASE_DB_URL is None
    assert s.SUPABASE_SERVICE_ROLE_KEY is None
    assert s.OPENROUTER_API_KEY is None
    # CORS includes the deployed frontend domain
    assert "https://recruitai-test.vercel.app" in s.CORS_ORIGINS


def test_settings_reads_supabase_url_from_env(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://redgbugvyoidjwhovmxa.supabase.co")
    import app.core.config as config
    importlib.reload(config)
    s = config.Settings()
    assert s.SUPABASE_URL == "https://redgbugvyoidjwhovmxa.supabase.co"


def test_cors_origins_parses_comma_separated_string(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://a.example.com, https://b.example.com")
    import app.core.config as config
    importlib.reload(config)
    s = config.Settings()
    assert s.CORS_ORIGINS == ["https://a.example.com", "https://b.example.com"]
```

- [ ] **Step 2: Run the test and confirm it FAILS**
Run from the `backend/` directory:
```bash
cd backend && venv/bin/pytest tests/test_config_settings.py -q
```
Expected: FAIL with `AttributeError: 'Settings' object has no attribute 'SUPABASE_URL'`.

- [ ] **Step 3: Add the three Supabase env vars to `Settings`**
In `backend/app/core/config.py`, find this line (line 43):
```python
    OPENROUTER_API_KEY: Optional[str] = Field(default=None, env="OPENROUTER_API_KEY")
```
Insert directly after it:
```python

    # Supabase (loaded from environment; none required at boot)
    SUPABASE_URL: Optional[str] = Field(default=None, env="SUPABASE_URL")
    SUPABASE_DB_URL: Optional[str] = Field(default=None, env="SUPABASE_DB_URL")
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = Field(default=None, env="SUPABASE_SERVICE_ROLE_KEY")
```

- [ ] **Step 4: Update `CORS_ORIGINS` to include the deployed frontend and parse comma-separated strings**
In `backend/app/core/config.py`, find this line (line 55):
```python
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5173"]
```
Replace it with:
```python
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://recruitai-test.vercel.app",
    ]
```
Then ensure `field_validator` is imported — find the existing pydantic import near the top of the file (e.g. `from pydantic import Field` or `from pydantic_settings import BaseSettings`) and add `field_validator`:
```python
from pydantic import Field, field_validator
```
Then add this validator method inside the `Settings` class (place it after the field declarations, before any other method):
```python
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _split_cors_origins(cls, v):
        """Allow CORS_ORIGINS to be supplied as a comma-separated env string."""
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v
```

- [ ] **Step 5: Run the test and confirm it PASSES**
Run from the `backend/` directory:
```bash
cd backend && venv/bin/pytest tests/test_config_settings.py -q
```
Expected: `3 passed`.

- [ ] **Step 6: Commit**
Run from repo root:
```bash
git add backend/app/core/config.py backend/tests/test_config_settings.py
git commit -m "feat(backend): add Supabase env vars and CORS parsing to Settings"
```

### Task A3: Create `app/db.py` — async psycopg pool + `db_conn()`

**Files:**
- Create: `backend/app/db.py`
- Test: `backend/tests/test_db_pool.py` (create)

- [ ] **Step 1: Write a failing test that opens the pool and runs `select 1`**
Create `backend/tests/test_db_pool.py` with this complete content:
```python
"""The async psycopg pool must open, hand out a connection, and run select 1.

Requires SUPABASE_DB_URL in the environment (loaded from backend/.env).
"""

import os

import pytest

pytestmark = pytest.mark.asyncio


@pytest.mark.skipif(
    not os.environ.get("SUPABASE_DB_URL"),
    reason="SUPABASE_DB_URL not set",
)
async def test_pool_runs_select_one():
    from app.db import open_pool, close_pool, db_conn

    await open_pool()
    try:
        async with db_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute("select 1")
                row = await cur.fetchone()
                assert row == (1,)
    finally:
        await close_pool()


@pytest.mark.skipif(
    not os.environ.get("SUPABASE_DB_URL"),
    reason="SUPABASE_DB_URL not set",
)
async def test_prepared_statements_disabled():
    """The configure callback must disable prepared statements for the pooler."""
    from app.db import open_pool, close_pool, db_conn

    await open_pool()
    try:
        async with db_conn() as conn:
            assert conn.prepare_threshold is None
    finally:
        await close_pool()
```

- [ ] **Step 2: Run the test and confirm it FAILS**
Run from the `backend/` directory (load `.env` so `SUPABASE_DB_URL` is present):
```bash
cd backend && set -a && . ./.env && set +a && venv/bin/pytest tests/test_db_pool.py -q
```
Expected: FAIL with `ModuleNotFoundError: No module named 'app.db'`.

- [ ] **Step 3: Create `backend/app/db.py`**
Write `backend/app/db.py` with this complete content:
```python
"""Async psycopg connection pool to Supabase Postgres.

The pool is opened in the FastAPI lifespan handler (app/main.py) and closed
on shutdown. Prepared statements are disabled (prepare_threshold = None)
because production runs behind the Supabase transaction pooler, which does
not keep a stable session and breaks server-side prepared statements.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

from psycopg import AsyncConnection
from psycopg_pool import AsyncConnectionPool

from app.core.config import settings

logger = logging.getLogger(__name__)

# Module-level pool. Created lazily by open_pool(); None until then.
pool: Optional[AsyncConnectionPool] = None


async def _configure(conn: AsyncConnection) -> None:
    """Per-connection setup. Disables prepared statements so the pool is safe
    behind the Supabase transaction pooler."""
    conn.prepare_threshold = None


async def open_pool() -> None:
    """Open the module-level connection pool. Idempotent — safe to call once
    from the FastAPI lifespan startup."""
    global pool
    if pool is not None:
        return
    if not settings.SUPABASE_DB_URL:
        raise RuntimeError(
            "SUPABASE_DB_URL is not set; cannot open the database pool."
        )
    pool = AsyncConnectionPool(
        conninfo=settings.SUPABASE_DB_URL,
        min_size=1,
        max_size=10,
        open=False,
        configure=_configure,
        kwargs={"autocommit": True},
    )
    await pool.open(wait=True, timeout=15.0)
    logger.info("Database pool opened (max_size=10)")


async def close_pool() -> None:
    """Close the module-level connection pool. Idempotent."""
    global pool
    if pool is None:
        return
    await pool.close()
    pool = None
    logger.info("Database pool closed")


@asynccontextmanager
async def db_conn() -> AsyncIterator[AsyncConnection]:
    """Acquire a connection from the pool for the duration of the block.

    Usage:
        async with db_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute("select 1")
    """
    if pool is None:
        raise RuntimeError(
            "Database pool is not open; call open_pool() in the app lifespan."
        )
    async with pool.connection() as conn:
        yield conn
```

- [ ] **Step 4: Run the test and confirm it PASSES**
Run from the `backend/` directory:
```bash
cd backend && set -a && . ./.env && set +a && venv/bin/pytest tests/test_db_pool.py -q
```
Expected: `2 passed`. If `SUPABASE_DB_URL` were missing the tests would `skip` instead — passing confirms the live session-pooler connection works.

- [ ] **Step 5: Commit**
Run from repo root:
```bash
git add backend/app/db.py backend/tests/test_db_pool.py
git commit -m "feat(backend): add async psycopg pool with db_conn helper"
```

### Task A4: Wire the pool into the FastAPI lifespan

**Files:**
- Modify: `backend/app/main.py:23-36` (lifespan handler)
- Test: `backend/tests/test_boot.py` (existing — must still pass unchanged)

- [ ] **Step 1: Confirm the existing boot test still passes before the change**
Run from the `backend/` directory:
```bash
cd backend && venv/bin/pytest tests/test_boot.py -q
```
Expected: `1 passed` (`test_backend_imports_without_llm_keys`). This is the baseline — the lifespan edit must not break it.

- [ ] **Step 2: Edit the lifespan handler in `app/main.py`**
In `backend/app/main.py`, replace the entire `lifespan` function (lines 23-36):
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # Ensure upload directory exists
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(f"Upload directory: {settings.UPLOAD_DIR}")

    yield

    # Shutdown
    logger.info("Shutting down application")
```
with:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # Ensure upload directory exists
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(f"Upload directory: {settings.UPLOAD_DIR}")

    # Open the database pool if SUPABASE_DB_URL is configured.
    # The app must still boot cleanly when it is not (e.g. CI without DB).
    if settings.SUPABASE_DB_URL:
        try:
            await open_pool()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Database pool not opened at startup: %s", exc)
    else:
        logger.info("SUPABASE_DB_URL not set; database pool not opened")

    yield

    # Shutdown
    await close_pool()
    logger.info("Shutting down application")
```

- [ ] **Step 3: Add the `app.db` import to `app/main.py`**
In `backend/app/main.py`, find this line (line 13):
```python
from app.api.v1 import router as api_router
```
Insert directly after it:
```python
from app.db import open_pool, close_pool
```

- [ ] **Step 4: Run the boot test and confirm it still PASSES**
Run from the `backend/` directory with no `.env` loaded (simulates a no-DB boot):
```bash
cd backend && venv/bin/pytest tests/test_boot.py tests/test_db_pool.py -q
```
Expected: `test_boot.py` `1 passed`; `test_db_pool.py` `2 skipped` (no `SUPABASE_DB_URL` in env). The app imports and boots without a database.

- [ ] **Step 5: Commit**
Run from repo root:
```bash
git add backend/app/main.py
git commit -m "feat(backend): open and close the db pool in the FastAPI lifespan"
```

### Task A5: Apply the 3 SQL migrations and verify the live schema

**Files:**
- Run: `backend/scripts/apply_migrations.py` (existing — no edits)
- Read first: `supabase/migrations/001_foundation_schema.sql`, `002_rls_policies.sql`, `003_storage_bucket.sql`

- [ ] **Step 1: Confirm `SUPABASE_DB_URL` is the session pooler (port 5432)**
Run from the `backend/` directory:
```bash
cd backend && set -a && . ./.env && set +a && python3 -c "import os,urllib.parse as u; p=u.urlparse(os.environ['SUPABASE_DB_URL']); print('scheme', p.scheme); print('port', p.port)"
```
Expected output:
```
scheme postgresql
port 5432
```
The migration applicator must use the **session pooler** (port 5432), not the transaction pooler (6543). If `scheme` is not `postgresql` or `port` is `6543`, stop and fix `backend/.env` before continuing.

- [ ] **Step 2: Apply the migrations**
Run from the `backend/` directory:
```bash
cd backend && set -a && . ./.env && set +a && venv/bin/python scripts/apply_migrations.py
```
Expected output (ends with):
```
--- Applying 001_foundation_schema.sql (6600 bytes) ---
OK: 001_foundation_schema.sql

--- Applying 002_rls_policies.sql (3616 bytes) ---
OK: 002_rls_policies.sql

--- Applying 003_storage_bucket.sql (1207 bytes) ---
OK: 003_storage_bucket.sql

=== Final public-schema tables (10) ===
  - applications
  - candidates
  - interview_reports
  - interview_sessions
  - invitations
  - jobs
  - organization_members
  - organizations
  - resume_analyses
  - resumes

All 10 foundation tables present.
```
The script exits `0` on success. The migrations are idempotent (`if not exists` / `do $$` guards), so re-running is safe if it partially fails.

- [ ] **Step 3: Verify RLS is enabled on all 10 tables**
Run from the `backend/` directory:
```bash
cd backend && set -a && . ./.env && set +a && venv/bin/python -c "
import os, psycopg
with psycopg.connect(os.environ['SUPABASE_DB_URL']) as c, c.cursor() as cur:
    cur.execute(\"select relname, relrowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r' order by relname\")
    rows = cur.fetchall()
    for name, rls in rows:
        print(name, 'RLS' if rls else 'NO-RLS')
    assert all(rls for _, rls in rows), 'some tables missing RLS'
    print('OK: RLS enabled on all', len(rows), 'tables')
"
```
Expected: every table prints `RLS` and the final line is `OK: RLS enabled on all 10 tables`.

- [ ] **Step 4: Verify the `resumes` storage bucket exists**
Run from the `backend/` directory:
```bash
cd backend && set -a && . ./.env && set +a && venv/bin/python -c "
import os, psycopg
with psycopg.connect(os.environ['SUPABASE_DB_URL']) as c, c.cursor() as cur:
    cur.execute(\"select id, public from storage.buckets where id='resumes'\")
    row = cur.fetchone()
    assert row is not None, 'resumes bucket not found'
    assert row[1] is False, 'resumes bucket must be private'
    print('OK: resumes bucket exists and is private')
"
```
Expected: `OK: resumes bucket exists and is private`.

- [ ] **Step 5: Commit a record of the applied migration run**
No source files changed (the applicator already exists). Confirm the working tree is clean for migrations:
```bash
git status --short --branch --untracked-files=all
```
Expected: no changes under `supabase/` or `backend/scripts/`. If `git status` is clean, skip the commit for this task — the migration state lives in the database, not the repo. No commit is required for Task A5.

### Task A6: Verify the LLM lazy-init and removed debug endpoint

**Files:**
- Read/verify: `backend/app/services/llm/service.py:74-86`
- Read/verify: `backend/app/api/v1/endpoints/interview.py`

- [ ] **Step 1: Verify the LLM provider is lazy-initialized**
Read `backend/app/services/llm/service.py`. Confirm the `provider` property (lines 74-86) defers `_create_provider` to first access — the code is:
```python
    @property
    def provider(self) -> BaseLLMProvider:
        if self._provider is None:
            self._provider = self._create_provider(self.provider_name, self.provider_config)
        return self._provider
```
Commit `8043c26` ("fix(backend): lazy-init LLM provider so boot succeeds without API keys") already implemented this. **Do not change the file** — it is already correct. If, and only if, `_create_provider` is instead called inside `__init__`, move it into the `provider` property exactly as shown above.

- [ ] **Step 2: Confirm the lazy-init holds with a no-keys boot**
Run from the `backend/` directory with all LLM keys unset:
```bash
cd backend && env -u OPENAI_API_KEY -u OPENROUTER_API_KEY -u GOOGLE_API_KEY -u ANTHROPIC_API_KEY -u GROQ_API_KEY venv/bin/python -c "
from app.services.llm.service import LLMService
s = LLMService()
print('LLMService constructed without keys:', s._provider is None)
assert s._provider is None, 'provider was eagerly created'
print('OK: provider is lazy')
"
```
Expected output:
```
LLMService constructed without keys: True
OK: provider is lazy
```

- [ ] **Step 3: Verify the debug `inject_resume` endpoint is gone**
Run from the `backend/` directory:
```bash
cd backend && grep -rn "inject_resume\|debug/inject" app/api/v1/endpoints/interview.py || echo "OK: inject_resume endpoint not present"
```
Expected output:
```
OK: inject_resume endpoint not present
```
Commit `e95adc3` ("security(backend): remove unauthenticated /interview/debug/inject_resume endpoint") already removed it. **No edit needed.** If `grep` instead returns matching lines, delete the entire `@router.post("/interview/debug/inject_resume")` route function and any helper it uses, then re-run the grep to confirm it is clean.

- [ ] **Step 4: Run the full backend suite to confirm nothing regressed**
Run from the `backend/` directory:
```bash
cd backend && venv/bin/pytest tests/test_boot.py tests/test_llm_providers.py tests/test_config_settings.py -q
```
Expected: all tests `passed` (no failures). This confirms the lazy-init and config changes hold together.

- [ ] **Step 5: Commit**
Steps 1-3 are verification-only and likely produce no file changes. Confirm:
```bash
git status --short
```
If the working tree is clean, no commit is needed for Task A6 — record in the PR description that `8043c26` and `e95adc3` were verified intact. If Step 1 or Step 3 required an edit, commit it:
```bash
git add backend/app/services/llm/service.py backend/app/api/v1/endpoints/interview.py
git commit -m "fix(backend): restore LLM lazy-init and remove debug endpoint"
```

---

## Phase B — Auth bridge & storage

This phase builds the trust boundary between the Supabase-managed frontend and the FastAPI backend: a JWKS-verified JWT bridge that resolves every request to a `Context(user_id, org_id, role)`, plus the Supabase Storage wrapper that replaces local-disk resume writes. Other phases import `app.auth.supabase.Context`, `get_current_context`, and `app.storage.upload_resume`/`download_resume`.

> **Plan correction (read header section "Plan corrections"):** Tasks B1 and B2 below duplicate Phase A Tasks A1 and A2. When executing, treat B1/B2 as verification-only — do not re-install or re-add config. Also, the `Context` dataclass gains a 4th field `email: str` (correction 3): add it to the dataclass in Task B3, set it in `get_current_context` in Task B5 via `email=claims.get("email", "")`, and include `"email"` in the Task B3 field-set assertion.

### Task B1: Add `pyjwt[crypto]` dependency

The contract assumes `pyjwt[crypto]` is installed, but it is not present in `backend/venv` or `requirements.txt`. Install it and pin it before any auth code can import `jwt`. (If Phase A Task A1 already did this, this task is verification-only.)

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Install `pyjwt[crypto]` into the venv**

Run from `backend/`:
```bash
backend/venv/bin/python -m pip install "pyjwt[crypto]>=2.8"
```
Expected output ends with:
```
Successfully installed pyjwt-2.x.x
```
(`cryptography` is already present, so it will be reported as already satisfied.)

- [ ] **Step 2: Verify the import works**

```bash
backend/venv/bin/python -c "import jwt; from jwt import PyJWKClient; print('PyJWT', jwt.__version__)"
```
Expected output:
```
PyJWT 2.x.x
```

- [ ] **Step 3: Pin it in `requirements.txt`**

Confirm `pyjwt[crypto]>=2.8` is present in `backend/requirements.txt` (Phase A Task A1 adds it). If it is missing, add the line `pyjwt[crypto]>=2.8`.

- [ ] **Step 4: Commit (only if requirements.txt changed)**

```bash
cd /home/pratap/work/ReCruItAI && git add backend/requirements.txt && git commit -m "build(backend): add pyjwt[crypto] for Supabase JWT verification" || echo "nothing to commit"
```

### Task B2: Confirm Supabase config fields on `Settings`

`app/core/config.py` needs `SUPABASE_URL`, `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Phase A Task A2 adds these. This task verifies they are present (it is verification-only when A2 is done).

**Files:**
- Verify: `backend/app/core/config.py`

- [ ] **Step 1: Verify the fields exist**

```bash
cd backend && venv/bin/python -c "
from app.core.config import Settings
s = Settings()
assert hasattr(s, 'SUPABASE_URL')
assert hasattr(s, 'SUPABASE_DB_URL')
assert hasattr(s, 'SUPABASE_SERVICE_ROLE_KEY')
print('OK: Supabase settings present')
"
```
Expected: `OK: Supabase settings present`. If this fails, Phase A Task A2 has not run — complete A2 first.

### Task B3: Create the `app/auth` package and `Context` dataclass

Establish the `app.auth` package and the locked `Context` contract that every endpoint in later phases will receive via dependency injection.

**Files:**
- Create: `backend/app/auth/__init__.py`
- Create: `backend/app/auth/supabase.py`
- Test: `backend/tests/test_auth_context.py`

- [ ] **Step 1: Write a failing test for the `Context` dataclass**

Create `backend/tests/test_auth_context.py`:
```python
"""Context is the locked shared contract returned by get_current_context."""

import dataclasses

import pytest


def test_context_is_frozen_dataclass_with_four_fields():
    from app.auth.supabase import Context

    assert dataclasses.is_dataclass(Context)
    field_names = {f.name for f in dataclasses.fields(Context)}
    assert field_names == {"user_id", "org_id", "role", "email"}

    ctx = Context(user_id="u-1", org_id="o-1", role="owner", email="u@example.com")
    assert ctx.user_id == "u-1"
    assert ctx.org_id == "o-1"
    assert ctx.role == "owner"
    assert ctx.email == "u@example.com"

    # frozen: assignment must raise.
    with pytest.raises(dataclasses.FrozenInstanceError):
        ctx.user_id = "u-2"
```

- [ ] **Step 2: Run the test and confirm it FAILS**

```bash
cd backend && venv/bin/pytest tests/test_auth_context.py -q
```
Expected: FAIL with `ModuleNotFoundError: No module named 'app.auth'`.

- [ ] **Step 3: Create the empty package marker**

Create `backend/app/auth/__init__.py` with exactly:
```python
"""Authentication bridge between Supabase-issued JWTs and FastAPI."""
```

- [ ] **Step 4: Create `app/auth/supabase.py` with the `Context` dataclass only**

Create `backend/app/auth/supabase.py`:
```python
"""Supabase JWT verification bridge.

Verifies a Supabase-issued JWT against the project's JWKS endpoint, then
resolves the caller to a Context(user_id, org_id, role, email) using the
organization_members table.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Context:
    """The authenticated request context handed to every protected endpoint.

    Attributes:
        user_id: Supabase auth.users UUID (the JWT `sub` claim).
        org_id: The active organization UUID for this request.
        role: The caller's org_role value within that organization.
        email: The caller's email (from the JWT `email` claim).
    """

    user_id: str
    org_id: str
    role: str
    email: str
```

- [ ] **Step 5: Run the test and confirm it PASSES**

```bash
cd backend && venv/bin/pytest tests/test_auth_context.py -q
```
Expected: `1 passed`.

- [ ] **Step 6: Commit**

```bash
cd /home/pratap/work/ReCruItAI && git add backend/app/auth/__init__.py backend/app/auth/supabase.py backend/tests/test_auth_context.py && git commit -m "feat(auth): add app.auth package and frozen Context dataclass"
```

### Task B4: JWKS fetch + cache and JWT verification

Add the cached JWKS fetch and a pure JWT-verification function. This is decoded JWT logic only — no FastAPI request handling yet, which keeps it testable with minted tokens.

**Files:**
- Modify: `backend/app/auth/supabase.py`
- Test: `backend/tests/test_auth_jwt.py`

- [ ] **Step 1: Write failing tests for JWT verification**

Create `backend/tests/test_auth_jwt.py`:
```python
"""JWT verification: valid token decodes; expired/wrong-issuer/garbage -> 401."""

import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException

SUPABASE_URL = "https://redgbugvyoidjwhovmxa.supabase.co"
ISSUER = f"{SUPABASE_URL}/auth/v1"
KID = "test-key-1"


@pytest.fixture(scope="module")
def rsa_keypair():
    """A local RSA keypair used to mint and verify test JWTs."""
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def jwks(rsa_keypair):
    """The public half of the keypair as a JWKS dict, as Supabase would serve it."""
    public_numbers = rsa_keypair.public_key().public_numbers()

    def _b64uint(n: int) -> str:
        import base64

        raw = n.to_bytes((n.bit_length() + 7) // 8, "big")
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")

    return {
        "keys": [
            {
                "kty": "RSA",
                "use": "sig",
                "alg": "RS256",
                "kid": KID,
                "n": _b64uint(public_numbers.n),
                "e": _b64uint(public_numbers.e),
            }
        ]
    }


def _mint(rsa_keypair, *, issuer=ISSUER, aud="authenticated", exp_delta=3600, sub="user-uuid-1"):
    now = int(time.time())
    payload = {
        "sub": sub,
        "aud": aud,
        "iss": issuer,
        "iat": now,
        "exp": now + exp_delta,
        "email": "candidate@example.com",
    }
    return jwt.encode(payload, rsa_keypair, algorithm="RS256", headers={"kid": KID})


@pytest.fixture(autouse=True)
def _patch_jwks(monkeypatch, jwks):
    """Replace the network JWKS fetch with the local test JWKS."""
    from app.auth import supabase as mod

    monkeypatch.setattr(mod, "_get_jwks", lambda: jwks)
    monkeypatch.setattr(mod.settings, "SUPABASE_URL", SUPABASE_URL)
    yield


@pytest.mark.asyncio
async def test_valid_token_decodes(rsa_keypair):
    from app.auth.supabase import verify_jwt

    claims = await verify_jwt(_mint(rsa_keypair))
    assert claims["sub"] == "user-uuid-1"
    assert claims["aud"] == "authenticated"


@pytest.mark.asyncio
async def test_expired_token_raises_401(rsa_keypair):
    from app.auth.supabase import verify_jwt

    with pytest.raises(HTTPException) as exc:
        await verify_jwt(_mint(rsa_keypair, exp_delta=-3600))
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_wrong_issuer_raises_401(rsa_keypair):
    from app.auth.supabase import verify_jwt

    with pytest.raises(HTTPException) as exc:
        await verify_jwt(_mint(rsa_keypair, issuer="https://evil.example.com/auth/v1"))
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_wrong_audience_raises_401(rsa_keypair):
    from app.auth.supabase import verify_jwt

    with pytest.raises(HTTPException) as exc:
        await verify_jwt(_mint(rsa_keypair, aud="anon"))
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_garbage_token_raises_401():
    from app.auth.supabase import verify_jwt

    with pytest.raises(HTTPException) as exc:
        await verify_jwt("not.a.jwt")
    assert exc.value.status_code == 401
```

- [ ] **Step 2: Run the tests and confirm they FAIL**

```bash
cd backend && venv/bin/pytest tests/test_auth_jwt.py -q
```
Expected: FAIL with `ImportError: cannot import name 'verify_jwt' from 'app.auth.supabase'`.

- [ ] **Step 3: Add the JWKS fetch/cache and `verify_jwt` to `app/auth/supabase.py`**

Replace the entire contents of `backend/app/auth/supabase.py` with:
```python
"""Supabase JWT verification bridge.

Verifies a Supabase-issued JWT against the project's JWKS endpoint, then
resolves the caller to a Context(user_id, org_id, role, email) using the
organization_members table.
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
from fastapi import HTTPException
from jwt.algorithms import RSAAlgorithm

from app.core.config import settings


@dataclass(frozen=True)
class Context:
    """The authenticated request context handed to every protected endpoint.

    Attributes:
        user_id: Supabase auth.users UUID (the JWT `sub` claim).
        org_id: The active organization UUID for this request.
        role: The caller's org_role value within that organization.
        email: The caller's email (from the JWT `email` claim).
    """

    user_id: str
    org_id: str
    role: str
    email: str


# --- JWKS fetch + in-process cache -----------------------------------------

_JWKS_TTL_SECONDS = 3600
_jwks_lock = threading.Lock()
_jwks_cache: dict[str, Any] = {"data": None, "fetched_at": 0.0}


def _jwks_url() -> str:
    """The Supabase JWKS endpoint, derived from SUPABASE_URL."""
    if not settings.SUPABASE_URL:
        raise HTTPException(status_code=503, detail="SUPABASE_URL is not configured")
    base = settings.SUPABASE_URL.rstrip("/")
    return f"{base}/auth/v1/.well-known/jwks.json"


def _get_jwks() -> dict[str, Any]:
    """Return the cached JWKS, fetching it once per TTL window."""
    now = time.time()
    cached = _jwks_cache["data"]
    if cached is not None and (now - _jwks_cache["fetched_at"]) < _JWKS_TTL_SECONDS:
        return cached
    with _jwks_lock:
        cached = _jwks_cache["data"]
        if cached is not None and (now - _jwks_cache["fetched_at"]) < _JWKS_TTL_SECONDS:
            return cached
        resp = httpx.get(_jwks_url(), timeout=10.0)
        resp.raise_for_status()
        data = resp.json()
        _jwks_cache["data"] = data
        _jwks_cache["fetched_at"] = time.time()
        return data


def _signing_key_for(token: str) -> Any:
    """Resolve the RSA public key matching the token's `kid` header."""
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token header") from exc
    kid = header.get("kid")
    jwks = _get_jwks()
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return RSAAlgorithm.from_jwk(key)
    raise HTTPException(status_code=401, detail="No matching signing key")


async def verify_jwt(token: str) -> dict[str, Any]:
    """Verify a Supabase JWT and return its claims.

    Raises HTTPException(401) for any missing, expired, wrong-issuer,
    wrong-audience, or otherwise invalid token.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    base = (settings.SUPABASE_URL or "").rstrip("/")
    issuer = f"{base}/auth/v1"
    signing_key = _signing_key_for(token)
    try:
        claims = jwt.decode(
            token,
            key=signing_key,
            algorithms=["RS256", "ES256"],
            audience="authenticated",
            issuer=issuer,
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token has expired") from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc
    return claims
```

- [ ] **Step 4: Run the tests and confirm they PASS**

```bash
cd backend && venv/bin/pytest tests/test_auth_jwt.py -q
```
Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
cd /home/pratap/work/ReCruItAI && git add backend/app/auth/supabase.py backend/tests/test_auth_jwt.py && git commit -m "feat(auth): JWKS fetch/cache and Supabase JWT verification"
```

### Task B5: Org resolution and the `get_current_context` dependency

Add the FastAPI dependency that reads the `Authorization` and `X-Organization-Id` headers, verifies the JWT, and resolves the active org against `organization_members` using `db_conn()`.

**Files:**
- Modify: `backend/app/auth/supabase.py`
- Test: `backend/tests/test_get_current_context.py`

- [ ] **Step 1: Write failing tests for `get_current_context`**

Create `backend/tests/test_get_current_context.py`:
```python
"""get_current_context: resolves Context, 401 on bad token, 403 on non-membership."""

import time
from contextlib import asynccontextmanager

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException

SUPABASE_URL = "https://redgbugvyoidjwhovmxa.supabase.co"
ISSUER = f"{SUPABASE_URL}/auth/v1"
KID = "test-key-1"

USER_A = "11111111-1111-1111-1111-111111111111"
ORG_1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
ORG_2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


@pytest.fixture(scope="module")
def rsa_keypair():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def jwks(rsa_keypair):
    import base64

    pub = rsa_keypair.public_key().public_numbers()

    def _b64uint(n: int) -> str:
        raw = n.to_bytes((n.bit_length() + 7) // 8, "big")
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")

    return {
        "keys": [
            {
                "kty": "RSA",
                "use": "sig",
                "alg": "RS256",
                "kid": KID,
                "n": _b64uint(pub.n),
                "e": _b64uint(pub.e),
            }
        ]
    }


def _mint(rsa_keypair, *, sub=USER_A):
    now = int(time.time())
    return jwt.encode(
        {
            "sub": sub,
            "aud": "authenticated",
            "iss": ISSUER,
            "iat": now,
            "exp": now + 3600,
            "email": "user-a@example.com",
        },
        rsa_keypair,
        algorithm="RS256",
        headers={"kid": KID},
    )


class _FakeCursor:
    """Minimal async cursor that returns a scripted membership row set."""

    def __init__(self, rows):
        self._rows = rows
        self._result = None

    async def execute(self, sql, params=None):
        if params and len(params) == 2:
            org_id = params[1]
            self._result = [r for r in self._rows if r[0] == org_id]
        else:
            self._result = list(self._rows)

    async def fetchone(self):
        return self._result[0] if self._result else None


class _FakeConn:
    def __init__(self, rows):
        self._rows = rows

    def cursor(self):
        rows = self._rows

        @asynccontextmanager
        async def _cm():
            yield _FakeCursor(rows)

        return _cm()


def _fake_db_conn(rows):
    @asynccontextmanager
    async def _cm():
        yield _FakeConn(rows)

    return _cm


@pytest.fixture(autouse=True)
def _patch(monkeypatch, jwks):
    from app.auth import supabase as mod

    monkeypatch.setattr(mod, "_get_jwks", lambda: jwks)
    monkeypatch.setattr(mod.settings, "SUPABASE_URL", SUPABASE_URL)
    yield


@pytest.mark.asyncio
async def test_valid_token_resolves_context(monkeypatch, rsa_keypair):
    from app.auth import supabase as mod

    monkeypatch.setattr(mod, "db_conn", _fake_db_conn([(ORG_1, "recruiter")]))
    ctx = await mod.get_current_context(
        authorization=f"Bearer {_mint(rsa_keypair)}",
        x_organization_id=None,
    )
    assert ctx.user_id == USER_A
    assert ctx.org_id == ORG_1
    assert ctx.role == "recruiter"
    assert ctx.email == "user-a@example.com"


@pytest.mark.asyncio
async def test_explicit_org_header_selects_that_org(monkeypatch, rsa_keypair):
    from app.auth import supabase as mod

    monkeypatch.setattr(
        mod, "db_conn", _fake_db_conn([(ORG_1, "recruiter"), (ORG_2, "admin")])
    )
    ctx = await mod.get_current_context(
        authorization=f"Bearer {_mint(rsa_keypair)}",
        x_organization_id=ORG_2,
    )
    assert ctx.org_id == ORG_2
    assert ctx.role == "admin"


@pytest.mark.asyncio
async def test_missing_authorization_raises_401(monkeypatch, rsa_keypair):
    from app.auth import supabase as mod

    monkeypatch.setattr(mod, "db_conn", _fake_db_conn([(ORG_1, "recruiter")]))
    with pytest.raises(HTTPException) as exc:
        await mod.get_current_context(authorization=None, x_organization_id=None)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_garbage_token_raises_401(monkeypatch):
    from app.auth import supabase as mod

    monkeypatch.setattr(mod, "db_conn", _fake_db_conn([(ORG_1, "recruiter")]))
    with pytest.raises(HTTPException) as exc:
        await mod.get_current_context(
            authorization="Bearer not.a.jwt", x_organization_id=None
        )
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_user_with_no_membership_raises_403(monkeypatch, rsa_keypair):
    from app.auth import supabase as mod

    monkeypatch.setattr(mod, "db_conn", _fake_db_conn([]))
    with pytest.raises(HTTPException) as exc:
        await mod.get_current_context(
            authorization=f"Bearer {_mint(rsa_keypair)}", x_organization_id=None
        )
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_requesting_org_user_not_in_raises_403(monkeypatch, rsa_keypair):
    from app.auth import supabase as mod

    monkeypatch.setattr(mod, "db_conn", _fake_db_conn([(ORG_1, "recruiter")]))
    with pytest.raises(HTTPException) as exc:
        await mod.get_current_context(
            authorization=f"Bearer {_mint(rsa_keypair)}", x_organization_id=ORG_2
        )
    assert exc.value.status_code == 403
```

- [ ] **Step 2: Run the tests and confirm they FAIL**

```bash
cd backend && venv/bin/pytest tests/test_get_current_context.py -q
```
Expected: FAIL with `AttributeError: module 'app.auth.supabase' has no attribute 'db_conn'` (or `get_current_context`).

- [ ] **Step 3: Add org resolution and the dependency to `app/auth/supabase.py`**

In `backend/app/auth/supabase.py`, change the typing import line to `from typing import Any, Optional`, and append the following at the end of the file:
```python
from fastapi import Header  # noqa: E402  (grouped with auth imports)

from app.db import db_conn  # noqa: E402


async def _resolve_org(user_id: str, requested_org_id: Optional[str]) -> tuple[str, str]:
    """Resolve the active organization for a user.

    If requested_org_id is given, confirm the user has an organization_members
    row for it. Otherwise fall back to the user's first membership.

    Returns (org_id, role). Raises HTTPException(403) if the user has no
    membership, or no membership in the requested org.
    """
    async with db_conn() as conn:
        async with conn.cursor() as cur:
            if requested_org_id:
                await cur.execute(
                    "select organization_id, role from organization_members "
                    "where user_id = %s and organization_id = %s",
                    (user_id, requested_org_id),
                )
                row = await cur.fetchone()
                if row is None:
                    raise HTTPException(
                        status_code=403,
                        detail="Not a member of the requested organization",
                    )
                return str(row[0]), str(row[1])

            await cur.execute(
                "select organization_id, role from organization_members "
                "where user_id = %s order by created_at asc limit 1",
                (user_id,),
            )
            row = await cur.fetchone()
            if row is None:
                raise HTTPException(
                    status_code=403, detail="User has no organization membership"
                )
            return str(row[0]), str(row[1])


async def get_current_context(
    authorization: Optional[str] = Header(default=None),
    x_organization_id: Optional[str] = Header(default=None),
) -> Context:
    """FastAPI dependency: verify the Supabase JWT and resolve the active org.

    Reads the `Authorization: Bearer <jwt>` header and the optional
    `X-Organization-Id` header. Returns a Context(user_id, org_id, role, email).

    Raises HTTPException(401) for missing/expired/invalid tokens and
    HTTPException(403) if the user is not a member of the requested org.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401, detail="Missing or malformed Authorization header"
        )
    token = authorization.split(" ", 1)[1].strip()
    claims = await verify_jwt(token)
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject claim")
    org_id, role = await _resolve_org(user_id, x_organization_id)
    return Context(
        user_id=str(user_id),
        org_id=org_id,
        role=role,
        email=claims.get("email", ""),
    )
```

- [ ] **Step 4: Run the tests and confirm they PASS**

```bash
cd backend && venv/bin/pytest tests/test_get_current_context.py tests/test_auth_jwt.py tests/test_auth_context.py -q
```
Expected: `12 passed`.

- [ ] **Step 5: Commit**

```bash
cd /home/pratap/work/ReCruItAI && git add backend/app/auth/supabase.py backend/tests/test_get_current_context.py && git commit -m "feat(auth): get_current_context dependency with org resolution"
```

> Note: `app/db.py` and its `db_conn()` are delivered by Phase A. The tests above monkeypatch `db_conn`, so they pass in isolation. Run the full auth suite again after Phase A lands.

### Task B6: Supabase Storage wrapper (`app/storage.py`)

Add the storage module that uploads and downloads resume bytes against the private `resumes` bucket using the service-role key, via the Supabase Storage REST API (no extra SDK dependency — uses `httpx`, already installed).

**Files:**
- Create: `backend/app/storage.py`
- Test: `backend/tests/test_storage.py`

- [ ] **Step 1: Write failing tests for storage path construction and the round-trip**

Create `backend/tests/test_storage.py`:
```python
"""Supabase Storage wrapper: path construction (unit) + round-trip (integration)."""

import os

import pytest

ORG = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
CAND = "cccccccc-cccc-cccc-cccc-cccccccccccc"


def test_storage_path_builder():
    from app.storage import _storage_path

    assert _storage_path(ORG, CAND, "resume.pdf") == f"{ORG}/{CAND}/resume.pdf"


def test_storage_path_strips_unsafe_filename():
    from app.storage import _storage_path

    assert _storage_path(ORG, CAND, "../../etc/passwd") == f"{ORG}/{CAND}/passwd"


@pytest.mark.asyncio
@pytest.mark.skipif(
    not os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or not os.environ.get("SUPABASE_URL"),
    reason="requires SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL",
)
async def test_upload_then_download_round_trips_bytes():
    import uuid

    from app.storage import download_resume, upload_resume

    candidate_id = str(uuid.uuid4())
    payload = b"%PDF-1.4 round-trip test bytes"
    storage_path = await upload_resume(
        org_id=ORG,
        candidate_id=candidate_id,
        file_name="roundtrip.pdf",
        data=payload,
        content_type="application/pdf",
    )
    assert storage_path == f"{ORG}/{candidate_id}/roundtrip.pdf"

    fetched = await download_resume(storage_path)
    assert fetched == payload
```

- [ ] **Step 2: Run the tests and confirm they FAIL**

```bash
cd backend && venv/bin/pytest tests/test_storage.py -q
```
Expected: FAIL with `ModuleNotFoundError: No module named 'app.storage'`. (The round-trip test is skipped when the env vars are unset — that is intended.)

- [ ] **Step 3: Create `app/storage.py`**

Create `backend/app/storage.py`:
```python
"""Supabase Storage wrapper for resume files.

Uploads/downloads bytes in the private `resumes` bucket using the
service-role key. Object path is always `{org_id}/{candidate_id}/{file_name}`,
so storage policies can scope access by organization.
"""

from __future__ import annotations

import os
from pathlib import PurePosixPath

import httpx

from app.core.config import settings

_BUCKET = "resumes"


def _require(name: str) -> str:
    """Return a required Supabase setting or raise a clean error."""
    value = getattr(settings, name, None) or os.environ.get(name)
    if not value:
        raise RuntimeError(f"{name} is not configured; Supabase Storage unavailable")
    return value


def _storage_path(org_id: str, candidate_id: str, file_name: str) -> str:
    """Build the object key `{org_id}/{candidate_id}/{file_name}`.

    The file name is reduced to its basename so a caller cannot use path
    separators to escape the org/candidate prefix.
    """
    safe_name = PurePosixPath(file_name).name or "file"
    return f"{org_id}/{candidate_id}/{safe_name}"


def _object_url(storage_path: str) -> str:
    base = _require("SUPABASE_URL").rstrip("/")
    return f"{base}/storage/v1/object/{_BUCKET}/{storage_path}"


def _headers() -> dict[str, str]:
    key = _require("SUPABASE_SERVICE_ROLE_KEY")
    return {"Authorization": f"Bearer {key}", "apikey": key}


async def upload_resume(
    org_id: str,
    candidate_id: str,
    file_name: str,
    data: bytes,
    content_type: str,
) -> str:
    """Upload resume bytes to the `resumes` bucket; return the storage_path.

    Uploads to `{org_id}/{candidate_id}/{file_name}`. Overwrites any existing
    object at that path (`x-upsert: true`).
    """
    storage_path = _storage_path(org_id, candidate_id, file_name)
    headers = {
        **_headers(),
        "Content-Type": content_type or "application/octet-stream",
        "x-upsert": "true",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(_object_url(storage_path), headers=headers, content=data)
    if resp.status_code not in (200, 201):
        raise RuntimeError(
            f"Supabase Storage upload failed ({resp.status_code}): {resp.text}"
        )
    return storage_path


async def download_resume(storage_path: str) -> bytes:
    """Download the bytes of a resume object by its storage_path."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(_object_url(storage_path), headers=_headers())
    if resp.status_code != 200:
        raise RuntimeError(
            f"Supabase Storage download failed ({resp.status_code}): {resp.text}"
        )
    return resp.content
```

- [ ] **Step 4: Run the tests and confirm they PASS (round-trip skipped)**

```bash
cd backend && venv/bin/pytest tests/test_storage.py -q
```
Expected: `2 passed, 1 skipped`. The skip reason is `requires SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL`.

- [ ] **Step 5: Run the round-trip integration test against real Supabase (optional verification)**

Only when the `resumes` bucket exists (delivered by Phase A migrations) and `SUPABASE_SERVICE_ROLE_KEY` is in `backend/.env`. From `backend/`:
```bash
set -a && . ./.env && set +a && venv/bin/pytest tests/test_storage.py::test_upload_then_download_round_trips_bytes -q
```
Expected: `1 passed`.

- [ ] **Step 6: Commit**

```bash
cd /home/pratap/work/ReCruItAI && git add backend/app/storage.py backend/tests/test_storage.py && git commit -m "feat(storage): Supabase Storage wrapper for resume upload/download"
```

### Task B7: Verify the full auth + storage suite and the no-keys boot path

Confirm the whole phase passes together and that the new modules do not break the existing fresh-boot guarantee in `tests/test_boot.py`.

**Files:**
- Test: the Phase B test files plus `backend/tests/test_boot.py`

- [ ] **Step 1: Run the complete Phase B suite plus the boot test**

```bash
cd backend && venv/bin/pytest tests/test_auth_context.py tests/test_auth_jwt.py tests/test_get_current_context.py tests/test_storage.py tests/test_config_settings.py tests/test_boot.py -q
```
Expected: all tests pass (the storage round-trip remains skipped without env vars; `test_boot.py` still passes — no `SUPABASE_*` key is required at import time).

- [ ] **Step 2: Confirm `app.auth.supabase` and `app.storage` import with no env set**

```bash
cd backend && env -u SUPABASE_URL -u SUPABASE_DB_URL -u SUPABASE_SERVICE_ROLE_KEY -u OPENROUTER_API_KEY venv/bin/python -c "import app.storage; from app.auth.supabase import Context, get_current_context; print('boot OK')"
```
Expected output: `boot OK`.

- [ ] **Step 3: Commit (suite confirmation only)**

If Step 1 surfaced any fix, commit it. Otherwise this task adds no new files:
```bash
cd /home/pratap/work/ReCruItAI && git status --short --branch
```
Expected: clean working tree. No commit needed if clean.

---

## Phase C — Repositories & endpoint refactor

This phase introduces the SQL data-access layer (`app/repositories/`) and rewrites every API endpoint to persist through Supabase Postgres instead of in-memory dicts, scoping every read and write to the caller's organization. It depends on the shared contracts from earlier phases: `app/db.py` (`db_conn`), `app/auth/supabase.py` (`Context`, `get_current_context`), and `app/storage.py` (`upload_resume`, `download_resume`).

> **Run all commands from `/home/pratap/work/ReCruItAI/backend/`.** Use `venv/bin/python` and `venv/bin/pytest`. Tests in this phase require a live Supabase Postgres reachable via `SUPABASE_DB_URL` (the same session-pooler string the migration applicator uses, with the 3 migrations already applied). If `SUPABASE_DB_URL` is unset, the repository tests skip cleanly (see Task C8's conftest).

---

### Task C1: Add a `dict_row` row-factory helper and the repositories package

**Files:**
- Create: `app/repositories/__init__.py`
- Create: `app/repositories/_common.py`

The repository functions return `dict` rows. psycopg's default returns tuples, so we set a `dict_row` row factory on every cursor. `_common.py` centralizes that and one tiny helper.

- [ ] **Step 1: Create the repositories package marker**

Create `app/repositories/__init__.py`:

```python
"""SQL data-access layer. Pure SQL, no business logic.

Every function takes `conn: AsyncConnection` first and `org_id: str` second,
and filters/sets `organization_id = %(org_id)s` on every statement.
"""
```

- [ ] **Step 2: Create the shared cursor helper**

Create `app/repositories/_common.py`:

```python
"""Shared helpers for repository modules."""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from psycopg import AsyncConnection
from psycopg.rows import dict_row
from psycopg import AsyncCursor


@asynccontextmanager
async def dict_cursor(conn: AsyncConnection) -> AsyncIterator[AsyncCursor]:
    """Yield a cursor whose rows come back as plain dicts."""
    cur = conn.cursor(row_factory=dict_row)
    try:
        yield cur
    finally:
        await cur.close()
```

- [ ] **Step 3: Verify it imports**

```bash
venv/bin/python -c "from app.repositories._common import dict_cursor; print('ok')"
```
Expected output: `ok`

- [ ] **Step 4: Commit**

```bash
git add app/repositories/__init__.py app/repositories/_common.py
git commit -m "feat(repositories): add repositories package and dict_cursor helper"
```

---

### Task C2: Jobs and candidates repositories

**Files:**
- Create: `app/repositories/jobs.py`
- Create: `app/repositories/candidates.py`
- Test: `backend/tests/test_repo_jobs_candidates.py`

- [ ] **Step 1: Write a failing CRUD round-trip test for jobs**

Create `backend/tests/test_repo_jobs_candidates.py`:

```python
"""CRUD round-trip tests for the jobs and candidates repositories."""
import pytest

from app.db import db_conn
from app.repositories import jobs as jobs_repo
from app.repositories import candidates as candidates_repo

pytestmark = pytest.mark.asyncio


async def test_jobs_crud_round_trip(seed_org_a):
    org_id = seed_org_a["org_id"]
    user_id = seed_org_a["user_id"]
    async with db_conn() as conn:
        created = await jobs_repo.create_job(
            conn, org_id, created_by=user_id,
            data={
                "title": "Backend Engineer",
                "department": "Engineering",
                "location": "Remote",
                "employment_type": "Full-time",
                "salary_min": 120000,
                "salary_max": 160000,
                "currency": "USD",
                "description": "Build APIs.",
                "requirements": ["Python", "FastAPI"],
                "status": "open",
            },
        )
        assert created["title"] == "Backend Engineer"
        job_id = created["id"]

        fetched = await jobs_repo.get_job(conn, org_id, job_id)
        assert fetched is not None
        assert fetched["id"] == job_id

        listed = await jobs_repo.list_jobs(conn, org_id)
        assert any(j["id"] == job_id for j in listed)

        updated = await jobs_repo.update_job(
            conn, org_id, job_id, data={"status": "paused", "title": "Senior Backend Engineer"}
        )
        assert updated is not None
        assert updated["status"] == "paused"
        assert updated["title"] == "Senior Backend Engineer"


async def test_candidates_crud_round_trip(seed_org_a):
    org_id = seed_org_a["org_id"]
    async with db_conn() as conn:
        created = await candidates_repo.create_candidate(
            conn, org_id,
            data={
                "full_name": "Ada Lovelace",
                "email": "ada@example.com",
                "phone": "+1-555-0100",
                "current_role": "Engineer",
                "current_company": "Analytical Engines",
                "source": "manual",
            },
        )
        assert created["full_name"] == "Ada Lovelace"
        candidate_id = created["id"]

        fetched = await candidates_repo.get_candidate(conn, org_id, candidate_id)
        assert fetched is not None and fetched["id"] == candidate_id

        listed = await candidates_repo.list_candidates(conn, org_id)
        assert any(c["id"] == candidate_id for c in listed)

        updated = await candidates_repo.update_candidate(
            conn, org_id, candidate_id, data={"current_role": "Staff Engineer"}
        )
        assert updated is not None and updated["current_role"] == "Staff Engineer"
```

- [ ] **Step 2: Run the test and confirm it FAILS**

```bash
venv/bin/pytest tests/test_repo_jobs_candidates.py -q
```
Expected: collection error / failure — `ModuleNotFoundError: No module named 'app.repositories.jobs'` (and `seed_org_a` fixture not found, added in Task C8). This confirms the test runs and the repo modules do not yet exist.

- [ ] **Step 3: Implement the jobs repository**

Create `app/repositories/jobs.py`:

```python
"""SQL data-access for the `jobs` table."""
from __future__ import annotations

from psycopg import AsyncConnection

from app.repositories._common import dict_cursor

_COLUMNS = (
    "id, organization_id, title, department, location, employment_type, "
    "salary_min, salary_max, currency, description, requirements, status, "
    "created_by, created_at, updated_at"
)


async def list_jobs(conn: AsyncConnection, org_id: str) -> list[dict]:
    async with dict_cursor(conn) as cur:
        await cur.execute(
            f"select {_COLUMNS} from jobs "
            "where organization_id = %(org_id)s order by created_at desc",
            {"org_id": org_id},
        )
        return await cur.fetchall()


async def get_job(conn: AsyncConnection, org_id: str, job_id: str) -> dict | None:
    async with dict_cursor(conn) as cur:
        await cur.execute(
            f"select {_COLUMNS} from jobs "
            "where organization_id = %(org_id)s and id = %(job_id)s",
            {"org_id": org_id, "job_id": job_id},
        )
        return await cur.fetchone()


async def create_job(
    conn: AsyncConnection, org_id: str, created_by: str | None, data: dict
) -> dict:
    async with dict_cursor(conn) as cur:
        await cur.execute(
            "insert into jobs (organization_id, title, department, location, "
            "employment_type, salary_min, salary_max, currency, description, "
            "requirements, status, created_by) values (%(org_id)s, %(title)s, "
            "%(department)s, %(location)s, %(employment_type)s, %(salary_min)s, "
            "%(salary_max)s, %(currency)s, %(description)s, %(requirements)s, "
            "%(status)s, %(created_by)s) "
            f"returning {_COLUMNS}",
            {
                "org_id": org_id,
                "title": data["title"],
                "department": data.get("department"),
                "location": data.get("location"),
                "employment_type": data.get("employment_type", "Full-time"),
                "salary_min": data.get("salary_min"),
                "salary_max": data.get("salary_max"),
                "currency": data.get("currency", "USD"),
                "description": data.get("description", ""),
                "requirements": data.get("requirements", []),
                "status": data.get("status", "open"),
                "created_by": created_by,
            },
        )
        row = await cur.fetchone()
        assert row is not None
        return row


async def update_job(
    conn: AsyncConnection, org_id: str, job_id: str, data: dict
) -> dict | None:
    allowed = (
        "title", "department", "location", "employment_type", "salary_min",
        "salary_max", "currency", "description", "requirements", "status",
    )
    fields = {k: v for k, v in data.items() if k in allowed}
    if not fields:
        return await get_job(conn, org_id, job_id)
    set_clause = ", ".join(f"{k} = %({k})s" for k in fields)
    params = {**fields, "org_id": org_id, "job_id": job_id}
    async with dict_cursor(conn) as cur:
        await cur.execute(
            f"update jobs set {set_clause}, updated_at = now() "
            "where organization_id = %(org_id)s and id = %(job_id)s "
            f"returning {_COLUMNS}",
            params,
        )
        return await cur.fetchone()
```

- [ ] **Step 4: Implement the candidates repository**

Create `app/repositories/candidates.py`:

```python
"""SQL data-access for the `candidates` table."""
from __future__ import annotations

from psycopg import AsyncConnection

from app.repositories._common import dict_cursor

_COLUMNS = (
    "id, organization_id, full_name, email, phone, current_role, "
    "current_company, source, created_at"
)


async def list_candidates(conn: AsyncConnection, org_id: str) -> list[dict]:
    async with dict_cursor(conn) as cur:
        await cur.execute(
            f"select {_COLUMNS} from candidates "
            "where organization_id = %(org_id)s order by created_at desc",
            {"org_id": org_id},
        )
        return await cur.fetchall()


async def get_candidate(
    conn: AsyncConnection, org_id: str, candidate_id: str
) -> dict | None:
    async with dict_cursor(conn) as cur:
        await cur.execute(
            f"select {_COLUMNS} from candidates "
            "where organization_id = %(org_id)s and id = %(candidate_id)s",
            {"org_id": org_id, "candidate_id": candidate_id},
        )
        return await cur.fetchone()


async def create_candidate(
    conn: AsyncConnection, org_id: str, data: dict
) -> dict:
    async with dict_cursor(conn) as cur:
        await cur.execute(
            "insert into candidates (organization_id, full_name, email, phone, "
            "current_role, current_company, source) values (%(org_id)s, "
            "%(full_name)s, %(email)s, %(phone)s, %(current_role)s, "
            "%(current_company)s, %(source)s) "
            f"returning {_COLUMNS}",
            {
                "org_id": org_id,
                "full_name": data["full_name"],
                "email": data["email"],
                "phone": data.get("phone"),
                "current_role": data.get("current_role"),
                "current_company": data.get("current_company"),
                "source": data.get("source", "manual"),
            },
        )
        row = await cur.fetchone()
        assert row is not None
        return row


async def update_candidate(
    conn: AsyncConnection, org_id: str, candidate_id: str, data: dict
) -> dict | None:
    allowed = (
        "full_name", "email", "phone", "current_role", "current_company", "source",
    )
    fields = {k: v for k, v in data.items() if k in allowed}
    if not fields:
        return await get_candidate(conn, org_id, candidate_id)
    set_clause = ", ".join(f"{k} = %({k})s" for k in fields)
    params = {**fields, "org_id": org_id, "candidate_id": candidate_id}
    async with dict_cursor(conn) as cur:
        await cur.execute(
            f"update candidates set {set_clause} "
            "where organization_id = %(org_id)s and id = %(candidate_id)s "
            f"returning {_COLUMNS}",
            params,
        )
        return await cur.fetchone()
```

- [ ] **Step 5: Run the test and confirm both CRUD round-trips PASS**

```bash
venv/bin/pytest tests/test_repo_jobs_candidates.py -q
```
Expected: `2 passed` (or `2 skipped` if `SUPABASE_DB_URL` is unset — the conftest from Task C8 gates the DB fixtures).

- [ ] **Step 6: Commit**

```bash
git add app/repositories/jobs.py app/repositories/candidates.py tests/test_repo_jobs_candidates.py
git commit -m "feat(repositories): add jobs and candidates repositories with CRUD tests"
```

---

### Task C3: Applications and resumes repositories

**Files:**
- Create: `app/repositories/applications.py`
- Create: `app/repositories/resumes.py`
- Test: `backend/tests/test_repo_applications_resumes.py`

- [ ] **Step 1: Write a failing CRUD round-trip test**

Create `backend/tests/test_repo_applications_resumes.py`:

```python
"""CRUD round-trip tests for the applications and resumes repositories."""
import pytest

from app.db import db_conn
from app.repositories import jobs as jobs_repo
from app.repositories import candidates as candidates_repo
from app.repositories import applications as applications_repo
from app.repositories import resumes as resumes_repo

pytestmark = pytest.mark.asyncio


async def test_applications_crud_round_trip(seed_org_a):
    org_id = seed_org_a["org_id"]
    user_id = seed_org_a["user_id"]
    async with db_conn() as conn:
        job = await jobs_repo.create_job(
            conn, org_id, created_by=user_id,
            data={"title": "QA Engineer", "description": "Test things."},
        )
        candidate = await candidates_repo.create_candidate(
            conn, org_id,
            data={"full_name": "Grace Hopper", "email": "grace@example.com"},
        )
        created = await applications_repo.create_application(
            conn, org_id,
            data={
                "candidate_id": candidate["id"],
                "job_id": job["id"],
                "stage": "new",
                "owner_id": user_id,
            },
        )
        assert created["stage"] == "new"
        app_id = created["id"]

        fetched = await applications_repo.get_application(conn, org_id, app_id)
        assert fetched is not None and fetched["id"] == app_id

        listed = await applications_repo.list_applications(conn, org_id)
        assert any(a["id"] == app_id for a in listed)

        by_job = await applications_repo.list_applications(conn, org_id, job_id=job["id"])
        assert all(a["job_id"] == job["id"] for a in by_job)

        updated = await applications_repo.update_application(
            conn, org_id, app_id,
            data={"stage": "screening", "ai_score": 88.5, "recommendation": "Hire"},
        )
        assert updated is not None
        assert updated["stage"] == "screening"
        assert float(updated["ai_score"]) == 88.5


async def test_resumes_crud_round_trip(seed_org_a):
    org_id = seed_org_a["org_id"]
    async with db_conn() as conn:
        candidate = await candidates_repo.create_candidate(
            conn, org_id,
            data={"full_name": "Alan Turing", "email": "alan@example.com"},
        )
        created = await resumes_repo.create_resume(
            conn, org_id,
            data={
                "candidate_id": candidate["id"],
                "storage_path": f"{org_id}/{candidate['id']}/cv.pdf",
                "file_name": "cv.pdf",
                "mime_type": "application/pdf",
                "byte_size": 4096,
            },
        )
        assert created["file_name"] == "cv.pdf"
        resume_id = created["id"]

        fetched = await resumes_repo.get_resume(conn, org_id, resume_id)
        assert fetched is not None and fetched["id"] == resume_id

        listed = await resumes_repo.list_resumes(conn, org_id)
        assert any(r["id"] == resume_id for r in listed)
```

- [ ] **Step 2: Run the test and confirm it FAILS**

```bash
venv/bin/pytest tests/test_repo_applications_resumes.py -q
```
Expected: `ModuleNotFoundError: No module named 'app.repositories.applications'`.

- [ ] **Step 3: Implement the applications repository**

Create `app/repositories/applications.py`:

```python
"""SQL data-access for the `applications` table."""
from __future__ import annotations

from psycopg import AsyncConnection

from app.repositories._common import dict_cursor

_COLUMNS = (
    "id, organization_id, candidate_id, job_id, stage, ai_score, "
    "recommendation, owner_id, created_at, updated_at"
)


async def list_applications(
    conn: AsyncConnection, org_id: str, job_id: str | None = None
) -> list[dict]:
    sql = (
        f"select {_COLUMNS} from applications "
        "where organization_id = %(org_id)s"
    )
    params: dict = {"org_id": org_id}
    if job_id is not None:
        sql += " and job_id = %(job_id)s"
        params["job_id"] = job_id
    sql += " order by created_at desc"
    async with dict_cursor(conn) as cur:
        await cur.execute(sql, params)
        return await cur.fetchall()


async def get_application(
    conn: AsyncConnection, org_id: str, application_id: str
) -> dict | None:
    async with dict_cursor(conn) as cur:
        await cur.execute(
            f"select {_COLUMNS} from applications "
            "where organization_id = %(org_id)s and id = %(application_id)s",
            {"org_id": org_id, "application_id": application_id},
        )
        return await cur.fetchone()


async def create_application(
    conn: AsyncConnection, org_id: str, data: dict
) -> dict:
    async with dict_cursor(conn) as cur:
        await cur.execute(
            "insert into applications (organization_id, candidate_id, job_id, "
            "stage, ai_score, recommendation, owner_id) values (%(org_id)s, "
            "%(candidate_id)s, %(job_id)s, %(stage)s, %(ai_score)s, "
            "%(recommendation)s, %(owner_id)s) "
            f"returning {_COLUMNS}",
            {
                "org_id": org_id,
                "candidate_id": data["candidate_id"],
                "job_id": data["job_id"],
                "stage": data.get("stage", "new"),
                "ai_score": data.get("ai_score"),
                "recommendation": data.get("recommendation"),
                "owner_id": data.get("owner_id"),
            },
        )
        row = await cur.fetchone()
        assert row is not None
        return row


async def update_application(
    conn: AsyncConnection, org_id: str, application_id: str, data: dict
) -> dict | None:
    allowed = ("stage", "ai_score", "recommendation", "owner_id")
    fields = {k: v for k, v in data.items() if k in allowed}
    if not fields:
        return await get_application(conn, org_id, application_id)
    set_clause = ", ".join(f"{k} = %({k})s" for k in fields)
    params = {**fields, "org_id": org_id, "application_id": application_id}
    async with dict_cursor(conn) as cur:
        await cur.execute(
            f"update applications set {set_clause}, updated_at = now() "
            "where organization_id = %(org_id)s and id = %(application_id)s "
            f"returning {_COLUMNS}",
            params,
        )
        return await cur.fetchone()
```

- [ ] **Step 4: Implement the resumes repository**

Create `app/repositories/resumes.py`:

```python
"""SQL data-access for the `resumes` table."""
from __future__ import annotations

from psycopg import AsyncConnection

from app.repositories._common import dict_cursor

_COLUMNS = (
    "id, organization_id, candidate_id, storage_path, file_name, "
    "mime_type, byte_size, uploaded_at"
)


async def list_resumes(
    conn: AsyncConnection, org_id: str, candidate_id: str | None = None
) -> list[dict]:
    sql = (
        f"select {_COLUMNS} from resumes "
        "where organization_id = %(org_id)s"
    )
    params: dict = {"org_id": org_id}
    if candidate_id is not None:
        sql += " and candidate_id = %(candidate_id)s"
        params["candidate_id"] = candidate_id
    sql += " order by uploaded_at desc"
    async with dict_cursor(conn) as cur:
        await cur.execute(sql, params)
        return await cur.fetchall()


async def get_resume(
    conn: AsyncConnection, org_id: str, resume_id: str
) -> dict | None:
    async with dict_cursor(conn) as cur:
        await cur.execute(
            f"select {_COLUMNS} from resumes "
            "where organization_id = %(org_id)s and id = %(resume_id)s",
            {"org_id": org_id, "resume_id": resume_id},
        )
        return await cur.fetchone()


async def create_resume(
    conn: AsyncConnection, org_id: str, data: dict
) -> dict:
    async with dict_cursor(conn) as cur:
        await cur.execute(
            "insert into resumes (organization_id, candidate_id, storage_path, "
            "file_name, mime_type, byte_size) values (%(org_id)s, "
            "%(candidate_id)s, %(storage_path)s, %(file_name)s, %(mime_type)s, "
            "%(byte_size)s) "
            f"returning {_COLUMNS}",
            {
                "org_id": org_id,
                "candidate_id": data.get("candidate_id"),
                "storage_path": data["storage_path"],
                "file_name": data["file_name"],
                "mime_type": data["mime_type"],
                "byte_size": data["byte_size"],
            },
        )
        row = await cur.fetchone()
        assert row is not None
        return row


async def delete_resume(
    conn: AsyncConnection, org_id: str, resume_id: str
) -> dict | None:
    """Delete and return the deleted row, or None if not in this org."""
    async with dict_cursor(conn) as cur:
        await cur.execute(
            "delete from resumes "
            "where organization_id = %(org_id)s and id = %(resume_id)s "
            f"returning {_COLUMNS}",
            {"org_id": org_id, "resume_id": resume_id},
        )
        return await cur.fetchone()
```

- [ ] **Step 5: Run the test and confirm both CRUD round-trips PASS**

```bash
venv/bin/pytest tests/test_repo_applications_resumes.py -q
```
Expected: `2 passed` (or `2 skipped` without `SUPABASE_DB_URL`).

- [ ] **Step 6: Commit**

```bash
git add app/repositories/applications.py app/repositories/resumes.py tests/test_repo_applications_resumes.py
git commit -m "feat(repositories): add applications and resumes repositories with CRUD tests"
```

---

### Task C4: Analyses and sessions repositories

**Files:**
- Create: `app/repositories/analyses.py`
- Create: `app/repositories/sessions.py`
- Test: `backend/tests/test_repo_analyses_sessions.py`

`analyses.py` covers the `resume_analyses` table; `sessions.py` covers the `interview_sessions` table.

- [ ] **Step 1: Write a failing CRUD round-trip test**

Create `backend/tests/test_repo_analyses_sessions.py`:

```python
"""CRUD round-trip tests for the analyses and sessions repositories."""
import pytest

from app.db import db_conn
from app.repositories import candidates as candidates_repo
from app.repositories import resumes as resumes_repo
from app.repositories import analyses as analyses_repo
from app.repositories import sessions as sessions_repo

pytestmark = pytest.mark.asyncio


async def test_analyses_crud_round_trip(seed_org_a):
    org_id = seed_org_a["org_id"]
    async with db_conn() as conn:
        candidate = await candidates_repo.create_candidate(
            conn, org_id, data={"full_name": "Edsger D.", "email": "ed@example.com"},
        )
        resume = await resumes_repo.create_resume(
            conn, org_id,
            data={
                "candidate_id": candidate["id"],
                "storage_path": f"{org_id}/{candidate['id']}/cv.pdf",
                "file_name": "cv.pdf",
                "mime_type": "application/pdf",
                "byte_size": 2048,
            },
        )
        created = await analyses_repo.create_analysis(
            conn, org_id,
            data={
                "resume_id": resume["id"],
                "job_id": None,
                "overall_score": 91.0,
                "ats_score": 84.0,
                "breakdown": {"clarity": 9},
                "red_flags": ["gap"],
                "skills_found": ["Python"],
                "skills_missing": ["Go"],
            },
        )
        assert float(created["overall_score"]) == 91.0
        analysis_id = created["id"]

        fetched = await analyses_repo.get_analysis(conn, org_id, analysis_id)
        assert fetched is not None and fetched["id"] == analysis_id

        listed = await analyses_repo.list_analyses(conn, org_id, resume_id=resume["id"])
        assert any(a["id"] == analysis_id for a in listed)


async def test_sessions_crud_round_trip(seed_org_a):
    org_id = seed_org_a["org_id"]
    async with db_conn() as conn:
        candidate = await candidates_repo.create_candidate(
            conn, org_id, data={"full_name": "Barbara L.", "email": "barb@example.com"},
        )
        created = await sessions_repo.create_session(
            conn, org_id,
            data={"candidate_id": candidate["id"], "job_id": None, "mode": "voice"},
        )
        assert created["status"] == "created"
        session_id = created["id"]

        fetched = await sessions_repo.get_session(conn, org_id, session_id)
        assert fetched is not None and fetched["id"] == session_id

        updated = await sessions_repo.update_session(
            conn, org_id, session_id,
            data={
                "status": "completed",
                "transcript": [{"q": "hi", "a": "hello"}],
                "scores": {"overall": 80},
            },
        )
        assert updated is not None and updated["status"] == "completed"

        listed = await sessions_repo.list_sessions(conn, org_id)
        assert any(s["id"] == session_id for s in listed)
```

- [ ] **Step 2: Run the test and confirm it FAILS**

```bash
venv/bin/pytest tests/test_repo_analyses_sessions.py -q
```
Expected: `ModuleNotFoundError: No module named 'app.repositories.analyses'`.

- [ ] **Step 3: Implement the analyses repository**

`breakdown` and `red_flags` are `jsonb`; psycopg cannot adapt a Python `dict`/`list` to `jsonb` directly, so wrap them with `psycopg.types.json.Jsonb`.

Create `app/repositories/analyses.py`:

```python
"""SQL data-access for the `resume_analyses` table."""
from __future__ import annotations

from psycopg import AsyncConnection
from psycopg.types.json import Jsonb

from app.repositories._common import dict_cursor

_COLUMNS = (
    "id, organization_id, resume_id, job_id, overall_score, ats_score, "
    "breakdown, red_flags, skills_found, skills_missing, created_at"
)


async def list_analyses(
    conn: AsyncConnection, org_id: str, resume_id: str | None = None
) -> list[dict]:
    sql = (
        f"select {_COLUMNS} from resume_analyses "
        "where organization_id = %(org_id)s"
    )
    params: dict = {"org_id": org_id}
    if resume_id is not None:
        sql += " and resume_id = %(resume_id)s"
        params["resume_id"] = resume_id
    sql += " order by created_at desc"
    async with dict_cursor(conn) as cur:
        await cur.execute(sql, params)
        return await cur.fetchall()


async def get_analysis(
    conn: AsyncConnection, org_id: str, analysis_id: str
) -> dict | None:
    async with dict_cursor(conn) as cur:
        await cur.execute(
            f"select {_COLUMNS} from resume_analyses "
            "where organization_id = %(org_id)s and id = %(analysis_id)s",
            {"org_id": org_id, "analysis_id": analysis_id},
        )
        return await cur.fetchone()


async def create_analysis(
    conn: AsyncConnection, org_id: str, data: dict
) -> dict:
    async with dict_cursor(conn) as cur:
        await cur.execute(
            "insert into resume_analyses (organization_id, resume_id, job_id, "
            "overall_score, ats_score, breakdown, red_flags, skills_found, "
            "skills_missing) values (%(org_id)s, %(resume_id)s, %(job_id)s, "
            "%(overall_score)s, %(ats_score)s, %(breakdown)s, %(red_flags)s, "
            "%(skills_found)s, %(skills_missing)s) "
            f"returning {_COLUMNS}",
            {
                "org_id": org_id,
                "resume_id": data["resume_id"],
                "job_id": data.get("job_id"),
                "overall_score": data.get("overall_score", 0),
                "ats_score": data.get("ats_score", 0),
                "breakdown": Jsonb(data.get("breakdown", {})),
                "red_flags": Jsonb(data.get("red_flags", [])),
                "skills_found": data.get("skills_found", []),
                "skills_missing": data.get("skills_missing", []),
            },
        )
        row = await cur.fetchone()
        assert row is not None
        return row
```

- [ ] **Step 4: Implement the sessions repository**

`transcript` and `scores` are `jsonb`; same `Jsonb` wrapper applies.

Create `app/repositories/sessions.py`:

```python
"""SQL data-access for the `interview_sessions` table."""
from __future__ import annotations

from psycopg import AsyncConnection
from psycopg.types.json import Jsonb

from app.repositories._common import dict_cursor

_COLUMNS = (
    "id, organization_id, candidate_id, job_id, status, mode, transcript, "
    "scores, started_at, ended_at, created_at"
)


async def list_sessions(conn: AsyncConnection, org_id: str) -> list[dict]:
    async with dict_cursor(conn) as cur:
        await cur.execute(
            f"select {_COLUMNS} from interview_sessions "
            "where organization_id = %(org_id)s order by created_at desc",
            {"org_id": org_id},
        )
        return await cur.fetchall()


async def get_session(
    conn: AsyncConnection, org_id: str, session_id: str
) -> dict | None:
    async with dict_cursor(conn) as cur:
        await cur.execute(
            f"select {_COLUMNS} from interview_sessions "
            "where organization_id = %(org_id)s and id = %(session_id)s",
            {"org_id": org_id, "session_id": session_id},
        )
        return await cur.fetchone()


async def create_session(
    conn: AsyncConnection, org_id: str, data: dict
) -> dict:
    async with dict_cursor(conn) as cur:
        await cur.execute(
            "insert into interview_sessions (organization_id, candidate_id, "
            "job_id, status, mode, transcript, scores, started_at) values "
            "(%(org_id)s, %(candidate_id)s, %(job_id)s, %(status)s, %(mode)s, "
            "%(transcript)s, %(scores)s, %(started_at)s) "
            f"returning {_COLUMNS}",
            {
                "org_id": org_id,
                "candidate_id": data.get("candidate_id"),
                "job_id": data.get("job_id"),
                "status": data.get("status", "created"),
                "mode": data.get("mode", "voice"),
                "transcript": Jsonb(data.get("transcript", [])),
                "scores": Jsonb(data.get("scores", {})),
                "started_at": data.get("started_at"),
            },
        )
        row = await cur.fetchone()
        assert row is not None
        return row


async def update_session(
    conn: AsyncConnection, org_id: str, session_id: str, data: dict
) -> dict | None:
    allowed = ("status", "mode", "transcript", "scores", "started_at", "ended_at")
    fields: dict = {}
    for k, v in data.items():
        if k not in allowed:
            continue
        fields[k] = Jsonb(v) if k in ("transcript", "scores") else v
    if not fields:
        return await get_session(conn, org_id, session_id)
    set_clause = ", ".join(f"{k} = %({k})s" for k in fields)
    params = {**fields, "org_id": org_id, "session_id": session_id}
    async with dict_cursor(conn) as cur:
        await cur.execute(
            f"update interview_sessions set {set_clause} "
            "where organization_id = %(org_id)s and id = %(session_id)s "
            f"returning {_COLUMNS}",
            params,
        )
        return await cur.fetchone()
```

- [ ] **Step 5: Run the test and confirm both CRUD round-trips PASS**

```bash
venv/bin/pytest tests/test_repo_analyses_sessions.py -q
```
Expected: `2 passed` (or `2 skipped` without `SUPABASE_DB_URL`).

- [ ] **Step 6: Commit**

```bash
git add app/repositories/analyses.py app/repositories/sessions.py tests/test_repo_analyses_sessions.py
git commit -m "feat(repositories): add analyses and sessions repositories with CRUD tests"
```

---

### Task C5: Collapse `auth.py` to a single `GET /me` endpoint

**Files:**
- Modify: `app/api/v1/endpoints/auth.py` (full rewrite — currently 126 lines)
- Modify: `app/api/deps.py:14` (remove `from app.api.v1.endpoints.auth import fake_users_db`)

`deps.py` imports `fake_users_db` from `auth.py`. We must update `deps.py` first or the app fails to import.

- [ ] **Step 1: Find every importer of `fake_users_db` / `get_current_user` from `auth`**

```bash
grep -rn "fake_users_db\|from app.api.v1.endpoints.auth import\|endpoints.auth import" app/
```
Expected: matches in `app/api/deps.py` and `app/api/v1/endpoints/auth.py` only. `recruiter.py:114` uses `deps.get_current_active_user` (kept working by the next step). If any other file appears, refactor it the same way as `deps.py`.

- [ ] **Step 2: Rewrite `app/api/deps.py` to use the Supabase context**

`recruiter.py` still calls `deps.get_current_active_user`. Re-point it at the real Supabase dependency so nothing else breaks. Replace the entire contents of `app/api/deps.py` with:

```python
"""FastAPI dependencies. Auth now flows through Supabase JWT verification."""
from app.auth.supabase import Context, get_current_context


async def get_current_active_user(
    ctx: Context = Depends(get_current_context),  # noqa: F821
) -> Context:
    """Backwards-compatible alias: returns the verified Supabase context."""
    return ctx
```

Then add the missing import at the top — final file:

```python
"""FastAPI dependencies. Auth now flows through Supabase JWT verification."""
from fastapi import Depends

from app.auth.supabase import Context, get_current_context


async def get_current_active_user(
    ctx: Context = Depends(get_current_context),
) -> Context:
    """Backwards-compatible alias: returns the verified Supabase context."""
    return ctx
```

- [ ] **Step 3: Rewrite `app/api/v1/endpoints/auth.py` as a single `GET /me`**

Replace the entire file with:

```python
"""Auth endpoints. Signup/login/OAuth happen client-side against Supabase;
FastAPI only exposes the verified-identity probe `GET /me`."""
from fastapi import APIRouter, Depends

from app.auth.supabase import Context, get_current_context
from app.db import db_conn

router = APIRouter()


@router.get("/me")
async def get_me(ctx: Context = Depends(get_current_context)) -> dict:
    """Return the verified user's identity and all org memberships."""
    async with db_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "select om.organization_id, o.name, om.role "
                "from organization_members om "
                "join organizations o on o.id = om.organization_id "
                "where om.user_id = %(user_id)s "
                "order by om.created_at",
                {"user_id": ctx.user_id},
            )
            rows = await cur.fetchall()
    memberships = [
        {"org_id": str(org_id), "name": name, "role": role}
        for (org_id, name, role) in rows
    ]
    return {
        "user_id": ctx.user_id,
        "email": ctx.email if hasattr(ctx, "email") else None,
        "memberships": memberships,
    }
```

> **Note on `email`:** the locked `Context` contract is `user_id`, `org_id`, `role` only — it has no `email`. The `hasattr` guard above returns `None` if Phase B's `Context` does not carry an email. If the JWT-verification phase added `email` to `Context`, this returns it automatically. Do not add `email` to `Context` yourself in this phase; flag it to the phase that owns `app/auth/supabase.py`.

- [ ] **Step 4: Update the test that referenced removed auth routes**

`tests/test_api_v1.py` calls `/auth/register` and `/auth/login/access-token`, which no longer exist. Delete `test_register_user`, `test_login_user`, `test_generate_jd_authorized`, `test_verify_identity_missing_file` and the `auth_token` global from that file, keeping only `test_health_check` and `test_generate_jd_unauthorized`. Rewrite `test_generate_jd_unauthorized` to assert the route now requires a Supabase token:

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)


def test_health_check():
    response = client.get(f"{settings.API_V1_STR}/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_generate_jd_requires_auth():
    response = client.post(
        f"{settings.API_V1_STR}/recruiter/generate-jd",
        json={
            "role": "Python Developer",
            "industry": "Tech",
            "seniority": "Senior",
            "skills": ["Python", "FastAPI"],
        },
    )
    assert response.status_code == 401
```

- [ ] **Step 5: Confirm the app still imports and boots**

```bash
venv/bin/pytest tests/test_boot.py tests/test_api_v1.py -q
```
Expected: `3 passed`.

- [ ] **Step 6: Commit**

```bash
git add app/api/v1/endpoints/auth.py app/api/deps.py tests/test_api_v1.py
git commit -m "refactor(auth): collapse auth.py to GET /me backed by Supabase context"
```

---

### Task C6: Refactor `recruiter.py` to repository-backed, org-scoped endpoints

**Files:**
- Modify: `app/api/v1/endpoints/recruiter.py` (currently 128 lines)
- Test: `backend/tests/test_recruiter_endpoints.py`

`recruiter.py` currently delegates every read to the in-memory `recruiter_ats_service`. Replace the CRUD-shaped routes (`/jobs`, `/jobs/{id}`, `/candidates`, `/candidates/{id}`) with repository calls scoped by `ctx.org_id`. The dashboard/analytics aggregate routes stay on `recruiter_ats_service` for this slice (spec section 2 lists analytics calculation as a non-goal) — only add `ctx` so they are auth-gated.

- [ ] **Step 1: Write a failing org-scoped endpoint test**

Create `backend/tests/test_recruiter_endpoints.py`:

```python
"""Endpoint-level tests for the org-scoped recruiter routes."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings

pytestmark = pytest.mark.asyncio


async def test_create_and_list_jobs_scoped_to_org(seed_org_a, auth_headers_a):
    client = TestClient(app)
    create = client.post(
        f"{settings.API_V1_STR}/recruiter/jobs",
        headers=auth_headers_a,
        json={"title": "Platform Engineer", "description": "Own the platform."},
    )
    assert create.status_code == 201, create.text
    job_id = create.json()["id"]

    listed = client.get(
        f"{settings.API_V1_STR}/recruiter/jobs", headers=auth_headers_a
    )
    assert listed.status_code == 200
    assert any(j["id"] == job_id for j in listed.json())
```

- [ ] **Step 2: Run the test and confirm it FAILS**

```bash
venv/bin/pytest tests/test_recruiter_endpoints.py -q
```
Expected FAIL: `405 Method Not Allowed` on the POST (no `POST /recruiter/jobs` route exists yet) or assertion error on status 201.

- [ ] **Step 3: Replace the CRUD-shaped routes in `recruiter.py`**

Open `app/api/v1/endpoints/recruiter.py`. Replace the import block and routes `list_jobs` through `get_candidate` (lines 1–57) so the file head becomes:

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.supabase import Context, get_current_context
from app.db import db_conn
from app.repositories import jobs as jobs_repo
from app.repositories import candidates as candidates_repo
from app.schemas.recruiter import (
    CandidateNoteRequest,
    CandidateStageMoveRequest,
    FeedbackRequestCreate,
    InterviewInviteRequest,
    RecruiterActionResponse,
    RecruiterCandidate,
    RecruiterDashboardResponse,
    RecruiterHiringFlowResponse,
    RecruiterJob,
)
from app.services.job_description import JDGeneratorService
from app.services.recruiter.ats import recruiter_ats_service

router = APIRouter()


class JDGenerationRequest(BaseModel):
    role: str
    industry: str
    seniority: str
    skills: list[str]


class JobCreateRequest(BaseModel):
    title: str
    department: str | None = None
    location: str | None = None
    employment_type: str = "Full-time"
    salary_min: int | None = None
    salary_max: int | None = None
    currency: str = "USD"
    description: str = ""
    requirements: list[str] = []
    status: str = "open"


class CandidateCreateRequest(BaseModel):
    full_name: str
    email: str
    phone: str | None = None
    current_role: str | None = None
    current_company: str | None = None
    source: str = "manual"


@router.get("/dashboard", response_model=RecruiterDashboardResponse)
async def get_recruiter_dashboard(ctx: Context = Depends(get_current_context)):
    return recruiter_ats_service.get_dashboard()


@router.get("/jobs")
async def list_jobs(ctx: Context = Depends(get_current_context)):
    async with db_conn() as conn:
        return await jobs_repo.list_jobs(conn, ctx.org_id)


@router.post("/jobs", status_code=201)
async def create_job(
    request: JobCreateRequest, ctx: Context = Depends(get_current_context)
):
    async with db_conn() as conn:
        return await jobs_repo.create_job(
            conn, ctx.org_id, created_by=ctx.user_id, data=request.model_dump()
        )


@router.get("/jobs/{job_id}")
async def get_job(job_id: str, ctx: Context = Depends(get_current_context)):
    async with db_conn() as conn:
        job = await jobs_repo.get_job(conn, ctx.org_id, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.patch("/jobs/{job_id}")
async def update_job(
    job_id: str,
    request: JobCreateRequest,
    ctx: Context = Depends(get_current_context),
):
    async with db_conn() as conn:
        job = await jobs_repo.update_job(
            conn, ctx.org_id, job_id, data=request.model_dump(exclude_unset=True)
        )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/candidates")
async def list_candidates(ctx: Context = Depends(get_current_context)):
    async with db_conn() as conn:
        return await candidates_repo.list_candidates(conn, ctx.org_id)


@router.post("/candidates", status_code=201)
async def create_candidate(
    request: CandidateCreateRequest, ctx: Context = Depends(get_current_context)
):
    async with db_conn() as conn:
        return await candidates_repo.create_candidate(
            conn, ctx.org_id, data=request.model_dump()
        )


@router.get("/candidates/{candidate_id}")
async def get_candidate(
    candidate_id: str, ctx: Context = Depends(get_current_context)
):
    async with db_conn() as conn:
        candidate = await candidates_repo.get_candidate(conn, ctx.org_id, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate
```

> The `response_model=RecruiterJob` / `RecruiterCandidate` annotations are dropped from the CRUD routes because those schemas describe the rich mock shape, not the DB row. Returning the raw repository dict is correct for this slice.

- [ ] **Step 4: Add `ctx` to the remaining mock-backed routes**

For every other route still in the file (`move_candidate_stage`, `add_candidate_note`, `send_interview_invite`, `request_feedback`, `get_interview_queue`, `get_collaboration_queue`, `get_recruiter_analytics`, `get_hiring_flow`), add `ctx: Context = Depends(get_current_context)` as the final parameter so they are auth-gated. Example — `move_candidate_stage`:

```python
@router.post("/candidates/{candidate_id}/move-stage", response_model=RecruiterCandidate)
async def move_candidate_stage(
    candidate_id: str,
    request: CandidateStageMoveRequest,
    ctx: Context = Depends(get_current_context),
):
    candidate = recruiter_ats_service.move_candidate_stage(candidate_id, request)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate
```

Leave `generate_jd` as-is — it already depends on `deps.get_current_active_user`, which Task C5 re-pointed at the Supabase context.

- [ ] **Step 5: Run the test and confirm it PASSES**

```bash
venv/bin/pytest tests/test_recruiter_endpoints.py -q
```
Expected: `1 passed` (or `1 skipped` without `SUPABASE_DB_URL`).

- [ ] **Step 6: Commit**

```bash
git add app/api/v1/endpoints/recruiter.py tests/test_recruiter_endpoints.py
git commit -m "refactor(recruiter): org-scope jobs and candidates routes via repositories"
```

---

### Task C7: Refactor `resume.py` (Supabase Storage), `analysis.py`, and `interview.py`

**Files:**
- Modify: `app/api/v1/endpoints/resume.py` (currently 249 lines)
- Modify: `app/api/v1/endpoints/analysis.py` (currently 196 lines)
- Modify: `app/api/v1/endpoints/interview.py` (currently 615 lines)

This task removes the three `*_storage` dicts. The resume parsing/chunking pipeline (RAG chunks, analytics) is per-request transient and not in the DB schema; only the durable resume *metadata row* is persisted. The `interview.py` engine objects also cannot live in Postgres — interview *session metadata* (status, transcript, scores) is persisted, but the live `engine` object is not. To keep this slice bounded, `interview.py`'s engine-stateful flow keeps a process-local dict for the live `engine` handle only, while the durable session row is written/read through `sessions_repo`.

- [ ] **Step 1: Write a failing resume-upload test (file goes to Supabase Storage)**

Create `backend/tests/test_resume_upload_endpoint.py`:

```python
"""Resume upload must persist a row and store bytes in Supabase Storage."""
import io
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings

pytestmark = pytest.mark.asyncio


async def test_upload_resume_persists_row_and_storage(
    seed_org_a, auth_headers_a, monkeypatch
):
    uploaded = {}

    async def fake_upload(org_id, candidate_id, file_name, data, content_type):
        uploaded["path"] = f"{org_id}/{candidate_id}/{file_name}"
        uploaded["bytes"] = data
        return uploaded["path"]

    monkeypatch.setattr("app.api.v1.endpoints.resume.upload_resume", fake_upload)

    client = TestClient(app)
    resp = client.post(
        f"{settings.API_V1_STR}/resume/upload",
        headers=auth_headers_a,
        files={"file": ("cv.txt", io.BytesIO(b"Jane Doe - Software Engineer"), "text/plain")},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "uploaded"
    assert "path" in uploaded
    assert uploaded["bytes"] == b"Jane Doe - Software Engineer"
```

- [ ] **Step 2: Run the test and confirm it FAILS**

```bash
venv/bin/pytest tests/test_resume_upload_endpoint.py -q
```
Expected FAIL: `401` (route has no auth yet) or `AttributeError` on `monkeypatch.setattr("app.api.v1.endpoints.resume.upload_resume", ...)` because `upload_resume` is not imported in that module yet.

- [ ] **Step 3: Rewrite `resume.py`**

Replace the entire contents of `app/api/v1/endpoints/resume.py` with:

```python
"""Resume upload and management endpoints. Files persist to Supabase Storage;
metadata persists to the `resumes` table — never the local `uploads/` dir."""
from __future__ import annotations

import logging
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.auth.supabase import Context, get_current_context
from app.core.config import settings
from app.db import db_conn
from app.repositories import resumes as resumes_repo
from app.schemas.resume import ResumeUploadResponse
from app.storage import upload_resume
from app.services.resume.parser import ResumeParser, ResumeChunker
from app.services.resume.analyzer import ResumeAnalyzer

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume_endpoint(
    file: UploadFile = File(...),
    candidate_id: str | None = None,
    ctx: Context = Depends(get_current_context),
):
    """Upload a resume: validate, store bytes in Supabase Storage, persist metadata."""
    file_ext = Path(file.filename or "").suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Allowed: {settings.ALLOWED_EXTENSIONS}",
        )

    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB",
        )

    try:
        parser = ResumeParser()
        parsed_content = await parser.parse_bytes(contents, file_ext)
        text_content = parsed_content.get("text", "")

        analyzer = ResumeAnalyzer()
        validation = await analyzer.validate_document_type(text_content)
        if not validation.get("is_valid_resume", True) or validation.get("document_type") != "RESUME":
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid Document Type",
                    "message": "The uploaded file does not appear to be a resume.",
                    "detected_type": validation.get("document_type", "UNKNOWN"),
                    "reason": validation.get("reasoning", "Document structure does not match a resume."),
                },
            )

        storage_path = await upload_resume(
            org_id=ctx.org_id,
            candidate_id=candidate_id or "unassigned",
            file_name=file.filename or f"resume{file_ext}",
            data=contents,
            content_type=file.content_type or "application/octet-stream",
        )

        async with db_conn() as conn:
            row = await resumes_repo.create_resume(
                conn, ctx.org_id,
                data={
                    "candidate_id": candidate_id,
                    "storage_path": storage_path,
                    "file_name": file.filename or f"resume{file_ext}",
                    "mime_type": file.content_type or "application/octet-stream",
                    "byte_size": len(contents),
                },
            )

        logger.info("Resume uploaded: %s (org %s)", row["id"], ctx.org_id)
        preview = text_content[:500] + "..." if len(text_content) > 500 else text_content
        return ResumeUploadResponse(
            id=str(row["id"]),
            filename=row["file_name"],
            status="uploaded",
            message="Resume uploaded successfully. Ready for analysis.",
            text_preview=preview,
        )
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.error("Error uploading resume: %s", e)
        raise HTTPException(status_code=500, detail=f"Error processing resume: {e}")


@router.get("/")
async def list_resumes(ctx: Context = Depends(get_current_context)):
    """List resume metadata rows for the caller's org."""
    async with db_conn() as conn:
        rows = await resumes_repo.list_resumes(conn, ctx.org_id)
    return {
        "resumes": [
            {"id": str(r["id"]), "filename": r["file_name"], "status": "uploaded"}
            for r in rows
        ]
    }


@router.get("/{resume_id}")
async def get_resume(resume_id: str, ctx: Context = Depends(get_current_context)):
    """Get a single resume's metadata."""
    async with db_conn() as conn:
        row = await resumes_repo.get_resume(conn, ctx.org_id, resume_id)
    if not row:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {
        "id": str(row["id"]),
        "filename": row["file_name"],
        "storage_path": row["storage_path"],
        "mime_type": row["mime_type"],
        "byte_size": row["byte_size"],
    }


@router.delete("/{resume_id}")
async def delete_resume(resume_id: str, ctx: Context = Depends(get_current_context)):
    """Delete a resume metadata row (storage object cleanup is out of this slice)."""
    async with db_conn() as conn:
        deleted = await resumes_repo.delete_resume(conn, ctx.org_id, resume_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"message": "Resume deleted successfully"}
```

> **`ResumeParser.parse_bytes`:** the old parser took a file *path*. There is no longer a local file. If `app/services/resume/parser.py` has no `parse_bytes(data: bytes, ext: str)` method, add a thin wrapper there that writes to a `tempfile.NamedTemporaryFile`, calls the existing path-based `parse`, and deletes the temp file inside the same call (tempfile lifetime is within one request, which is serverless-safe). The `/chunks` and `/context/{topic}` routes depended on the in-memory `chunks` blob — they are removed in this slice; the RAG-chunk feature is re-wired in a later interview slice. If `interview.py` imports them, see Step 5.

- [ ] **Step 4: Rewrite `analysis.py` to read the resume from storage + DB**

`analysis.py` imported `resume_storage` (line 17). Replace the entire file with:

```python
"""Resume analysis endpoints. Resume text is re-parsed from Supabase Storage;
analysis results persist to the `resume_analyses` table."""
from __future__ import annotations

import logging
import traceback

from fastapi import APIRouter, Depends, HTTPException

from app.auth.supabase import Context, get_current_context
from app.db import db_conn
from app.repositories import analyses as analyses_repo
from app.repositories import resumes as resumes_repo
from app.schemas.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    QuickAnalysisResponse,
    JDComparisonRequest,
    JDComparisonResponse,
)
from app.services.resume.analyzer import ResumeAnalyzer
from app.services.resume.parser import ResumeParser
from app.storage import download_resume

router = APIRouter()
logger = logging.getLogger(__name__)


async def _resume_text(org_id: str, resume_id: str) -> str:
    """Fetch a resume row for this org and re-parse its bytes from storage."""
    async with db_conn() as conn:
        row = await resumes_repo.get_resume(conn, org_id, resume_id)
    if not row:
        raise HTTPException(status_code=404, detail="Resume not found")
    data = await download_resume(row["storage_path"])
    from pathlib import Path
    parsed = await ResumeParser().parse_bytes(data, Path(row["file_name"]).suffix.lower())
    return parsed.get("text", "")


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_resume(
    request: AnalysisRequest, ctx: Context = Depends(get_current_context)
):
    """Comprehensive resume analysis; result row persisted to `resume_analyses`."""
    text = await _resume_text(ctx.org_id, request.resume_id)
    try:
        analyzer = ResumeAnalyzer()
        result = await analyzer.analyze_enhanced(
            resume_text=text,
            job_description=request.job_description,
            analysis_type=request.analysis_type,
            include_smart_questions=True,
        )
        async with db_conn() as conn:
            row = await analyses_repo.create_analysis(
                conn, ctx.org_id,
                data={
                    "resume_id": request.resume_id,
                    "job_id": None,
                    "overall_score": result.get("overall_score", 0),
                    "ats_score": result.get("ats_score", 0),
                    "breakdown": result.get("sections", {}),
                    "red_flags": result.get("improvements", []),
                    "skills_found": result.get("keywords", {}).get("found", []),
                    "skills_missing": result.get("keywords", {}).get("missing", []),
                },
            )
        return AnalysisResponse(
            analysis_id=str(row["id"]),
            resume_id=request.resume_id,
            overall_score=result.get("overall_score", 0),
            ats_score=result.get("ats_score", 0),
            content_score=result.get("content_score", 0),
            format_score=result.get("format_score", 0),
            jd_match_score=result.get("jd_match_score"),
            sections=result.get("sections", {}),
            keywords=result.get("keywords", {}),
            improvements=result.get("improvements", []),
            detailed_feedback=result.get("detailed_feedback", ""),
            rewrite_examples=result.get("rewrite_examples", []),
        )
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.error("Error analyzing resume: %s\n%s", e, traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error analyzing resume: {e}")


@router.post("/quick-analyze", response_model=QuickAnalysisResponse)
async def quick_analyze_resume(
    request: AnalysisRequest, ctx: Context = Depends(get_current_context)
):
    """Fast, less-detailed resume analysis."""
    text = await _resume_text(ctx.org_id, request.resume_id)
    try:
        result = await ResumeAnalyzer().quick_analyze(resume_text=text)
        return QuickAnalysisResponse(
            resume_id=request.resume_id,
            overall_score=result.get("overall_score", 0),
            summary=result.get("summary", ""),
            top_strength=result.get("top_strength", ""),
            top_improvement=result.get("top_improvement", ""),
        )
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.error("Error in quick analysis: %s", e)
        raise HTTPException(status_code=500, detail=f"Error in quick analysis: {e}")


@router.post("/compare-jd", response_model=JDComparisonResponse)
async def compare_with_jd(
    request: JDComparisonRequest, ctx: Context = Depends(get_current_context)
):
    """Compare a resume against a job description."""
    if not request.job_description:
        raise HTTPException(status_code=400, detail="Job description is required")
    text = await _resume_text(ctx.org_id, request.resume_id)
    try:
        result = await ResumeAnalyzer().compare_with_jd(
            resume_text=text, job_description=request.job_description
        )
        return JDComparisonResponse(
            resume_id=request.resume_id,
            match_percentage=result.get("match_percentage", 0),
            matched_requirements=result.get("matched_requirements", []),
            missing_requirements=result.get("missing_requirements", []),
            transferable_skills=result.get("transferable_skills", []),
            recommendations=result.get("recommendations", []),
            gap_analysis=result.get("gap_analysis", {}),
        )
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.error("Error comparing with JD: %s", e)
        raise HTTPException(status_code=500, detail=f"Error comparing with JD: {e}")


@router.get("/{analysis_id}")
async def get_analysis(
    analysis_id: str, ctx: Context = Depends(get_current_context)
):
    """Fetch a stored analysis row by id, scoped to the caller's org."""
    async with db_conn() as conn:
        row = await analyses_repo.get_analysis(conn, ctx.org_id, analysis_id)
    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return row


@router.post("/keywords/{resume_id}")
async def extract_keywords(
    resume_id: str, ctx: Context = Depends(get_current_context)
):
    """Extract and categorize keywords from a resume."""
    text = await _resume_text(ctx.org_id, resume_id)
    try:
        keywords = await ResumeAnalyzer().extract_keywords(resume_text=text)
        return {"resume_id": resume_id, "keywords": keywords}
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.error("Error extracting keywords: %s", e)
        raise HTTPException(status_code=500, detail=f"Error extracting keywords: {e}")
```

- [ ] **Step 5: Refactor `interview.py` — remove the `resume_storage`/`analysis_storage` imports and org-scope the session routes**

`interview.py:25-26` imports `resume_storage` and `analysis_storage`. Make these three edits:

1. **Replace the imports** (lines 25–26) — delete both `from app.api.v1.endpoints.resume import resume_storage` and `from app.api.v1.endpoints.analysis import analysis_storage`, and add:

```python
from app.auth.supabase import Context, get_current_context
from app.db import db_conn
from app.repositories import sessions as sessions_repo
from app.repositories import resumes as resumes_repo
from app.repositories import analyses as analyses_repo
from app.storage import download_resume
from app.services.resume.parser import ResumeParser
from pathlib import Path
```

2. **Add an org-scoped resume-text helper** near the top of the module (after `interview_sessions = {}`):

```python
async def _load_resume_text(org_id: str, resume_id: str) -> str:
    async with db_conn() as conn:
        row = await resumes_repo.get_resume(conn, org_id, resume_id)
    if not row:
        raise HTTPException(status_code=404, detail="Resume not found")
    data = await download_resume(row["storage_path"])
    parsed = await ResumeParser().parse_bytes(data, Path(row["file_name"]).suffix.lower())
    return parsed.get("text", "")
```

3. **In `start_interview`** — add `ctx: Context = Depends(get_current_context)` to the signature, replace the `resume_storage` lookup (lines 62–69) with `resume_text = await _load_resume_text(ctx.org_id, request.resume_id)` and `analysis_data = {}` (the latest analysis can optionally be fetched via `analyses_repo.list_analyses(conn, ctx.org_id, resume_id=request.resume_id)` — take the first if present, else `{}`). Pass `resume_text` (not `resume_data["text_content"]`) to `engine.initialize_interview`. After building `interview_sessions[session_id]`, also persist a durable session row:

```python
async with db_conn() as conn:
    db_session = await sessions_repo.create_session(
        conn, ctx.org_id,
        data={"candidate_id": None, "job_id": None, "mode": request.mode,
              "status": "in_progress"},
    )
interview_sessions[session_id]["db_session_id"] = str(db_session["id"])
interview_sessions[session_id]["org_id"] = ctx.org_id
interview_sessions[session_id]["resume_text"] = resume_text
```

For `submit_response`, `submit_audio_response`, `get_current_question`, `end_interview`, `get_behavioral_analytics`, `get_session`, `list_sessions`, `get_interview_report`: add `ctx: Context = Depends(get_current_context)` as the final parameter. In `submit_response`, replace the line `resume_text=resume_storage[session["resume_id"]]["text_content"]` (line 190) with `resume_text=session["resume_text"]`. In `get_interview_report`, replace the `resume_storage.get(...)` block (lines 599–600) with `resume_text = session.get("resume_text", "")`. In `end_interview` and the completion branch of `submit_response`, after marking the session completed, sync the durable row:

```python
async with db_conn() as conn:
    await sessions_repo.update_session(
        conn, ctx.org_id, session["db_session_id"],
        data={"status": "completed",
              "scores": aggregate_scores,
              "ended_at": session["ended_at"]},
    )
```

> The live `engine` object stays in the process-local `interview_sessions` dict for the duration of the multi-call interview flow — it cannot be JSON-serialized into Postgres. This is an accepted scoped exception for this slice (full serverless-safe interview state is a later slice, per spec section 2). The *durable* session record is in Postgres via `sessions_repo`.

- [ ] **Step 6: Run the resume-upload test and the boot test**

```bash
venv/bin/pytest tests/test_resume_upload_endpoint.py tests/test_boot.py -q
```
Expected: `2 passed` (resume test `skipped` without `SUPABASE_DB_URL`; `test_boot` always passes — confirms `interview.py`, `analysis.py`, `resume.py` all still import cleanly with no `*_storage` references).

- [ ] **Step 7: Confirm no `*_storage` dict references remain**

```bash
grep -rn "resume_storage\|analysis_storage\|fake_users_db\|UPLOAD_DIR" app/api/
```
Expected: no output (empty). If `interview.py` still shows `analysis_storage`, finish removing it.

- [ ] **Step 8: Commit**

```bash
git add app/api/v1/endpoints/resume.py app/api/v1/endpoints/analysis.py app/api/v1/endpoints/interview.py tests/test_resume_upload_endpoint.py
git commit -m "refactor(api): persist resumes/analyses/sessions via repositories and Supabase Storage"
```

---

### Task C8: Test infrastructure — `conftest.py` with two-org / two-user fixtures

**Files:**
- Create: `backend/conftest.py`
- Create: `backend/pytest.ini`

The repo has no project-level `conftest.py` or pytest config. `pytest-asyncio` is installed but needs `asyncio_mode = auto`. The fixtures seed two real organizations with one user each, so the org-isolation test (Task C9) and every repo CRUD test have data.

- [ ] **Step 1: Create `backend/pytest.ini`**

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
```

- [ ] **Step 2: Create `backend/conftest.py` with the org/user fixtures**

The fixtures insert directly into Postgres so they do not depend on the as-yet-untested endpoints. They also build a fake JWT-context override so `TestClient` requests are authenticated without a real Supabase token. `seed_org_a`/`seed_org_b` create `auth.users` rows and `organizations` rows; `auth_headers_a` installs a FastAPI dependency override that returns a `Context` for org A.

```python
"""Shared pytest fixtures: two seeded orgs, two users, and auth overrides."""
from __future__ import annotations

import os
import uuid

import pytest
import pytest_asyncio

DB_URL = os.getenv("SUPABASE_DB_URL")
_needs_db = pytest.mark.skipif(
    not DB_URL, reason="SUPABASE_DB_URL not set; DB-backed test skipped"
)


async def _insert_org(conn, *, org_name: str, user_email: str) -> dict:
    """Create one auth.users row, one organization, one owner membership."""
    user_id = str(uuid.uuid4())
    org_id = str(uuid.uuid4())
    async with conn.cursor() as cur:
        # auth.users is normally Supabase-managed; insert the minimum for FK refs.
        await cur.execute(
            "insert into auth.users (id, email) values (%s, %s) "
            "on conflict (id) do nothing",
            (user_id, user_email),
        )
        await cur.execute(
            "insert into organizations (id, name, slug) values (%s, %s, %s)",
            (org_id, org_name, f"{org_name.lower().replace(' ', '-')}-{org_id[:8]}"),
        )
        await cur.execute(
            "insert into organization_members (organization_id, user_id, role) "
            "values (%s, %s, 'owner')",
            (org_id, user_id),
        )
    return {"org_id": org_id, "user_id": user_id, "email": user_email}


async def _cleanup_org(conn, org_id: str, user_id: str) -> None:
    async with conn.cursor() as cur:
        # organizations cascade-deletes jobs/candidates/etc; remove user last.
        await cur.execute("delete from organizations where id = %s", (org_id,))
        await cur.execute("delete from auth.users where id = %s", (user_id,))


@pytest_asyncio.fixture
async def seed_org_a():
    """Org A with one owner user. Yields {org_id, user_id, email}."""
    _needs_db.mark  # marker accessed so skip applies via the decorator below
    if not DB_URL:
        pytest.skip("SUPABASE_DB_URL not set")
    from app.db import db_conn
    async with db_conn() as conn:
        org = await _insert_org(conn, org_name="Org A", user_email="owner-a@example.com")
        await conn.commit()
    try:
        yield org
    finally:
        async with db_conn() as conn:
            await _cleanup_org(conn, org["org_id"], org["user_id"])
            await conn.commit()


@pytest_asyncio.fixture
async def seed_org_b():
    """Org B with one owner user. Yields {org_id, user_id, email}."""
    if not DB_URL:
        pytest.skip("SUPABASE_DB_URL not set")
    from app.db import db_conn
    async with db_conn() as conn:
        org = await _insert_org(conn, org_name="Org B", user_email="owner-b@example.com")
        await conn.commit()
    try:
        yield org
    finally:
        async with db_conn() as conn:
            await _cleanup_org(conn, org["org_id"], org["user_id"])
            await conn.commit()


def _override_context(org: dict):
    """Build a get_current_context override that returns org's owner Context."""
    from app.auth.supabase import Context

    async def _fake_context() -> Context:
        return Context(user_id=org["user_id"], org_id=org["org_id"], role="owner")

    return _fake_context


@pytest.fixture
def auth_headers_a(seed_org_a):
    """Install a dependency override so TestClient requests authenticate as org A.

    Returns an (empty) headers dict — the override supplies the Context, so no
    real Bearer token is needed. Headers kept as a dict so callers can extend it.
    """
    from app.main import app
    from app.auth.supabase import get_current_context

    app.dependency_overrides[get_current_context] = _override_context(seed_org_a)
    try:
        yield {}
    finally:
        app.dependency_overrides.pop(get_current_context, None)


@pytest.fixture
def auth_headers_b(seed_org_b):
    """Same as auth_headers_a but authenticates as org B's owner."""
    from app.main import app
    from app.auth.supabase import get_current_context

    app.dependency_overrides[get_current_context] = _override_context(seed_org_b)
    try:
        yield {}
    finally:
        app.dependency_overrides.pop(get_current_context, None)
```

> **`auth.users` inserts:** the FK targets `auth.users`. Supabase normally manages that table; a direct `insert` works because the migration applicator connects with the service-role pooler. If your environment forbids writing to `auth.schema`, change `_insert_org` to call the Supabase Admin API (`create_user`) instead — but the direct insert is the simplest and is what the org-isolation test relies on. Keep the inserted columns minimal (`id`, `email`) so it survives Supabase schema changes.

- [ ] **Step 3: Run the full repo suite — fixtures now resolve**

```bash
venv/bin/pytest tests/test_repo_jobs_candidates.py tests/test_repo_applications_resumes.py tests/test_repo_analyses_sessions.py -q
```
Expected: `6 passed` if `SUPABASE_DB_URL` is set to a DB with the 3 migrations applied; `6 skipped` otherwise. Either outcome confirms the fixtures load without collection errors.

- [ ] **Step 4: Commit**

```bash
git add backend/conftest.py backend/pytest.ini
git commit -m "test(backend): add conftest with two-org fixtures and pytest config"
```

---

### Task C9: Org-isolation test — cross-org fetch returns 404, not 403

**Files:**
- Test: `backend/tests/test_org_isolation.py`

This is the spec's headline negative test (section 11): a user in org A requesting an org-B job must get `404` — never `403` — so the API does not leak that the row exists.

- [ ] **Step 1: Write the org-isolation test**

Create `backend/tests/test_org_isolation.py`:

```python
"""A user in org A must not see org B's data; cross-org fetch -> 404 (not 403)."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.db import db_conn
from app.repositories import jobs as jobs_repo

pytestmark = pytest.mark.asyncio


async def test_repo_get_job_returns_none_for_other_org(seed_org_a, seed_org_b):
    """jobs_repo.get_job scoped to org A cannot see an org-B job."""
    async with db_conn() as conn:
        org_b_job = await jobs_repo.create_job(
            conn, seed_org_b["org_id"], created_by=seed_org_b["user_id"],
            data={"title": "Org B Secret Role", "description": "hidden"},
        )
        # Same job id, but queried under org A's id -> must be None.
        leaked = await jobs_repo.get_job(conn, seed_org_a["org_id"], org_b_job["id"])
    assert leaked is None


async def test_endpoint_cross_org_job_fetch_is_404(
    seed_org_a, seed_org_b, auth_headers_a
):
    """Org A's authenticated user fetching an org-B job id gets 404, not 403."""
    # Create the job directly under org B.
    async with db_conn() as conn:
        org_b_job = await jobs_repo.create_job(
            conn, seed_org_b["org_id"], created_by=seed_org_b["user_id"],
            data={"title": "Org B Only", "description": "hidden"},
        )
        job_id = str(org_b_job["id"])

    # auth_headers_a installed a dependency override -> request runs as org A.
    client = TestClient(app)
    resp = client.get(
        f"{settings.API_V1_STR}/recruiter/jobs/{job_id}", headers=auth_headers_a
    )
    assert resp.status_code == 404, resp.text
    assert resp.status_code != 403

    # And org A's own job list never contains the org-B job.
    listed = client.get(
        f"{settings.API_V1_STR}/recruiter/jobs", headers=auth_headers_a
    )
    assert listed.status_code == 200
    assert all(j["id"] != job_id for j in listed.json())
```

> `auth_headers_a` depends on `seed_org_a`; this test also requests `seed_org_b` directly so both orgs exist. pytest resolves both fixtures; the override is for org A only, so the endpoint runs as org A while org B's job sits in the DB.

- [ ] **Step 2: Run the org-isolation test and confirm it PASSES**

```bash
venv/bin/pytest tests/test_org_isolation.py -q
```
Expected: `2 passed` (or `2 skipped` without `SUPABASE_DB_URL`). A `403` instead of `404` here is a real isolation leak — fix the endpoint, not the test.

- [ ] **Step 3: Run the entire backend suite as a regression gate**

```bash
venv/bin/pytest -q
```
Expected: all previously-passing tests plus the new repo/endpoint/isolation tests pass; DB-backed tests `skipped` if `SUPABASE_DB_URL` is unset. No collection errors, no `ModuleNotFoundError`.

- [ ] **Step 4: Commit**

```bash
git add tests/test_org_isolation.py
git commit -m "test(backend): cross-org fetch returns 404 not 403 (org-isolation)"
```
### Task C10: Add the `get_verified_user_id` auth dependency

**Files:**
- Modify: `app/auth/supabase.py`
- Test: `backend/tests/test_verified_user_id.py`

`get_current_context` resolves an org membership and 403s a user who has none. But two flows have a verified JWT and *no* membership yet: a brand-new user creating their first organization, and an invitee accepting an invitation. They need identity-only auth. `get_verified_user_id` reuses `verify_jwt` to validate the bearer token and returns just the `user_id` string — no DB lookup, no org resolution.

- [ ] **Step 1: Write a failing unit test for `get_verified_user_id`**

Create `backend/tests/test_verified_user_id.py`:

```python
"""Unit tests for the identity-only auth dependency get_verified_user_id."""
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.auth import supabase as supa


def _creds(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


async def test_returns_user_id_for_valid_token(monkeypatch):
    """A token verify_jwt accepts yields its `sub` claim as user_id."""
    monkeypatch.setattr(
        supa, "verify_jwt", lambda token: {"sub": "user-123", "email": "x@example.com"}
    )
    user_id = await supa.get_verified_user_id(_creds("good-token"))
    assert user_id == "user-123"


async def test_rejects_invalid_token(monkeypatch):
    """A token verify_jwt rejects propagates as HTTP 401."""
    def _boom(token):
        raise HTTPException(status_code=401, detail="bad token")

    monkeypatch.setattr(supa, "verify_jwt", _boom)
    with pytest.raises(HTTPException) as exc:
        await supa.get_verified_user_id(_creds("garbage"))
    assert exc.value.status_code == 401


async def test_rejects_token_without_sub(monkeypatch):
    """A verified token missing the `sub` claim is a 401, not a crash."""
    monkeypatch.setattr(supa, "verify_jwt", lambda token: {"email": "x@example.com"})
    with pytest.raises(HTTPException) as exc:
        await supa.get_verified_user_id(_creds("no-sub"))
    assert exc.value.status_code == 401
```

- [ ] **Step 2: Run the test and confirm it FAILS**

```bash
venv/bin/pytest tests/test_verified_user_id.py -q
```
Expected: `AttributeError: module 'app.auth.supabase' has no attribute 'get_verified_user_id'`.

- [ ] **Step 3: Add `get_verified_user_id` to `app/auth/supabase.py`**

`app/auth/supabase.py` already defines an `HTTPBearer` security scheme used by `get_current_context` (Phase B). Reuse it. If the existing scheme variable has a different name than `bearer_scheme`, match it. Append this dependency to the module (after `get_current_context`):

```python
async def get_verified_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Identity-only auth: verify the JWT, return the user id, do NO org lookup.

    Used by flows where the caller has a valid Supabase session but no
    organization membership yet — creating a first org, or accepting an invite.
    `get_current_context` would 403 such a user; this dependency does not.
    """
    claims = verify_jwt(credentials.credentials)
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject claim")
    return str(user_id)
```

Confirm `HTTPAuthorizationCredentials`, `Depends`, and `HTTPException` are imported at the top of the file. `get_current_context` already imports `Depends`/`HTTPException` and the bearer scheme; add `HTTPAuthorizationCredentials` to the existing `from fastapi.security import ...` line if it is not already there.

- [ ] **Step 4: Run the test and confirm it PASSES**

```bash
venv/bin/pytest tests/test_verified_user_id.py -q
```
Expected: `3 passed`.

- [ ] **Step 5: Confirm the app still imports**

```bash
venv/bin/python -c "from app.auth.supabase import get_verified_user_id, get_current_context, Context; print('ok')"
```
Expected output: `ok`

- [ ] **Step 6: Commit**

```bash
git add app/auth/supabase.py tests/test_verified_user_id.py
git commit -m "feat(auth): add identity-only get_verified_user_id dependency"
```

---

### Task C11: Organizations, invitations, and members repositories

**Files:**
- Create: `app/repositories/organizations.py`
- Create: `app/repositories/invitations.py`
- Create: `app/repositories/members.py`
- Test: `backend/tests/test_repo_org_invite_member.py`

These three repositories back the org-creation, invitation, and team-management endpoints.

> **Owner-trigger investigation (resolved):** `supabase/migrations/001_foundation_schema.sql` defines an `after insert on organizations` trigger `add_creator_as_owner()` whose body is guarded by `if auth.uid() is not null`. `auth.uid()` reads a GUC set by Supabase's PostgREST/GoTrue layer from the request JWT — on a **direct psycopg connection it is always NULL**, so the trigger is a no-op for us. Therefore `create_organization` **must explicitly insert the owner `organization_members` row itself.** The trigger's `on conflict do nothing` makes this safe even if a future runtime sets `auth.uid()`: the explicit insert and the trigger insert collide harmlessly on the `(organization_id, user_id)` primary key. The Task C8 `_insert_org` fixture already inserts the membership explicitly for the same reason — `create_organization` mirrors that.

- [ ] **Step 1: Write a failing CRUD round-trip test**

Create `backend/tests/test_repo_org_invite_member.py`:

```python
"""CRUD round-trip tests for the organizations, invitations, members repositories."""
import uuid

import pytest

from app.db import db_conn
from app.repositories import organizations as orgs_repo
from app.repositories import invitations as invites_repo
from app.repositories import members as members_repo

pytestmark = pytest.mark.asyncio


async def test_create_organization_inserts_owner_membership(seed_org_a):
    """create_organization must persist the org AND the owner membership row,
    because the auth.uid() trigger is a no-op on a direct psycopg connection."""
    owner_id = seed_org_a["user_id"]
    async with db_conn() as conn:
        org = await orgs_repo.create_organization(
            conn, name="Brand New Co", owner_user_id=owner_id
        )
        assert org["name"] == "Brand New Co"
        assert org["slug"].startswith("brand-new-co")

        fetched = await orgs_repo.get_organization(conn, org["id"])
        assert fetched is not None and fetched["id"] == org["id"]

        members = await members_repo.list_members(conn, org["id"])
        assert len(members) == 1
        assert members[0]["user_id"] == str(owner_id)
        assert members[0]["role"] == "owner"

        # cleanup the extra org this test created (seed_org_a only cleans its own)
        async with conn.cursor() as cur:
            await cur.execute("delete from organizations where id = %s", (org["id"],))
        await conn.commit()


async def test_invitation_create_list_get_accept(seed_org_a):
    org_id = seed_org_a["org_id"]
    async with db_conn() as conn:
        created = await invites_repo.create_invitation(
            conn, org_id, email="newhire@example.com", role="recruiter"
        )
        assert created["email"] == "newhire@example.com"
        assert created["token"]
        assert created["accepted_at"] is None
        invite_id = created["id"]
        token = created["token"]

        pending = await invites_repo.list_invitations(conn, org_id)
        assert any(i["id"] == invite_id for i in pending)

        by_token = await invites_repo.get_invitation_by_token(conn, token)
        assert by_token is not None and by_token["id"] == invite_id

        await invites_repo.mark_accepted(conn, invite_id)
        # accepted invitations drop out of the pending list
        still_pending = await invites_repo.list_invitations(conn, org_id)
        assert all(i["id"] != invite_id for i in still_pending)


async def test_member_add_update_remove(seed_org_a):
    org_id = seed_org_a["org_id"]
    new_user_id = str(uuid.uuid4())
    async with db_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "insert into auth.users (id, email) values (%s, %s) "
                "on conflict (id) do nothing",
                (new_user_id, "member2@example.com"),
            )

        added = await members_repo.add_member(
            conn, org_id, user_id=new_user_id, role="recruiter"
        )
        assert added["user_id"] == new_user_id
        assert added["role"] == "recruiter"

        members = await members_repo.list_members(conn, org_id)
        assert any(m["user_id"] == new_user_id for m in members)
        assert any(m["email"] == "member2@example.com" for m in members)

        updated = await members_repo.update_member_role(
            conn, org_id, new_user_id, role="admin"
        )
        assert updated is not None and updated["role"] == "admin"

        removed = await members_repo.remove_member(conn, org_id, new_user_id)
        assert removed is True
        gone = await members_repo.update_member_role(
            conn, org_id, new_user_id, role="recruiter"
        )
        assert gone is None
```

- [ ] **Step 2: Run the test and confirm it FAILS**

```bash
venv/bin/pytest tests/test_repo_org_invite_member.py -q
```
Expected: `ModuleNotFoundError: No module named 'app.repositories.organizations'`.

- [ ] **Step 3: Implement the organizations repository**

The `organizations` table is **not** org-scoped (it *is* the org), so these functions take `org_id` as the row id, not a `organization_id` filter. The slug is derived from the name, lower-cased and hyphenated, with a short random suffix so the `slug text unique` constraint never collides.

Create `app/repositories/organizations.py`:

```python
"""SQL data-access for the `organizations` table.

Unlike org-scoped repositories, these functions operate on the organization
row itself, so the second argument is the org's own id (or None for creation).
"""
from __future__ import annotations

import re
import secrets

from psycopg import AsyncConnection

from app.repositories._common import dict_cursor

_COLUMNS = "id, name, slug, created_at"


def _slugify(name: str) -> str:
    """Lower-case, hyphenate, strip non-alphanumerics; append a random suffix
    so the unique `slug` constraint never collides on duplicate names."""
    base = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    base = base or "org"
    return f"{base}-{secrets.token_hex(3)}"


async def create_organization(
    conn: AsyncConnection, name: str, owner_user_id: str
) -> dict:
    """Insert an organization and its owner membership row.

    The DB trigger `add_creator_as_owner` is a no-op on a direct psycopg
    connection (auth.uid() is NULL), so we insert the owner membership here.
    The trigger's `on conflict do nothing` keeps this safe if auth.uid() is
    ever populated.
    """
    async with dict_cursor(conn) as cur:
        await cur.execute(
            "insert into organizations (name, slug) values (%(name)s, %(slug)s) "
            f"returning {_COLUMNS}",
            {"name": name, "slug": _slugify(name)},
        )
        org = await cur.fetchone()
        assert org is not None
        await cur.execute(
            "insert into organization_members (organization_id, user_id, role) "
            "values (%(org_id)s, %(user_id)s, 'owner') "
            "on conflict (organization_id, user_id) do nothing",
            {"org_id": org["id"], "user_id": owner_user_id},
        )
        return org


async def get_organization(conn: AsyncConnection, org_id: str) -> dict | None:
    async with dict_cursor(conn) as cur:
        await cur.execute(
            f"select {_COLUMNS} from organizations where id = %(org_id)s",
            {"org_id": org_id},
        )
        return await cur.fetchone()
```

- [ ] **Step 4: Implement the invitations repository**

`invitations` is org-scoped (`organization_id`), but `get_invitation_by_token` is intentionally **not** org-scoped — the accept flow only has the token, not an org context. The token is a url-safe random string; `expires_at` is seven days out.

Create `app/repositories/invitations.py`:

```python
"""SQL data-access for the `invitations` table."""
from __future__ import annotations

import secrets

from psycopg import AsyncConnection

from app.repositories._common import dict_cursor

_COLUMNS = (
    "id, organization_id, email, role, token, expires_at, accepted_at"
)


async def create_invitation(
    conn: AsyncConnection, org_id: str, email: str, role: str
) -> dict:
    """Create a pending invitation with a random token, expiring in 7 days."""
    async with dict_cursor(conn) as cur:
        await cur.execute(
            "insert into invitations "
            "(organization_id, email, role, token, expires_at) values "
            "(%(org_id)s, %(email)s, %(role)s, %(token)s, now() + interval '7 days') "
            f"returning {_COLUMNS}",
            {
                "org_id": org_id,
                "email": email,
                "role": role,
                "token": secrets.token_urlsafe(32),
            },
        )
        row = await cur.fetchone()
        assert row is not None
        return row


async def list_invitations(conn: AsyncConnection, org_id: str) -> list[dict]:
    """Pending (not yet accepted) invitations for the org."""
    async with dict_cursor(conn) as cur:
        await cur.execute(
            f"select {_COLUMNS} from invitations "
            "where organization_id = %(org_id)s and accepted_at is null "
            "order by id",
            {"org_id": org_id},
        )
        return await cur.fetchall()


async def get_invitation_by_token(
    conn: AsyncConnection, token: str
) -> dict | None:
    """Look up an invitation by token. NOT org-scoped: the accept flow has
    only the token. Callers must still validate expiry / accepted_at."""
    async with dict_cursor(conn) as cur:
        await cur.execute(
            f"select {_COLUMNS} from invitations where token = %(token)s",
            {"token": token},
        )
        return await cur.fetchone()


async def mark_accepted(conn: AsyncConnection, invitation_id: str) -> None:
    """Stamp `accepted_at = now()` so the invitation can no longer be used."""
    async with dict_cursor(conn) as cur:
        await cur.execute(
            "update invitations set accepted_at = now() "
            "where id = %(invitation_id)s",
            {"invitation_id": invitation_id},
        )
```

- [ ] **Step 5: Implement the members repository**

`list_members` joins `organization_members` to `auth.users` for the member's email. `add_member` upserts so re-adding (e.g. an invite acceptance) is idempotent.

Create `app/repositories/members.py`:

```python
"""SQL data-access for the `organization_members` table."""
from __future__ import annotations

from psycopg import AsyncConnection

from app.repositories._common import dict_cursor


async def list_members(conn: AsyncConnection, org_id: str) -> list[dict]:
    """All members of the org, each with their auth.users email."""
    async with dict_cursor(conn) as cur:
        await cur.execute(
            "select om.user_id::text as user_id, u.email, om.role, om.created_at "
            "from organization_members om "
            "join auth.users u on u.id = om.user_id "
            "where om.organization_id = %(org_id)s "
            "order by om.created_at",
            {"org_id": org_id},
        )
        return await cur.fetchall()


async def add_member(
    conn: AsyncConnection, org_id: str, user_id: str, role: str
) -> dict:
    """Add (or, on conflict, refresh the role of) an org member."""
    async with dict_cursor(conn) as cur:
        await cur.execute(
            "insert into organization_members (organization_id, user_id, role) "
            "values (%(org_id)s, %(user_id)s, %(role)s) "
            "on conflict (organization_id, user_id) "
            "do update set role = excluded.role "
            "returning organization_id, user_id::text as user_id, role, created_at",
            {"org_id": org_id, "user_id": user_id, "role": role},
        )
        row = await cur.fetchone()
        assert row is not None
        return row


async def update_member_role(
    conn: AsyncConnection, org_id: str, user_id: str, role: str
) -> dict | None:
    """Change a member's role. Returns None if the member is not in the org."""
    async with dict_cursor(conn) as cur:
        await cur.execute(
            "update organization_members set role = %(role)s "
            "where organization_id = %(org_id)s and user_id = %(user_id)s "
            "returning organization_id, user_id::text as user_id, role, created_at",
            {"org_id": org_id, "user_id": user_id, "role": role},
        )
        return await cur.fetchone()


async def remove_member(
    conn: AsyncConnection, org_id: str, user_id: str
) -> bool:
    """Delete a member. Returns True if a row was removed, False otherwise."""
    async with dict_cursor(conn) as cur:
        await cur.execute(
            "delete from organization_members "
            "where organization_id = %(org_id)s and user_id = %(user_id)s",
            {"org_id": org_id, "user_id": user_id},
        )
        return cur.rowcount > 0
```

- [ ] **Step 6: Run the test and confirm all three CRUD round-trips PASS**

```bash
venv/bin/pytest tests/test_repo_org_invite_member.py -q
```
Expected: `3 passed` (or `3 skipped` without `SUPABASE_DB_URL`).

- [ ] **Step 7: Commit**

```bash
git add app/repositories/organizations.py app/repositories/invitations.py app/repositories/members.py tests/test_repo_org_invite_member.py
git commit -m "feat(repositories): add organizations, invitations, members repositories"
```

---

### Task C12: Organization and invitation endpoints

**Files:**
- Modify: `app/api/v1/endpoints/recruiter.py`
- Test: covered in Task C14

`recruiter.py` after Task C6 has the repository imports and request models. This task adds the org-bootstrap and invitation routes. `POST /organizations` and `POST /invitations/{token}/accept` use the identity-only `get_verified_user_id` from Task C10 because the caller may have no membership yet. The other two routes use `get_current_context`.

- [ ] **Step 1: Extend the imports in `recruiter.py`**

In `app/api/v1/endpoints/recruiter.py`, extend the auth import and add the three new repositories. Change:

```python
from app.auth.supabase import Context, get_current_context
from app.repositories import jobs as jobs_repo
from app.repositories import candidates as candidates_repo
```

to:

```python
from app.auth.supabase import Context, get_current_context, get_verified_user_id
from app.repositories import jobs as jobs_repo
from app.repositories import candidates as candidates_repo
from app.repositories import applications as applications_repo
from app.repositories import organizations as orgs_repo
from app.repositories import invitations as invites_repo
from app.repositories import members as members_repo
```

(`applications_repo` is used by Task C13; importing it here keeps the import block in one edit.)

- [ ] **Step 2: Add the request models**

After the `CandidateCreateRequest` model already in the file, add:

```python
class OrganizationCreateRequest(BaseModel):
    name: str


class InvitationCreateRequest(BaseModel):
    email: str
    role: str = "recruiter"
```

- [ ] **Step 3: Add the organization and invitation routes**

Append these routes to `recruiter.py`. The owner/admin guard is a small inline check on `ctx.role`.

```python
@router.post("/organizations", status_code=201)
async def create_organization(
    request: OrganizationCreateRequest,
    user_id: str = Depends(get_verified_user_id),
):
    """Create a new organization. The caller becomes its owner. Uses
    identity-only auth because a first-time user has no membership yet."""
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Organization name is required")
    async with db_conn() as conn:
        org = await orgs_repo.create_organization(
            conn, name=name, owner_user_id=user_id
        )
        await conn.commit()
    return {"id": str(org["id"]), "name": org["name"], "slug": org["slug"]}


@router.get("/invitations")
async def list_invitations(ctx: Context = Depends(get_current_context)):
    """Pending invitations for the caller's organization."""
    async with db_conn() as conn:
        rows = await invites_repo.list_invitations(conn, ctx.org_id)
    return [
        {
            "id": str(r["id"]),
            "email": r["email"],
            "role": r["role"],
            "token": r["token"],
            "expires_at": r["expires_at"],
        }
        for r in rows
    ]


@router.post("/invitations", status_code=201)
async def create_invitation(
    request: InvitationCreateRequest,
    ctx: Context = Depends(get_current_context),
):
    """Create an invitation. Owner/admin only. The recruiter shares the
    returned token link manually — no email is sent in this slice."""
    if ctx.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=403, detail="Only owners and admins can invite members"
        )
    async with db_conn() as conn:
        invite = await invites_repo.create_invitation(
            conn, ctx.org_id, email=request.email, role=request.role
        )
        await conn.commit()
    return {
        "id": str(invite["id"]),
        "email": invite["email"],
        "role": invite["role"],
        "token": invite["token"],
        "expires_at": invite["expires_at"],
    }


@router.post("/invitations/{token}/accept")
async def accept_invitation(
    token: str,
    user_id: str = Depends(get_verified_user_id),
):
    """Accept an invitation: add the caller as a member, mark it accepted.
    Identity-only auth — the invitee has no membership in the org yet.
    Returns 404 for a missing, expired, or already-accepted token."""
    async with db_conn() as conn:
        invite = await invites_repo.get_invitation_by_token(conn, token)
        if invite is None or invite["accepted_at"] is not None:
            raise HTTPException(status_code=404, detail="Invitation not found")
        async with conn.cursor() as cur:
            await cur.execute("select now() > %(exp)s as expired",
                              {"exp": invite["expires_at"]})
            row = await cur.fetchone()
        if row and row[0]:
            raise HTTPException(status_code=404, detail="Invitation not found")

        await members_repo.add_member(
            conn, invite["organization_id"], user_id=user_id, role=invite["role"]
        )
        await invites_repo.mark_accepted(conn, invite["id"])
        org = await orgs_repo.get_organization(conn, invite["organization_id"])
        await conn.commit()
    if org is None:
        raise HTTPException(status_code=404, detail="Invitation not found")
    return {"id": str(org["id"]), "name": org["name"]}
```

> **404 for expired/accepted, not 410/403:** the spec's isolation principle is "don't leak existence." An expired or already-used token is treated identically to a missing one. `accepted_at is not None` covers the already-accepted case before the membership is touched, so accepting twice is a clean 404.

- [ ] **Step 4: Confirm the app still imports and routes register**

```bash
venv/bin/python -c "from app.main import app; paths = {r.path for r in app.routes}; assert any(p.endswith('/organizations') for p in paths), 'org route missing'; assert any('/invitations' in p for p in paths), 'invite routes missing'; print('ok')"
```
Expected output: `ok`

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/endpoints/recruiter.py
git commit -m "feat(recruiter): add organization and invitation endpoints"
```

---

### Task C13: Member and application endpoints

**Files:**
- Modify: `app/api/v1/endpoints/recruiter.py`
- Test: covered in Task C14

This task adds the team-management and application routes, and removes the mock `move_candidate_stage` route that Task C6 left on `recruiter_ats_service` — `PATCH /applications/{id}` replaces it.

- [ ] **Step 1: Add the application request model**

After the `InvitationCreateRequest` model added in Task C12, add:

```python
class ApplicationCreateRequest(BaseModel):
    candidate_id: str
    job_id: str


class MemberRoleUpdateRequest(BaseModel):
    role: str


class ApplicationUpdateRequest(BaseModel):
    stage: str | None = None
    ai_score: float | None = None
    recommendation: str | None = None
```

- [ ] **Step 2: Remove the mock `move_candidate_stage` route**

In `recruiter.py`, delete the entire `move_candidate_stage` route (the `@router.post("/candidates/{candidate_id}/move-stage" ...)` handler that calls `recruiter_ats_service.move_candidate_stage`). Stage moves now go through `PATCH /applications/{application_id}`. `CandidateStageMoveRequest` may become an unused import — if `recruiter.py` no longer references it, remove it from the `app.schemas.recruiter` import list (run the import check in Step 5 to catch a stale reference).

- [ ] **Step 3: Add the member routes**

Append to `recruiter.py`:

```python
@router.get("/members")
async def list_members(ctx: Context = Depends(get_current_context)):
    """List the caller's organization members."""
    async with db_conn() as conn:
        rows = await members_repo.list_members(conn, ctx.org_id)
    return [
        {"user_id": r["user_id"], "email": r["email"], "role": r["role"]}
        for r in rows
    ]


@router.patch("/members/{user_id}")
async def update_member(
    user_id: str,
    request: MemberRoleUpdateRequest,
    ctx: Context = Depends(get_current_context),
):
    """Change a member's role. Owner/admin only."""
    if ctx.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=403, detail="Only owners and admins can change roles"
        )
    async with db_conn() as conn:
        updated = await members_repo.update_member_role(
            conn, ctx.org_id, user_id, role=request.role
        )
        await conn.commit()
    if updated is None:
        raise HTTPException(status_code=404, detail="Member not found")
    return {
        "user_id": updated["user_id"],
        "role": updated["role"],
    }


@router.delete("/members/{user_id}", status_code=204)
async def remove_member(
    user_id: str, ctx: Context = Depends(get_current_context)
):
    """Remove a member from the organization. Owner/admin only."""
    if ctx.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=403, detail="Only owners and admins can remove members"
        )
    async with db_conn() as conn:
        removed = await members_repo.remove_member(conn, ctx.org_id, user_id)
        await conn.commit()
    if not removed:
        raise HTTPException(status_code=404, detail="Member not found")
    return None
```

- [ ] **Step 4: Add the application routes**

Append to `recruiter.py`:

```python
@router.post("/applications", status_code=201)
async def create_application(
    request: ApplicationCreateRequest,
    ctx: Context = Depends(get_current_context),
):
    """Create an application linking a candidate to a job in the org."""
    async with db_conn() as conn:
        row = await applications_repo.create_application(
            conn, ctx.org_id,
            data={
                "candidate_id": request.candidate_id,
                "job_id": request.job_id,
                "owner_id": ctx.user_id,
            },
        )
        await conn.commit()
    return row


@router.patch("/applications/{application_id}")
async def update_application(
    application_id: str,
    request: ApplicationUpdateRequest,
    ctx: Context = Depends(get_current_context),
):
    """Update an application's stage / ai_score / recommendation.
    Replaces the old mock move-stage route. 404 if not in the caller's org."""
    async with db_conn() as conn:
        row = await applications_repo.update_application(
            conn, ctx.org_id, application_id,
            data=request.model_dump(exclude_unset=True),
        )
        await conn.commit()
    if row is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return row


@router.get("/jobs/{job_id}/candidates")
async def list_job_candidates(
    job_id: str, ctx: Context = Depends(get_current_context)
):
    """Candidate rows for everyone who applied to a job — applications joined
    to candidates, scoped to the caller's org."""
    async with db_conn() as conn:
        from app.repositories._common import dict_cursor
        async with dict_cursor(conn) as cur:
            await cur.execute(
                "select c.id, c.full_name, c.email, c.phone, c.current_role, "
                "c.current_company, c.source, c.created_at "
                "from applications a "
                "join candidates c on c.id = a.candidate_id "
                "where a.organization_id = %(org_id)s and a.job_id = %(job_id)s "
                "order by a.created_at desc",
                {"org_id": ctx.org_id, "job_id": job_id},
            )
            return await cur.fetchall()


@router.get("/candidates/{candidate_id}/applications")
async def list_candidate_applications(
    candidate_id: str, ctx: Context = Depends(get_current_context)
):
    """A candidate's applications, each enriched with the job title."""
    async with db_conn() as conn:
        from app.repositories._common import dict_cursor
        async with dict_cursor(conn) as cur:
            await cur.execute(
                "select a.id, a.candidate_id, a.job_id, a.stage, a.ai_score, "
                "a.recommendation, a.owner_id, a.created_at, a.updated_at, "
                "j.title as job_title "
                "from applications a "
                "join jobs j on j.id = a.job_id "
                "where a.organization_id = %(org_id)s "
                "and a.candidate_id = %(candidate_id)s "
                "order by a.created_at desc",
                {"org_id": ctx.org_id, "candidate_id": candidate_id},
            )
            return await cur.fetchall()
```

> `list_job_candidates` and `list_candidate_applications` are joins, not single-table reads, so they run inline `dict_cursor` SQL rather than calling a repository function. Both still filter `a.organization_id = %(org_id)s`, so org isolation holds: a candidate id or job id from another org yields an empty list.

- [ ] **Step 5: Confirm the app still imports and the mock route is gone**

```bash
venv/bin/python -c "from app.main import app; paths = {(m, r.path) for r in app.routes for m in getattr(r, 'methods', [])}; assert ('PATCH', '/api/v1/recruiter/applications/{application_id}') in paths or any(p.endswith('/applications/{application_id}') and m == 'PATCH' for m, p in paths), 'patch application route missing'; assert not any(p.endswith('/move-stage') for _, p in paths), 'mock move-stage route still present'; print('ok')"
```
Expected output: `ok`

- [ ] **Step 6: Commit**

```bash
git add app/api/v1/endpoints/recruiter.py
git commit -m "feat(recruiter): add member and application endpoints, drop mock move-stage"
```

---

### Task C14: Endpoint tests for orgs, invitations, members, and applications

**Files:**
- Test: `backend/tests/test_org_invite_app_endpoints.py`

End-to-end endpoint tests over the Task C12/C13 routes, using the Phase C conftest fixtures (`seed_org_a`, `seed_org_b`, `auth_headers_a`, `auth_headers_b`). `POST /organizations` and `POST /invitations/{token}/accept` use `get_verified_user_id`, which the conftest does **not** override — so those two tests install their own override on `get_verified_user_id`.

- [ ] **Step 1: Write the endpoint tests**

Create `backend/tests/test_org_invite_app_endpoints.py`:

```python
"""Endpoint tests for org-bootstrap, invitations, members, and applications."""
import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.db import db_conn
from app.repositories import jobs as jobs_repo
from app.repositories import candidates as candidates_repo
from app.repositories import applications as applications_repo

pytestmark = pytest.mark.asyncio

API = settings.API_V1_STR


async def test_create_organization_endpoint(seed_org_a):
    """POST /organizations creates an org and makes the caller its owner.
    Uses get_verified_user_id, so this test overrides that dependency."""
    from app.auth.supabase import get_verified_user_id

    user_id = seed_org_a["user_id"]

    async def _fake_user_id() -> str:
        return user_id

    app.dependency_overrides[get_verified_user_id] = _fake_user_id
    created_org_id = None
    try:
        client = TestClient(app)
        resp = client.post(f"{API}/recruiter/organizations", json={"name": "Acme Talent"})
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["name"] == "Acme Talent"
        assert body["slug"].startswith("acme-talent")
        created_org_id = body["id"]
    finally:
        app.dependency_overrides.pop(get_verified_user_id, None)
        if created_org_id:
            async with db_conn() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(
                        "delete from organizations where id = %s", (created_org_id,)
                    )
                await conn.commit()


async def test_invitation_create_then_accept_round_trip(seed_org_a, auth_headers_a):
    """Owner creates an invitation; a fresh user accepts it and joins the org."""
    from app.auth.supabase import get_verified_user_id

    client = TestClient(app)

    # 1. Owner (auth_headers_a override) creates the invitation.
    create = client.post(
        f"{API}/recruiter/invitations",
        headers=auth_headers_a,
        json={"email": "invitee@example.com", "role": "recruiter"},
    )
    assert create.status_code == 201, create.text
    token = create.json()["token"]
    assert token

    # It shows up in the pending list.
    pending = client.get(f"{API}/recruiter/invitations", headers=auth_headers_a)
    assert pending.status_code == 200
    assert any(i["token"] == token for i in pending.json())

    # 2. A brand-new user accepts it. Seed the auth.users row, override
    #    get_verified_user_id to that new user.
    new_user_id = str(uuid.uuid4())
    async with db_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "insert into auth.users (id, email) values (%s, %s) "
                "on conflict (id) do nothing",
                (new_user_id, "invitee@example.com"),
            )
        await conn.commit()

    async def _fake_user_id() -> str:
        return new_user_id

    app.dependency_overrides[get_verified_user_id] = _fake_user_id
    try:
        accept = client.post(f"{API}/recruiter/invitations/{token}/accept")
        assert accept.status_code == 200, accept.text
        assert accept.json()["id"] == seed_org_a["org_id"]

        # Accepting again is a clean 404 (already accepted).
        again = client.post(f"{API}/recruiter/invitations/{token}/accept")
        assert again.status_code == 404
    finally:
        app.dependency_overrides.pop(get_verified_user_id, None)
        async with db_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "delete from organization_members where user_id = %s",
                    (new_user_id,),
                )
                await cur.execute("delete from auth.users where id = %s", (new_user_id,))
            await conn.commit()

    # The accepted invitee now appears in the members list.
    members = client.get(f"{API}/recruiter/members", headers=auth_headers_a)
    assert members.status_code == 200
    # (the invitee row was cleaned up above; the owner is always present)
    assert any(m["role"] == "owner" for m in members.json())


async def test_accept_unknown_token_is_404(seed_org_a):
    """An unknown invitation token returns 404, never 500."""
    from app.auth.supabase import get_verified_user_id

    async def _fake_user_id() -> str:
        return seed_org_a["user_id"]

    app.dependency_overrides[get_verified_user_id] = _fake_user_id
    try:
        client = TestClient(app)
        resp = client.post(f"{API}/recruiter/invitations/does-not-exist/accept")
        assert resp.status_code == 404, resp.text
    finally:
        app.dependency_overrides.pop(get_verified_user_id, None)


async def test_create_application_then_patch_stage(seed_org_a, auth_headers_a):
    """POST /applications then PATCH /applications/{id} round-trips the stage."""
    org_id = seed_org_a["org_id"]
    user_id = seed_org_a["user_id"]
    async with db_conn() as conn:
        job = await jobs_repo.create_job(
            conn, org_id, created_by=user_id,
            data={"title": "Data Engineer", "description": "Pipelines."},
        )
        candidate = await candidates_repo.create_candidate(
            conn, org_id,
            data={"full_name": "Margaret H.", "email": "maggie@example.com"},
        )
        await conn.commit()

    client = TestClient(app)
    create = client.post(
        f"{API}/recruiter/applications",
        headers=auth_headers_a,
        json={"candidate_id": str(candidate["id"]), "job_id": str(job["id"])},
    )
    assert create.status_code == 201, create.text
    app_id = create.json()["id"]
    assert create.json()["stage"] == "new"

    patched = client.patch(
        f"{API}/recruiter/applications/{app_id}",
        headers=auth_headers_a,
        json={"stage": "screening", "ai_score": 77.5, "recommendation": "Advance"},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["stage"] == "screening"
    assert float(patched.json()["ai_score"]) == 77.5

    # The candidate shows up under the job's applicants.
    applicants = client.get(
        f"{API}/recruiter/jobs/{job['id']}/candidates", headers=auth_headers_a
    )
    assert applicants.status_code == 200
    assert any(c["id"] == str(candidate["id"]) for c in applicants.json())

    # And the application shows up under the candidate, with the job title.
    apps = client.get(
        f"{API}/recruiter/candidates/{candidate['id']}/applications",
        headers=auth_headers_a,
    )
    assert apps.status_code == 200
    assert any(
        a["id"] == app_id and a["job_title"] == "Data Engineer"
        for a in apps.json()
    )


async def test_patch_application_cross_org_is_404(
    seed_org_a, seed_org_b, auth_headers_a
):
    """Org B owns the application; org A's user PATCHing it gets 404, not 403."""
    # Create the application entirely under org B.
    async with db_conn() as conn:
        job = await jobs_repo.create_job(
            conn, seed_org_b["org_id"], created_by=seed_org_b["user_id"],
            data={"title": "Org B Role", "description": "hidden"},
        )
        candidate = await candidates_repo.create_candidate(
            conn, seed_org_b["org_id"],
            data={"full_name": "Org B Person", "email": "b-person@example.com"},
        )
        application = await applications_repo.create_application(
            conn, seed_org_b["org_id"],
            data={"candidate_id": candidate["id"], "job_id": job["id"]},
        )
        await conn.commit()
        app_id = str(application["id"])

    # auth_headers_a -> request runs as org A's owner.
    client = TestClient(app)
    resp = client.patch(
        f"{API}/recruiter/applications/{app_id}",
        headers=auth_headers_a,
        json={"stage": "rejected"},
    )
    assert resp.status_code == 404, resp.text
    assert resp.status_code != 403
```

- [ ] **Step 2: Run the new endpoint tests and confirm they PASS**

```bash
venv/bin/pytest tests/test_org_invite_app_endpoints.py -q
```
Expected: `5 passed` (or `5 skipped` without `SUPABASE_DB_URL`). A `403` in the cross-org test is a real isolation leak — fix `update_application`'s org filter, not the test.

- [ ] **Step 3: Run the entire backend suite as a regression gate**

```bash
venv/bin/pytest -q
```
Expected: all previously-passing tests plus the new repo/endpoint tests pass; DB-backed tests `skipped` if `SUPABASE_DB_URL` is unset. No collection errors, no `ModuleNotFoundError`.

- [ ] **Step 4: Commit**

```bash
git add tests/test_org_invite_app_endpoints.py
git commit -m "test(backend): endpoint tests for orgs, invitations, members, applications"
```

---

## Phase D — Frontend auth & data wiring

This phase replaces mock auth and `mockData.ts` in `platform-web/` with real Supabase authentication and live FastAPI calls: it wires up the Supabase SSR client, a typed `apiFetch` wrapper, signup/login/invite pages, route protection, an org switcher, and live data on the jobs, candidates, and settings pages — then proves org isolation with Playwright. All commands run from `platform-web/` unless noted; the warm cream/lime/ink theme in `globals.css` already exists, so new pages reuse the existing `Button`, `Card`, `Badge`, `EmptyState` components and tokens (`bg-surface`, `bg-card`, `text-ink`, `border-border`, `bg-accent`, `font-serif`) — no theme work.

---

### Task D1: Install Supabase libraries and add env vars

**Files:**
- Modify: `platform-web/package.json` (via npm)
- Modify: `platform-web/.env.local.example`

- [ ] **Step 1: Install the two Supabase packages**
Run from `platform-web/`:
```bash
npm install @supabase/ssr@latest @supabase/supabase-js@latest
```
Expected output ends with a line like `added 2 packages` (or `changed`/`audited`) and no `npm error`. Confirm `package.json` now lists both under `dependencies`:
```bash
node -e "const p=require('./package.json');console.log(p.dependencies['@supabase/ssr'],p.dependencies['@supabase/supabase-js'])"
```
Expected output: two version strings, e.g. `^0.7.0 ^2.x.x`.

- [ ] **Step 2: Write the env-var template**
Overwrite `platform-web/.env.local.example` with the exact three frontend vars Phase D depends on:
```bash
cat > .env.local.example <<'EOF'
# FastAPI backend base URL (Vercel Project B). No trailing slash.
NEXT_PUBLIC_API_URL=http://localhost:8000

# Supabase project (ref redgbugvyoidjwhovmxa)
NEXT_PUBLIC_SUPABASE_URL=https://redgbugvyoidjwhovmxa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EOF
```
Then create your real local file so `npm run dev` works (this file is gitignored — never commit it):
```bash
test -f .env.local || cp .env.local.example .env.local
```
Expected: `.env.local.example` contains exactly the three `NEXT_PUBLIC_*` vars.

- [ ] **Step 3: Commit**
From repo root:
```bash
git add platform-web/package.json platform-web/package-lock.json platform-web/.env.local.example
git commit -m "chore(web): install @supabase/ssr and add frontend env vars"
```

---

### Task D2: Create the Supabase browser and server clients

**Files:**
- Create: `platform-web/src/lib/supabase/client.ts`
- Create: `platform-web/src/lib/supabase/server.ts`

- [ ] **Step 1: Create the browser client**
This is used inside Client Components (signup, login, org switcher). Write `platform-web/src/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components / browser code.
 * Reads the public env vars; safe to ship to the browser.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 2: Create the server client**
This is used in Server Components, the route guard, and Server Actions. It reads/writes auth cookies via Next.js 16 async `cookies()`. Write `platform-web/src/lib/supabase/server.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components / Server Actions / route guards.
 * Next.js 16: cookies() is async and must be awaited.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component (read-only cookie store).
            // Safe to ignore: the middleware refreshes the session.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3: Verify it compiles**
Run from `platform-web/`:
```bash
npx tsc --noEmit
```
Expected: exits with code 0, no errors mentioning `src/lib/supabase/`.

- [ ] **Step 4: Commit**
From repo root:
```bash
git add platform-web/src/lib/supabase/client.ts platform-web/src/lib/supabase/server.ts
git commit -m "feat(web): add Supabase browser and server SSR clients"
```

---

### Task D3: Rewrite `src/lib/api.ts` as the typed `apiFetch` wrapper

The current `src/lib/api.ts` (read it first — it has `API_BASE_URL`, `requestJson`, and five dashboard endpoint stubs) is being fully replaced. The new file exports `apiFetch<T>`, an `ApiError` class, and shared API types.

**Files:**
- Modify: `platform-web/src/lib/api.ts` (full rewrite)

- [ ] **Step 1: Overwrite `src/lib/api.ts`**
Replace the entire contents of `platform-web/src/lib/api.ts` with:
```ts
import { createClient } from "@/lib/supabase/client";

/** Base URL of the FastAPI backend (Vercel Project B). */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Thrown on any non-2xx API response. */
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** Reads the active org id from the `active_org_id` cookie (browser only). */
function readActiveOrgId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith("active_org_id="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

/**
 * Typed fetch wrapper for the FastAPI backend.
 * Injects `Authorization: Bearer <supabase access_token>` and
 * `X-Organization-Id: <active org id>` on every request.
 * Throws `ApiError` (with `.status`) on non-2xx.
 *
 * Browser-only: relies on the Supabase browser client and document.cookie.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  const orgId = readActiveOrgId();
  if (orgId) {
    headers.set("X-Organization-Id", orgId);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => null);
    }
    const detail =
      body && typeof body === "object" && "detail" in body
        ? String((body as { detail: unknown }).detail)
        : `Request failed with ${res.status}`;
    throw new ApiError(res.status, detail, body);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/* ---- Shared API response types (match the FastAPI backend) ---- */

export interface Membership {
  org_id: string;
  name: string;
  role: "owner" | "admin" | "recruiter" | "hiring_manager" | "interviewer";
}

export interface MeResponse {
  user_id: string;
  email: string;
  memberships: Membership[];
}

export interface Job {
  id: string;
  organization_id: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  description: string;
  requirements: string[];
  status: "draft" | "open" | "paused" | "closed";
  created_at: string;
}

export interface Candidate {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  current_role: string | null;
  current_company: string | null;
  source: string;
  created_at: string;
}

export interface OrgMember {
  user_id: string;
  email: string;
  role: Membership["role"];
}
```

- [ ] **Step 2: Verify nothing else imports the deleted functions**
The old file exported `getRecruiterDashboard`, `listRecruiterJobs`, `listRecruiterCandidates`, `moveCandidateStage`, `sendInterviewInvite`, `API_BASE_URL`. Confirm they are not used anywhere else (the dashboard pages currently use `mockData`, not these):
```bash
grep -rn "getRecruiterDashboard\|listRecruiterJobs\|listRecruiterCandidates\|moveCandidateStage\|sendInterviewInvite\|API_BASE_URL" src/ ; echo "exit:$?"
```
Expected output: `exit:1` (no matches). If any match appears, that file is rewired in a later task in this phase — note it but proceed.

- [ ] **Step 3: Lint and commit**
Run from `platform-web/`:
```bash
npm run lint
```
Expected: `✔ No ESLint warnings or errors` (or no output for `src/lib/api.ts`). Then from repo root:
```bash
git add platform-web/src/lib/api.ts
git commit -m "feat(web): rewrite api.ts as typed apiFetch with auth headers"
```

---

### Task D4: Add the route guard for `(dashboard)` routes

A server-component guard in `(dashboard)/layout.tsx` keeps the implementation small and explicit (no `middleware.ts`/`proxy.ts` is added). It loads the session server-side and redirects unauthenticated users to `/login`.

**Files:**
- Create: `platform-web/src/app/(dashboard)/auth-guard.tsx`
- Modify: `platform-web/src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Create the server guard component**
This is an async Server Component that the (client) dashboard layout cannot itself be — it wraps the layout. Write `platform-web/src/app/(dashboard)/auth-guard.tsx`:
```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side guard for all (dashboard) routes.
 * Redirects unauthenticated visitors to /login before any dashboard UI renders.
 */
export default async function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Wrap the dashboard layout body with the guard**
In `platform-web/src/app/(dashboard)/layout.tsx`, the file is a `"use client"` component, so it cannot be `async`. Instead, render the guard *around* its output. Add the import at the top, just below the existing `usePathname` import line:
```tsx
import AuthGuard from "./auth-guard";
```
Then change the `return` statement so the whole tree is wrapped. Replace the opening line:
```tsx
    return (
        <div className="flex min-h-screen bg-surface text-ink">
```
with:
```tsx
    return (
      <AuthGuard>
        <div className="flex min-h-screen bg-surface text-ink">
```
and the matching closing `</div>` at the end of the component:
```tsx
        </div>
    );
}
```
with:
```tsx
        </div>
      </AuthGuard>
    );
}
```
Note: a client component can render a Server Component passed as `children`, and `AuthGuard` here is imported and used directly — Next.js 16 allows a client component to import and render an async server component only when that server component receives no client props; `AuthGuard` takes only `children`, so this is valid. If the build complains, fall back to wrapping in the route-group: instead create `(dashboard)/layout-guard.tsx` as the async default export that renders `<AuthGuard><DashboardLayout>{children}</DashboardLayout></AuthGuard>` — but try Step 2 first.

- [ ] **Step 3: Build to confirm the RSC boundary is valid**
Run from `platform-web/`:
```bash
npm run build
```
Expected: build completes with `✓ Compiled successfully`. If it errors with an async-component-in-client-component message, apply the fallback noted in Step 2.

- [ ] **Step 4: Commit**
From repo root:
```bash
git add "platform-web/src/app/(dashboard)/auth-guard.tsx" "platform-web/src/app/(dashboard)/layout.tsx"
git commit -m "feat(web): redirect unauthenticated users away from dashboard"
```

---

### Task D5: Build the signup page

A new `(auth)/signup` page: signs the user up via Supabase, then calls the backend to create the organization + owner membership. The org-creation endpoint lives at `POST /api/v1/recruiter/organizations` (built in a backend phase) and returns `{ id, name }`.

**Files:**
- Create: `platform-web/src/app/(auth)/signup/page.tsx`

- [ ] **Step 1: Create the signup page**
Write `platform-web/src/app/(auth)/signup/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const supabase = createClient();

    // 1. Create the Supabase auth user and sign in.
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpError) {
      setError(signUpError.message);
      setIsLoading(false);
      return;
    }

    // 2. Create the organization + owner membership on the backend.
    try {
      const org = await apiFetch<{ id: string; name: string }>(
        "/api/v1/recruiter/organizations",
        { method: "POST", body: JSON.stringify({ name: orgName }) },
      );
      // 3. Make the new org the active org.
      document.cookie = `active_org_id=${org.id}; path=/; max-age=31536000; samesite=lax`;
    } catch (err) {
      setError(
        err instanceof Error
          ? `Account created but org setup failed: ${err.message}`
          : "Org setup failed",
      );
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
      <Card className="w-full max-w-md p-10">
        <h1 className="font-serif text-3xl text-ink mb-1 tracking-tight">
          Create your workspace
        </h1>
        <p className="text-ink-2 mb-8">
          Set up your recruiting organization in under a minute.
        </p>

        {error && (
          <div role="alert" aria-live="polite" className="mb-4 text-danger text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="orgName" className="block text-sm font-medium text-ink mb-1">
              Organization name
            </label>
            <input
              id="orgName"
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-card text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Acme Talent"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-card text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-card text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="At least 8 characters"
            />
          </div>

          <Button variant="primary" type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 aria-hidden="true" className="animate-spin w-4 h-4 mr-2" />
                Creating workspace…
              </>
            ) : (
              "Create workspace"
            )}
          </Button>
        </form>

        <p className="text-sm text-ink-2 mt-6 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-ink underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Lint and commit**
Run from `platform-web/`:
```bash
npm run lint
```
Expected: no errors. From repo root:
```bash
git add "platform-web/src/app/(auth)/signup/page.tsx"
git commit -m "feat(web): add signup page with org creation"
```

---

### Task D6: Rewrite the login page with real Supabase auth

Replace the hardcoded-credentials `setTimeout` mock (lines 24–48 of the current file) with a real `signInWithPassword` call. The `useAppStore` zustand import is dropped — auth state now lives in the Supabase session.

**Files:**
- Modify: `platform-web/src/app/(auth)/login/page.tsx` (rewrite the logic; keep the existing layout/markup)

- [ ] **Step 1: Overwrite the login page**
Replace the entire contents of `platform-web/src/app/(auth)/login/page.tsx` with:
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, type MeResponse } from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
      return;
    }

    // Set the active org cookie from the user's first membership
    // (the org switcher in the header can change it later).
    try {
      const me = await apiFetch<MeResponse>("/api/v1/auth/me");
      if (me.memberships.length > 0) {
        document.cookie = `active_org_id=${me.memberships[0].org_id}; path=/; max-age=31536000; samesite=lax`;
      }
    } catch {
      // Non-fatal: dashboard pages will surface a clearer error if needed.
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
      <Card className="w-full max-w-md p-10">
        <h1 className="font-serif text-3xl text-ink mb-1 tracking-tight">Welcome back</h1>
        <p className="text-ink-2 mb-8">Sign in to your recruiter workspace</p>

        {error && (
          <div role="alert" aria-live="polite" className="mb-4 text-danger text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-card text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 pr-10 rounded-md border border-border bg-card text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2"
              >
                {showPassword ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <Button variant="primary" type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 aria-hidden="true" className="animate-spin w-4 h-4 mr-2" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="text-sm text-ink-2 mt-6 text-center">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-ink underline underline-offset-2">
            Create account
          </Link>
        </p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Lint and commit**
Run from `platform-web/`:
```bash
npm run lint
```
Expected: no errors. From repo root:
```bash
git add "platform-web/src/app/(auth)/login/page.tsx"
git commit -m "feat(web): replace mock login with Supabase auth"
```

---

### Task D7: Build the invite-accept page

A new dynamic route `(auth)/invite/[token]` that accepts an invitation. It requires the visitor to be signed in (or to sign up first), then calls `POST /api/v1/recruiter/invitations/{token}/accept` which creates the membership row and returns the org.

**Files:**
- Create: `platform-web/src/app/(auth)/invite/[token]/page.tsx`

- [ ] **Step 1: Create the invite-accept page**
Write `platform-web/src/app/(auth)/invite/[token]/page.tsx`:
```tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

export default function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [error, setError] = useState("");
  const [needsSignup, setNeedsSignup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleAccept() {
    setError("");
    setIsLoading(true);

    // Must be signed in to accept an invite.
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setNeedsSignup(true);
      setIsLoading(false);
      return;
    }

    try {
      const org = await apiFetch<{ id: string; name: string }>(
        `/api/v1/recruiter/invitations/${token}/accept`,
        { method: "POST" },
      );
      document.cookie = `active_org_id=${org.id}; path=/; max-age=31536000; samesite=lax`;
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError("This invitation is invalid or has expired.");
      } else {
        setError(err instanceof Error ? err.message : "Could not accept invitation.");
      }
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
      <Card className="w-full max-w-md p-10 text-center">
        <h1 className="font-serif text-3xl text-ink mb-1 tracking-tight">
          You&apos;re invited
        </h1>
        <p className="text-ink-2 mb-8">
          Accept this invitation to join the recruiting workspace.
        </p>

        {error && (
          <div role="alert" aria-live="polite" className="mb-4 text-danger text-sm">
            {error}
          </div>
        )}

        {needsSignup ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-2">
              Create an account or sign in first, then return to this link.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href={`/signup?redirect=/invite/${token}`}
                className="inline-flex h-10 items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-accent-ink hover:brightness-95"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center rounded-md border border-border px-5 text-sm font-medium text-ink hover:bg-surface-muted"
              >
                Sign in
              </Link>
            </div>
          </div>
        ) : (
          <Button
            variant="primary"
            className="w-full"
            onClick={handleAccept}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 aria-hidden="true" className="animate-spin w-4 h-4 mr-2" />
                Accepting…
              </>
            ) : (
              "Accept invitation"
            )}
          </Button>
        )}
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Lint and commit**
Run from `platform-web/`:
```bash
npm run lint
```
Expected: no errors. From repo root:
```bash
git add "platform-web/src/app/(auth)/invite/[token]/page.tsx"
git commit -m "feat(web): add invite-accept page"
```

---

### Task D8: Add the org switcher to the dashboard header

The dashboard header (in `(dashboard)/layout.tsx`) gains an org switcher between the search bar and the notification bell. It fetches memberships from `/api/v1/auth/me`, shows the active org, and on selection writes the `active_org_id` cookie and reloads so all data refetches under the new org.

**Files:**
- Create: `platform-web/src/components/layout/OrgSwitcher.tsx`
- Modify: `platform-web/src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Create the OrgSwitcher component**
Write `platform-web/src/components/layout/OrgSwitcher.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Building2 } from "lucide-react";
import { apiFetch, type MeResponse, type Membership } from "@/lib/api";

function getActiveOrgId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith("active_org_id="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

export function OrgSwitcher() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<MeResponse>("/api/v1/auth/me")
      .then((me) => {
        if (cancelled) return;
        setMemberships(me.memberships);
        const current = getActiveOrgId();
        const valid = me.memberships.some((m) => m.org_id === current);
        if (valid && current) {
          setActiveOrgId(current);
        } else if (me.memberships.length > 0) {
          // Fall back to first membership and persist it.
          const first = me.memberships[0].org_id;
          document.cookie = `active_org_id=${first}; path=/; max-age=31536000; samesite=lax`;
          setActiveOrgId(first);
        }
      })
      .catch(() => {
        /* header still renders; data pages surface their own errors */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function selectOrg(orgId: string) {
    document.cookie = `active_org_id=${orgId}; path=/; max-age=31536000; samesite=lax`;
    // Hard reload so every Server Component and apiFetch picks up the new org.
    window.location.reload();
  }

  const active = memberships.find((m) => m.org_id === activeOrgId);

  if (memberships.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
      >
        <Building2 size={16} className="text-ink-3" />
        <span className="max-w-40 truncate">{active?.name ?? "Select org"}</span>
        <ChevronDown size={14} className="text-ink-3" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-md border border-border bg-card shadow-card"
        >
          {memberships.map((m) => (
            <li key={m.org_id}>
              <button
                type="button"
                role="option"
                aria-selected={m.org_id === activeOrgId}
                onClick={() => selectOrg(m.org_id)}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-muted ${
                  m.org_id === activeOrgId ? "font-semibold text-ink" : "text-ink-2"
                }`}
              >
                <span className="truncate">{m.name}</span>
                <span className="ml-2 shrink-0 text-xs text-ink-3 capitalize">
                  {m.role}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Mount the switcher in the dashboard header**
In `platform-web/src/app/(dashboard)/layout.tsx`, add the import below the `lucide-react` import block:
```tsx
import { OrgSwitcher } from "@/components/layout/OrgSwitcher";
```
Then in the `<header>`, find the right-side container:
```tsx
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/notifications" className="relative rounded-full border border-border bg-card p-2 text-ink-2 transition-colors hover:bg-surface-muted">
```
and insert the switcher as the first child of that `div`:
```tsx
                    <div className="flex items-center gap-3">
                        <OrgSwitcher />
                        <Link href="/dashboard/notifications" className="relative rounded-full border border-border bg-card p-2 text-ink-2 transition-colors hover:bg-surface-muted">
```

- [ ] **Step 3: Make Sign Out clear the session**
The current "Sign Out" link in the sidebar is a plain `<Link href="/">`. It must clear the Supabase session. Replace the sign-out block:
```tsx
                        <Link href="/" className="flex items-center gap-3 rounded-full px-3 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10">
                            <LogOut size={20} />
                            Sign Out
                        </Link>
```
with a button that signs out:
```tsx
                        <button
                            type="button"
                            onClick={async () => {
                                const { createClient } = await import("@/lib/supabase/client");
                                await createClient().auth.signOut();
                                document.cookie = "active_org_id=; path=/; max-age=0";
                                window.location.href = "/login";
                            }}
                            className="flex w-full items-center gap-3 rounded-full px-3 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
                        >
                            <LogOut size={20} />
                            Sign Out
                        </button>
```

- [ ] **Step 4: Lint, build, commit**
Run from `platform-web/`:
```bash
npm run lint && npm run build
```
Expected: no lint errors, `✓ Compiled successfully`. From repo root:
```bash
git add platform-web/src/components/layout/OrgSwitcher.tsx "platform-web/src/app/(dashboard)/layout.tsx"
git commit -m "feat(web): add org switcher and real sign-out to dashboard"
```

---

### Task D9: Wire the jobs list page to live data

Replace `mockJobs` in `(dashboard)/dashboard/jobs/page.tsx` with a live fetch to `GET /api/v1/recruiter/jobs`. Use the existing theme tokens and the `Card`/`Button`/`EmptyState` components; the current page uses stale blue/gray Tailwind classes — switch them to the warm tokens while wiring.

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/jobs/page.tsx` (full rewrite)

- [ ] **Step 1: Overwrite the jobs list page**
Replace the entire contents of `platform-web/src/app/(dashboard)/dashboard/jobs/page.tsx` with:
```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, MapPin, Briefcase, Loader2 } from "lucide-react";
import { apiFetch, type Job } from "@/lib/api";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";

const STATUS_TONE: Record<Job["status"], "success" | "neutral" | "warning"> = {
  open: "success",
  draft: "neutral",
  paused: "warning",
  closed: "neutral",
};

function formatSalary(job: Job): string {
  if (job.salary_min == null && job.salary_max == null) return "Not specified";
  const fmt = (n: number) => `${job.currency} ${(n / 1000).toFixed(0)}k`;
  if (job.salary_min != null && job.salary_max != null)
    return `${fmt(job.salary_min)} – ${fmt(job.salary_max)}`;
  return fmt((job.salary_min ?? job.salary_max)!);
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch<Job[]>("/api/v1/recruiter/jobs")
      .then((data) => {
        if (!cancelled) {
          setJobs(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load jobs");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredJobs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return jobs.filter(
      (job) =>
        job.title.toLowerCase().includes(q) ||
        (job.location ?? "").toLowerCase().includes(q) ||
        (job.department ?? "").toLowerCase().includes(q),
    );
  }, [jobs, searchQuery]);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-ink">Jobs</h1>
          <p className="text-ink-2">Manage your job postings and hiring pipelines.</p>
        </div>
        <Link
          href="/dashboard/jobs/new"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-accent-ink hover:brightness-95"
        >
          <Plus size={18} /> New Job
        </Link>
      </div>

      <Card className="mb-6 flex items-center justify-between !p-4">
        <div className="relative w-96">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
            size={18}
          />
          <input
            type="text"
            placeholder="Search jobs, locations…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-border bg-card py-2 pl-10 pr-4 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </Card>

      {loading && (
        <div className="flex items-center gap-2 py-16 text-ink-3">
          <Loader2 className="animate-spin" size={18} /> Loading jobs…
        </div>
      )}

      {error && !loading && (
        <div role="alert" className="py-16 text-center text-danger">
          {error}
        </div>
      )}

      {!loading && !error && filteredJobs.length === 0 && (
        <EmptyState
          title="No jobs yet"
          body="Post your first opening to start collecting applications."
          action={{ label: "Create a job", href: "/dashboard/jobs/new" }}
        />
      )}

      {!loading && !error && filteredJobs.length > 0 && (
        <div className="grid gap-4">
          {filteredJobs.map((job) => (
            <Card key={job.id} className="transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-soft text-ink">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{job.title}</h3>
                    <div className="mt-1 flex items-center gap-4 text-sm text-ink-3">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} /> {job.location ?? "Remote"}
                      </span>
                      <span>{formatSalary(job)}</span>
                      <span className="rounded bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-2">
                        {job.employment_type}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge tone={STATUS_TONE[job.status]} className="capitalize">
                  {job.status}
                </Badge>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border-card pt-4">
                <span className="text-sm text-ink-3">{job.department ?? "—"}</span>
                <Link
                  href={`/dashboard/jobs/${job.id}`}
                  className="text-sm font-medium text-ink underline underline-offset-2"
                >
                  View Details
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Lint and commit**
Run from `platform-web/`:
```bash
npm run lint
```
Expected: no errors. From repo root:
```bash
git add "platform-web/src/app/(dashboard)/dashboard/jobs/page.tsx"
git commit -m "feat(web): wire jobs list to live API"
```

---

### Task D10: Wire the new-job page to the API and remove the `alert()`

The current `jobs/new/page.tsx` calls `alert("This is a demo…")`. Replace `handleSubmit` with a real `POST /api/v1/recruiter/jobs`, and convert the stale blue/gray markup to warm tokens.

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/jobs/new/page.tsx` (full rewrite)

- [ ] **Step 1: Overwrite the new-job page**
Replace the entire contents of `platform-web/src/app/(dashboard)/dashboard/jobs/new/page.tsx` with:
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { apiFetch, type Job } from "@/lib/api";
import { Card } from "@/components/Card";

const INPUT =
  "w-full h-10 px-3 rounded-md border border-border bg-card text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent";

export default function NewJobPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    department: "",
    location: "Remote",
    employment_type: "Full-time",
    salary_min: "",
    salary_max: "",
    description: "",
    requirements: "",
  });

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const payload = {
      title: formData.title,
      department: formData.department || null,
      location: formData.location || null,
      employment_type: formData.employment_type,
      salary_min: formData.salary_min ? Number(formData.salary_min) : null,
      salary_max: formData.salary_max ? Number(formData.salary_max) : null,
      description: formData.description,
      requirements: formData.requirements
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
      status: "open",
    };

    try {
      const job = await apiFetch<Job>("/api/v1/recruiter/jobs", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push(`/dashboard/jobs/${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <Link
        href="/dashboard/jobs"
        className="mb-6 flex items-center text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs
      </Link>

      <div className="mb-8">
        <h1 className="font-serif text-3xl tracking-tight text-ink">Create New Job</h1>
        <p className="text-ink-2">
          Post a new opening to start collecting applications.
        </p>
      </div>

      {error && (
        <div role="alert" aria-live="polite" className="mb-4 text-sm text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-6 !p-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="title" className="mb-1 block text-sm font-medium text-ink">
                Job Title
              </label>
              <input
                id="title"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Senior Frontend Engineer"
                className={INPUT}
                required
              />
            </div>
            <div>
              <label
                htmlFor="department"
                className="mb-1 block text-sm font-medium text-ink"
              >
                Department
              </label>
              <input
                id="department"
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g. Engineering"
                className={INPUT}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="location"
                className="mb-1 block text-sm font-medium text-ink"
              >
                Location
              </label>
              <input
                id="location"
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className={INPUT}
              />
            </div>
            <div>
              <label
                htmlFor="employment_type"
                className="mb-1 block text-sm font-medium text-ink"
              >
                Type
              </label>
              <select
                id="employment_type"
                name="employment_type"
                value={formData.employment_type}
                onChange={handleChange}
                className={INPUT}
              >
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
                <option>Internship</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="salary_min"
                className="mb-1 block text-sm font-medium text-ink"
              >
                Salary Min (USD)
              </label>
              <input
                id="salary_min"
                type="number"
                name="salary_min"
                value={formData.salary_min}
                onChange={handleChange}
                placeholder="e.g. 120000"
                className={INPUT}
              />
            </div>
            <div>
              <label
                htmlFor="salary_max"
                className="mb-1 block text-sm font-medium text-ink"
              >
                Salary Max (USD)
              </label>
              <input
                id="salary_max"
                type="number"
                name="salary_max"
                value={formData.salary_max}
                onChange={handleChange}
                placeholder="e.g. 150000"
                className={INPUT}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium text-ink"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Describe the role and responsibilities…"
            />
          </div>

          <div>
            <label
              htmlFor="requirements"
              className="mb-1 block text-sm font-medium text-ink"
            >
              Key Requirements (comma-separated)
            </label>
            <textarea
              id="requirements"
              name="requirements"
              value={formData.requirements}
              onChange={handleChange}
              rows={2}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g. React, TypeScript, Node.js, 5+ years experience"
            />
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Link
            href="/dashboard/jobs"
            className="inline-flex h-10 items-center rounded-md border border-border px-5 text-sm font-medium text-ink hover:bg-surface-muted"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-accent-ink hover:brightness-95 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Publishing…
              </>
            ) : (
              <>
                <Save size={18} /> Publish Job
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Confirm the `alert()` is gone**
```bash
grep -rn "alert(" "src/app/(dashboard)/dashboard/jobs/" ; echo "exit:$?"
```
Expected output: `exit:1` (no matches).

- [ ] **Step 3: Lint and commit**
Run from `platform-web/`:
```bash
npm run lint
```
Expected: no errors. From repo root:
```bash
git add "platform-web/src/app/(dashboard)/dashboard/jobs/new/page.tsx"
git commit -m "feat(web): post new jobs to API and remove demo alert"
```

---

### Task D11: Wire the job-detail page to live data

Replace `mockJobs`/`mockCandidates` in `jobs/[id]/page.tsx` with `GET /api/v1/recruiter/jobs/{id}` and `GET /api/v1/recruiter/jobs/{id}/candidates`. A backend 404 (job belongs to another org, or does not exist) renders a "Job not found" state — this is the org-isolation behaviour Playwright verifies in Task D17.

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/jobs/[id]/page.tsx` (full rewrite)

- [ ] **Step 1: Overwrite the job-detail page**
Replace the entire contents of `platform-web/src/app/(dashboard)/dashboard/jobs/[id]/page.tsx` with:
```tsx
"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Users, Loader2 } from "lucide-react";
import { apiFetch, ApiError, type Job, type Candidate } from "@/lib/api";
import { Card } from "@/components/Card";

function formatSalary(job: Job): string {
  if (job.salary_min == null && job.salary_max == null) return "Not specified";
  const fmt = (n: number) => `${job.currency} ${(n / 1000).toFixed(0)}k`;
  if (job.salary_min != null && job.salary_max != null)
    return `${fmt(job.salary_min)} – ${fmt(job.salary_max)}`;
  return fmt((job.salary_min ?? job.salary_max)!);
}

export default function JobDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch<Job>(`/api/v1/recruiter/jobs/${id}`),
      apiFetch<Candidate[]>(`/api/v1/recruiter/jobs/${id}/candidates`),
    ])
      .then(([j, c]) => {
        if (cancelled) return;
        setJob(j);
        setCandidates(c);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load job");
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-ink-3">
        <Loader2 className="animate-spin" size={18} /> Loading job…
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="p-8">
        <Link
          href="/dashboard/jobs"
          className="mb-6 flex items-center text-ink-3 hover:text-ink"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs
        </Link>
        <Card>
          <p className="font-serif text-2xl italic text-ink">Job not found</p>
          <p className="mt-2 text-ink-2">
            This job does not exist or belongs to another organization.
          </p>
        </Card>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div role="alert" className="p-8 text-danger">
        {error || "Job not found"}
      </div>
    );
  }

  return (
    <div className="p-8">
      <Link
        href="/dashboard/jobs"
        className="mb-6 flex items-center text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs
      </Link>

      <Card className="mb-8 !p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="mb-2 font-serif text-3xl tracking-tight text-ink">
              {job.title}
            </h1>
            <div className="mb-4 flex items-center gap-4 text-ink-3">
              <span className="flex items-center gap-1">
                <MapPin size={16} /> {job.location ?? "Remote"}
              </span>
              <span>{formatSalary(job)}</span>
              <span className="rounded bg-accent-soft px-2 py-0.5 text-xs font-medium text-ink">
                {job.employment_type}
              </span>
            </div>
            <p className="max-w-2xl text-ink-2">{job.description}</p>
            {job.requirements.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {job.requirements.map((r) => (
                  <span
                    key={r}
                    className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-ink-2"
                  >
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-3">
              Total Candidates
            </div>
            <div className="font-serif text-4xl text-ink">{candidates.length}</div>
          </div>
        </div>
      </Card>

      <Card className="!p-0">
        <div className="flex items-center gap-2 border-b border-border-card p-4">
          <Users size={18} className="text-ink-3" />
          <h3 className="font-semibold text-ink">Candidates</h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-surface text-xs font-medium uppercase text-ink-3">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Current Role</th>
              <th className="px-6 py-3">Source</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.id} className="border-b border-border-card">
                <td className="px-6 py-3 font-medium text-ink">{c.full_name}</td>
                <td className="px-6 py-3 text-sm text-ink-2">{c.email}</td>
                <td className="px-6 py-3 text-sm text-ink-2">
                  {c.current_role ?? "—"}
                </td>
                <td className="px-6 py-3 text-sm text-ink-2">{c.source}</td>
                <td className="px-6 py-3">
                  <Link
                    href={`/dashboard/candidates/${c.id}`}
                    className="text-sm font-medium text-ink underline underline-offset-2"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {candidates.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-ink-3">
                  No candidates for this job yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Lint and commit**
Run from `platform-web/`:
```bash
npm run lint
```
Expected: no errors. From repo root:
```bash
git add "platform-web/src/app/(dashboard)/dashboard/jobs/[id]/page.tsx"
git commit -m "feat(web): wire job detail page to live API"
```

---

### Task D12: Wire the candidates list page to live data

Replace `mockCandidates`/`mockJobs` in `candidates/page.tsx` with `GET /api/v1/recruiter/candidates`. The backend `Candidate` type has no `score`/`status`/`risk_level` fields (those are application-level and out of scope this slice), so the metric strip and stage/risk filters are dropped — keep a clean searchable table.

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/candidates/page.tsx` (full rewrite)

- [ ] **Step 1: Overwrite the candidates list page**
Replace the entire contents of `platform-web/src/app/(dashboard)/dashboard/candidates/page.tsx` with:
```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import { apiFetch, type Candidate } from "@/lib/api";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch<Candidate[]>("/api/v1/recruiter/candidates")
      .then((data) => {
        if (!cancelled) {
          setCandidates(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load candidates");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return candidates.filter((c) =>
      [c.full_name, c.email, c.current_role ?? "", c.current_company ?? "", c.source]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [candidates, searchQuery]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl tracking-tight text-ink">
          Candidate Pipeline
        </h1>
        <p className="text-ink-2">
          Screen and review candidates across your organization.
        </p>
      </div>

      <Card className="mb-6 !p-4">
        <div className="relative w-full xl:w-[34rem]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
            size={18}
          />
          <input
            type="text"
            placeholder="Search candidate, role, company, source…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-border bg-card py-2 pl-10 pr-4 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </Card>

      {loading && (
        <div className="flex items-center gap-2 py-16 text-ink-3">
          <Loader2 className="animate-spin" size={18} /> Loading candidates…
        </div>
      )}

      {error && !loading && (
        <div role="alert" className="py-16 text-center text-danger">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          title="No candidates yet"
          body="Candidates will appear here once they are added to your organization."
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface text-xs font-medium uppercase text-ink-3">
                <tr>
                  <th className="px-6 py-3">Candidate</th>
                  <th className="px-6 py-3">Current Role</th>
                  <th className="px-6 py-3">Company</th>
                  <th className="px-6 py-3">Source</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border-card">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-bold text-surface">
                          {initials(c.full_name)}
                        </div>
                        <div>
                          <Link
                            href={`/dashboard/candidates/${c.id}`}
                            className="font-medium text-ink underline-offset-2 hover:underline"
                          >
                            {c.full_name}
                          </Link>
                          <p className="text-xs text-ink-3">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-ink-2">
                      {c.current_role ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-sm text-ink-2">
                      {c.current_company ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-sm text-ink-2">{c.source}</td>
                    <td className="px-6 py-3">
                      <Link
                        href={`/dashboard/candidates/${c.id}`}
                        className="text-sm font-medium text-ink underline underline-offset-2"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border-card p-4 text-sm text-ink-3">
            Showing {filtered.length} candidate{filtered.length === 1 ? "" : "s"}
          </div>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Lint and commit**
Run from `platform-web/`:
```bash
npm run lint
```
Expected: no errors. From repo root:
```bash
git add "platform-web/src/app/(dashboard)/dashboard/candidates/page.tsx"
git commit -m "feat(web): wire candidates list to live API"
```

---

### Task D13: Wire the candidate-detail page to live data

Replace `mockCandidates`/`mockJobs` in `candidates/[id]/page.tsx` with `GET /api/v1/recruiter/candidates/{id}`. The rich mock-only sections (identity verification, career analytics, score breakdown) are not backed by the slice-1 `candidates` table — keep only what the real `Candidate` type supports and add a "Coming in Slice 2" pill for the AI/verification surfaces.

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/candidates/[id]/page.tsx` (full rewrite)

- [ ] **Step 1: Overwrite the candidate-detail page**
Replace the entire contents of `platform-web/src/app/(dashboard)/dashboard/candidates/[id]/page.tsx` with:
```tsx
"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Briefcase, Building, Loader2 } from "lucide-react";
import { apiFetch, ApiError, type Candidate } from "@/lib/api";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";

export default function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch<Candidate>(`/api/v1/recruiter/candidates/${id}`)
      .then((c) => {
        if (cancelled) return;
        setCandidate(c);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load candidate");
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-ink-3">
        <Loader2 className="animate-spin" size={18} /> Loading candidate…
      </div>
    );
  }

  if (notFound || (!candidate && !error)) {
    return (
      <div className="p-8">
        <Link
          href="/dashboard/candidates"
          className="mb-6 flex items-center text-ink-3 hover:text-ink"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Candidates
        </Link>
        <Card>
          <p className="font-serif text-2xl italic text-ink">Candidate not found</p>
          <p className="mt-2 text-ink-2">
            This candidate does not exist or belongs to another organization.
          </p>
        </Card>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div role="alert" className="p-8 text-danger">
        {error || "Candidate not found"}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <Link
        href="/dashboard/candidates"
        className="mb-6 flex items-center text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Candidates
      </Link>

      <Card className="mb-8 !p-8">
        <div className="flex items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-ink text-2xl font-bold text-surface">
            {candidate.full_name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <h1 className="mb-1 font-serif text-3xl tracking-tight text-ink">
              {candidate.full_name}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-ink-2">
              <span className="flex items-center gap-1">
                <Mail size={16} /> {candidate.email}
              </span>
              {candidate.current_role && (
                <span className="flex items-center gap-1">
                  <Briefcase size={16} /> {candidate.current_role}
                </span>
              )}
              {candidate.current_company && (
                <span className="flex items-center gap-1">
                  <Building size={16} /> {candidate.current_company}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold text-ink">Candidate Details</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-3">Phone</dt>
              <dd className="text-ink">{candidate.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Source</dt>
              <dd className="text-ink">{candidate.source}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Added</dt>
              <dd className="text-ink">
                {new Date(candidate.created_at).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-ink">AI Resume Analysis</h3>
            <Badge tone="accent">Coming in Slice 2</Badge>
          </div>
          <p className="text-sm text-ink-2">
            Resume scoring, skills match, and identity verification land in the next
            slice. This candidate&apos;s core record is live now.
          </p>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint and commit**
Run from `platform-web/`:
```bash
npm run lint
```
Expected: no errors. From repo root:
```bash
git add "platform-web/src/app/(dashboard)/dashboard/candidates/[id]/page.tsx"
git commit -m "feat(web): wire candidate detail page to live API"
```

---

### Task D14: Build the functional Team Members tab on the settings page

The settings page currently has a static "Team Members" sidebar button. Add a real Team Members panel: list members from `GET /api/v1/recruiter/members`, invite by email via `POST /api/v1/recruiter/invitations`, change role via `PATCH /api/v1/recruiter/members/{user_id}`, and remove via `DELETE /api/v1/recruiter/members/{user_id}`.

**Files:**
- Create: `platform-web/src/components/settings/TeamMembers.tsx`
- Modify: `platform-web/src/app/(dashboard)/dashboard/settings/page.tsx`

- [ ] **Step 1: Create the TeamMembers component**
Write `platform-web/src/components/settings/TeamMembers.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { apiFetch, type OrgMember } from "@/lib/api";

const ROLES: OrgMember["role"][] = [
  "owner",
  "admin",
  "recruiter",
  "hiring_manager",
  "interviewer",
];

const INPUT =
  "h-10 px-3 rounded-md border border-border bg-card text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent text-sm";

export function TeamMembers() {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgMember["role"]>("recruiter");
  const [inviting, setInviting] = useState(false);
  const [notice, setNotice] = useState("");

  function load() {
    setLoading(true);
    apiFetch<OrgMember[]>("/api/v1/recruiter/members")
      .then((data) => {
        setMembers(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load members");
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setInviting(true);
    try {
      const res = await apiFetch<{ token: string }>(
        "/api/v1/recruiter/invitations",
        {
          method: "POST",
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        },
      );
      const link = `${window.location.origin}/invite/${res.token}`;
      setNotice(`Invitation created. Share this link: ${link}`);
      setInviteEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(userId: string, role: OrgMember["role"]) {
    setError("");
    try {
      await apiFetch(`/api/v1/recruiter/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, role } : m)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function removeMember(userId: string) {
    setError("");
    try {
      await apiFetch(`/api/v1/recruiter/members/${userId}`, { method: "DELETE" });
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus size={18} className="text-ink-3" />
          <h2 className="text-lg font-bold text-ink">Invite a teammate</h2>
        </div>
        {notice && (
          <div className="mb-3 break-all rounded-md bg-accent-soft px-3 py-2 text-sm text-ink">
            {notice}
          </div>
        )}
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <label
              htmlFor="invite-email"
              className="mb-1 block text-sm font-medium text-ink"
            >
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com"
              className={`${INPUT} w-full`}
            />
          </div>
          <div>
            <label
              htmlFor="invite-role"
              className="mb-1 block text-sm font-medium text-ink"
            >
              Role
            </label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as OrgMember["role"])
              }
              className={INPUT}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-accent-ink hover:brightness-95 disabled:opacity-50"
          >
            {inviting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus size={16} />
            )}
            Send invite
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 text-lg font-bold text-ink">Team members</h2>
        {error && (
          <div role="alert" className="mb-3 text-sm text-danger">
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-ink-3">
            <Loader2 className="animate-spin" size={18} /> Loading members…
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="text-xs font-medium uppercase text-ink-3">
              <tr>
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.user_id} className="border-t border-border-card">
                  <td className="py-3 text-sm text-ink">{m.email}</td>
                  <td className="py-3">
                    <select
                      aria-label={`Role for ${m.email}`}
                      value={m.role}
                      onChange={(e) =>
                        changeRole(
                          m.user_id,
                          e.target.value as OrgMember["role"],
                        )
                      }
                      className={INPUT}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      aria-label={`Remove ${m.email}`}
                      onClick={() => removeMember(m.user_id)}
                      className="inline-flex items-center gap-1 text-sm text-danger hover:underline"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-ink-3">
                    No team members yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Make the settings page tabbed and mount TeamMembers**
Replace the entire contents of `platform-web/src/app/(dashboard)/dashboard/settings/page.tsx` with:
```tsx
"use client";

import { useState } from "react";
import { Building, User } from "lucide-react";
import { TeamMembers } from "@/components/settings/TeamMembers";

type Tab = "organization" | "team";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("organization");

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-2 font-serif text-3xl tracking-tight text-ink">Settings</h1>
      <p className="mb-8 text-ink-2">Manage your organization preferences.</p>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setTab("organization")}
            className={`flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left font-medium transition-colors ${
              tab === "organization"
                ? "bg-accent-soft text-ink"
                : "text-ink-2 hover:bg-surface-muted"
            }`}
          >
            <Building size={18} /> Organization
          </button>
          <button
            type="button"
            onClick={() => setTab("team")}
            className={`flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left font-medium transition-colors ${
              tab === "team"
                ? "bg-accent-soft text-ink"
                : "text-ink-2 hover:bg-surface-muted"
            }`}
          >
            <User size={18} /> Team Members
          </button>
        </div>

        <div className="md:col-span-2">
          {tab === "organization" ? (
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h2 className="mb-2 text-lg font-bold text-ink">
                Organization Profile
              </h2>
              <p className="text-sm text-ink-2">
                Organization profile editing arrives in a later slice. Use the Team
                Members tab to manage who has access.
              </p>
            </div>
          ) : (
            <TeamMembers />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Lint, build, commit**
Run from `platform-web/`:
```bash
npm run lint && npm run build
```
Expected: no lint errors, `✓ Compiled successfully`. From repo root:
```bash
git add platform-web/src/components/settings/TeamMembers.tsx "platform-web/src/app/(dashboard)/dashboard/settings/page.tsx"
git commit -m "feat(web): functional team members tab in settings"
```

---

### Task D15: Add a "Coming in Slice 2" pill to mock-data dashboard pages

Pages still rendering `mockData.ts` (pipeline, interviews, collaboration, communications, sourcing, automations, analytics, hiring-flow, notifications, profile, scorecard) must not pretend to be live. Add a small reusable pill component and place it at the top of each.

**Files:**
- Create: `platform-web/src/components/MockDataNotice.tsx`
- Modify: 11 dashboard pages (see Step 2)

- [ ] **Step 1: Create the notice component**
Write `platform-web/src/components/MockDataNotice.tsx`:
```tsx
import { Sparkles } from "lucide-react";

/**
 * Small pill shown on dashboard pages still backed by mockData.ts,
 * so the UI does not imply this data is live.
 */
export function MockDataNotice() {
  return (
    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-accent-soft px-3 py-1 text-xs font-medium text-ink">
      <Sparkles size={14} />
      Sample data — live data coming in Slice 2
    </div>
  );
}
```

- [ ] **Step 2: Insert the pill into each mock-data page**
For each of these 11 files, add the import and render `<MockDataNotice />` as the first child inside the page's outermost wrapper `<div>`:
```
src/app/(dashboard)/dashboard/pipeline/page.tsx
src/app/(dashboard)/dashboard/interviews/page.tsx
src/app/(dashboard)/dashboard/collaboration/page.tsx
src/app/(dashboard)/dashboard/communications/page.tsx
src/app/(dashboard)/dashboard/sourcing/page.tsx
src/app/(dashboard)/dashboard/automations/page.tsx
src/app/(dashboard)/dashboard/analytics/page.tsx
src/app/(dashboard)/dashboard/hiring-flow/page.tsx
src/app/(dashboard)/dashboard/notifications/page.tsx
src/app/(dashboard)/dashboard/profile/page.tsx
src/app/(dashboard)/dashboard/candidates/[id]/scorecard/page.tsx
```
In each file, add this import line after the existing `lucide-react` import:
```tsx
import { MockDataNotice } from "@/components/MockDataNotice";
```
Then, immediately inside the component's top-level returned `<div ...>` (each of these pages opens its return with a `<div className="...p-8...">` or similar), add as the very first child:
```tsx
      <MockDataNotice />
```
Confirm afterward that the dashboard home page also still uses `mockData` (it does — `mockAnalytics`, `mockCandidates`, `mockJobs`); add the import and `<MockDataNotice />` to `src/app/(dashboard)/dashboard/page.tsx` as the first child of its outer `<div className="space-y-8 p-8">` too.

- [ ] **Step 3: Verify every targeted page got the pill**
```bash
grep -rl "MockDataNotice" "src/app/(dashboard)/dashboard/" | sort
```
Expected: 12 file paths listed (the 11 above plus `dashboard/page.tsx`).

- [ ] **Step 4: Lint, build, commit**
Run from `platform-web/`:
```bash
npm run lint && npm run build
```
Expected: no lint errors, `✓ Compiled successfully`. From repo root:
```bash
git add platform-web/src/components/MockDataNotice.tsx "platform-web/src/app/(dashboard)/dashboard/"
git commit -m "feat(web): mark mock-data pages with Coming in Slice 2 pill"
```

---

### Task D16: Install and configure Playwright

**Files:**
- Create: `platform-web/playwright.config.ts`
- Modify: `platform-web/package.json` (scripts + devDependency)
- Modify: `platform-web/.gitignore`

- [ ] **Step 1: Install Playwright and its Chromium browser**
Run from `platform-web/`:
```bash
npm install -D @playwright/test@latest && npx playwright install chromium
```
Expected: `@playwright/test` added to `devDependencies`; the browser download finishes with `chromium ... downloaded`.

- [ ] **Step 2: Add the test script to `package.json`**
In `platform-web/package.json`, add a `test:e2e` entry to the `scripts` block so it reads:
```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test:e2e": "playwright test"
  },
```

- [ ] **Step 3: Create the Playwright config**
Write `platform-web/playwright.config.ts`:
```ts
import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for the recruiter web app.
 * Boots `next dev` automatically and runs tests against it.
 * Requires .env.local to point NEXT_PUBLIC_* at a working Supabase
 * project and a running FastAPI backend.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

- [ ] **Step 4: Ignore Playwright output**
Append to `platform-web/.gitignore`:
```
# Playwright
/test-results
/playwright-report
/blob-report
/playwright/.cache
```

- [ ] **Step 5: Commit**
From repo root:
```bash
git add platform-web/package.json platform-web/package-lock.json platform-web/playwright.config.ts platform-web/.gitignore
git commit -m "test(web): install and configure Playwright"
```

---

### Task D17: Write the happy-path and org-isolation E2E tests

Two tests: (1) a fresh user signs up, creates an org, posts a job, and sees it in the list; (2) a second user in a different org cannot see the first org's job. A small helper generates unique emails per run so tests are repeatable.

**Files:**
- Create: `platform-web/e2e/helpers.ts`
- Create: `platform-web/e2e/happy-path.spec.ts`
- Create: `platform-web/e2e/org-isolation.spec.ts`

- [ ] **Step 1: Create the test helper**
Write `platform-web/e2e/helpers.ts`:
```ts
import { expect, type Page } from "@playwright/test";

/** Unique email per test run so signup never collides. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}+${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.recruitai.test`;
}

/** Signs up a brand-new user and creates their organization. */
export async function signUpAndCreateOrg(
  page: Page,
  email: string,
  orgName: string,
): Promise<void> {
  await page.goto("/signup");
  await page.getByLabel("Organization name").fill(orgName);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("E2eTestPass123!");
  await page.getByRole("button", { name: "Create workspace" }).click();
  // Lands on the dashboard once signup + org creation succeed.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
}

/** Creates a job via the new-job form and waits for the detail page. */
export async function postJob(page: Page, title: string): Promise<void> {
  await page.goto("/dashboard/jobs/new");
  await page.getByLabel("Job Title").fill(title);
  await page.getByLabel("Department").fill("Engineering");
  await page.getByLabel("Description").fill("E2E created job.");
  await page.getByRole("button", { name: "Publish Job" }).click();
  await expect(page).toHaveURL(/\/dashboard\/jobs\/[0-9a-f-]+$/, {
    timeout: 30_000,
  });
}
```

- [ ] **Step 2: Create the happy-path test**
Write `platform-web/e2e/happy-path.spec.ts`:
```ts
import { test, expect } from "@playwright/test";
import { uniqueEmail, signUpAndCreateOrg, postJob } from "./helpers";

test("signup -> create org -> post job -> job appears in list", async ({
  page,
}) => {
  const email = uniqueEmail("happy");
  const jobTitle = `Senior Platform Engineer ${Date.now()}`;

  await signUpAndCreateOrg(page, email, "HappyPath Talent");
  await postJob(page, jobTitle);

  // The job is visible on the jobs list page.
  await page.goto("/dashboard/jobs");
  await expect(page.getByRole("heading", { name: jobTitle })).toBeVisible({
    timeout: 30_000,
  });
});
```

- [ ] **Step 3: Create the org-isolation test**
Write `platform-web/e2e/org-isolation.spec.ts`:
```ts
import { test, expect } from "@playwright/test";
import { uniqueEmail, signUpAndCreateOrg, postJob } from "./helpers";

test("a second org's user cannot see the first org's job", async ({
  browser,
}) => {
  const jobTitle = `Confidential Role ${Date.now()}`;

  // --- Org A: create a user, an org, and a job ---
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await signUpAndCreateOrg(pageA, uniqueEmail("orgA"), "Org Alpha");
  await postJob(pageA, jobTitle);
  // Capture Org A's job id from the detail URL.
  const jobUrl = pageA.url();
  const jobId = jobUrl.split("/").pop()!;
  await ctxA.close();

  // --- Org B: a different user in a different org ---
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await signUpAndCreateOrg(pageB, uniqueEmail("orgB"), "Org Beta");

  // Org B's jobs list must NOT contain Org A's job.
  await pageB.goto("/dashboard/jobs");
  await expect(
    pageB.getByRole("heading", { name: jobTitle }),
  ).toHaveCount(0);

  // Directly visiting Org A's job id renders the not-found state (API 404).
  await pageB.goto(`/dashboard/jobs/${jobId}`);
  await expect(pageB.getByText("Job not found")).toBeVisible({
    timeout: 30_000,
  });
  await ctxB.close();
});
```

- [ ] **Step 4: Run the suite**
Ensure the FastAPI backend is running and `.env.local` points `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_SUPABASE_*` at working services, then run from `platform-web/`:
```bash
npm run test:e2e
```
Expected: `2 passed`. If signup fails with a Supabase email-confirmation error, disable "Confirm email" for the project in Supabase Auth settings (test environment) and re-run.

- [ ] **Step 5: Commit**
From repo root:
```bash
git add platform-web/e2e/
git commit -m "test(web): add happy-path and org-isolation E2E tests"
```

---

### Task D18: Final verification

**Files:**
- None (verification only)

- [ ] **Step 1: Confirm no mock data leaks into wired pages**
Run from `platform-web/`:
```bash
grep -rn "mockJobs\|mockCandidates" "src/app/(dashboard)/dashboard/jobs/" "src/app/(dashboard)/dashboard/candidates/" "src/app/(dashboard)/dashboard/settings/" ; echo "exit:$?"
```
Expected output: `exit:1` (no matches — jobs, candidates, and settings are fully live).

- [ ] **Step 2: Confirm no stray `alert()` remains in the dashboard**
```bash
grep -rn "alert(" "src/app/(dashboard)/" ; echo "exit:$?"
```
Expected output: `exit:1` (no matches).

- [ ] **Step 3: Full lint + build gate**
Run from `platform-web/`:
```bash
npm run lint && npm run build
```
Expected: `✔ No ESLint warnings or errors` and `✓ Compiled successfully`. The `(auth)/signup`, `(auth)/login`, `(auth)/invite/[token]`, and the wired dashboard routes all appear in the route list with no errors.

- [ ] **Step 4: Commit any final fixes**
If Steps 1–3 surfaced fixes, stage the specific files and commit from repo root:
```bash
git add <specific changed files>
git commit -m "fix(web): resolve lint/build issues from data wiring"
```
If nothing changed, skip this step.
### Task D19: Add the `Application` type and an Applications section on the candidate-detail page

The slice's definition of done requires the recruiter to "see the candidate scored by AI and move the candidate between pipeline stages." Task D13 wired the candidate-detail page but only renders the core `Candidate` record. This task adds the `Application` type to `src/lib/api.ts` and extends `candidates/[id]/page.tsx` (the page created by Task D13) with an "Applications" section: it lists every application for the candidate (job title, stage Badge, AI score) and adds an "Assign to a job" control that creates a new application.

**Files:**
- Modify: `platform-web/src/lib/api.ts` (add the `Application` interface)
- Modify: `platform-web/src/app/(dashboard)/dashboard/candidates/[id]/page.tsx` (full rewrite — extends Task D13's page)

- [ ] **Step 1: Add the `Application` interface to `src/lib/api.ts`**
The shared API types live at the end of `src/lib/api.ts` (added in Task D3). Append a new `Application` interface after the existing `OrgMember` interface. Add this block at the end of the file:
```ts

export type AppStage =
  | "new"
  | "screening"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";

export interface Application {
  id: string;
  candidate_id: string;
  job_id: string;
  job_title: string;
  stage: AppStage;
  ai_score: number | null;
  recommendation: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Overwrite the candidate-detail page**
Replace the entire contents of `platform-web/src/app/(dashboard)/dashboard/candidates/[id]/page.tsx` with the version below. It keeps everything Task D13 created (header card, "Candidate Details" card, the "Coming in Slice 2" AI pill card) and adds an `<ApplicationsSection>` below the two-column grid. The section fetches `GET /candidates/{id}/applications`, lists each application, and offers a job picker (`GET /jobs`) plus an "Assign" button that `POST`s a new application and refreshes the list.
```tsx
"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Briefcase,
  Building,
  Loader2,
  Plus,
} from "lucide-react";
import {
  apiFetch,
  ApiError,
  type Candidate,
  type Application,
  type Job,
} from "@/lib/api";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";

function ApplicationsSection({ candidateId }: { candidateId: string }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch<Application[]>(
        `/api/v1/recruiter/candidates/${candidateId}/applications`,
      ),
      apiFetch<Job[]>("/api/v1/recruiter/jobs"),
    ])
      .then(([apps, jobList]) => {
        if (cancelled) return;
        setApplications(apps);
        setJobs(jobList);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load applications",
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  async function refreshApplications() {
    try {
      const apps = await apiFetch<Application[]>(
        `/api/v1/recruiter/candidates/${candidateId}/applications`,
      );
      setApplications(apps);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh applications",
      );
    }
  }

  async function handleAssign() {
    if (!selectedJobId) return;
    setAssignError("");
    setAssigning(true);
    try {
      await apiFetch<Application>("/api/v1/recruiter/applications", {
        method: "POST",
        body: JSON.stringify({
          candidate_id: candidateId,
          job_id: selectedJobId,
        }),
      });
      setSelectedJobId("");
      await refreshApplications();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAssignError("This candidate is already assigned to that job.");
      } else {
        setAssignError(
          err instanceof Error ? err.message : "Failed to assign job",
        );
      }
    } finally {
      setAssigning(false);
    }
  }

  // Jobs the candidate is not already applied to.
  const assignedJobIds = new Set(applications.map((a) => a.job_id));
  const availableJobs = jobs.filter((j) => !assignedJobIds.has(j.id));

  return (
    <Card className="mt-8 !p-0">
      <div className="flex items-center justify-between border-b border-border-card p-6">
        <div>
          <h3 className="font-semibold text-ink">Applications</h3>
          <p className="text-sm text-ink-2">
            Jobs this candidate has been put forward for.
          </p>
        </div>
      </div>

      <div className="border-b border-border-card p-6">
        <label
          htmlFor="assign-job"
          className="mb-1 block text-sm font-medium text-ink"
        >
          Assign to a job
        </label>
        {assignError && (
          <div role="alert" aria-live="polite" className="mb-2 text-sm text-danger">
            {assignError}
          </div>
        )}
        <div className="flex items-center gap-3">
          <select
            id="assign-job"
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            disabled={loading || availableJobs.length === 0}
            className="h-10 flex-1 rounded-md border border-border bg-card px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          >
            <option value="">
              {availableJobs.length === 0
                ? "No more jobs to assign"
                : "Select a job…"}
            </option>
            {availableJobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAssign}
            disabled={!selectedJobId || assigning}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-accent-ink hover:brightness-95 disabled:opacity-50"
          >
            {assigning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Assigning…
              </>
            ) : (
              <>
                <Plus size={16} /> Assign
              </>
            )}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 p-6 text-sm text-ink-3">
          <Loader2 className="animate-spin" size={16} /> Loading applications…
        </div>
      )}

      {error && !loading && (
        <div role="alert" className="p-6 text-sm text-danger">
          {error}
        </div>
      )}

      {!loading && !error && applications.length === 0 && (
        <p className="p-6 text-sm text-ink-2">
          This candidate is not assigned to any job yet.
        </p>
      )}

      {!loading && !error && applications.length > 0 && (
        <ul>
          {applications.map((app) => (
            <li
              key={app.id}
              className="flex items-center justify-between border-b border-border-card px-6 py-4 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-ink">
                  <Briefcase size={16} />
                </div>
                <Link
                  href={`/dashboard/jobs/${app.job_id}`}
                  className="text-sm font-medium text-ink underline underline-offset-2"
                >
                  {app.job_title}
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-ink-2">
                  {app.ai_score != null
                    ? `AI score ${app.ai_score.toFixed(0)}`
                    : "Not scored yet"}
                </span>
                <Badge tone="neutral" className="capitalize">
                  {app.stage}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch<Candidate>(`/api/v1/recruiter/candidates/${id}`)
      .then((c) => {
        if (cancelled) return;
        setCandidate(c);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load candidate");
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-ink-3">
        <Loader2 className="animate-spin" size={18} /> Loading candidate…
      </div>
    );
  }

  if (notFound || (!candidate && !error)) {
    return (
      <div className="p-8">
        <Link
          href="/dashboard/candidates"
          className="mb-6 flex items-center text-ink-3 hover:text-ink"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Candidates
        </Link>
        <Card>
          <p className="font-serif text-2xl italic text-ink">Candidate not found</p>
          <p className="mt-2 text-ink-2">
            This candidate does not exist or belongs to another organization.
          </p>
        </Card>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div role="alert" className="p-8 text-danger">
        {error || "Candidate not found"}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <Link
        href="/dashboard/candidates"
        className="mb-6 flex items-center text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Candidates
      </Link>

      <Card className="mb-8 !p-8">
        <div className="flex items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-ink text-2xl font-bold text-surface">
            {candidate.full_name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <h1 className="mb-1 font-serif text-3xl tracking-tight text-ink">
              {candidate.full_name}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-ink-2">
              <span className="flex items-center gap-1">
                <Mail size={16} /> {candidate.email}
              </span>
              {candidate.current_role && (
                <span className="flex items-center gap-1">
                  <Briefcase size={16} /> {candidate.current_role}
                </span>
              )}
              {candidate.current_company && (
                <span className="flex items-center gap-1">
                  <Building size={16} /> {candidate.current_company}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold text-ink">Candidate Details</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-3">Phone</dt>
              <dd className="text-ink">{candidate.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Source</dt>
              <dd className="text-ink">{candidate.source}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Added</dt>
              <dd className="text-ink">
                {new Date(candidate.created_at).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-ink">AI Resume Analysis</h3>
            <Badge tone="accent">Coming in Slice 2</Badge>
          </div>
          <p className="text-sm text-ink-2">
            Resume scoring, skills match, and identity verification land in the next
            slice. This candidate&apos;s core record is live now.
          </p>
        </Card>
      </div>

      <ApplicationsSection candidateId={id} />
    </div>
  );
}
```

- [ ] **Step 3: Verify the type is exported**
Run from `platform-web/`:
```bash
grep -n "export interface Application\|export type AppStage" src/lib/api.ts ; echo "exit:$?"
```
Expected output: two matching lines and `exit:0`.

- [ ] **Step 4: Lint and commit**
Run from `platform-web/`:
```bash
npm run lint
```
Expected: `✔ No ESLint warnings or errors` (or no output for the two changed files). From repo root:
```bash
git add platform-web/src/lib/api.ts "platform-web/src/app/(dashboard)/dashboard/candidates/[id]/page.tsx"
git commit -m "feat(web): list and create candidate applications on detail page"
```

---

### Task D20: Add an inline stage control to each application row

Task D19 renders each application's stage as a static Badge. This task replaces that Badge with an inline `<select>` of the six `app_stage` values plus a colored semantic indicator. Changing the select calls `PATCH /applications/{id}` with `{stage}` and updates the row optimistically — it reverts on an `ApiError`. This completes the spec's "move the candidate between pipeline stages" requirement.

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/candidates/[id]/page.tsx` (replace the `ApplicationsSection` component from Task D19)

- [ ] **Step 1: Replace the `ApplicationsSection` component**
In `platform-web/src/app/(dashboard)/dashboard/candidates/[id]/page.tsx`, replace the entire `ApplicationsSection` function (the component added in Task D19, starting at `function ApplicationsSection({ candidateId }: ...)` and ending at its closing `}`) with the version below. The rest of the file — the imports, `CandidateDetailPage`, and the `<ApplicationsSection candidateId={id} />` usage — stays unchanged. This version adds a `STAGE_TONE` map, a per-row `<StageControl>`, and an `updateStage` handler that mutates the row optimistically and reverts on failure.
```tsx
const APP_STAGES: AppStage[] = [
  "new",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
];

const STAGE_TONE: Record<
  AppStage,
  "neutral" | "info" | "warning" | "accent" | "success" | "danger"
> = {
  new: "neutral",
  screening: "info",
  interview: "warning",
  offer: "accent",
  hired: "success",
  rejected: "danger",
};

const STAGE_DOT: Record<AppStage, string> = {
  new: "bg-ink-3",
  screening: "bg-info",
  interview: "bg-warning",
  offer: "bg-accent",
  hired: "bg-success",
  rejected: "bg-danger",
};

function StageControl({
  application,
  onChange,
}: {
  application: Application;
  onChange: (id: string, stage: AppStage) => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);

  async function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextStage = e.target.value as AppStage;
    if (nextStage === application.stage) return;
    setUpdating(true);
    try {
      await onChange(application.id, nextStage);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${STAGE_DOT[application.stage]}`}
        title={STAGE_TONE[application.stage]}
      />
      {updating ? (
        <Loader2 className="h-4 w-4 animate-spin text-ink-3" />
      ) : null}
      <label className="sr-only" htmlFor={`stage-${application.id}`}>
        Stage for {application.job_title}
      </label>
      <select
        id={`stage-${application.id}`}
        value={application.stage}
        onChange={handleSelect}
        disabled={updating}
        className="h-9 rounded-md border border-border bg-card px-2 text-sm capitalize text-ink focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
      >
        {APP_STAGES.map((stage) => (
          <option key={stage} value={stage} className="capitalize">
            {stage}
          </option>
        ))}
      </select>
    </div>
  );
}

function ApplicationsSection({ candidateId }: { candidateId: string }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [stageError, setStageError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch<Application[]>(
        `/api/v1/recruiter/candidates/${candidateId}/applications`,
      ),
      apiFetch<Job[]>("/api/v1/recruiter/jobs"),
    ])
      .then(([apps, jobList]) => {
        if (cancelled) return;
        setApplications(apps);
        setJobs(jobList);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load applications",
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  async function refreshApplications() {
    try {
      const apps = await apiFetch<Application[]>(
        `/api/v1/recruiter/candidates/${candidateId}/applications`,
      );
      setApplications(apps);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh applications",
      );
    }
  }

  async function handleAssign() {
    if (!selectedJobId) return;
    setAssignError("");
    setAssigning(true);
    try {
      await apiFetch<Application>("/api/v1/recruiter/applications", {
        method: "POST",
        body: JSON.stringify({
          candidate_id: candidateId,
          job_id: selectedJobId,
        }),
      });
      setSelectedJobId("");
      await refreshApplications();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAssignError("This candidate is already assigned to that job.");
      } else {
        setAssignError(
          err instanceof Error ? err.message : "Failed to assign job",
        );
      }
    } finally {
      setAssigning(false);
    }
  }

  async function updateStage(applicationId: string, nextStage: AppStage) {
    setStageError("");
    // Capture the prior stage so we can revert on failure.
    const previous = applications.find((a) => a.id === applicationId)?.stage;
    // Optimistic update.
    setApplications((prev) =>
      prev.map((a) =>
        a.id === applicationId ? { ...a, stage: nextStage } : a,
      ),
    );
    try {
      const updated = await apiFetch<Application>(
        `/api/v1/recruiter/applications/${applicationId}`,
        { method: "PATCH", body: JSON.stringify({ stage: nextStage }) },
      );
      // Reconcile with the server's response.
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? updated : a)),
      );
    } catch (err) {
      // Revert the optimistic change.
      if (previous) {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === applicationId ? { ...a, stage: previous } : a,
          ),
        );
      }
      setStageError(
        err instanceof ApiError
          ? `Could not move stage: ${err.message}`
          : "Could not move stage.",
      );
    }
  }

  // Jobs the candidate is not already applied to.
  const assignedJobIds = new Set(applications.map((a) => a.job_id));
  const availableJobs = jobs.filter((j) => !assignedJobIds.has(j.id));

  return (
    <Card className="mt-8 !p-0">
      <div className="flex items-center justify-between border-b border-border-card p-6">
        <div>
          <h3 className="font-semibold text-ink">Applications</h3>
          <p className="text-sm text-ink-2">
            Jobs this candidate has been put forward for.
          </p>
        </div>
      </div>

      <div className="border-b border-border-card p-6">
        <label
          htmlFor="assign-job"
          className="mb-1 block text-sm font-medium text-ink"
        >
          Assign to a job
        </label>
        {assignError && (
          <div role="alert" aria-live="polite" className="mb-2 text-sm text-danger">
            {assignError}
          </div>
        )}
        <div className="flex items-center gap-3">
          <select
            id="assign-job"
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            disabled={loading || availableJobs.length === 0}
            className="h-10 flex-1 rounded-md border border-border bg-card px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          >
            <option value="">
              {availableJobs.length === 0
                ? "No more jobs to assign"
                : "Select a job…"}
            </option>
            {availableJobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAssign}
            disabled={!selectedJobId || assigning}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-accent-ink hover:brightness-95 disabled:opacity-50"
          >
            {assigning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Assigning…
              </>
            ) : (
              <>
                <Plus size={16} /> Assign
              </>
            )}
          </button>
        </div>
      </div>

      {stageError && (
        <div
          role="alert"
          aria-live="polite"
          className="border-b border-border-card px-6 py-3 text-sm text-danger"
        >
          {stageError}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 p-6 text-sm text-ink-3">
          <Loader2 className="animate-spin" size={16} /> Loading applications…
        </div>
      )}

      {error && !loading && (
        <div role="alert" className="p-6 text-sm text-danger">
          {error}
        </div>
      )}

      {!loading && !error && applications.length === 0 && (
        <p className="p-6 text-sm text-ink-2">
          This candidate is not assigned to any job yet.
        </p>
      )}

      {!loading && !error && applications.length > 0 && (
        <ul>
          {applications.map((app) => (
            <li
              key={app.id}
              className="flex items-center justify-between border-b border-border-card px-6 py-4 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-ink">
                  <Briefcase size={16} />
                </div>
                <Link
                  href={`/dashboard/jobs/${app.job_id}`}
                  className="text-sm font-medium text-ink underline underline-offset-2"
                >
                  {app.job_title}
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-ink-2">
                  {app.ai_score != null
                    ? `AI score ${app.ai_score.toFixed(0)}`
                    : "Not scored yet"}
                </span>
                <StageControl application={app} onChange={updateStage} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Confirm the static Badge is gone from the application rows**
The `Badge tone="neutral"` on each application row from Task D19 is now replaced by `<StageControl>`. Confirm `StageControl` is wired in and `Badge` is no longer rendered inside `ApplicationsSection` (the `Badge` import is still used by the "Coming in Slice 2" card, so it stays imported):
```bash
grep -n "StageControl application={app}\|onChange={updateStage}" "platform-web/src/app/(dashboard)/dashboard/candidates/[id]/page.tsx" ; echo "exit:$?"
```
Expected output: the matching line(s) and `exit:0`.

- [ ] **Step 3: Lint, build, commit**
Run from `platform-web/`:
```bash
npm run lint && npm run build
```
Expected: no lint errors, `✓ Compiled successfully`. From repo root:
```bash
git add "platform-web/src/app/(dashboard)/dashboard/candidates/[id]/page.tsx"
git commit -m "feat(web): inline stage control with optimistic application moves"
```

---

## Phase E — Deployment & E2E smoke-test

This phase deploys the FastAPI backend as a second Vercel project (Project B) rooted at `backend/`, wires the existing frontend (Project A) to it, and verifies the Section-1 happy path end-to-end on the public URLs. The FastAPI app object is `app` in `backend/app/main.py`; Vercel's native Python runtime serves it via a thin `api/index.py` entrypoint.

### Task E1: Add the Vercel Python ASGI entrypoint

**Files:**
- Create: `backend/api/index.py`

- [ ] **Step 1: Create the entrypoint that re-exports the FastAPI `app`**

Vercel's Python runtime auto-discovers files under `api/` and, for an ASGI app, serves the module-level object named `app`. Create `backend/api/index.py` with the COMPLETE contents below. It adds the `backend/` directory to `sys.path` so the existing `app` package (`app.main`, `app.core`, etc.) imports unchanged regardless of Vercel's working directory:

```python
"""Vercel Python runtime entrypoint for the ReCruItAI FastAPI backend.

Vercel serves the module-level ASGI object named `app`. The real application
lives in `backend/app/main.py`; this file only re-exports it after ensuring
the `backend/` directory is importable.
"""

import sys
from pathlib import Path

# backend/api/index.py -> parents[1] == backend/
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app  # noqa: E402  (path setup must run first)

# Explicit re-export so `app` is the module-level ASGI object Vercel serves.
__all__ = ["app"]
```

- [ ] **Step 2: Verify the entrypoint imports cleanly with no env vars set**

Run from the repo root. The spec (section 6) requires the backend to boot with no API keys; this confirms the import path is correct:

```bash
cd /home/pratap/work/ReCruItAI/backend && python -c "from api.index import app; print(type(app).__name__, len(app.routes), 'routes')"
```

Expected output (route count may differ slightly):

```
FastAPI 30 routes
```

If you get `ModuleNotFoundError: No module named 'app'`, the `sys.path` insert failed — check the file is at `backend/api/index.py` exactly.

- [ ] **Step 3: Commit**

```bash
cd /home/pratap/work/ReCruItAI && git add backend/api/index.py && git commit -m "feat(deploy): add Vercel Python ASGI entrypoint for backend"
```

### Task E2: Add `backend/vercel.json` routing config

**Files:**
- Create: `backend/vercel.json`

- [ ] **Step 1: Create `backend/vercel.json`**

This declares the Python function and rewrites every incoming path to the single ASGI entrypoint, so FastAPI's own router (including `/`, `/api/docs`, `/api/v1/...`) handles all routing. Create `backend/vercel.json` with the COMPLETE contents below:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/index.py": {
      "runtime": "@vercel/python@5.0.0",
      "maxDuration": 300,
      "memory": 1024
    }
  },
  "rewrites": [
    { "source": "/(.*)", "destination": "/api/index" }
  ]
}
```

Notes:
- `maxDuration: 300` matches Vercel's Fluid Compute default ceiling — ample headroom for LLM scoring calls.
- The `rewrites` rule sends all paths to `api/index`, so FastAPI's prefix (`/api/v1`) and root route both work; do not also create other files under `api/`.
- `@vercel/python@5.0.0` is the current Python builder. If `vercel deploy` later reports the version is unavailable, drop the `"runtime"` line entirely — Vercel auto-selects the latest Python builder for files under `api/`.

- [ ] **Step 2: Pin the Python version for the build**

Vercel reads the Python version from a `Pipfile` or, more simply, from the `PYTHON_VERSION` setting. Add it via the project later (Task E4). For now, confirm the local Python major.minor so you request a matching runtime:

```bash
python3 --version
```

Expected: `Python 3.11.x` or newer (Vercel supports 3.12). Record this value — you will set `PYTHON_VERSION` in Task E4.

- [ ] **Step 3: Commit**

```bash
cd /home/pratap/work/ReCruItAI && git add backend/vercel.json && git commit -m "chore(deploy): add vercel.json for backend Python runtime"
```

### Task E3: Produce a slim, Vercel-buildable `requirements.txt`

**Files:**
- Create: `backend/requirements-vercel.txt`
- Modify: `backend/vercel.json` (build step)

- [ ] **Step 1: Understand the problem**

The current `backend/requirements.txt` (152 lines) pins heavy ML wheels — `torch==2.10.0`, `nvidia-*-cu12`, `transformers`, `spacy`, `triton` — that are gigabytes in size and will exceed Vercel's 250 MB unzipped function size limit. Slice 1 only needs the web framework, DB, auth, and HTTP client. The TTS/ML stack is not on the Slice-1 happy path.

- [ ] **Step 2: Create `backend/requirements-vercel.txt` with only the runtime dependencies**

Create the file with the COMPLETE contents below (versions copied verbatim from the existing `requirements.txt` so behavior matches local):

```
fastapi==0.109.0
uvicorn==0.27.0
starlette==0.35.1
pydantic==2.6.0
pydantic-settings==2.1.0
pydantic_core==2.16.1
annotated-types==0.7.0
anyio==4.12.0
sniffio==1.3.1
h11==0.16.0
httpx==0.26.0
httpcore==1.0.9
httptools==0.7.1
python-multipart==0.0.9
python-dotenv==1.0.1
python-jose==3.3.0
ecdsa==0.19.1
rsa==4.9.1
pyasn1==0.6.1
cryptography==46.0.3
cffi==2.0.0
pycparser==2.23
email-validator==2.3.0
dnspython==2.8.0
idna==3.11
certifi==2023.7.22
PyYAML==6.0.1
psycopg[binary,pool]>=3.2
psycopg-pool>=3.2
pyjwt[crypto]>=2.8
requests==2.32.5
charset-normalizer==3.4.4
urllib3==2.6.2
typing_extensions==4.15.0
PyPDF2==3.0.1
python-docx==1.1.0
Jinja2==3.1.6
MarkupSafe==3.0.3
loguru==0.7.3
```

This drops `torch`, `transformers`, `spacy`, all `nvidia-*`, `triton`, `kokoro`, `edge-tts`, `gTTS`, `reportlab`, `pdfplumber`, `numpy`/`scipy` etc. — none are on the Section-1 path. If a deploy later fails with `ModuleNotFoundError` for a module the live endpoints actually import, add only that one pinned line and redeploy (see plan correction 4).

- [ ] **Step 3: Point the Vercel build at the slim file**

Vercel's Python builder installs `requirements.txt` by default. Tell it to use the slim file via the `installCommand` in `backend/vercel.json`. Replace the file's contents with the COMPLETE updated version below:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "pip install -r requirements-vercel.txt",
  "functions": {
    "api/index.py": {
      "runtime": "@vercel/python@5.0.0",
      "maxDuration": 300,
      "memory": 1024
    }
  },
  "rewrites": [
    { "source": "/(.*)", "destination": "/api/index" }
  ]
}
```

- [ ] **Step 4: Verify the slim set installs into a clean throwaway venv**

```bash
cd /tmp && python3 -m venv vercel-check && ./vercel-check/bin/pip install -q -r /home/pratap/work/ReCruItAI/backend/requirements-vercel.txt && ./vercel-check/bin/python -c "import fastapi, psycopg, psycopg_pool, jwt, jose, httpx; print('slim deps OK')" && rm -rf /tmp/vercel-check
```

Expected output:

```
slim deps OK
```

- [ ] **Step 5: Commit**

```bash
cd /home/pratap/work/ReCruItAI && git add backend/requirements-vercel.txt backend/vercel.json && git commit -m "chore(deploy): slim requirements for Vercel backend build"
```

### Task E4: [USER ACTION] Create & link the backend Vercel project (Project B), set env vars

**Files:**
- Create: `backend/.vercel/project.json` (generated by `vercel link` — do not hand-edit)
- Modify: `backend/.gitignore` (add `.vercel`)

- [ ] **Step 1: [USER ACTION] Confirm you are logged into the Vercel CLI on the correct account**

In your terminal run:

```bash
vercel whoami
```

If it prints an account name, you are logged in. If it errors, run `vercel login` and complete the interactive browser login with the same account that owns the existing `recruitai-test` project.

- [ ] **Step 2: [USER ACTION] Create and link Project B rooted at `backend/`**

Run from inside the `backend/` directory so Vercel scopes the project to that folder (not the repo root):

```bash
cd /home/pratap/work/ReCruItAI/backend && vercel link --yes --project recruitai-api
```

When prompted for scope/team, pick the same team that owns `recruitai-test`. This creates `backend/.vercel/project.json` linking a NEW project named `recruitai-api`, separate from Project A. Confirm with:

```bash
cat /home/pratap/work/ReCruItAI/backend/.vercel/project.json
```

Expected: JSON containing `"projectId"` and `"orgId"`.

- [ ] **Step 3: Keep the generated `.vercel` folder out of git**

Create `backend/.gitignore` with the COMPLETE contents below (the directory has no `.gitignore` yet):

```
.vercel
.env
.env.*
__pycache__/
*.pyc
venv/
uploads/
.pytest_cache/
```

- [ ] **Step 4: [USER ACTION] Set the Python version on the project**

```bash
cd /home/pratap/work/ReCruItAI/backend && vercel env add PYTHON_VERSION production
```

When prompted for the value, enter `3.12` (or the major.minor recorded in Task E2 Step 2).

- [ ] **Step 5: [USER ACTION] Add the 5 backend env vars to Project B (production)**

Run each command from `backend/`. The CLI prompts for the value, then asks which environments — choose `Production` (and `Preview` if you want preview deploys to work too):

```bash
cd /home/pratap/work/ReCruItAI/backend
vercel env add SUPABASE_URL production
vercel env add SUPABASE_DB_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add OPENROUTER_API_KEY production
vercel env add CORS_ORIGINS production
```

Values to paste at each prompt:

- `SUPABASE_URL` → `https://redgbugvyoidjwhovmxa.supabase.co`
- `SUPABASE_DB_URL` → the **transaction pooler** connection string. Form (the `@` inside the password must be percent-encoded as `%40`):
  ```
  postgresql://postgres.redgbugvyoidjwhovmxa:<URL-ENCODED-PASSWORD>@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres
  ```
  Use port **6543** (transaction pooler) here — NOT 5432. The 5432 session pooler is only for the migration applicator. `app/db.py` already sets `prepare_threshold=None`, which is required for the 6543 pooler.
- `SUPABASE_SERVICE_ROLE_KEY` → the `service_role` secret key from Supabase Dashboard → Project `redgbugvyoidjwhovmxa` → Settings → API → Project API keys.
- `OPENROUTER_API_KEY` → the OpenRouter key (same value used locally in `backend/.env`).
- `CORS_ORIGINS` → `https://recruitai-test.vercel.app,http://localhost:3000` (comma-separated; this is updated to the final value in Task E7. The `Settings._split_cors_origins` validator added in Task A2 parses this comma-separated string into a list.)

- [ ] **Step 6: [USER ACTION] Verify the env vars landed**

```bash
cd /home/pratap/work/ReCruItAI/backend && vercel env ls production
```

Expected: a table listing `PYTHON_VERSION`, `SUPABASE_URL`, `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `CORS_ORIGINS`.

- [ ] **Step 7: Commit the `.gitignore` (not `.vercel`, not env values)**

```bash
cd /home/pratap/work/ReCruItAI && git add backend/.gitignore && git commit -m "chore(deploy): gitignore backend .vercel and local artifacts"
```

### Task E5: Deploy Project B to production and capture its URL

**Files:** _(none — deployment only)_

- [ ] **Step 1: Deploy the backend to production**

Run from `backend/` so the deploy uses Project B's link:

```bash
cd /home/pratap/work/ReCruItAI/backend && vercel deploy --prod --yes
```

Expected: the CLI streams the build, then prints a production URL such as `https://recruitai-api.vercel.app`. **Record this URL** — it is `NEXT_PUBLIC_API_URL` for Task E6 and the test target below. If the build fails, read the error: a size-limit error means trim more from `requirements-vercel.txt` (Task E3); a `ModuleNotFoundError` at runtime means add the missing pinned dependency back (plan correction 4).

- [ ] **Step 2: Smoke-test the deployed health endpoint**

Replace `<BACKEND_URL>` with the URL from Step 1:

```bash
curl -s <BACKEND_URL>/api/v1/health
```

Expected output:

```json
{"status":"healthy","version":"1.0.0"}
```

- [ ] **Step 3: Confirm the OpenAPI docs render**

```bash
curl -s -o /dev/null -w "%{http_code}\n" <BACKEND_URL>/api/docs
```

Expected: `200`. This confirms the ASGI entrypoint and `rewrites` rule route correctly.

- [ ] **Step 4: Confirm the DB connection works against a DB-backed endpoint**

Hit any read endpoint that touches Postgres (e.g. listing jobs) without auth and confirm it returns a clean `401`/`403` rather than a `500` connection error:

```bash
curl -s -o /dev/null -w "%{http_code}\n" <BACKEND_URL>/api/v1/recruiter/jobs
```

Expected: `401` or `403` (auth rejected) — NOT `500`. A `500` here means `SUPABASE_DB_URL` is wrong (check port `6543` and the `%40`-encoded password) or `prepare_threshold` is not disabled. Check logs with `vercel logs <BACKEND_URL>`.

### Task E6: Point the frontend (Project A) at the backend and redeploy

**Files:** _(none — Vercel project config + deploy only)_

- [ ] **Step 1: [USER ACTION] Set `NEXT_PUBLIC_API_URL` on Project A**

Run from `platform-web/` (already linked to Project A — `platform-web/.vercel/project.json` exists):

```bash
cd /home/pratap/work/ReCruItAI/platform-web && vercel env add NEXT_PUBLIC_API_URL production
```

At the value prompt, paste the backend URL from Task E5 Step 1 (e.g. `https://recruitai-api.vercel.app`) with **no trailing slash**.

- [ ] **Step 2: [USER ACTION] Verify the Supabase frontend vars are already set**

```bash
cd /home/pratap/work/ReCruItAI/platform-web && vercel env ls production
```

Expected: the table includes `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. If either Supabase var is missing, add it:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production       # value: https://redgbugvyoidjwhovmxa.supabase.co
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production   # value: the anon/publishable key from Supabase Settings → API
```

- [ ] **Step 3: Build the frontend locally before deploying**

Per the project workflow rules, verify the build is green first:

```bash
cd /home/pratap/work/ReCruItAI/platform-web && npm run lint && npm run build
```

Expected: lint passes and the build ends with `Compiled successfully` / route summary, no errors.

- [ ] **Step 4: Redeploy Project A to production**

`NEXT_PUBLIC_*` vars are inlined at build time, so a fresh deploy is required for the new API URL to take effect:

```bash
cd /home/pratap/work/ReCruItAI/platform-web && vercel deploy --prod --yes
```

Expected: deploy succeeds and resolves at `https://recruitai-test.vercel.app`.

- [ ] **Step 5: Confirm the frontend is live**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://recruitai-test.vercel.app && curl -s -o /dev/null -w "%{http_code}\n" https://recruitai-test.vercel.app/dashboard
```

Expected: both return `200` (the dashboard may `200` to a login redirect page — that is fine).

### Task E7: Lock CORS to the frontend origin and redeploy the backend

**Files:** _(none — Vercel project config + deploy only)_

- [ ] **Step 1: [USER ACTION] Update `CORS_ORIGINS` on Project B to the final value**

The value set in Task E4 was provisional. Remove and re-add it with the production frontend origin (no trailing slash, no wildcard — `allow_credentials=True` in `app/main.py` forbids `*`):

```bash
cd /home/pratap/work/ReCruItAI/backend
vercel env rm CORS_ORIGINS production --yes
vercel env add CORS_ORIGINS production
```

At the value prompt, paste:

```
https://recruitai-test.vercel.app,http://localhost:3000
```

Keep `http://localhost:3000` so local frontend dev still works against the deployed backend.

- [ ] **Step 2: Redeploy the backend so the new `CORS_ORIGINS` is picked up**

```bash
cd /home/pratap/work/ReCruItAI/backend && vercel deploy --prod --yes
```

Expected: deploy succeeds; URL unchanged from Task E5.

- [ ] **Step 3: Verify CORS headers allow the frontend origin**

```bash
curl -s -D - -o /dev/null -H "Origin: https://recruitai-test.vercel.app" -X OPTIONS <BACKEND_URL>/api/v1/health
```

Expected: the response headers include `access-control-allow-origin: https://recruitai-test.vercel.app` and `access-control-allow-credentials: true`. If the origin header is missing, `CORS_ORIGINS` did not parse into a list — check the `_split_cors_origins` validator from Task A2.

### Task E8: Run the Section-1 happy-path deploy smoke-test

**Files:**
- Modify: the open PR description (paste the checklist result)

- [ ] **Step 1: Open the deployed app in a browser**

[USER ACTION] In a fresh browser session (or incognito), open `https://recruitai-test.vercel.app`. Confirm the marketing page renders with the warm cream theme and a working "Sign up" / "Get started" link.

- [ ] **Step 2: Walk the happy path and tick each box**

[USER ACTION] Perform the full Section-1 flow on the public URLs. Record the result of each step:

```
Deploy smoke-test — https://recruitai-test.vercel.app  +  <BACKEND_URL>
Date: ____   Tester: ____

[ ] 1. Sign up with a new email + password + organization name → lands in the dashboard
[ ] 2. Organization created; org switcher in the header shows the new org
[ ] 3. Post a job (title, department, location, employment type, description) → job appears in the jobs list
[ ] 4. Add a candidate (name, email) and upload a resume file (PDF) → upload succeeds (file stored in Supabase Storage, not local disk)
[ ] 5. AI scores the candidate → an ai_score / recommendation appears on the application (no 503; OpenRouter key reached)
[ ] 6. Move the candidate to a new pipeline stage (e.g. new → screening) → stage change persists
[ ] 7. Hard-refresh the page → all created data (org, job, candidate, score, stage) still present (survives restart / no in-memory state)
[ ] 8. No alert() dialogs and no mock data appeared anywhere in the flow
```

- [ ] **Step 3: Spot-check cross-request persistence and logs**

[USER ACTION] After step 7 above, open `vercel logs <BACKEND_URL>` in a terminal and confirm there are no `500` errors, no `prepared statement` errors, and no ephemeral-filesystem write errors during the flow. Persistence surviving the hard refresh confirms data is in Postgres, not warm process memory.

- [ ] **Step 4: Record the result in the PR**

[USER ACTION] Paste the completed checklist from Step 2 (with real ticks and tester/date filled in) into the open Slice 1 pull request description, under a `## Deploy smoke-test` heading. This is the spec's Definition of Done for deployment (section 10) and for testing (section 11). If any box failed, file the fix as a follow-up task before merging — all 8 boxes must be checked for the slice to be considered deployed.
