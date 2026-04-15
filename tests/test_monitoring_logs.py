import json
import logging
from unittest.mock import patch, MagicMock


def test_single_ocr_success_logs_structured_event(caplog):
    """Single OCR success should log structured event"""
    import app.line_handlers as lh

    with caplog.at_level(logging.INFO, logger="app.line_handlers"):
        lh._log_ocr_event("ocr_success", "org1", "user1", "single")

    assert any(
        "ocr_success" in r.message and "org1" in r.message
        for r in caplog.records
    )


def test_single_ocr_failure_logs_structured_event(caplog):
    """Single OCR failure should log structured event"""
    import app.line_handlers as lh

    with caplog.at_level(logging.ERROR, logger="app.line_handlers"):
        lh._log_ocr_event("ocr_failure", "org1", "user1", "single", reason="parse error")

    assert any(
        "ocr_failure" in r.message and "parse error" in r.message
        for r in caplog.records
    )


def test_batch_ocr_success_logs_structured_event(caplog):
    """Batch OCR success should log structured event"""
    import app.batch_processor as bp

    with caplog.at_level(logging.INFO, logger="app.batch_processor"):
        bp._log_ocr_event("ocr_success", "org1", "user1", "batch")

    assert any("ocr_success" in r.message for r in caplog.records)


def test_firebase_write_error_logs_structured_event(caplog):
    """Firebase write error should log structured event with path and reason"""
    import app.firebase_utils as fu

    with caplog.at_level(logging.ERROR, logger="app.firebase_utils"):
        fu._log_firebase_event("firebase_write_error", "namecard/org1/card1", "Connection timeout")

    # Check that the error was logged
    assert len(caplog.records) > 0
    last_record = caplog.records[-1]
    assert last_record.levelname == "ERROR"

    # Parse JSON from message
    log_data = json.loads(last_record.message)
    assert log_data["event"] == "firebase_write_error"
    assert log_data["path"] == "namecard/org1/card1"
    assert log_data["reason"] == "Connection timeout"


def test_firebase_read_error_logs_structured_event(caplog):
    """Firebase read error should log structured event with path and reason"""
    import app.firebase_utils as fu

    with caplog.at_level(logging.ERROR, logger="app.firebase_utils"):
        fu._log_firebase_event("firebase_read_error", "organizations/org1", "Permission denied")

    # Check that the error was logged
    assert len(caplog.records) > 0
    last_record = caplog.records[-1]
    assert last_record.levelname == "ERROR"

    # Parse JSON from message
    log_data = json.loads(last_record.message)
    assert log_data["event"] == "firebase_read_error"
    assert log_data["path"] == "organizations/org1"
    assert log_data["reason"] == "Permission denied"
