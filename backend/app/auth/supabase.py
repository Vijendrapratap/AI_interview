# backend/app/auth/supabase.py
import os
import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient

_JWKS_URL = os.environ.get("SUPABASE_JWKS_URL", "")
_jwk_client = PyJWKClient(_JWKS_URL) if _JWKS_URL else None


def verify_supabase_jwt(authorization: str | None = Header(default=None)) -> dict:
    """FastAPI dependency: verify a Supabase access token; return its claims."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    if token.count(".") != 2:
        raise HTTPException(status_code=401, detail="Malformed token")
    try:
        if _jwk_client is None:
            raise HTTPException(status_code=500, detail="SUPABASE_JWKS_URL not configured")
        signing_key = _jwk_client.get_signing_key_from_jwt(token).key
        claims = jwt.decode(token, signing_key, algorithms=["RS256", "ES256"], audience="authenticated")
        return claims
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc
