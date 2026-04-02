import json
import re


def load_json_string_to_object(json_str: str) -> dict:
    try:
        # 移除前後可能存在的 markdown 標籤
        json_str = json_str.strip().replace(
            "```json", "").replace(
            "```", "").strip()
        return json.loads(json_str)
    except Exception as e:
        print(f"Error loading JSON string: {e}, string was: {json_str}")
        return {}


def parse_gemini_result_to_json(card_json_str: str) -> dict:
    try:
        return json.loads(card_json_str)
    except Exception as e:
        print(f"Error parsing JSON: {e}")
        return {}


def generate_sample_namecard() -> dict:
    return {
        "name": "Kevin Dai",
        "title": "Software Engineer",
        "address": "Taipei, Taiwan",
        "email": "aa@bbb.cc",
        "phone": "+886-123-456-789",
        "company": "LINE Taiwan",
        "memo": "This is a test memo."
    }


def validate_namecard_fields(card: dict) -> dict:
    result = card.copy()

    def _clean(val):
        return re.sub(r'[\s\-\(\)]', '', val) if val else val

    phone = result.get("phone")
    if phone and phone != "N/A":
        if not re.match(r'^(\+?886|0)[2-9]\d{6,8}(#\d+)?$', _clean(phone)):
            result["phone"] = "N/A"

    mobile = result.get("mobile")
    if mobile and mobile != "N/A":
        if not re.match(r'^(\+?886|0)9\d{8}$', _clean(mobile)):
            result["mobile"] = "N/A"

    email = result.get("email")
    if email and email != "N/A":
        if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
            result["email"] = "N/A"

    line_id = result.get("line_id")
    if line_id and line_id != "N/A":
        if not re.match(r'^[a-zA-Z0-9._]{4,20}$', line_id):
            result["line_id"] = "N/A"

    return result


def merge_namecard_data(front: dict, back: dict) -> dict:
    """Merge two namecard dicts (front + back), where front takes priority.

    For each key in `back`, only copy it to `result` if the corresponding value
    in `front` is None, "N/A", or "" (empty string).

    Args:
        front: Primary namecard data (e.g., from card front side)
        back: Secondary namecard data (e.g., from card back side)

    Returns:
        Merged dict with front priority and back as fallback for missing/invalid fields
    """
    result = front.copy()
    for key, value in back.items():
        front_val = result.get(key)
        if front_val is None or front_val == "N/A" or front_val == "":
            result[key] = value
    return result
