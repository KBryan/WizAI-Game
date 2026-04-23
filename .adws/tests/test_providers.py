import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import patch, MagicMock

from providers import (
    OpenCodeProvider,
    ClaudeCLIProvider,
    VeniceAPIProvider,
    get_provider,
    PROVIDERS,
)


class TestGetProvider:
    def test_default_provider_is_opencode(self):
        with patch.dict(os.environ, {}, clear=True):
            provider = get_provider()
            assert isinstance(provider, OpenCodeProvider)

    def test_explicit_opencode(self):
        with patch.dict(os.environ, {"ADW_AGENT_PROVIDER": "opencode"}, clear=False):
            provider = get_provider("opencode")
            assert isinstance(provider, OpenCodeProvider)

    def test_claude_cli_provider(self):
        provider = get_provider("claude_cli")
        assert isinstance(provider, ClaudeCLIProvider)

    def test_venice_api_provider(self):
        provider = get_provider("venice_api")
        assert isinstance(provider, VeniceAPIProvider)

    def test_unknown_provider_raises_error(self):
        try:
            get_provider("nonexistent")
            assert False, "Should have raised ValueError"
        except ValueError as e:
            assert "nonexistent" in str(e)
            assert "opencode" in str(e)
            assert "claude_cli" in str(e)
            assert "venice_api" in str(e)

    def test_env_var_overrides(self):
        with patch.dict(os.environ, {"ADW_AGENT_PROVIDER": "venice_api"}, clear=False):
            provider = get_provider()
            assert isinstance(provider, VeniceAPIProvider)

    def test_all_providers_registered(self):
        assert set(PROVIDERS.keys()) == {"opencode", "claude_cli", "venice_api"}


class TestOpenCodeProvider:
    def test_check_available_not_installed(self):
        provider = OpenCodeProvider()
        with patch("providers.subprocess.run") as mock_run:
            mock_run.side_effect = FileNotFoundError("opencode not found")
            result = provider.check_available()
            assert result is not None
            assert "opencode" in result.lower() or "OpenCode" in result

    def test_check_available_installed(self):
        provider = OpenCodeProvider()
        with patch("providers.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            result = provider.check_available()
            assert result is None

    def test_custom_cli_path(self):
        with patch.dict(os.environ, {"OPENCODE_PATH": "/custom/opencode"}, clear=False):
            provider = OpenCodeProvider()
            assert provider.cli_path == "/custom/opencode"

    def test_default_cli_path(self):
        with patch.dict(os.environ, {}, clear=True):
            provider = OpenCodeProvider()
            assert provider.cli_path == "opencode"

    def test_execute_prompt_not_available(self):
        from data_types import AgentPromptRequest
        provider = OpenCodeProvider()
        with patch.object(provider, "check_available", return_value="not installed"):
            request = AgentPromptRequest(
                prompt="/feature add login",
                adw_id="abc12345",
            )
            response = provider.execute_prompt(request)
            assert response.success is False
            assert "not installed" in response.output

    def test_get_env_includes_venice_key(self):
        provider = OpenCodeProvider()
        with patch.dict(os.environ, {"VENICE_API_KEY": "vntest123", "PATH": "/usr/bin", "HOME": "/home/test"}, clear=True):
            env = provider.get_env()
            assert env.get("VENICE_API_KEY") == "vntest123"
            assert env.get("OPENAI_API_KEY") == "vntest123"

    def test_get_env_includes_anthropic_key(self):
        provider = OpenCodeProvider()
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "sk-test", "PATH": "/usr/bin", "HOME": "/home/test"}, clear=True):
            env = provider.get_env()
            assert env.get("ANTHROPIC_API_KEY") == "sk-test"


class TestClaudeCLIProvider:
    def test_check_available_not_installed(self):
        provider = ClaudeCLIProvider()
        with patch("providers.subprocess.run") as mock_run:
            mock_run.side_effect = FileNotFoundError("claude not found")
            result = provider.check_available()
            assert result is not None

    def test_check_available_installed(self):
        provider = ClaudeCLIProvider()
        with patch("providers.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            result = provider.check_available()
            assert result is None

    def test_get_env_includes_anthropic_key(self):
        provider = ClaudeCLIProvider()
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "sk-test", "PATH": "/usr/bin", "HOME": "/home/test"}, clear=True):
            env = provider.get_env()
            assert env.get("ANTHROPIC_API_KEY") == "sk-test"

    def test_get_env_includes_github_pat(self):
        provider = ClaudeCLIProvider()
        with patch.dict(os.environ, {"GITHUB_PAT": "ghp-test", "PATH": "/usr/bin", "HOME": "/home/test"}, clear=True):
            env = provider.get_env()
            assert env.get("GITHUB_PAT") == "ghp-test"
            assert env.get("GH_TOKEN") == "ghp-test"


class TestVeniceAPIProvider:
    def test_check_available_no_key(self):
        with patch.dict(os.environ, {}, clear=True):
            provider = VeniceAPIProvider()
            result = provider.check_available()
            assert result is not None
            assert "VENICE_API_KEY" in result

    def test_check_available_with_key(self):
        import urllib.request
        with patch.dict(os.environ, {"VENICE_API_KEY": "vntest123"}, clear=True):
            provider = VeniceAPIProvider()
            mock_response = MagicMock()
            mock_response.status = 200
            mock_response.__enter__ = MagicMock(return_value=mock_response)
            mock_response.__exit__ = MagicMock(return_value=False)
            with patch.object(urllib.request, "urlopen", return_value=mock_response):
                result = provider.check_available()
                assert result is None

    def test_default_model(self):
        with patch.dict(os.environ, {"VENICE_API_KEY": "test"}, clear=False):
            provider = VeniceAPIProvider()
            assert provider.model == "zai-org-glm-5-1"

    def test_custom_model(self):
        with patch.dict(os.environ, {"VENICE_API_KEY": "test", "VENICE_MODEL": "custom-model"}, clear=False):
            provider = VeniceAPIProvider()
            assert provider.model == "custom-model"

    def test_custom_base_url(self):
        with patch.dict(os.environ, {"VENICE_API_KEY": "test", "VENICE_API_BASE_URL": "https://custom.api/v1"}, clear=False):
            provider = VeniceAPIProvider()
            assert provider.base_url == "https://custom.api/v1"

    def test_get_env(self):
        with patch.dict(os.environ, {"VENICE_API_KEY": "test", "PATH": "/usr/bin", "HOME": "/home/test"}, clear=True):
            provider = VeniceAPIProvider()
            env = provider.get_env()
            assert env.get("VENICE_API_KEY") == "test"
            assert env.get("VENICE_MODEL") == "zai-org-glm-5-1"
            assert "VENICE_API_BASE_URL" in env

    def test_get_env_includes_github_pat(self):
        with patch.dict(os.environ, {"VENICE_API_KEY": "test", "GITHUB_PAT": "ghp-test", "PATH": "/usr/bin", "HOME": "/home/test"}, clear=True):
            provider = VeniceAPIProvider()
            env = provider.get_env()
            assert env.get("GITHUB_PAT") == "ghp-test"

    def test_execute_prompt_not_available(self):
        from data_types import AgentPromptRequest
        with patch.dict(os.environ, {}, clear=True):
            provider = VeniceAPIProvider()
            request = AgentPromptRequest(
                prompt="/feature add login",
                adw_id="abc12345",
            )
            response = provider.execute_prompt(request)
            assert response.success is False
            assert "VENICE_API_KEY" in response.output