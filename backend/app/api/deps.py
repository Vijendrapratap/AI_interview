from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import settings
from app.models import user as user_model
from app.schemas import user as user_schema

# Reusing the mock fake_users_db from auth endpoint for now
# Ideally this should be a proper DB service
from app.api.v1.endpoints.auth import fake_users_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login/access-token")

def get_db() -> Generator:
    # Placeholder for DB session
    try:
        yield None
    finally:
        pass

def get_current_user(
    token: str = Depends(oauth2_scheme)
) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = user_schema.TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise credentials_exception
    
    # In a real app, we would query the DB here
    # user = db.query(user_model.User).filter(user_model.User.email == token_data.sub).first()
    
    # Mock lookup
    user = fake_users_db.get(token_data.sub)
    if not user:
        if token_data.sub == "admin@example.com":
             return {"email": "admin@example.com", "role": "admin"}
        raise credentials_exception
    
    return user

def get_current_active_user(
    current_user: dict = Depends(get_current_user),
) -> dict:
    # Here we would check if user is active
    return current_user
