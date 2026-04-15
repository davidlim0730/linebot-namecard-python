import uuid
from datetime import datetime
from typing import List, Optional

from ..models.action import Action
from ..models.org import UserContext
from ..repositories.action_repo import ActionRepo


class ActionService:

    def __init__(self, action_repo: ActionRepo):
        self.action_repo = action_repo

    def schedule_action(self, org_id: str, action_data: dict, user: UserContext) -> Optional[Action]:
        """Create a new action. Skips if due_date is empty."""
        due_date = action_data.get("due_date", "")
        if not due_date:
            return None

        now = datetime.utcnow().isoformat() + "Z"
        action_id = str(uuid.uuid4())

        data = {
            "org_id": org_id,
            "deal_id": action_data.get("deal_id"),
            "entity_name": action_data.get("entity_name", ""),
            "task_detail": action_data.get("task_detail", ""),
            "due_date": due_date,
            "status": "pending",
            "added_by": user.user_id,
            "created_at": now,
        }
        data = {k: v for k, v in data.items() if v is not None}

        self.action_repo.save(org_id, action_id, data)
        return self.action_repo.get(org_id, action_id)

    def complete_action(self, org_id: str, action_id: str, user: UserContext) -> Optional[Action]:
        """Mark an action as completed."""
        self.action_repo.update(org_id, action_id, {"status": "completed"})
        return self.action_repo.get(org_id, action_id)

    def get_due_today(self, org_id: str) -> List[Action]:
        """Return all pending actions due today or earlier (for LINE push)."""
        return self.action_repo.list_due_today(org_id)

    def list_actions(self, org_id: str, user: UserContext) -> List[Action]:
        """List actions. Members see own; admins see all."""
        all_actions = self.action_repo.list_all(org_id)
        if user.is_admin:
            return sorted(all_actions.values(), key=lambda a: a.due_date)
        return sorted(
            [a for a in all_actions.values() if a.added_by == user.user_id],
            key=lambda a: a.due_date,
        )
