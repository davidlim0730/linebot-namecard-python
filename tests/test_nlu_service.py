import pytest
from unittest.mock import patch
from app.models.nlu import NLUResult, NLUEntity, NLUPipeline, NLUInteraction, NLUAction
from app.models.card import Card
from app.models.product import Product
from app.services.nlu_service import fuzzy_match_entity, build_grounding_context


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
    mock_cards = {
        "card-1": Card(id="card-1", name="王大明", company="台積電", added_by="u1", created_at="2026-01-01T00:00:00Z"),
        "card-2": Card(id="card-2", name="李小姐", company="聯發科", added_by="u1", created_at="2026-01-01T00:00:00Z"),
    }
    mock_products = [
        Product(id="PL-0001", org_id="org1", name="AI 質檢方案", status="Active", created_at="2026-01-01T00:00:00Z"),
        Product(id="PL-0002", org_id="org1", name="智慧倉儲系統", status="Active", created_at="2026-01-01T00:00:00Z"),
    ]

    with patch("app.services.nlu_service.CardRepo") as MockCardRepo, \
         patch("app.services.nlu_service.ProductRepo") as MockProductRepo, \
         patch("app.services.nlu_service.DealRepo") as MockDealRepo:

        MockCardRepo.return_value.list_all.return_value = mock_cards
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
    """同一 company 出現多次只列一次"""
    mock_cards = {
        "card-1": Card(id="card-1", name="王大明", company="台積電", added_by="u1", created_at="2026-01-01T00:00:00Z"),
        "card-2": Card(id="card-2", name="張小姐", company="台積電", added_by="u1", created_at="2026-01-01T00:00:00Z"),
    }

    with patch("app.services.nlu_service.CardRepo") as MockCardRepo, \
         patch("app.services.nlu_service.ProductRepo") as MockProductRepo, \
         patch("app.services.nlu_service.DealRepo") as MockDealRepo:

        MockCardRepo.return_value.list_all.return_value = mock_cards
        MockProductRepo.return_value.list_active.return_value = []
        MockDealRepo.return_value.list_all.return_value = {}

        result = build_grounding_context("org1")

    assert result.count("台積電") == 1
