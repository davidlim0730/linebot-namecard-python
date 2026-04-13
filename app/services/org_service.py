import random
import string
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from ..models.org import Org, UserContext
from ..repositories.org_repo import OrgRepo


class PermissionError(Exception):
    pass


class OrgService:

    def __init__(self, org_repo: OrgRepo):
        self.org_repo = org_repo

    def ensure_user_org(self, user_id: str) -> Tuple[str, bool]:
        org_id = self.org_repo.get_user_org_id(user_id)
        if not org_id:
            short_id = user_id[-8:] if len(user_id) > 8 else user_id
            org_id = self.org_repo.create(user_id, f"{short_id}的團隊")
            return org_id, True
        return org_id, False

    def join_org_with_code(self, user_id: str, code: str) -> Optional[str]:
        invite = self.org_repo.get_invite_code(code)
        if not invite:
            return None
        expires_at = invite.get("expires_at", "")
        try:
            expires_dt = datetime.fromisoformat(
                expires_at.replace("Z", "+00:00")
            )
            if datetime.now(timezone.utc) > expires_dt:
                return None
        except Exception:
            return None
        org_id = invite["org_id"]
        self.org_repo.add_member(org_id, user_id)
        return org_id

    def generate_invite_code(self, org_id: str, created_by: str) -> str:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        expires_at = (
            datetime.now(timezone.utc) + timedelta(days=7)
        ).strftime('%Y-%m-%dT%H:%M:%SZ')
        self.org_repo.create_invite_code(code, org_id, created_by, expires_at)
        return code

    def update_member_role(self, org_id: str, target_user_id: str,
                           new_role: str, requester: UserContext) -> bool:
        if not requester.is_admin:
            raise PermissionError("Only admins can change roles")
        return self.org_repo.update_member_role(org_id, target_user_id, new_role)

    def check_scan_permission(self, org_id: str) -> dict:
        org = self.org_repo.get(org_id)
        if not org or org.plan_type is None or org.plan_type == "pro":
            return {"allowed": True, "reason": "ok"}
        if org.trial_ends_at:
            try:
                ends_dt = datetime.fromisoformat(
                    org.trial_ends_at.replace("Z", "+00:00")
                )
                if datetime.now(timezone.utc) > ends_dt:
                    return {"allowed": False, "reason": "trial_expired"}
            except Exception:
                pass
        return {"allowed": True, "reason": "ok"}
