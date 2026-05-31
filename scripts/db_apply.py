#!/usr/bin/env python
"""Apply a .sql migration file to the Supabase Postgres DB.

Reads the connection string from .env (SUPABASE_DB_URL, else DATABASE_URL) so the
secret is never echoed. Runs the whole file via the libpq simple-query protocol
(supports multiple statements + DO blocks). Prints only OK / ERROR.

Usage: backend/venv/bin/python scripts/db_apply.py supabase/migrations/00X.sql
"""
import sys
from pathlib import Path

import psycopg
from psycopg import pq

ROOT = Path(__file__).resolve().parents[1]


def load_env_url() -> str | None:
    env = ROOT / ".env"
    if not env.exists():
        return None
    candidates = []
    for raw in env.read_text().splitlines():
        line = raw.strip()
        for key in ("SUPABASE_DB_URL=", "DATABASE_URL=", "DIRECT_URL=", "POSTGRES_URL=", "POSTGRES_PRISMA_URL="):
            if line.startswith(key):
                candidates.append(line.split("=", 1)[1].strip().strip('"').strip("'"))
    # Only a real Postgres connection string is usable here (not the HTTPS API URL).
    for c in candidates:
        if c.startswith("postgres://") or c.startswith("postgresql://"):
            return c
    return None


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: db_apply.py <file.sql>")
        return 2
    sql_path = Path(sys.argv[1])
    sql = sql_path.read_text()
    url = load_env_url()
    if not url:
        print("NO_DB_URL (set SUPABASE_DB_URL or DATABASE_URL in .env)")
        return 2
    try:
        with psycopg.connect(url, autocommit=True, connect_timeout=20) as conn:
            res = conn.pgconn.exec_(sql.encode())
            if res.status in (pq.ExecStatus.COMMAND_OK, pq.ExecStatus.TUPLES_OK):
                print(f"OK {sql_path}")
                return 0
            msg = (res.error_message or b"").decode(errors="replace").strip()
            print(f"ERROR applying {sql_path}: {msg or res.status}")
            return 1
    except Exception as e:  # noqa: BLE001
        print(f"CONNECT/EXEC ERROR: {type(e).__name__}: {e}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
