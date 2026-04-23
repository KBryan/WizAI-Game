import os
import sys
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient


def _import_app():
    with patch.dict(os.environ, {"PORT": "8001"}, clear=False):
        import trigger_webhook
        return trigger_webhook.app


class TestHealthEndpoint:
    def test_health_endpoint_exists(self):
        app = _import_app()
        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "service" in data
        assert data["service"] == "adw-webhook-trigger"


class TestWebhookEndpoint:
    def test_ignores_non_matching_events(self):
        app = _import_app()
        client = TestClient(app)
        response = client.post(
            "/gh-webhook",
            json={"action": "edited", "issue": {"number": 1}},
            headers={"X-GitHub-Event": "issues"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ignored"

    def test_triggers_on_new_issue(self):
        app = _import_app()
        client = TestClient(app)
        with patch("trigger_webhook.subprocess.Popen") as mock_popen:
            mock_popen.return_value = MagicMock()
            response = client.post(
                "/gh-webhook",
                json={"action": "opened", "issue": {"number": 42}},
                headers={"X-GitHub-Event": "issues"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "accepted"
            assert data["issue"] == 42
            assert "adw_id" in data

    def test_triggers_on_adw_comment(self):
        app = _import_app()
        client = TestClient(app)
        with patch("trigger_webhook.subprocess.Popen") as mock_popen:
            mock_popen.return_value = MagicMock()
            response = client.post(
                "/gh-webhook",
                json={
                    "action": "created",
                    "issue": {"number": 7},
                    "comment": {"body": "adw"},
                },
                headers={"X-GitHub-Event": "issue_comment"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "accepted"

    def test_ignores_non_adw_comment(self):
        app = _import_app()
        client = TestClient(app)
        response = client.post(
            "/gh-webhook",
            json={
                "action": "created",
                "issue": {"number": 7},
                "comment": {"body": "this is not adw"},
            },
            headers={"X-GitHub-Event": "issue_comment"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ignored"

    def test_handles_malformed_payload(self):
        app = _import_app()
        client = TestClient(app)
        response = client.post(
            "/gh-webhook",
            json={"action": "opened"},
            headers={"X-GitHub-Event": "issues"},
        )
        assert response.status_code == 200