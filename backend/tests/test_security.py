from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_debug_inject_resume_is_gone():
    """The unauthenticated /interview/debug/inject_resume endpoint must not exist."""
    r = client.post("/api/v1/interview/debug/inject_resume", json={})
    assert r.status_code == 404, f"Expected 404 (endpoint removed); got {r.status_code}: {r.text!r}"
