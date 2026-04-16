"""
Tests for GET /vcf/{card_id} endpoint.
Verifies vCard download functionality with org isolation.
"""
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


def test_vcf_endpoint_missing_card_returns_404():
    """Test that missing card returns 404"""
    from app.main import app

    with patch('app.api.vcf.org_repo') as mock_org_repo:
        mock_org_repo.get_user_org_id.return_value = 'org_123'

        with patch('app.api.vcf.card_repo') as mock_card_repo:
            mock_card_repo.get.return_value = None

            client = TestClient(app)
            response = client.get('/vcf/card_notfound?user_id=user_123')

            assert response.status_code == 404


def test_vcf_endpoint_valid_card_returns_vcard():
    """Test that valid card returns vCard with correct headers"""
    from app.main import app
    from app.models.card import Card

    expected_vcard = """BEGIN:VCARD
VERSION:3.0
FN:John Doe
N:John Doe;;;
ORG:TechCorp
TITLE:Software Engineer
TEL;TYPE=WORK,VOICE:0212345678
EMAIL;TYPE=WORK:john@techcorp.com
ADR;TYPE=WORK:;;123 Main St;;;;
NOTE:Important client
END:VCARD"""

    # Create a proper Card object
    card = Card(
        id='card_123',
        name='John Doe',
        title='Software Engineer',
        company='TechCorp',
        phone='02-1234-5678',
        email='john@techcorp.com',
        address='123 Main St',
        memo='Important client',
        added_by='user_123',
        created_at='2026-04-15T10:00:00'
    )

    with patch('app.api.vcf.org_repo') as mock_org_repo:
        mock_org_repo.get_user_org_id.return_value = 'org_123'

        with patch('app.api.vcf.card_repo') as mock_card_repo:
            mock_card_repo.get.return_value = card

            with patch('app.api.vcf.generate_vcard_string') as mock_generate:
                mock_generate.return_value = expected_vcard

                client = TestClient(app)
                response = client.get('/vcf/card_123?user_id=user_123')

                assert response.status_code == 200
                assert 'text/vcard' in response.headers['content-type']
                assert 'attachment; filename=' in response.headers['content-disposition']
                assert response.text == expected_vcard


def test_vcf_endpoint_org_isolation_returns_404():
    """Test that cross-org access returns 404"""
    from app.main import app

    with patch('app.api.vcf.org_repo') as mock_org_repo:
        # User belongs to org_999
        mock_org_repo.get_user_org_id.return_value = 'org_999'

        with patch('app.api.vcf.card_repo') as mock_card_repo:
            # Card is in different org (org_123), so get returns None
            mock_card_repo.get.return_value = None

            client = TestClient(app)
            response = client.get('/vcf/card_123?user_id=user_123')

            # Should return 404 since card is not in user's org
            assert response.status_code == 404


def test_vcf_endpoint_no_org_returns_404():
    """Test that user with no org returns 404"""
    from app.main import app

    with patch('app.api.vcf.org_repo') as mock_org_repo:
        mock_org_repo.get_user_org_id.return_value = None

        client = TestClient(app)
        response = client.get('/vcf/card_123?user_id=user_123')

        assert response.status_code == 404


def test_vcf_endpoint_filename_header():
    """Test that Content-Disposition filename is correctly formatted"""
    from app.main import app
    from app.models.card import Card

    # Create a proper Card object
    card = Card(
        id='card_123',
        name='Jane Smith',
        title=None,
        company=None,
        phone=None,
        email=None,
        address=None,
        memo=None,
        added_by='user_123',
        created_at='2026-04-15T10:00:00'
    )

    with patch('app.api.vcf.org_repo') as mock_org_repo:
        mock_org_repo.get_user_org_id.return_value = 'org_123'

        with patch('app.api.vcf.card_repo') as mock_card_repo:
            mock_card_repo.get.return_value = card

            with patch('app.api.vcf.generate_vcard_string') as mock_generate:
                mock_generate.return_value = "BEGIN:VCARD\nEND:VCARD"

                client = TestClient(app)
                response = client.get('/vcf/card_123?user_id=user_123')

                assert response.status_code == 200
                # Check filename contains person's name
                assert 'filename="Jane Smith.vcf"' in response.headers['content-disposition']
