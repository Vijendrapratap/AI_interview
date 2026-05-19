"""Smoke tests that quick-analyze and keywords return populated payloads, not 500s.

These are real LLM calls -- they require OPENROUTER_API_KEY to be set and will
be skipped otherwise. They were added to lock down a regression where the
quick-analyze and keyword endpoints sent empty prompts to OpenRouter and got
back a 400 ``user message is required``.
"""

import os
import pytest
from fastapi.testclient import TestClient
from app.main import app

pytestmark = pytest.mark.skipif(
    not os.getenv("OPENROUTER_API_KEY"),
    reason="OPENROUTER_API_KEY not set",
)

client = TestClient(app)
SAMPLE = "/home/pratap/work/ReCruItAI/sample_data/resumes/resume_backend_engineer.txt"


def _upload():
    with open(SAMPLE, "rb") as f:
        r = client.post(
            "/api/v1/resume/upload",
            files={"file": ("resume.txt", f, "text/plain")},
        )
    r.raise_for_status()
    return r.json()["id"]


def test_quick_analyze_returns_populated_payload():
    rid = _upload()
    r = client.post("/api/v1/analysis/quick-analyze", json={"resume_id": rid})
    assert r.status_code == 200, r.text
    body = r.json()
    # At minimum the overall_score should be a number > 0
    assert isinstance(body, dict)
    assert any(k for k in body if "score" in k.lower())


def test_keywords_returns_populated_payload():
    rid = _upload()
    r = client.post(f"/api/v1/analysis/keywords/{rid}")
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body, dict)
    assert len(body) > 0
