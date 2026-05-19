import sys


def test_backend_imports_without_llm_keys(monkeypatch):
    """Backend must import even if no LLM provider keys are set."""
    for k in ["OPENAI_API_KEY", "OPENROUTER_API_KEY", "GOOGLE_API_KEY", "ANTHROPIC_API_KEY", "GROQ_API_KEY"]:
        monkeypatch.delenv(k, raising=False)
    # Force reimport of app modules so the fresh-boot path is exercised
    for mod_name in list(sys.modules):
        if mod_name.startswith("app."):
            sys.modules.pop(mod_name, None)
    from app.main import app  # must not raise
    assert app is not None
    paths = {r.path for r in app.routes if hasattr(r, "path")}
    assert "/api/v1/health" in paths
