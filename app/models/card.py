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
    contact_type: str                        # "person" | "company"
    display_name: str
    legal_name: Optional[str] = None
    aliases: List[str] = []
    parent_company_id: Optional[str] = None  # FK → contacts (company)
    company_name: Optional[str] = None       # denormalized，供 Flex Message 快速顯示
    title: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    line_id: Optional[str] = None
    address: Optional[str] = None
    memo: Optional[str] = None
    tags: List[str] = []                     # 聯絡人標籤（從 namecard.role_tags 搬來）
    source: str = "manual"                   # "ocr"|"nlu"|"manual"|"marketing_list"|"referral"|"import"|"liff"
    raw_card_data: Optional[dict] = None     # OCR 原始掃描結果（審計用）
    industry: Optional[str] = None           # company 專屬
    website: Optional[str] = None            # company 專屬
    employee_count: Optional[int] = None     # company 專屬
    department: Optional[str] = None         # person 專屬
    work_phone: Optional[str] = None         # person 專屬
    added_by: str
    created_at: str
    updated_at: Optional[str] = None


class ContactCreate(BaseModel):
    display_name: str
    contact_type: str
    source: str = "manual"
    legal_name: Optional[str] = None
    aliases: List[str] = []
    parent_company_id: Optional[str] = None
    company_name: Optional[str] = None
    title: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    line_id: Optional[str] = None
    address: Optional[str] = None
    memo: Optional[str] = None
    tags: List[str] = []
    raw_card_data: Optional[dict] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    employee_count: Optional[int] = None
    department: Optional[str] = None
    work_phone: Optional[str] = None


class ContactUpdate(BaseModel):
    display_name: Optional[str] = None
    legal_name: Optional[str] = None
    aliases: Optional[List[str]] = None
    contact_type: Optional[str] = None
    parent_company_id: Optional[str] = None
    company_name: Optional[str] = None
    title: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    line_id: Optional[str] = None
    address: Optional[str] = None
    memo: Optional[str] = None
    tags: Optional[List[str]] = None
    source: Optional[str] = None
    raw_card_data: Optional[dict] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    employee_count: Optional[int] = None
    department: Optional[str] = None
    work_phone: Optional[str] = None
