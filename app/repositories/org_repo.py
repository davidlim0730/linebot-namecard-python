import uuid
from datetime import datetime, timedelta, timezone
from firebase_admin import db
from ..models.org import Org, Member
from typing import Optional


class OrgRepo:

    def get_user_org_id(self, user_id: str) -> Optional[str]:
        try:
            return db.reference(f"user_org_map/{user_id}").get()
        except Exception:
            return None

    def set_user_org_id(self, user_id: str, org_id: str) -> None:
        db.reference(f"user_org_map/{user_id}").set(org_id)

    def get(self, org_id: str) -> Optional[Org]:
        try:
            data = db.reference(f"organizations/{org_id}").get()
            if not data:
                return None
            return self._to_org(org_id, data)
        except Exception:
            return None

    def get_user_role(self, org_id: str, user_id: str) -> Optional[str]:
        try:
            return db.reference(
                f"organizations/{org_id}/members/{user_id}/role"
            ).get()
        except Exception:
            return None

    def create(self, user_id: str, org_name: str) -> Optional[str]:
        org_id = f"org_{uuid.uuid4().hex[:8]}"
        now = datetime.now().isoformat()
        trial_ends_at = (
            datetime.now(timezone.utc) + timedelta(days=7)
        ).strftime('%Y-%m-%dT%H:%M:%SZ')
        try:
            db.reference(f"organizations/{org_id}").set({
                "name": org_name,
                "created_by": user_id,
                "created_at": now,
                "plan_type": "trial",
                "trial_ends_at": trial_ends_at,
                "usage": {"scan_count": 0},
                "members": {
                    user_id: {"role": "admin", "joined_at": now}
                }
            })
            db.reference(f"user_org_map/{user_id}").set(org_id)
            return org_id
        except Exception:
            return None

    def update_name(self, org_id: str, name: str) -> bool:
        try:
            db.reference(f"organizations/{org_id}/name").set(name)
            return True
        except Exception:
            return False

    def add_member(self, org_id: str, user_id: str, role: str = "member") -> bool:
        try:
            now = datetime.now().isoformat()
            db.reference(f"organizations/{org_id}/members/{user_id}").set({
                "role": role, "joined_at": now
            })
            db.reference(f"user_org_map/{user_id}").set(org_id)
            return True
        except Exception:
            return False

    def remove_member(self, org_id: str, user_id: str) -> bool:
        try:
            db.reference(f"organizations/{org_id}/members/{user_id}").delete()
            db.reference(f"user_org_map/{user_id}").delete()
            return True
        except Exception:
            return False

    def update_member_role(self, org_id: str, user_id: str, role: str) -> bool:
        try:
            db.reference(
                f"organizations/{org_id}/members/{user_id}/role"
            ).set(role)
            return True
        except Exception:
            return False

    def get_invite_code(self, code: str) -> Optional[dict]:
        try:
            return db.reference(f"invite_codes/{code}").get()
        except Exception:
            return None

    def create_invite_code(self, code: str, org_id: str, created_by: str,
                           expires_at: str) -> bool:
        try:
            db.reference(f"invite_codes/{code}").set({
                "org_id": org_id,
                "created_by": created_by,
                "created_at": datetime.now().isoformat(),
                "expires_at": expires_at,
            })
            return True
        except Exception:
            return False

    def increment_scan_count(self, org_id: str) -> int:
        try:
            ref = db.reference(f"organizations/{org_id}/usage/scan_count")
            return ref.transaction(lambda current: (current or 0) + 1)
        except Exception:
            return 0

    def get_all_role_tags(self, org_id: str) -> list:
        try:
            data = db.reference(f"organizations/{org_id}/tags/roles").get()
            return list(data.values()) if data else []
        except Exception:
            return []

    def add_role_tag(self, org_id: str, tag_name: str) -> bool:
        try:
            existing = self.get_all_role_tags(org_id)
            if tag_name in existing:
                return False
            db.reference(f"organizations/{org_id}/tags/roles").push(tag_name)
            return True
        except Exception:
            return False

    def delete_role_tag(self, org_id: str, tag_name: str) -> bool:
        try:
            ref = db.reference(f"organizations/{org_id}/tags/roles")
            data = ref.get()
            if not data:
                return False
            for key, value in data.items():
                if value == tag_name:
                    ref.child(key).delete()
                    return True
            return False
        except Exception:
            return False

    def _to_org(self, org_id: str, data: dict) -> Org:
        members_data = data.get("members") or {}
        members = [
            Member(user_id=uid, **m)
            for uid, m in members_data.items()
            if isinstance(m, dict) and "role" in m
        ]
        return Org(
            id=org_id,
            name=data.get("name", ""),
            created_by=data.get("created_by", ""),
            plan_type=data.get("plan_type"),
            trial_ends_at=data.get("trial_ends_at"),
            members=members,
        )
