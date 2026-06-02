"""Settings must expose the Supabase/LLM env vars and not require them at boot."""

import importlib


def test_settings_has_supabase_fields(monkeypatch):
    for k in ["SUPABASE_URL", "SUPABASE_DB_URL", "SUPABASE_SERVICE_ROLE_KEY",
              "OPENROUTER_API_KEY", "CORS_ORIGINS"]:
        monkeypatch.delenv(k, raising=False)
    import app.core.config as config
    importlib.reload(config)
    s = config.Settings()
    assert s.SUPABASE_URL is None
    assert s.SUPABASE_DB_URL is None
    assert s.SUPABASE_SERVICE_ROLE_KEY is None
    assert s.OPENROUTER_API_KEY is None
    assert "https://recruitai-test.vercel.app" in s.CORS_ORIGINS


def test_settings_reads_supabase_url_from_env(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://redgbugvyoidjwhovmxa.supabase.co")
    import app.core.config as config
    importlib.reload(config)
    s = config.Settings()
    assert s.SUPABASE_URL == "https://redgbugvyoidjwhovmxa.supabase.co"


def test_cors_origins_parses_comma_separated_string(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://a.example.com, https://b.example.com")
    import app.core.config as config
    importlib.reload(config)
    s = config.Settings()
    assert s.CORS_ORIGINS == ["https://a.example.com", "https://b.example.com"]
