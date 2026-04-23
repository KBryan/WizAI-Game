"""Agent provider abstraction for the ADW system.

Supports multiple agent backends:
- OpenCode (default): Terminal-based AI coding agent
- Claude CLI: Anthropic's Claude Code CLI
- Venice API: Direct API calls to Venice.AI (OpenAI-compatible)

Select a provider via the ADW_AGENT_PROVIDER env var:
  ADW_AGENT_PROVIDER=opencode    (default)
  ADW_AGENT_PROVIDER=claude_cli
  ADW_AGENT_PROVIDER=venice_api

Each provider implements the AgentProvider protocol:
  - check_available() -> Optional[str]
  - execute_prompt(request) -> AgentPromptResponse
  - get_env() -> Dict[str, str]
"""

import json
import os
import re
import subprocess
import sys
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Tuple

from data_types import AgentPromptRequest, AgentPromptResponse


class AgentProvider(ABC):
    """Base class for all agent providers."""

    @abstractmethod
    def check_available(self) -> Optional[str]:
        """Check if the provider is available. Return None if OK, error message if not."""
        ...

    @abstractmethod
    def execute_prompt(self, request: AgentPromptRequest) -> AgentPromptResponse:
        """Execute a prompt and return the response."""
        ...

    @abstractmethod
    def get_env(self) -> Dict[str, str]:
        """Get environment variables needed by this provider."""
        ...


class OpenCodeProvider(AgentProvider):
    """Agent provider that shells out to the OpenCode CLI."""

    def __init__(self):
        self.cli_path = os.getenv("OPENCODE_PATH", "opencode")

    def check_available(self) -> Optional[str]:
        try:
            result = subprocess.run(
                [self.cli_path, "--version"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode != 0:
                return f"OpenCode CLI returned non-zero exit code at: {self.cli_path}"
        except FileNotFoundError:
            return f"OpenCode CLI not found at: {self.cli_path}. Install from https://github.com/anomalyco/opencode"
        except subprocess.TimeoutExpired:
            return f"OpenCode CLI timed out at: {self.cli_path}"
        return None

    def _save_prompt(self, prompt: str, adw_id: str, agent_name: str) -> None:
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        prompt_dir = os.path.join(project_root, "agents", adw_id, agent_name, "prompts")
        os.makedirs(prompt_dir, exist_ok=True)
        match = re.match(r"^(/\w+)", prompt)
        if match:
            command_name = match.group(1)[1:]
        else:
            command_name = "prompt"
        prompt_file = os.path.join(prompt_dir, f"{command_name}.txt")
        with open(prompt_file, "w") as f:
            f.write(prompt)

    def execute_prompt(self, request: AgentPromptRequest) -> AgentPromptResponse:
        error_msg = self.check_available()
        if error_msg:
            return AgentPromptResponse(output=error_msg, success=False, session_id=None)

        self._save_prompt(request.prompt, request.adw_id, request.agent_name)

        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        output_dir = os.path.join(project_root, "agents", request.adw_id, request.agent_name)
        os.makedirs(output_dir, exist_ok=True)
        output_file = os.path.join(output_dir, "raw_output.md")

        cmd = [
            self.cli_path,
            "--non-interactive",
            "-p",
            request.prompt,
        ]

        env = self.get_env()

        try:
            with open(output_file, "w") as f:
                result = subprocess.run(
                    cmd,
                    stdout=f,
                    stderr=subprocess.PIPE,
                    text=True,
                    env=env,
                    timeout=300,
                    cwd=project_root,
                )

            if result.returncode == 0 and os.path.exists(output_file):
                with open(output_file, "r") as f:
                    output_text = f.read()
                return AgentPromptResponse(
                    output=output_text,
                    success=True,
                    session_id=request.adw_id,
                )
            else:
                stderr_msg = result.stderr if result.stderr else "Unknown error"
                return AgentPromptResponse(
                    output=f"OpenCode error: {stderr_msg}",
                    success=False,
                    session_id=None,
                )

        except subprocess.TimeoutExpired:
            return AgentPromptResponse(
                output="Error: OpenCode command timed out after 5 minutes",
                success=False,
                session_id=None,
            )
        except Exception as e:
            return AgentPromptResponse(
                output=f"Error executing OpenCode: {e}",
                success=False,
                session_id=None,
            )

    def get_env(self) -> Dict[str, str]:
        env_vars = {
            "HOME": os.getenv("HOME"),
            "USER": os.getenv("USER"),
            "PATH": os.getenv("PATH"),
            "SHELL": os.getenv("SHELL"),
            "TERM": os.getenv("TERM"),
        }
        venice_key = os.getenv("VENICE_API_KEY")
        if venice_key:
            env_vars["VENICE_API_KEY"] = venice_key
            env_vars["OPENAI_API_KEY"] = venice_key
            env_vars["OPENAI_BASE_URL"] = os.getenv(
                "VENICE_API_BASE_URL", "https://api.venice.ai/api/v1"
            )
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        if anthropic_key:
            env_vars["ANTHROPIC_API_KEY"] = anthropic_key
        github_pat = os.getenv("GITHUB_PAT")
        if github_pat:
            env_vars["GITHUB_PAT"] = github_pat
            env_vars["GH_TOKEN"] = github_pat
        return {k: v for k, v in env_vars.items() if v is not None}


class ClaudeCLIProvider(AgentProvider):
    """Agent provider that shells out to Claude Code CLI (legacy)."""

    def __init__(self):
        self.cli_path = os.getenv("CLAUDE_CODE_PATH", "claude")

    def check_available(self) -> Optional[str]:
        try:
            result = subprocess.run(
                [self.cli_path, "--version"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode != 0:
                return f"Claude Code CLI is not installed. Expected at: {self.cli_path}"
        except FileNotFoundError:
            return f"Claude Code CLI not found at: {self.cli_path}"
        return None

    def _save_prompt(self, prompt: str, adw_id: str, agent_name: str) -> None:
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        prompt_dir = os.path.join(project_root, "agents", adw_id, agent_name, "prompts")
        os.makedirs(prompt_dir, exist_ok=True)
        match = re.match(r"^(/\w+)", prompt)
        command_name = match.group(1)[1:] if match else "prompt"
        prompt_file = os.path.join(prompt_dir, f"{command_name}.txt")
        with open(prompt_file, "w") as f:
            f.write(prompt)

    @staticmethod
    def _parse_jsonl_output(output_file: str) -> Tuple[List[Dict[str, Any]], Optional[Dict[str, Any]]]:
        try:
            with open(output_file, "r") as f:
                messages = [json.loads(line) for line in f if line.strip()]
            result_message = None
            for message in reversed(messages):
                if message.get("type") == "result":
                    result_message = message
                    break
            return messages, result_message
        except Exception as e:
            print(f"Error parsing JSONL file: {e}", file=sys.stderr)
            return [], None

    @staticmethod
    def _convert_jsonl_to_json(jsonl_file: str) -> str:
        json_file = jsonl_file.replace(".jsonl", ".json")
        messages, _ = ClaudeCLIProvider._parse_jsonl_output(jsonl_file)
        with open(json_file, "w") as f:
            json.dump(messages, f, indent=2)
        return json_file

    def execute_prompt(self, request: AgentPromptRequest) -> AgentPromptResponse:
        error_msg = self.check_available()
        if error_msg:
            return AgentPromptResponse(output=error_msg, success=False, session_id=None)

        self._save_prompt(request.prompt, request.adw_id, request.agent_name)

        output_dir = os.path.dirname(request.output_file)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        cmd = [self.cli_path, "-p", request.prompt]
        cmd.extend(["--model", request.model])
        cmd.extend(["--output-format", "stream-json"])
        cmd.append("--verbose")
        if request.dangerously_skip_permissions:
            cmd.append("--dangerously-skip-permissions")

        env = self.get_env()

        try:
            with open(request.output_file, "w") as f:
                result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, text=True, env=env)

            if result.returncode == 0:
                messages, result_message = self._parse_jsonl_output(request.output_file)
                self._convert_jsonl_to_json(request.output_file)
                if result_message:
                    session_id = result_message.get("session_id")
                    is_error = result_message.get("is_error", False)
                    result_text = result_message.get("result", "")
                    return AgentPromptResponse(
                        output=result_text,
                        success=not is_error,
                        session_id=session_id,
                    )
                else:
                    with open(request.output_file, "r") as f:
                        raw_output = f.read()
                    return AgentPromptResponse(output=raw_output, success=True, session_id=None)
            else:
                return AgentPromptResponse(
                    output=f"Claude Code error: {result.stderr}",
                    success=False,
                    session_id=None,
                )

        except subprocess.TimeoutExpired:
            return AgentPromptResponse(
                output="Error: Claude Code command timed out after 5 minutes",
                success=False,
                session_id=None,
            )
        except Exception as e:
            return AgentPromptResponse(
                output=f"Error executing Claude Code: {e}",
                success=False,
                session_id=None,
            )

    def get_env(self) -> Dict[str, str]:
        env_vars = {
            "ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY"),
            "CLAUDE_CODE_PATH": os.getenv("CLAUDE_CODE_PATH", "claude"),
            "CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR": os.getenv(
                "CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR", "true"
            ),
            "E2B_API_KEY": os.getenv("E2B_API_KEY"),
            "HOME": os.getenv("HOME"),
            "USER": os.getenv("USER"),
            "PATH": os.getenv("PATH"),
            "SHELL": os.getenv("SHELL"),
            "TERM": os.getenv("TERM"),
        }
        github_pat = os.getenv("GITHUB_PAT")
        if github_pat:
            env_vars["GITHUB_PAT"] = github_pat
            env_vars["GH_TOKEN"] = github_pat
        return {k: v for k, v in env_vars.items() if v is not None}


class VeniceAPIProvider(AgentProvider):
    """Agent provider that calls Venice.AI API directly (OpenAI-compatible)."""

    VENICE_API_BASE = "https://api.venice.ai/api/v1"

    def __init__(self):
        self.api_key = os.getenv("VENICE_API_KEY", "")
        self.base_url = os.getenv("VENICE_API_BASE_URL", self.VENICE_API_BASE)
        self.model = os.getenv("VENICE_MODEL", "zai-org-glm-5-1")

    def check_available(self) -> Optional[str]:
        if not self.api_key:
            return "VENICE_API_KEY is not set. Set it in .env or environment."
        try:
            import urllib.request
            import urllib.error

            url = f"{self.base_url}/models"
            req = urllib.request.Request(
                url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status != 200:
                    return f"Venice API returned status {response.status}"
        except urllib.error.HTTPError as e:
            if e.code == 401:
                return "Venice API key is invalid (401 Unauthorized)"
            return f"Venice API returned HTTP {e.code}"
        except Exception as e:
            return f"Cannot reach Venice API at {self.base_url}: {e}"
        return None

    def _save_prompt(self, prompt: str, adw_id: str, agent_name: str) -> None:
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        prompt_dir = os.path.join(project_root, "agents", adw_id, agent_name, "prompts")
        os.makedirs(prompt_dir, exist_ok=True)
        match = re.match(r"^(/\w+)", prompt)
        command_name = match.group(1)[1:] if match else "prompt"
        prompt_file = os.path.join(prompt_dir, f"{command_name}.txt")
        with open(prompt_file, "w") as f:
            f.write(prompt)

    def execute_prompt(self, request: AgentPromptRequest) -> AgentPromptResponse:
        error_msg = self.check_available()
        if error_msg:
            return AgentPromptResponse(output=error_msg, success=False, session_id=None)

        self._save_prompt(request.prompt, request.adw_id, request.agent_name)

        model = self.model
        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": model,
            "messages": [
                {"role": "user", "content": request.prompt},
            ],
            "temperature": 0.3,
        }

        import urllib.request
        import urllib.error

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        output_dir = os.path.join(project_root, "agents", request.adw_id, request.agent_name)
        os.makedirs(output_dir, exist_ok=True)
        output_file = os.path.join(output_dir, "raw_output.json")

        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=data, headers=headers, method="POST")

            with urllib.request.urlopen(req, timeout=300) as response:
                response_data = json.loads(response.read().decode("utf-8"))

            with open(output_file, "w") as f:
                json.dump(response_data, f, indent=2)

            content = (
                response_data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
            )
            venice_session_id = response_data.get("id", request.adw_id)

            return AgentPromptResponse(
                output=content,
                success=True,
                session_id=venice_session_id,
            )

        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="replace") if e.fp else ""
            return AgentPromptResponse(
                output=f"Venice API HTTP {e.code}: {error_body}",
                success=False,
                session_id=None,
            )
        except urllib.error.URLError as e:
            return AgentPromptResponse(
                output=f"Venice API connection error: {e.reason}",
                success=False,
                session_id=None,
            )
        except Exception as e:
            return AgentPromptResponse(
                output=f"Error calling Venice API: {e}",
                success=False,
                session_id=None,
            )

    def get_env(self) -> Dict[str, str]:
        env_vars = {
            "VENICE_API_KEY": self.api_key,
            "VENICE_API_BASE_URL": self.base_url,
            "VENICE_MODEL": self.model,
            "PATH": os.getenv("PATH"),
            "HOME": os.getenv("HOME"),
        }
        github_pat = os.getenv("GITHUB_PAT")
        if github_pat:
            env_vars["GITHUB_PAT"] = github_pat
        return {k: v for k, v in env_vars.items() if v is not None}


PROVIDERS = {
    "opencode": OpenCodeProvider,
    "claude_cli": ClaudeCLIProvider,
    "venice_api": VeniceAPIProvider,
}


def get_provider(provider_name: Optional[str] = None) -> AgentProvider:
    """Get an agent provider instance by name.

    Args:
        provider_name: One of 'opencode', 'claude_cli', 'venice_api'.
                       If None, reads from ADW_AGENT_PROVIDER env var (default: 'opencode').

    Returns:
        An AgentProvider instance.

    Raises:
        ValueError: If the provider name is not recognized.
    """
    if provider_name is None:
        provider_name = os.getenv("ADW_AGENT_PROVIDER", "opencode")

    provider_class = PROVIDERS.get(provider_name)
    if provider_class is None:
        available = ", ".join(sorted(PROVIDERS.keys()))
        raise ValueError(
            f"Unknown agent provider: '{provider_name}'. Available providers: {available}"
        )

    return provider_class()