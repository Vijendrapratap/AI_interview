"""Apply Supabase SQL migrations from supabase/migrations/*.sql via psycopg.

Bypasses the Supabase MCP (which needs Claude Code restart). Uses SUPABASE_DB_URL
from backend/.env. Each migration is idempotent (`if not exists` / `do $$` guards),
so re-running is safe.

Usage:
    cd /home/pratap/work/ReCruItAI/backend
    set -a && . ./.env && set +a
    ./venv/bin/python scripts/apply_migrations.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
MIGRATIONS_DIR = REPO_ROOT / "supabase" / "migrations"


def main() -> int:
    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        print("ERROR: SUPABASE_DB_URL is not set in the environment.", file=sys.stderr)
        print("       cd backend && set -a && . ./.env && set +a && ./venv/bin/python scripts/apply_migrations.py", file=sys.stderr)
        return 2

    migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not migration_files:
        print(f"ERROR: no migrations under {MIGRATIONS_DIR}", file=sys.stderr)
        return 2

    print(f"Connecting to Supabase Postgres via SUPABASE_DB_URL ...")
    with psycopg.connect(db_url, autocommit=False) as conn:
        with conn.cursor() as cur:
            cur.execute("select version()")
            (version,) = cur.fetchone()
            print(f"Connected: {version}")

        for f in migration_files:
            print(f"\n--- Applying {f.name} ({f.stat().st_size} bytes) ---")
            sql = f.read_text()
            with conn.cursor() as cur:
                cur.execute(sql)
            conn.commit()
            print(f"OK: {f.name}")

        with conn.cursor() as cur:
            cur.execute(
                "select tablename from pg_tables where schemaname='public' order by tablename"
            )
            tables = [r[0] for r in cur.fetchall()]

    print(f"\n=== Final public-schema tables ({len(tables)}) ===")
    for t in tables:
        print(f"  - {t}")
    expected = {
        "applications",
        "candidates",
        "interview_reports",
        "interview_sessions",
        "invitations",
        "jobs",
        "organization_members",
        "organizations",
        "resume_analyses",
        "resumes",
    }
    missing = expected - set(tables)
    if missing:
        print(f"\nWARNING: expected tables missing: {sorted(missing)}", file=sys.stderr)
        return 1
    print("\nAll 10 foundation tables present.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
