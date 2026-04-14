from pydantic import BaseModel, Field
from typing import Optional


class Product(BaseModel):
    """Product line model (used in NLU grounding context)"""
    id: str = Field(..., description="Product ID (Firebase key)")
    org_id: str = Field(..., description="Organization ID")
    name: str = Field(..., description="Product line name (Chinese)")
    status: str = Field(default="Active", description="Active, Beta, or Sunset")
    description: Optional[str] = Field(None, description="Product description for NLU context")
    created_at: str = Field(..., description="ISO 8601 timestamp")


class ProductCreate(BaseModel):
    """Input schema for creating a product"""
    name: str
    status: str = "Active"
    description: Optional[str] = None


class ProductUpdate(BaseModel):
    """Input schema for updating a product"""
    name: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
