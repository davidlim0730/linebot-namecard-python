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


class Contact(BaseModel):
    id: str
    contact_type: str
    display_name: str
    legal_name: Optional[str] = None
    aliases: List[str] = []
    parent_company_id: Optional[str] = None
    title: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    line_id: Optional[str] = None
    memo: Optional[str] = None
    source: Optional[str] = None
    added_by: str
    created_at: str


class ContactCreate(BaseModel):
    display_name: str
    contact_type: str
    source: str = "nlu"
    legal_name: Optional[str] = None
    aliases: List[str] = []
    parent_company_id: Optional[str] = None
    title: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    line_id: Optional[str] = None
    memo: Optional[str] = None


class ContactUpdate(BaseModel):
    display_name: Optional[str] = None
    legal_name: Optional[str] = None
    aliases: Optional[List[str]] = None
    contact_type: Optional[str] = None
    parent_company_id: Optional[str] = None
    title: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    line_id: Optional[str] = None
    memo: Optional[str] = None
    source: Optional[str] = None
