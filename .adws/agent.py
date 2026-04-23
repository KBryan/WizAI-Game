"""Agent module for executing prompts via configurable agent providers.

Supported providers (set via ADW_AGENT_PROVIDER env var):
  - opencode (default): OpenCode CLI
  - claude_cli: Claude Code CLI (legacy)
  - venice_api: Venice.AI API (OpenAI-compatible)

All provider logic lives in providers.py. This module provides the
backward-compatible interface used by the rest of the ADW system.
"""

import os
from typing import Optional

from dotenv import load_dotenv

from data_types import AgentPromptRequest, AgentPromptResponse, AgentTemplateRequest
from providers import get_provider, AgentProvider, ClaudeCLIProvider, PROVIDERS

load_dotenv()


def get_current_provider() -> AgentProvider:
    """Get the currently configured agent provider."""
    return get_provider()


def execute_with_provider(request: AgentPromptRequest) -> AgentPromptResponse:
    """Execute a prompt using the configured agent provider."""
    provider = get_current_provider()
    return provider.execute_prompt(request)


def execute_template_with_provider(request: AgentTemplateRequest) -> AgentPromptResponse:
    """Execute a template (slash command + args) using the configured agent provider."""
    prompt = f"{request.slash_command} {' '.join(request.args)}"

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(project_root, "agents", request.adw_id, request.agent_name)
    os.makedirs(output_dir, exist_ok=True)

    prompt_request = AgentPromptRequest(
        prompt=prompt,
        adw_id=request.adw_id,
        agent_name=request.agent_name,
        model=request.model,
        dangerously_skip_permissions=True,
        output_file=os.path.join(output_dir, "raw_output.jsonl"),
    )

    return execute_with_provider(prompt_request)


# ── Backward-compatible wrappers ──
# These functions preserve the original agent.py interface so that
# existing callers (adw_plan_build.py, etc.) continue to work.


def check_agent_available() -> Optional[str]:
    """Check if the configured agent provider is available."""
    provider = get_current_provider()
    return provider.check_available()


def get_agent_env() -> dict:
    """Get environment variables for the configured agent provider."""
    provider = get_current_provider()
    return provider.get_env()


# ── Legacy Claude Code functions (kept for backward compatibility) ──
# Callers that specifically need Claude Code CLI can still use these.

def check_claude_installed() -> Optional[str]:
    """Check if Claude Code CLI is installed. Return error message if not."""
    provider = ClaudeCLIProvider()
    return provider.check_available()


def prompt_claude_code(request: AgentPromptRequest) -> AgentPromptResponse:
    """Execute Claude Code with the given prompt configuration (legacy)."""
    provider = ClaudeCLIProvider()
    return provider.execute_prompt(request)


def execute_template(request: AgentTemplateRequest) -> AgentPromptResponse:
    """Execute a Claude Code template with slash command and args (legacy)."""
    return execute_template_with_provider(request)


def get_claude_env() -> dict:
    """Get environment variables for Claude Code execution (legacy)."""
    provider = ClaudeCLIProvider()
    return provider.get_env()