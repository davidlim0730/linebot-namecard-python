from firebase_admin import db
from .. import config
from ..models.stakeholder import Stakeholder
from typing import Optional, Dict, List


class StakeholderRepo:
    """Repository for Stakeholder records"""

    STAKEHOLDERS_PATH = "stakeholders"

    def get(self, org_id: str, stakeholder_id: str) -> Optional[Stakeholder]:
        """Get a single stakeholder"""
        ref = db.reference(f"{self.STAKEHOLDERS_PATH}/{org_id}/{stakeholder_id}")
        data = ref.get()
        if not data:
            return None
        return self._to_stakeholder(stakeholder_id, data)

    def list_all(self, org_id: str) -> Dict[str, Stakeholder]:
        """List all stakeholders in an organization"""
        ref = db.reference(f"{self.STAKEHOLDERS_PATH}/{org_id}")
        data = ref.get() or {}
        return {
            stakeholder_id: self._to_stakeholder(stakeholder_id, stakeholder_data)
            for stakeholder_id, stakeholder_data in data.items()
            if isinstance(stakeholder_data, dict)
        }

    def list_by_deal(self, org_id: str, deal_id: str) -> List[Stakeholder]:
        """List all stakeholders for a specific deal"""
        all_stakeholders = self.list_all(org_id)
        return [
            stakeholder for stakeholder in all_stakeholders.values()
            if stakeholder.deal_id == deal_id
        ]

    def list_by_role(self, org_id: str, role: str) -> List[Stakeholder]:
        """List all stakeholders with a specific role"""
        all_stakeholders = self.list_all(org_id)
        return [
            stakeholder for stakeholder in all_stakeholders.values()
            if stakeholder.role == role
        ]

    def save(self, org_id: str, stakeholder_id: str, stakeholder_data: dict) -> bool:
        """Create or overwrite a stakeholder"""
        try:
            db.reference(f"{self.STAKEHOLDERS_PATH}/{org_id}/{stakeholder_id}").set(stakeholder_data)
            return True
        except Exception:
            return False

    def update(self, org_id: str, stakeholder_id: str, fields: dict) -> bool:
        """Update specific fields of a stakeholder"""
        try:
            db.reference(f"{self.STAKEHOLDERS_PATH}/{org_id}/{stakeholder_id}").update(fields)
            return True
        except Exception:
            return False

    def delete(self, org_id: str, stakeholder_id: str) -> bool:
        """Delete a stakeholder"""
        try:
            db.reference(f"{self.STAKEHOLDERS_PATH}/{org_id}/{stakeholder_id}").delete()
            return True
        except Exception:
            return False

    def _to_stakeholder(self, stakeholder_id: str, data: dict) -> Stakeholder:
        """Convert Firebase dict to Stakeholder model"""
        d = dict(data)
        allowed = {
            "org_id", "deal_id", "name", "title", "role", "attitude",
            "email", "phone", "notes", "added_by", "created_at"
        }
        filtered = {k: v for k, v in d.items() if k in allowed}
        return Stakeholder(id=stakeholder_id, **filtered)
