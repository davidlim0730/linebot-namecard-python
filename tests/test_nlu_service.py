import pytest
from app.models.nlu import NLUResult, NLUEntity, NLUPipeline, NLUInteraction, NLUAction
from app.services.nlu_service import fuzzy_match_entity


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
