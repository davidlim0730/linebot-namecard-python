import pytest
from app.models.nlu import NLUResult, NLUEntity, NLUPipeline, NLUInteraction, NLUAction


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
