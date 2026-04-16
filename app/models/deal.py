from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class Deal(BaseModel):
    """Deal / Pipeline model for CRM"""
    id: str = Field(..., description="Deal ID (Firebase key)")
    org_id: str = Field(..., description="Organization ID")
    entity_name: str = Field(..., description="Customer/Partner name")
    company_contact_id: Optional[str] = Field(None, description="Company Contact FK")
    contract_entity_id: Optional[str] = Field(None, description="Contract entity FK")
    poc_contact_id: Optional[str] = Field(None, description="Point of contact FK")
    stage: str = Field(..., description="Stage: 0-6, 成交, or 失敗")
    is_pending: Optional[bool] = Field(None, description="Is deal on hold")
    product_id: Optional[str] = Field(None, description="Product ID")
    est_value: Optional[int] = Field(None, description="Estimated value in TWD")
    next_action_date: Optional[str] = Field(None, description="YYYY-MM-DD format (optional, may be null)")
    status_summary: str = Field(default="", description="One-line status summary (Chinese)")
    added_by: Optional[str] = Field(None, description="User ID who created this deal")
    created_at: Optional[str] = Field(None, description="ISO 8601 timestamp")
    updated_at: Optional[str] = Field(None, description="ISO 8601 timestamp")


class StageChangeEvent(BaseModel):
    """Track deal stage transitions"""
    id: str = Field(..., description="Event ID (Firebase key)")
    org_id: str = Field(..., description="Organization ID")
    deal_id: str = Field(..., description="Deal ID")
    from_stage: str = Field(..., description="Previous stage")
    to_stage: str = Field(..., description="New stage")
    updated_by: str = Field(..., description="User ID who made the change")
    created_at: str = Field(..., description="ISO 8601 timestamp")


class DealCreate(BaseModel):
    """Input schema for creating a deal"""
    entity_name: str
    product_id: Optional[str] = None
    est_value: Optional[int] = None
    next_action_date: Optional[str] = None
    stage: str = "0"
    is_pending: Optional[bool] = None
    status_summary: str = ""
    company_contact_id: Optional[str] = None
    contract_entity_id: Optional[str] = None
    poc_contact_id: Optional[str] = None


class DealUpdate(BaseModel):
    """Input schema for updating a deal"""
    entity_name: Optional[str] = None
    product_id: Optional[str] = None
    est_value: Optional[int] = None
    next_action_date: Optional[str] = None
    stage: Optional[str] = None
    is_pending: Optional[bool] = None
    status_summary: Optional[str] = None
    company_contact_id: Optional[str] = None
    contract_entity_id: Optional[str] = None
    poc_contact_id: Optional[str] = None
