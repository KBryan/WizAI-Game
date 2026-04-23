import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import patch

from github import extract_repo_path, get_github_env


class TestExtractRepoPath:
    def test_https_url(self):
        result = extract_repo_path("https://github.com/owner/repo")
        assert result == "owner/repo"

    def test_https_url_with_git_suffix(self):
        result = extract_repo_path("https://github.com/owner/repo.git")
        assert result == "owner/repo"

    def test_nested_org(self):
        result = extract_repo_path("https://github.com/my-org/my-repo")
        assert result == "my-org/my-repo"

    def test_case_preserved(self):
        result = extract_repo_path("https://github.com/MyOrg/MyRepo")
        assert result == "MyOrg/MyRepo"


class TestGetGithubEnv:
    def test_returns_none_when_no_pat(self):
        with patch.dict(os.environ, {}, clear=True):
            result = get_github_env()
            assert result is None

    def test_returns_env_with_pat(self):
        with patch.dict(os.environ, {"GITHUB_PAT": "ghp_abc123"}, clear=True):
            result = get_github_env()
            assert result is not None
            assert result["GH_TOKEN"] == "ghp_abc123"
            assert "PATH" in result

    def test_env_includes_path(self):
        with patch.dict(os.environ, {"GITHUB_PAT": "ghp_test", "PATH": "/usr/bin"}, clear=True):
            result = get_github_env()
            assert result["PATH"] == "/usr/bin"