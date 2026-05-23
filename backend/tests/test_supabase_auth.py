import pytest
from fastapi import HTTPException
from app.auth.supabase import verify_supabase_jwt

def test_rejects_missing_token():
    with pytest.raises(HTTPException) as exc:
        verify_supabase_jwt(authorization=None)
    assert exc.value.status_code == 401

def test_rejects_malformed_token():
    with pytest.raises(HTTPException) as exc:
        verify_supabase_jwt(authorization="Bearer not-a-jwt")
    assert exc.value.status_code == 401
