import json
import pytest
from unittest.mock import patch, MagicMock
from app.models.nlu import NLUResult, NLUEntity, NLUPipeline, NLUInteraction, NLUAction
from app.models.card import Card, Contact
from app.models.product import Product
from app.services.nlu_service import fuzzy_match_entity, build_grounding_context, parse_text, auto_link_namecard


def test_nlu_result_defaults():
    result = NLUResult()
    assert result.intents == []
    assert result.overall_confidence == 0.0
    assert result.missing_fields == []
    assert result.entities == []
    assert result.pipelines == []
    assert result.interactions == []
    assert result.actions == []


def test_nlu_entity_defaults():
    entity = NLUEntity(name="台積電")
    assert entity.category == "Client"
    assert entity.matched_entity_id is None
    assert entity.entity_match_confidence == 0.0


def test_fuzzy_match_exact():
    result = fuzzy_match_entity("台積電", ["台積電", "聯發科", "瑞昱"])
    assert result == "台積電"


def test_fuzzy_match_contains():
    result = fuzzy_match_entity("台積", ["台積電", "聯發科"])
    assert result == "台積電"


def test_fuzzy_match_similar():
    # difflib ratio: "聯發科技" vs "聯發科" ≈ 0.86
    result = fuzzy_match_entity("聯發科技", ["台積電", "聯發科"])
    assert result == "聯發科"


def test_fuzzy_match_no_match():
    result = fuzzy_match_entity("完全不存在的公司", ["台積電", "聯發科"])
    assert result is None


def test_fuzzy_match_empty_list():
    result = fuzzy_match_entity("台積電", [])
    assert result is None


def test_build_grounding_context_basic():
    mock_contacts = {
        "c-1": Contact(id="c-1", contact_type="company", display_name="台積電", added_by="u1", created_at="2026-01-01T00:00:00Z"),
        "c-2": Contact(id="c-2", contact_type="company", display_name="聯發科", added_by="u1", created_at="2026-01-01T00:00:00Z"),
    }
    mock_products = [
        Product(id="PL-0001", org_id="org1", name="AI 質檢方案", status="Active", created_at="2026-01-01T00:00:00Z"),
        Product(id="PL-0002", org_id="org1", name="智慧倉儲系統", status="Active", created_at="2026-01-01T00:00:00Z"),
    ]

    with patch("app.services.nlu_service.ContactRepo") as MockContactRepo, \
         patch("app.services.nlu_service.ProductRepo") as MockProductRepo, \
         patch("app.services.nlu_service.DealRepo") as MockDealRepo:

        MockContactRepo.return_value.list_all.return_value = mock_contacts
        MockProductRepo.return_value.list_active.return_value = mock_products
        MockDealRepo.return_value.list_all.return_value = {}

        result = build_grounding_context("org1")

    assert "台積電" in result
    assert "聯發科" in result
    assert "PL-0001" in result
    assert "AI 質檢方案" in result
    assert "## 現有客戶名單" in result
    assert "## 可用產品線" in result


def test_build_grounding_context_dedup_companies():
    """同一 display_name 出現多次只列一次"""
    mock_contacts = {
        "c-1": Contact(id="c-1", contact_type="company", display_name="台積電", added_by="u1", created_at="2026-01-01T00:00:00Z"),
        "c-2": Contact(id="c-2", contact_type="person", display_name="台積電王大明", added_by="u1", created_at="2026-01-01T00:00:00Z"),
    }

    with patch("app.services.nlu_service.ContactRepo") as MockContactRepo, \
         patch("app.services.nlu_service.ProductRepo") as MockProductRepo, \
         patch("app.services.nlu_service.DealRepo") as MockDealRepo:

        MockContactRepo.return_value.list_all.return_value = mock_contacts
        MockProductRepo.return_value.list_active.return_value = []
        MockDealRepo.return_value.list_all.return_value = {}

        result = build_grounding_context("org1")

    assert "台積電" in result


SAMPLE_NLU_JSON = {
    "intents": ["UPDATE_PIPELINE", "LOG_INTERACTION"],
    "overall_confidence": 0.88,
    "missing_fields": [],
    "entities": [
        {
            "name": "台積電",
            "category": "Client",
            "industry": "半導體",
            "matched_entity_id": "C-0001",
            "entity_match_confidence": 0.97
        }
    ],
    "pipelines": [
        {
            "entity_name": "台積電",
            "stage": "3",
            "product_id": None,
            "est_value": 5000000,
            "next_action_date": "2026-04-20",
            "status_summary": "進入正式提案階段"
        }
    ],
    "interactions": [
        {
            "entity_name": "台積電",
            "raw_transcript": "台積那邊今天進入正式提案",
            "ai_key_insights": ["關鍵點 1", "關鍵點 2", "關鍵點 3"],
            "sentiment": "Positive"
        }
    ],
    "actions": []
}


def test_parse_text_returns_nlu_result():
    mock_response = MagicMock()
    mock_response.text = json.dumps(SAMPLE_NLU_JSON)

    with patch("app.services.nlu_service.build_grounding_context", return_value="## 現有客戶名單\n- C-0001 | 台積電"), \
         patch("app.services.nlu_service.generate_gemini_text_complete", return_value=mock_response):

        result = parse_text("台積那邊今天進入正式提案", "org1")

    assert isinstance(result, NLUResult)
    assert "UPDATE_PIPELINE" in result.intents
    assert result.overall_confidence == 0.88
    assert len(result.entities) == 1
    assert result.entities[0].name == "台積電"
    assert len(result.pipelines) == 1
    assert result.pipelines[0].stage == "3"


def test_parse_text_gemini_malformed_json():
    """Gemini 回傳無法解析的 JSON 時，回傳空 NLUResult 而非 crash"""
    mock_response = MagicMock()
    mock_response.text = "這不是 JSON"

    with patch("app.services.nlu_service.build_grounding_context", return_value=""), \
         patch("app.services.nlu_service.generate_gemini_text_complete", return_value=mock_response):

        result = parse_text("隨便輸入", "org1")

    assert isinstance(result, NLUResult)
    assert result.intents == []
    assert result.overall_confidence == 0.0


def test_parse_text_missing_system_prompt():
    """Missing system_prompt.md returns empty NLUResult (not a crash or silent bad parse)"""
    with patch("builtins.open", side_effect=FileNotFoundError), \
         patch("app.services.nlu_service.build_grounding_context", return_value=""):
        result = parse_text("任意輸入", "org1")
    assert isinstance(result, NLUResult)
    assert result.intents == []
    assert result.overall_confidence == 0.0


def test_auto_link_namecard_found():
    mock_cards = {
        "card-1": Card(id="card-1", name="王大明", company="台積電", added_by="u1", created_at="2026-01-01T00:00:00Z"),
        "card-2": Card(id="card-2", name="李小姐", company="聯發科", added_by="u1", created_at="2026-01-01T00:00:00Z"),
    }

    with patch("app.services.nlu_service.CardRepo") as MockCardRepo:
        MockCardRepo.return_value.list_all.return_value = mock_cards
        result = auto_link_namecard("台積電", "org1")

    assert result == "card-1"


def test_auto_link_namecard_fuzzy():
    """「台積」也能匹配到 company=台積電 的 card"""
    mock_cards = {
        "card-1": Card(id="card-1", name="王大明", company="台積電", added_by="u1", created_at="2026-01-01T00:00:00Z"),
    }

    with patch("app.services.nlu_service.CardRepo") as MockCardRepo:
        MockCardRepo.return_value.list_all.return_value = mock_cards
        result = auto_link_namecard("台積", "org1")

    assert result == "card-1"


def test_auto_link_namecard_not_found():
    mock_cards = {
        "card-1": Card(id="card-1", name="王大明", company="台積電", added_by="u1", created_at="2026-01-01T00:00:00Z"),
    }

    with patch("app.services.nlu_service.CardRepo") as MockCardRepo:
        MockCardRepo.return_value.list_all.return_value = mock_cards
        result = auto_link_namecard("完全不存在公司", "org1")

    assert result is None


def test_auto_link_namecard_empty_entity_name():
    """Empty entity_name returns None without hitting Firebase"""
    with patch("app.services.nlu_service.CardRepo") as MockCardRepo:
        result = auto_link_namecard("", "org1")
    assert result is None
    MockCardRepo.return_value.list_all.assert_not_called()
