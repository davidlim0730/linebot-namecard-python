from app.utils import validate_namecard_fields


def test_valid_phone_unchanged():
    result = validate_namecard_fields({"phone": "02-12345678"})
    assert result["phone"] == "02-12345678"


def test_invalid_phone_becomes_na():
    result = validate_namecard_fields({"phone": "12345"})
    assert result["phone"] == "N/A"


def test_valid_mobile_unchanged():
    result = validate_namecard_fields({"mobile": "0912345678"})
    assert result["mobile"] == "0912345678"


def test_valid_mobile_with_country_code_unchanged():
    result = validate_namecard_fields({"mobile": "+886912345678"})
    assert result["mobile"] == "+886912345678"


def test_invalid_mobile_becomes_na():
    result = validate_namecard_fields({"mobile": "12345"})
    assert result["mobile"] == "N/A"


def test_valid_email_unchanged():
    result = validate_namecard_fields({"email": "user@example.com"})
    assert result["email"] == "user@example.com"


def test_invalid_email_becomes_na():
    result = validate_namecard_fields({"email": "not-an-email"})
    assert result["email"] == "N/A"


def test_valid_line_id_unchanged():
    result = validate_namecard_fields({"line_id": "john_doe"})
    assert result["line_id"] == "john_doe"


def test_line_id_too_short_becomes_na():
    result = validate_namecard_fields({"line_id": "ab"})
    assert result["line_id"] == "N/A"


def test_field_already_na_stays_na():
    result = validate_namecard_fields({"phone": "N/A"})
    assert result["phone"] == "N/A"


def test_missing_field_not_added():
    result = validate_namecard_fields({"name": "John"})
    assert "mobile" not in result
    assert "line_id" not in result


def test_multiple_fields_validated_independently():
    result = validate_namecard_fields({"phone": "invalid", "email": "valid@example.com"})
    assert result["phone"] == "N/A"
    assert result["email"] == "valid@example.com"


from app.utils import merge_namecard_data  # noqa: E402


def test_merge_back_fills_na_field():
    front = {"name": "John", "email": "N/A"}
    back = {"name": "Wrong", "email": "john@example.com"}
    result = merge_namecard_data(front, back)
    assert result["email"] == "john@example.com"


def test_merge_front_field_not_overwritten():
    front = {"name": "John"}
    back = {"name": "Wrong Name"}
    result = merge_namecard_data(front, back)
    assert result["name"] == "John"


def test_merge_back_fills_empty_string():
    front = {"phone": ""}
    back = {"phone": "02-12345678"}
    result = merge_namecard_data(front, back)
    assert result["phone"] == "02-12345678"


def test_merge_back_adds_missing_field():
    front = {"name": "John"}
    back = {"mobile": "0912345678"}
    result = merge_namecard_data(front, back)
    assert result["mobile"] == "0912345678"


# Task 18 test
def test_write_feedback_writes_to_correct_path():
    """Verify write_feedback writes to correct Firebase path"""
    from app.firebase_utils import write_feedback
    from unittest.mock import MagicMock

    org_id = "test_org"
    user_id = "test_user"
    timestamp = "2026-04-10T12:00:00.000000"

    feedback_data = {
        'content': 'Test feedback',
        'type': 'text',
        'created_at': timestamp,
        'user_id': user_id
    }

    mock_db = MagicMock()
    mock_ref = MagicMock()
    mock_db.reference.return_value = mock_ref

    write_feedback(org_id, user_id, timestamp, feedback_data, mock_db)

    expected_path = f'feedback/{org_id}/{user_id}/{timestamp}'
    mock_db.reference.assert_called_once_with(expected_path)
    mock_ref.set.assert_called_once_with(feedback_data)
