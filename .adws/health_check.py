#!/usr/bin/env uv run
# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "python-dotenv",
#     "pydantic",
# ]
# ///

"""
Health Check Script for ADW System

Usage:
uv run adws/health_check.py <issue_number>

This script performs comprehensive health checks:
1. Validates environment variables for the configured provider
2. Checks git repository configuration
3. Tests agent provider availability (OpenCode, Claude CLI, or Venice API)
4. Returns structured results
"""

import os
import sys
import json
import subprocess
import tempfile
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path
import argparse

from dotenv import load_dotenv
from pydantic import BaseModel

from github import get_repo_url, extract_repo_path, make_issue_comment
from providers import get_provider, PROVIDERS

# Load environment variables
load_dotenv()


class CheckResult(BaseModel):
    """Individual check result."""

    success: bool
    error: Optional[str] = None
    warning: Optional[str] = None
    details: Dict[str, Any] = {}


class HealthCheckResult(BaseModel):
    """Structure for health check results."""

    success: bool
    timestamp: str
    checks: Dict[str, CheckResult]
    warnings: List[str] = []
    errors: List[str] = []


def check_env_vars() -> CheckResult:
    """Check required environment variables based on the configured provider."""
    provider_name = os.getenv("ADW_AGENT_PROVIDER", "opencode")

    # Required vars per provider
    provider_required = {
        "opencode": {},  # OpenCode detects its own API key
        "claude_cli": {
            "ANTHROPIC_API_KEY": "Anthropic API Key for Claude Code",
        },
        "venice_api": {
            "VENICE_API_KEY": "Venice.AI API Key",
        },
    }

    # Optional vars shared across providers
    optional_vars = {
        "GITHUB_PAT": "(Optional) GitHub Personal Access Token",
        "E2B_API_KEY": "(Optional) E2B API Key for sandbox environments",
        "CLOUDFLARED_TUNNEL_TOKEN": "(Optional) Cloudflare tunnel token for webhook exposure",
    }

    # Provider-specific optional vars
    provider_optional = {
        "opencode": {
            "VENICE_API_KEY": "(Optional) Venice.AI API Key for OpenCode LLM backend",
            "ANTHROPIC_API_KEY": "(Optional) Anthropic API Key for OpenCode LLM backend",
        },
        "claude_cli": {
            "CLAUDE_CODE_PATH": "(Optional) Path to Claude Code CLI (defaults to 'claude')",
        },
        "venice_api": {
            "VENICE_MODEL": "(Optional) Venice model ID (defaults to 'zai-org-glm-5-1')",
            "VENICE_API_BASE_URL": "(Optional) Custom Venice API base URL",
        },
    }

    required = provider_required.get(provider_name, {})
    optional = {**optional_vars, **provider_optional.get(provider_name, {})}

    missing_required = []
    missing_optional = []

    for var, desc in required.items():
        if not os.getenv(var):
            missing_required.append(f"{var} ({desc})")

    for var, desc in optional.items():
        if not os.getenv(var):
            missing_optional.append(f"{var} ({desc})")

    success = len(missing_required) == 0

    return CheckResult(
        success=success,
        error="Missing required environment variables" if not success else None,
        details={
            "provider": provider_name,
            "missing_required": missing_required,
            "missing_optional": missing_optional,
        },
    )


def check_git_repo() -> CheckResult:
    """Check git repository configuration using github module."""
    try:
        # Get repo URL using the github module function
        repo_url = get_repo_url()
        repo_path = extract_repo_path(repo_url)

        # Check if still using disler's repo
        is_disler_repo = "disler" in repo_path.lower()

        return CheckResult(
            success=True,
            warning=(
                "Repository still points to 'disler'. Please update to your own GitHub repository."
                if is_disler_repo
                else None
            ),
            details={
                "repo_url": repo_url,
                "repo_path": repo_path,
                "is_disler_repo": is_disler_repo,
            },
        )
    except ValueError as e:
        return CheckResult(success=False, error=str(e))


def check_agent_provider() -> CheckResult:
    """Check if the configured agent provider is available."""
    try:
        provider = get_provider()
    except ValueError as e:
        return CheckResult(success=False, error=str(e))

    provider_name = os.getenv("ADW_AGENT_PROVIDER", "opencode")
    error_msg = provider.check_available()
    if error_msg:
        return CheckResult(
            success=False,
            error=error_msg,
            details={"provider": provider_name, "available": False},
        )

    return CheckResult(
        success=True,
        details={
            "provider": provider_name,
            "available": True,
            "provider_class": type(provider).__name__,
        },
    )


def check_github_cli() -> CheckResult:
    """Check if GitHub CLI is installed and authenticated."""
    try:
        # Check if gh is installed
        result = subprocess.run(["gh", "--version"], capture_output=True, text=True)
        if result.returncode != 0:
            return CheckResult(success=False, error="GitHub CLI (gh) is not installed")

        # Check authentication status
        env = os.environ.copy()
        if os.getenv("GITHUB_PAT"):
            env["GH_TOKEN"] = os.getenv("GITHUB_PAT")

        result = subprocess.run(
            ["gh", "auth", "status"], capture_output=True, text=True, env=env
        )

        authenticated = result.returncode == 0

        return CheckResult(
            success=authenticated,
            error="GitHub CLI not authenticated" if not authenticated else None,
            details={"installed": True, "authenticated": authenticated},
        )

    except FileNotFoundError:
        return CheckResult(
            success=False,
            error="GitHub CLI (gh) is not installed. Install with: brew install gh",
            details={"installed": False},
        )


def check_venice_connectivity() -> CheckResult:
    """Test Venice.AI API connectivity with a minimal request."""
    try:
        import urllib.request
        import urllib.error

        api_key = os.getenv("VENICE_API_KEY", "")
        base_url = os.getenv("VENICE_API_BASE_URL", "https://api.venice.ai/api/v1")
        url = f"{base_url}/models"

        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                return CheckResult(
                    success=True,
                    details={"base_url": base_url, "status": "connected"},
                )
            else:
                return CheckResult(
                    success=False,
                    error=f"Venice API returned status {response.status}",
                )
    except urllib.error.HTTPError as e:
        if e.code == 401:
            return CheckResult(success=False, error="Venice API key is invalid (401 Unauthorized)")
        return CheckResult(success=False, error=f"Venice API returned HTTP {e.code}")
    except Exception as e:
        return CheckResult(success=False, error=f"Cannot reach Venice API: {e}")


def run_health_check() -> HealthCheckResult:
    """Run all health checks and return results."""
    result = HealthCheckResult(
        success=True, timestamp=datetime.now().isoformat(), checks={}
    )

    # Check environment variables
    env_check = check_env_vars()
    result.checks["environment"] = env_check
    if not env_check.success:
        result.success = False
        if env_check.error:
            result.errors.append(env_check.error)
        # Add specific missing vars to errors
        missing_required = env_check.details.get("missing_required", [])
        result.errors.extend(
            [f"Missing required env var: {var}" for var in missing_required]
        )
    # Don't add warnings for optional env vars - they're optional!

    # Check git repository
    git_check = check_git_repo()
    result.checks["git_repository"] = git_check
    if not git_check.success:
        result.success = False
        if git_check.error:
            result.errors.append(git_check.error)
    elif git_check.warning:
        result.warnings.append(git_check.warning)

    # Check GitHub CLI
    gh_check = check_github_cli()
    result.checks["github_cli"] = gh_check
    if not gh_check.success:
        result.success = False
        if gh_check.error:
            result.errors.append(gh_check.error)

    # Check agent provider availability
    provider_name = os.getenv("ADW_AGENT_PROVIDER", "opencode")
    provider_check = check_agent_provider()
    result.checks[f"agent_{provider_name}"] = provider_check
    if not provider_check.success:
        result.success = False
        if provider_check.error:
            result.errors.append(provider_check.error)
    else:
        # For venice_api, we can do a connectivity check
        if provider_name == "venice_api":
            venice_check = check_venice_connectivity()
            result.checks["venice_api_connectivity"] = venice_check
            if not venice_check.success:
                result.success = False
                if venice_check.error:
                    result.errors.append(venice_check.error)

    return result


def main():
    """Main entry point."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="ADW System Health Check")
    parser.add_argument(
        "issue_number",
        nargs="?",
        help="Optional GitHub issue number to post results to",
    )
    args = parser.parse_args()

    print("🏥 Running ADW System Health Check...\n")

    result = run_health_check()

    # Print summary
    print(
        f"{'✅' if result.success else '❌'} Overall Status: {'HEALTHY' if result.success else 'UNHEALTHY'}"
    )
    print(f"📅 Timestamp: {result.timestamp}\n")

    # Print detailed results
    print("📋 Check Results:")
    print("-" * 50)

    for check_name, check_result in result.checks.items():
        status = "✅" if check_result.success else "❌"
        print(f"\n{status} {check_name.replace('_', ' ').title()}:")

        # Print check-specific details
        for key, value in check_result.details.items():
            if value is not None and key not in [
                "missing_required",
                "missing_optional",
            ]:
                print(f"   {key}: {value}")

        if check_result.error:
            print(f"   ❌ Error: {check_result.error}")
        if check_result.warning:
            print(f"   ⚠️  Warning: {check_result.warning}")

    # Print warnings
    if result.warnings:
        print("\n⚠️  Warnings:")
        for warning in result.warnings:
            print(f"   - {warning}")

    # Print errors
    if result.errors:
        print("\n❌ Errors:")
        for error in result.errors:
            print(f"   - {error}")

    # Print next steps
    if not result.success:
        print("\n📝 Next Steps:")
        if any("ANTHROPIC_API_KEY" in e for e in result.errors):
            print("   1. Set ANTHROPIC_API_KEY in your .env file (for claude_cli provider)")
        if any("VENICE_API_KEY" in e for e in result.errors):
            print("   1. Set VENICE_API_KEY in your .env file (for venice_api provider)")
        if any("GitHub CLI" in e for e in result.errors):
            print("   3. Install GitHub CLI: brew install gh")
            print("   4. Authenticate: gh auth login")
        if any("disler" in w for w in result.warnings):
            print(
                "   5. Fork/clone the repository and update git remote to your own repo"
            )

    # If issue number provided, post comment
    if args.issue_number:
        print(f"\n📤 Posting health check results to issue #{args.issue_number}...")
        status_emoji = "✅" if result.success else "❌"
        comment = f"{status_emoji} Health check completed: {'HEALTHY' if result.success else 'UNHEALTHY'}"
        try:
            make_issue_comment(args.issue_number, comment)
            print(f"✅ Posted health check comment to issue #{args.issue_number}")
        except Exception as e:
            print(f"❌ Failed to post comment: {e}")

    # Return appropriate exit code
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
