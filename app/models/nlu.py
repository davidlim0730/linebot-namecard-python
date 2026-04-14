from pydantic import BaseModel, Field
from typing import List, Optional


class NLUEntity(BaseModel):
    """Represents an entity extracted by NLU (e.g., customer, company, person)"""
    name: str
    category: str = "Client"
    industry: Optional[str] = None
    matched_entity_id: Optional[str] = None
    entity_match_confidence: float = 0.0


class NLUPipeline(BaseModel):
    """Represents a sales pipeline / deal extracted from NLU"""
    entity_name: str
    stage: Optional[str] = None
    is_pending: Optional[bool] = None
    product_id: Optional[str] = None
    est_value: Optional[int] = None
    next_action_date: Optional[str] = None
    status_summary: str = ""


class NLUInteraction(BaseModel):
    """Represents a sales interaction or conversation note"""
    entity_name: str
    raw_transcript: str
    ai_key_insights: List[str] = Field(default_factory=list)
    sentiment: str = "Neutral"


class NLUAction(BaseModel):
    """Represents an action or follow-up task extracted from NLU"""
    entity_name: str
    task_detail: str
    due_date: str


class NLUResult(BaseModel):
    """Complete NLU parsing result from Gemini"""
    intents: List[str] = Field(default_factory=list)
    overall_confidence: float = 0.0
    missing_fields: List[str] = Field(default_factory=list)
    entities: List[NLUEntity] = Field(default_factory=list)
    pipelines: List[NLUPipeline] = Field(default_factory=list)
    interactions: List[NLUInteraction] = Field(default_factory=list)
    actions: List[NLUAction] = Field(default_factory=list)
