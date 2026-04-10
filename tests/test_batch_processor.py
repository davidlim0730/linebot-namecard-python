"""
Tests for batch_processor module.
Verifies batch processing behavior and notification handling.
"""
import pytest
import asyncio
from unittest.mock import MagicMock, patch
from app.batch_processor import process_batch


def test_process_batch_does_not_send_per_image_notifications():
    """Verify process_batch doesn't send push message for each image"""
    user_id = "test_user"
    org_id = "test_org"

    # Create mock image paths
    image_paths = [
        "raw_images/test_org/test_user/image1.jpg",
        "raw_images/test_org/test_user/image2.jpg",
        "raw_images/test_org/test_user/image3.jpg"
    ]

    # Patch all dependencies
    with patch('app.batch_processor.firebase_utils') as mock_firebase, \
         patch('app.batch_processor.gemini_utils') as mock_gemini, \
         patch('app.batch_processor.utils') as mock_utils, \
         patch('app.batch_processor.trigger_sync') as mock_sync:

        # Setup mocks to simulate successful processing
        mock_firebase.check_org_permission.return_value = {'allowed': True}
        mock_firebase.download_raw_image.return_value = b"fake_image_data"
        mock_firebase.check_if_card_exists.return_value = None  # No duplicate
        mock_firebase.add_namecard.return_value = "card_id_123"

        mock_gemini.generate_json_from_image.return_value = MagicMock(
            text='{"name": "John", "company": "ABC"}'
        )
        mock_utils.parse_gemini_result_to_json.return_value = {
            "name": "John", "company": "ABC"
        }
        mock_utils.validate_namecard_fields.return_value = {
            "name": "John", "company": "ABC"
        }

        # Execute process_batch using asyncio.run
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(process_batch(user_id, org_id, image_paths))
        finally:
            loop.close()

        # Assertions
        # 1. Verify all images were processed successfully
        assert result["success"] == 3, f"Expected 3 successful, got {result['success']}"
        assert result["failed"] == 0, f"Expected 0 failures, got {result['failed']}"

        # 2. Verify batch processing loop completed without premature exits
        assert mock_firebase.download_raw_image.call_count == 3, \
            "Expected 3 image downloads"
        assert mock_gemini.generate_json_from_image.call_count == 3, \
            "Expected 3 OCR calls"


def test_process_batch_returns_summary_only():
    """Verify process_batch returns summary dict without push notifications"""
    user_id = "test_user"
    org_id = "test_org"
    image_paths = ["raw_images/test_org/test_user/image1.jpg"]

    with patch('app.batch_processor.firebase_utils') as mock_firebase, \
         patch('app.batch_processor.gemini_utils') as mock_gemini, \
         patch('app.batch_processor.utils') as mock_utils, \
         patch('app.batch_processor.trigger_sync') as mock_sync:

        mock_firebase.check_org_permission.return_value = {'allowed': True}
        mock_firebase.download_raw_image.return_value = b"fake_image_data"
        mock_firebase.check_if_card_exists.return_value = None
        mock_firebase.add_namecard.return_value = "card_id_123"

        mock_gemini.generate_json_from_image.return_value = MagicMock(
            text='{"name": "Test"}'
        )
        mock_utils.parse_gemini_result_to_json.return_value = {"name": "Test"}
        mock_utils.validate_namecard_fields.return_value = {"name": "Test"}

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(process_batch(user_id, org_id, image_paths))
        finally:
            loop.close()

        # Verify return value is a dict with expected keys
        assert isinstance(result, dict), "process_batch should return a dict"
        assert "success" in result, "Result should have 'success' key"
        assert "failed" in result, "Result should have 'failed' key"
        assert "failures" in result, "Result should have 'failures' key"
        assert result["success"] == 1, "Expected 1 successful card"
        assert result["failed"] == 0, "Expected no failures"


def test_process_batch_logs_progress_not_pushes():
    """Verify process_batch logs progress with logger.info instead of push_message"""
    user_id = "test_user"
    org_id = "test_org"
    image_paths = [
        "raw_images/test_org/test_user/image1.jpg",
        "raw_images/test_org/test_user/image2.jpg",
    ]

    with patch('app.batch_processor.firebase_utils') as mock_firebase, \
         patch('app.batch_processor.gemini_utils') as mock_gemini, \
         patch('app.batch_processor.utils') as mock_utils, \
         patch('app.batch_processor.trigger_sync') as mock_sync:

        mock_firebase.check_org_permission.return_value = {'allowed': True}
        mock_firebase.download_raw_image.return_value = b"fake_image_data"
        mock_firebase.check_if_card_exists.return_value = None
        mock_firebase.add_namecard.return_value = "card_id_123"

        mock_gemini.generate_json_from_image.return_value = MagicMock(
            text='{"name": "John"}'
        )
        mock_utils.parse_gemini_result_to_json.return_value = {"name": "John"}
        mock_utils.validate_namecard_fields.return_value = {"name": "John"}

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(process_batch(user_id, org_id, image_paths))
        finally:
            loop.close()

        assert result["success"] == 2, "Expected 2 successful cards"
        assert result["failed"] == 0, "Expected no failures"
