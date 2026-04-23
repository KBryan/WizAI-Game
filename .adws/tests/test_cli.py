import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import patch, MagicMock
from pathlib import Path

from cli import get_project_root, get_adws_dir, find_script


class TestGetProjectRoot:
    def test_returns_cwd_when_no_manifest(self):
        # Verify the function exists and returns a Path
        result = get_project_root()
        assert isinstance(result, Path)


class TestGetAdwsDir:
    def test_returns_dot_adws(self, tmp_path):
        result = get_adws_dir(tmp_path)
        assert result == tmp_path / ".adws"


class TestFindScript:
    def test_returns_none_when_script_not_found(self, tmp_path):
        with patch("cli.get_project_root", return_value=tmp_path):
            result = find_script("nonexistent.sh")
            assert result is None

    def test_finds_script_in_project_scripts(self, tmp_path):
        scripts_dir = tmp_path / "scripts"
        scripts_dir.mkdir()
        script_file = scripts_dir / "test.sh"
        script_file.write_text("#!/bin/bash")

        with patch("cli.get_project_root", return_value=tmp_path):
            result = find_script("test.sh")
            assert result == script_file


class TestRepoAgnostic:
    """Test repo-agnostic functionality via ADW_REPO env var."""

    def test_get_repo_url_uses_adw_repo_env(self):
        from github import get_repo_url

        with patch.dict(os.environ, {"ADW_REPO": "owner/repo"}, clear=True):
            with patch("github.subprocess.run") as mock_run:
                # Should NOT call git remote when ADW_REPO is set
                result = get_repo_url()
                assert result == "https://github.com/owner/repo"
                mock_run.assert_not_called()

    def test_get_repo_url_with_full_url(self):
        from github import get_repo_url

        with patch.dict(
            os.environ,
            {"ADW_REPO": "https://github.com/myorg/myrepo"},
            clear=True,
        ):
            with patch("github.subprocess.run") as mock_run:
                result = get_repo_url()
                assert result == "https://github.com/myorg/myrepo"
                mock_run.assert_not_called()

    def test_get_repo_url_falls_back_to_git(self):
        from github import get_repo_url

        with patch.dict(os.environ, {}, clear=True):
            with patch("github.subprocess.run") as mock_run:
                mock_run.return_value = MagicMock(
                    returncode=0,
                    stdout="https://github.com/fallback/repo\n",
                )
                result = get_repo_url()
                assert result == "https://github.com/fallback/repo"
                mock_run.assert_called_once()

    def test_get_repo_url_error_when_no_git_and_no_env(self):
        from github import get_repo_url

        with patch.dict(os.environ, {}, clear=True):
            with patch("github.subprocess.run") as mock_run:
                mock_run.side_effect = subprocess.CalledProcessError(1, "git")
                try:
                    get_repo_url()
                    assert False, "Should have raised ValueError"
                except ValueError as e:
                    assert "ADW_REPO" in str(e)
