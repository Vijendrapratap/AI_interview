import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)

# Global variables to store state between tests
auth_token = None
resume_id = "test_resume_123"

def test_health_check():
    response = client.get(f"{settings.API_V1_STR}/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_register_user():
    response = client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "email": "test@example.com",
            "password": "password123",
            "full_name": "Test User",
            "role": "candidate"
        }
    )
    # It might fail if user already exists from previous runs, so we check for 200 or 400
    assert response.status_code in [200, 400]

def test_login_user():
    global auth_token
    response = client.post(
        f"{settings.API_V1_STR}/auth/login/access-token",
        data={
            "username": "test@example.com",
            "password": "password123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    auth_token = data["access_token"]

def test_generate_jd_unauthorized():
    response = client.post(
        f"{settings.API_V1_STR}/recruiter/generate-jd",
        json={
            "role": "Python Developer",
            "industry": "Tech",
            "seniority": "Senior",
            "skills": ["Python", "FastAPI"]
        }
    )
    # Should fail without token
    assert response.status_code == 401

def test_generate_jd_authorized():
    if not auth_token:
        pytest.skip("No auth token available")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post(
        f"{settings.API_V1_STR}/recruiter/generate-jd",
        headers=headers,
        json={
            "role": "Python Developer",
            "industry": "Tech",
            "seniority": "Senior",
            "skills": ["Python", "FastAPI"]
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "title" in data
    assert "responsibilities" in data

# Note: Testing verification requires file upload, which is complex to mock here without a real file.
# We will skip valid verification test for now and test invalid input.

def test_verify_identity_missing_file():
    if not auth_token:
        pytest.skip("No auth token available")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post(
        f"{settings.API_V1_STR}/verification/verify-identity",
        headers=headers,
        data={"resume_id": "123"}
        # No file provided
    )
    assert response.status_code == 422 # Validation error
