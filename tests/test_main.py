"""
Tests for main.py endpoints.
Verifies internal endpoint behavior and Cloud Scheduler integration.
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch


def test_check_batch_idle_endpoint_processes_all_batches():
    """Verify /internal/check-batch-idle processes active batches"""
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    # Mock database with two batches
    with patch('app.main.get_db_instance') as mock_get_db:
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        # Two batches: one idle, one active
        all_batches = {
            'user_1': {
                'org_id': 'org_1',
                'pending_images': ['img1.jpg'],
                'last_image_time': (datetime.utcnow() - timedelta(seconds=6)).isoformat(),
                'status': 'active'
            },
            'user_2': {
                'org_id': 'org_2',
                'pending_images': ['img2.jpg'],
                'last_image_time': datetime.utcnow().isoformat(),
                'status': 'active'
            }
        }

        mock_ref = MagicMock()
        mock_db.reference.return_value = mock_ref
        mock_ref.get.return_value = all_batches

        response = client.post('/internal/check-batch-idle')

        assert response.status_code == 200
        assert response.json()['status'] == 'ok'
