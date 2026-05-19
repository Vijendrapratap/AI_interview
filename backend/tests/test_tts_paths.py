"""Smoke that /tts/synthesize returns audio, not 500."""
import os
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_synthesize_default_returns_audio():
    r = client.post("/api/v1/tts/synthesize", json={"text": "Hello world."})
    assert r.status_code == 200, r.text
    # Audio bytes - content-type should NOT be application/json
    ct = r.headers.get("content-type", "")
    assert "audio" in ct or "octet-stream" in ct, f"Expected audio response, got content-type {ct!r}"
    assert len(r.content) > 1000, f"Response too small ({len(r.content)} bytes)"


def test_providers_endpoint():
    r = client.get("/api/v1/tts/providers")
    assert r.status_code == 200
    body = r.json()
    assert "providers" in body
    # At least one provider should be `available: true`
    tts_list = body["providers"].get("tts", [])
    available = [p for p in tts_list if p.get("available")]
    assert len(available) >= 1, f"No TTS providers available: {tts_list}"
