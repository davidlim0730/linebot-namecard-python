from pydantic import BaseModel, computed_field
from typing import Optional, List


class Member(BaseModel):
    user_id: str
    role: str  # "admin" | "member"
    joined_at: str
    display_name: Optional[str] = None


class Org(BaseModel):
    id: str
    name: str
    created_by: str
    plan_type: Optional[str] = None
    trial_ends_at: Optional[str] = None
    members: List[Member] = []


class UserContext(BaseModel):
    user_id: str
    org_id: str
    role: str  # "admin" | "member"

    @computed_field
    @property
    def is_admin(self) -> bool:
        return self.role == "admin"
