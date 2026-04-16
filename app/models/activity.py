from pydantic import BaseModel, Field
from typing import Optional, List


class Activity(BaseModel):
    """Activity / Interaction log model"""
    id: str = Field(..., description="Activity ID (Firebase key)")
    org_id: str = Field(..., description="Organization ID")
    deal_id: Optional[str] = Field(None, description="Associated deal ID (optional)")
    contact_id: Optional[str] = Field(None, description="Associated contact ID (optional)")
    entity_name: Optional[str] = Field(None, description="Customer/Partner name (for search if deal_id is null)")
    raw_transcript: str = Field(..., description="Original input text (preserved)")
    ai_key_insights: List[str] = Field(default_factory=list, description="3 key insights (Chinese, max 30 chars each)")
    sentiment: str = Field(default="Neutral", description="Positive, Neutral, or Negative")
    is_human_corrected: bool = Field(default=False, description="Whether user has edited this activity")
    edit_log: Optional[str] = Field(None, description="JSON string of edit history (if corrected)")
    added_by: Optional[str] = Field(None, description="User ID who logged this activity")
    created_at: Optional[str] = Field(None, description="ISO 8601 timestamp")


class ActivityCreate(BaseModel):
    """Input schema for logging an activity"""
    entity_name: str
    raw_transcript: str
    ai_key_insights: List[str] = Field(default_factory=list)
    sentiment: str = "Neutral"
    deal_id: Optional[str] = None
    contact_id: Optional[str] = None


class ActivityUpdate(BaseModel):
    """Input schema for updating an activity"""
    ai_key_insights: Optional[List[str]] = None
    sentiment: Optional[str] = None
    is_human_corrected: Optional[bool] = None
    edit_log: Optional[str] = None
