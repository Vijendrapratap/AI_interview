from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import settings
from app.schemas import user as user_schema
from app.models import user as user_model

# Mock database dependency for now (will implement real DB session later)
# In real app, this would come from app.db.session
def get_db():
    # Placeholder for database session
    # We will need to set up the database connection in main.py or a database.py module
    yield None

router = APIRouter()

# Temporary in-memory user store for testing until DB is hooked up
fake_users_db = {}

@router.post("/login/access-token", response_model=user_schema.Token)
def login_access_token(
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    # For now, using fake in-memory DB
    user = fake_users_db.get(form_data.username)
    if not user:
        # Check against a hardcoded admin for testing
        if form_data.username == "admin@example.com" and form_data.password == "admin123":
             access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
             return {
                "access_token": security.create_access_token(
                    subject="admin@example.com", expires_delta=access_token_expires
                ),
                "token_type": "bearer",
            }
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not security.verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            subject=user["email"], expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/register", response_model=user_schema.User)
def register_user(
    *,
    user_in: user_schema.UserCreate,
) -> Any:
    """
    Create new user without the need to be logged in
    """
    if user_in.email in fake_users_db:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system",
        )
    
    user_data = user_in.model_dump()
    hashed_password = security.get_password_hash(user_data["password"])
    del user_data["password"]
    user_data["hashed_password"] = hashed_password
    user_data["id"] = len(fake_users_db) + 1
    
    fake_users_db[user_in.email] = user_data
    
    return user_data
