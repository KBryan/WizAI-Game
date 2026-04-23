import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import patch, MagicMock

from health_check import check_env_vars, check_git_repo, CheckResult, HealthCheckResult


class TestCheckEnvVars:
    def test_opencode_no_required_keys(self):
        with patch.dict(os.environ, {"ADW_AGENT_PROVIDER": "opencode"}, clear=True):
            result = check_env_vars()
            assert result.success is True
            assert result.details["provider"] == "opencode"

    def test_claude_cli_requires_anthropic_key(self):
        with patch.dict(os.environ, {"ADW_AGENT_PROVIDER": "claude_cli"}, clear=True):
            result = check_env_vars()
            assert result.success is False
            assert any("ANTHROPIC_API_KEY" in v for v in result.details.get("missing_required", []))

    def test_claude_cli_with_anthropic_key(self):
        with patch.dict(os.environ, {"ADW_AGENT_PROVIDER": "claude_cli", "ANTHROPIC_API_KEY": "sk-test-123"}, clear=True):
            result = check_env_vars()
            assert result.success is True

    def test_venice_api_requires_venice_key(self):
        with patch.dict(os.environ, {"ADW_AGENT_PROVIDER": "venice_api"}, clear=True):
            result = check_env_vars()
            assert result.success is False
            assert any("VENICE_API_KEY" in v for v in result.details.get("missing_required", []))

    def test_venice_api_with_key(self):
        with patch.dict(os.environ, {"ADW_AGENT_PROVIDER": "venice_api", "VENICE_API_KEY": "vntest123"}, clear=True):
            result = check_env_vars()
            assert result.success is True


class TestCheckGitRepo:
    @patch("health_check.get_repo_url")
    @patch("health_check.extract_repo_path")
    def test_success_normal_repo(self, mock_extract, mock_get_url):
        mock_get_url.return_value = "https://github.com/myorg/myrepo"
        mock_extract.return_value = "myorg/myrepo"
        result = check_git_repo()
        assert result.success is True
        assert result.warning is None

    @patch("health_check.get_repo_url")
    @patch("health_check.extract_repo_path")
    def test_warns_on_disler_repo(self, mock_extract, mock_get_url):
        mock_get_url.return_value = "https://github.com/disler/oldrepo"
        mock_extract.return_value = "disler/oldrepo"
        result = check_git_repo()
        assert result.success is True
        assert result.warning is not None
        assert "disler" in result.warning.lower()

    @patch("health_check.get_repo_url")
    def test_failure_no_git_remote(self, mock_get_url):
        mock_get_url.side_effect = ValueError("No git remote found")
        result = check_git_repo()
        assert result.success is False


class TestHealthCheckResult:
    def test_create_success(self):
        result = HealthCheckResult(
            success=True,
            timestamp="2026-04-13T00:00:00",
            checks={},
        )
        assert result.success is True
        assert result.errors == []
        assert result.warnings == []

    def test_create_with_errors(self):
        env_check = CheckResult(
            success=False,
            error="Missing ANTHROPIC_API_KEY",
        )
        result = HealthCheckResult(
            success=False,
            timestamp="2026-04-13T00:00:00",
            checks={"environment": env_check},
            errors=["Missing ANTHROPIC_API_KEY"],
        )
        assert result.success is False
        assert len(result.errors) == 1