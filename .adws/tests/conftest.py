import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from data_types import (
    GitHubUser,
    GitHubLabel,
    GitHubMilestone,
    GitHubComment,
    GitHubIssueListItem,
    GitHubIssue,
    AgentPromptRequest,
    AgentPromptResponse,
    AgentTemplateRequest,
    SlashCommand,
    ClaudeCodeResultMessage,
)


@pytest.fixture
def sample_github_user():
    return {
        "login": "testuser",
        "id": "12345",
        "name": "Test User",
        "is_bot": False,
    }


@pytest.fixture
def sample_github_label():
    return {
        "id": "label-1",
        "name": "bug",
        "color": "ff0000",
        "description": "Bug report",
    }


@pytest.fixture
def sample_github_issue_list_item(sample_github_user, sample_github_label):
    return {
        "number": 42,
        "title": "Test issue",
        "body": "This is a test issue",
        "labels": [sample_github_label],
        "createdAt": "2026-01-15T10:30:00Z",
        "updatedAt": "2026-01-15T12:00:00Z",
    }


@pytest.fixture
def sample_github_comment(sample_github_user):
    return {
        "id": "comment-1",
        "author": sample_github_user,
        "body": "This is a comment",
        "createdAt": "2026-01-15T11:00:00Z",
    }


@pytest.fixture
def sample_github_issue(sample_github_user, sample_github_label, sample_github_comment):
    return {
        "number": 42,
        "title": "Test issue",
        "body": "This is a test issue",
        "state": "open",
        "author": sample_github_user,
        "assignees": [sample_github_user],
        "labels": [sample_github_label],
        "milestone": None,
        "comments": [sample_github_comment],
        "createdAt": "2026-01-15T10:30:00Z",
        "updatedAt": "2026-01-15T12:00:00Z",
        "url": "https://github.com/owner/repo/issues/42",
    }