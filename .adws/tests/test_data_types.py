import pytest
from datetime import datetime

from data_types import (
    GitHubUser,
    GitHubLabel,
    GitHubComment,
    GitHubIssueListItem,
    GitHubIssue,
    AgentPromptRequest,
    AgentPromptResponse,
    AgentTemplateRequest,
    SlashCommand,
    ClaudeCodeResultMessage,
)


class TestGitHubUser:
    def test_create_minimal(self):
        user = GitHubUser(login="testuser")
        assert user.login == "testuser"
        assert user.id is None
        assert user.name is None
        assert user.is_bot is False

    def test_create_full(self):
        user = GitHubUser(
            login="testuser",
            id="12345",
            name="Test User",
            is_bot=True,
        )
        assert user.login == "testuser"
        assert user.id == "12345"
        assert user.is_bot is True

    def test_login_required(self):
        with pytest.raises(Exception):
            GitHubUser()


class TestGitHubLabel:
    def test_create(self):
        label = GitHubLabel(
            id="label-1",
            name="bug",
            color="ff0000",
        )
        assert label.name == "bug"
        assert label.description is None

    def test_with_description(self):
        label = GitHubLabel(
            id="label-1",
            name="bug",
            color="ff0000",
            description="Bug report",
        )
        assert label.description == "Bug report"


class TestGitHubComment:
    def test_create(self, sample_github_user):
        comment = GitHubComment(
            id="c-1",
            author=GitHubUser(**sample_github_user),
            body="Hello",
            createdAt="2026-01-15T10:00:00Z",
        )
        assert comment.body == "Hello"
        assert comment.author.login == "testuser"

    def test_updated_at_optional(self, sample_github_user):
        comment = GitHubComment(
            id="c-1",
            author=GitHubUser(**sample_github_user),
            body="Hello",
            createdAt="2026-01-15T10:00:00Z",
        )
        assert comment.updated_at is None


class TestGitHubIssueListItem:
    def test_create(self, sample_github_issue_list_item):
        issue = GitHubIssueListItem(**sample_github_issue_list_item)
        assert issue.number == 42
        assert issue.title == "Test issue"
        assert len(issue.labels) == 1
        assert issue.labels[0].name == "bug"

    def test_labels_default_empty(self):
        issue = GitHubIssueListItem(
            number=1,
            title="Test",
            body="Body",
            createdAt="2026-01-01T00:00:00Z",
            updatedAt="2026-01-01T00:00:00Z",
        )
        assert issue.labels == []


class TestGitHubIssue:
    def test_create_full(self, sample_github_issue):
        issue = GitHubIssue(**sample_github_issue)
        assert issue.number == 42
        assert issue.state == "open"
        assert issue.author.login == "testuser"
        assert len(issue.comments) == 1
        assert issue.milestone is None

    def test_closed_at_optional(self, sample_github_issue):
        issue = GitHubIssue(**sample_github_issue)
        assert issue.closed_at is None

    def test_url_required(self, sample_github_issue):
        issue = GitHubIssue(**sample_github_issue)
        assert "github.com" in issue.url


class TestAgentPromptRequest:
    def test_create_minimal(self):
        req = AgentPromptRequest(
            prompt="/feature add login",
            adw_id="abc12345",
        )
        assert req.prompt == "/feature add login"
        assert req.agent_name == "ops"
        assert req.model == "opus"
        assert req.output_file == ""
        assert req.dangerously_skip_permissions is False

    def test_model_options(self):
        for model in ("sonnet", "opus", "zai-org-glm-5-1"):
            req = AgentPromptRequest(
                prompt="/bug fix crash",
                adw_id="abc12345",
                output_file="/tmp/out.jsonl",
                model=model,
            )
            assert req.model == model

    def test_any_string_model(self):
        req = AgentPromptRequest(
            prompt="/feature test",
            adw_id="abc12345",
            model="zai-org-glm-5-1",
        )
        assert req.model == "zai-org-glm-5-1"


class TestAgentPromptResponse:
    def test_success(self):
        resp = AgentPromptResponse(
            output="Task completed",
            success=True,
            session_id="sess-1",
        )
        assert resp.success is True
        assert resp.session_id == "sess-1"

    def test_failure(self):
        resp = AgentPromptResponse(
            output="Error occurred",
            success=False,
        )
        assert resp.success is False
        assert resp.session_id is None

    def test_session_id_optional(self):
        resp = AgentPromptResponse(
            output="Done",
            success=True,
        )
        assert resp.session_id is None


class TestAgentTemplateRequest:
    def test_create(self):
        req = AgentTemplateRequest(
            agent_name="ops",
            slash_command="/feature",
            args=["add", "login"],
            adw_id="abc12345",
        )
        assert req.slash_command == "/feature"
        assert req.args == ["add", "login"]
        assert req.model == "opus"

    def test_slash_command_values(self):
        valid_commands = ["/chore", "/bug", "/feature"]
        for cmd in valid_commands:
            req = AgentTemplateRequest(
                agent_name="ops",
                slash_command=cmd,
                args=["test"],
                adw_id="abc12345",
            )
            assert req.slash_command == cmd

    def test_invalid_slash_command_rejected(self):
        with pytest.raises(Exception):
            AgentTemplateRequest(
                agent_name="ops",
                slash_command="/invalid",
                args=[],
                adw_id="abc12345",
            )


class TestClaudeCodeResultMessage:
    def test_create(self):
        msg = ClaudeCodeResultMessage(
            type="result",
            subtype="success",
            is_error=False,
            duration_ms=5000,
            duration_api_ms=3000,
            num_turns=3,
            result="Implementation complete",
            session_id="sess-abc",
            total_cost_usd=0.42,
        )
        assert msg.type == "result"
        assert msg.is_error is False
        assert msg.total_cost_usd == 0.42

    def test_error_result(self):
        msg = ClaudeCodeResultMessage(
            type="result",
            subtype="error",
            is_error=True,
            duration_ms=100,
            duration_api_ms=50,
            num_turns=1,
            result="Command failed",
            session_id="sess-err",
            total_cost_usd=0.01,
        )
        assert msg.is_error is True