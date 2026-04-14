from firebase_admin import db
from .. import config
from ..models.action import Action
from typing import Optional, Dict, List
import uuid
from datetime import datetime


class ActionRepo:
    """Repository for Action / To-Do records"""

    ACTIONS_PATH = "actions"

    def get(self, org_id: str, action_id: str) -> Optional[Action]:
        """Get a single action"""
        ref = db.reference(f"{self.ACTIONS_PATH}/{org_id}/{action_id}")
        data = ref.get()
        if not data:
            return None
        return self._to_action(action_id, data)

    def list_all(self, org_id: str) -> Dict[str, Action]:
        """List all actions in an organization"""
        ref = db.reference(f"{self.ACTIONS_PATH}/{org_id}")
        data = ref.get() or {}
        return {
            action_id: self._to_action(action_id, action_data)
            for action_id, action_data in data.items()
            if isinstance(action_data, dict)
        }

    def list_pending(self, org_id: str) -> List[Action]:
        """List all pending actions"""
        all_actions = self.list_all(org_id)
        return [action for action in all_actions.values() if action.status == "pending"]

    def list_due_today(self, org_id: str) -> List[Action]:
        """List all actions due today or earlier"""
        today = datetime.utcnow().strftime("%Y-%m-%d")
        all_actions = self.list_all(org_id)
        return [
            action for action in all_actions.values()
            if action.status == "pending" and action.due_date <= today
        ]

    def list_by_deal(self, org_id: str, deal_id: str) -> List[Action]:
        """List all actions for a specific deal"""
        all_actions = self.list_all(org_id)
        actions = [
            action for action in all_actions.values()
            if action.deal_id == deal_id
        ]
        return sorted(actions, key=lambda a: a.due_date)

    def list_by_entity_name(self, org_id: str, entity_name: str) -> List[Action]:
        """List all actions for an entity"""
        all_actions = self.list_all(org_id)
        actions = [
            action for action in all_actions.values()
            if action.entity_name.lower() == entity_name.lower()
        ]
        return sorted(actions, key=lambda a: a.due_date)

    def save(self, org_id: str, action_id: str, action_data: dict) -> bool:
        """Create or overwrite an action"""
        try:
            db.reference(f"{self.ACTIONS_PATH}/{org_id}/{action_id}").set(action_data)
            return True
        except Exception:
            return False

    def update(self, org_id: str, action_id: str, fields: dict) -> bool:
        """Update specific fields of an action"""
        try:
            db.reference(f"{self.ACTIONS_PATH}/{org_id}/{action_id}").update(fields)
            return True
        except Exception:
            return False

    def delete(self, org_id: str, action_id: str) -> bool:
        """Delete an action"""
        try:
            db.reference(f"{self.ACTIONS_PATH}/{org_id}/{action_id}").delete()
            return True
        except Exception:
            return False

    def _to_action(self, action_id: str, data: dict) -> Action:
        """Convert Firebase dict to Action model"""
        d = dict(data)
        allowed = {
            "org_id", "deal_id", "entity_name", "task_detail",
            "due_date", "status", "added_by", "created_at"
        }
        filtered = {k: v for k, v in d.items() if k in allowed}
        return Action(id=action_id, **filtered)
