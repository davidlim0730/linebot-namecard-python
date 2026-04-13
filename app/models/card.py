from pydantic import BaseModel
from typing import Optional, List


class Card(BaseModel):
    id: str
    name: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    line_id: Optional[str] = None
    memo: Optional[str] = None
    tags: List[str] = []
    added_by: str
    created_at: str


class CardUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    line_id: Optional[str] = None
    memo: Optional[str] = None
