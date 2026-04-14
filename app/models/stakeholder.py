from pydantic import BaseModel, Field
from typing import Optional


class Stakeholder(BaseModel):
    """Stakeholder / Contact role model (for tracking decision makers, influencers, etc.)"""
    id: str = Field(..., description="Stakeholder ID (Firebase key)")
    org_id: str = Field(..., description="Organization ID")
    deal_id: str = Field(..., description="Associated deal ID")
    name: str = Field(..., description="Stakeholder name")
    title: Optional[str] = Field(None, description="Job title")
    role: str = Field(..., description="Champion, Decision Maker, or Gatekeeper")
    attitude: Optional[str] = Field(None, description="Supportive, Neutral, or Skeptical")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    notes: Optional[str] = Field(None, description="Additional notes")
    added_by: str = Field(..., description="User ID who added this stakeholder")
    created_at: str = Field(..., description="ISO 8601 timestamp")


class StakeholderCreate(BaseModel):
    """Input schema for adding a stakeholder"""
    name: str
    title: Optional[str] = None
    role: str
    attitude: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class StakeholderUpdate(BaseModel):
    """Input schema for updating a stakeholder"""
    name: Optional[str] = None
    title: Optional[str] = None
    role: Optional[str] = None
    attitude: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
