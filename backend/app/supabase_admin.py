# backend/app/supabase_admin.py
import os
from functools import lru_cache
from supabase import create_client, Client


@lru_cache
def admin_client() -> Client:
    """Service-role Supabase client — full DB + Storage access. Server-side only."""
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)
