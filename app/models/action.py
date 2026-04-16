from pydantic import BaseModel, Field
from typing import Optional


class Action(BaseModel):
    """Action / To-Do model"""
    id: str = Field(..., description="Action ID (Firebase key)")
    org_id: str = Field(..., description="Organization ID")
    deal_id: Optional[str] = Field(None, description="Associated deal ID (optional)")
    contact_id: Optional[str] = Field(None, description="Associated contact ID (optional)")
    entity_name: Optional[str] = Field(None, description="Customer/Partner name (for search if deal_id is null)")
    task_detail: str = Field(..., description="Clear, actionable task description")
    due_date: Optional[str] = Field(None, description="YYYY-MM-DD format (optional, may be null)")
    status: str = Field(default="pending", description="pending or completed")
    added_by: str = Field(..., description="User ID who created this action")
    created_at: str = Field(..., description="ISO 8601 timestamp")


class ActionCreate(BaseModel):
    """Input schema for creating an action"""
    entity_name: str
    task_detail: str
    due_date: str  # YYYY-MM-DD
    deal_id: Optional[str] = None
    contact_id: Optional[str] = None


class ActionUpdate(BaseModel):
    """Input schema for updating an action"""
    task_detail: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    entity_name: Optional[str] = None


class ActionComplete(BaseModel):
    """Input schema for marking action as completed"""
    status: str = "completed"
