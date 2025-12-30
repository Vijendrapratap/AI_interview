import pytest
from unittest.mock import patch, MagicMock
from app.services.llm.providers import GeminiProvider
import os

@pytest.fixture
def mock_settings_google_key():
    with patch.dict(os.environ, {"GOOGLE_API_KEY": "test-key"}):
        yield

@pytest.fixture
def no_mock_settings_google_key():
    with patch.dict(os.environ, {}, clear=True):
        if "GOOGLE_API_KEY" in os.environ:
            del os.environ["GOOGLE_API_KEY"]
        yield

def test_gemini_provider_raises_error_without_key(no_mock_settings_google_key):
    """Test that GeminiProvider raises a ValueError if the GOOGLE_API_KEY is not set."""
    with pytest.raises(ValueError, match="Google API key not found. Please set GOOGLE_API_KEY."):
        GeminiProvider()

@pytest.mark.asyncio
async def test_gemini_provider_sends_key_in_header(mock_settings_google_key):
    """Test that GeminiProvider sends the API key in the x-goog-api-key header."""
    with patch("httpx.AsyncClient") as mock_client:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "candidates": [{
                "content": {
                    "parts": [{"text": "test response"}]
                }
            }]
        }
        
        mock_client.return_value.__aenter__.return_value.post.return_value = mock_response

        provider = GeminiProvider()
        await provider.generate("test prompt")

        mock_client.return_value.__aenter__.return_value.post.assert_called_once()
        _, kwargs = mock_client.return_value.__aenter__.return_value.post.call_args
        assert "x-goog-api-key" in kwargs["headers"]
        assert kwargs["headers"]["x-goog-api-key"] == "test-key"
