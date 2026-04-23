import os
import sys
import logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils import make_adw_id, setup_logger, get_logger


class TestMakeAdwId:
    def test_returns_string(self):
        result = make_adw_id()
        assert isinstance(result, str)

    def test_length_is_8(self):
        result = make_adw_id()
        assert len(result) == 8

    def test_unique(self):
        ids = {make_adw_id() for _ in range(100)}
        assert len(ids) == 100

    def test_alphanumeric(self):
        result = make_adw_id()
        assert result.isalnum() or "-" in result


class TestSetupLogger:
    def test_creates_logger(self):
        adw_id = make_adw_id()
        logger = setup_logger(adw_id)
        assert isinstance(logger, logging.Logger)
        assert f"adw_{adw_id}" in logger.name

    def test_logger_creates_log_directory(self):
        adw_id = make_adw_id()
        logger = setup_logger(adw_id, "test_trigger")
        logger.info("Test log message")

        import utils
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(utils.__file__)))
        log_dir = os.path.join(project_root, "agents", adw_id, "test_trigger")
        assert os.path.isdir(log_dir), f"Log directory not created at {log_dir}"

    def test_logger_has_file_and_console_handlers(self):
        adw_id = make_adw_id()
        logger = setup_logger(adw_id)
        assert len(logger.handlers) == 2

        handler_types = {type(h) for h in logger.handlers}
        assert logging.FileHandler in handler_types
        assert logging.StreamHandler in handler_types


class TestGetLogger:
    def test_retrieves_existing_logger(self):
        adw_id = make_adw_id()
        original = setup_logger(adw_id)
        retrieved = get_logger(adw_id)
        assert original.name == retrieved.name

    def test_returns_logger_without_setup(self):
        adw_id = "nonexistent_test"
        logger = get_logger(adw_id)
        assert isinstance(logger, logging.Logger)
        assert f"adw_{adw_id}" in logger.name