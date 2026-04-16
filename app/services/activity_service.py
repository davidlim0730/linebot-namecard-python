import uuid
from datetime import datetime
from typing import List

from ..models.activity import Activity
from ..models.org import UserContext
from ..repositories.activity_repo import ActivityRepo
from ..repositories.deal_repo import DealRepo
from .nlu_service import auto_link_or_create_contact


class ActivityService:

    def __init__(self, activity_repo: ActivityRepo):
        self.activity_repo = activity_repo

    def log_activity(self, org_id: str, interaction_data: dict, user: UserContext) -> Activity:
        """Log an interaction. Automatically links to contact via fuzzy match."""
        now = datetime.utcnow().isoformat() + "Z"
        activity_id = str(uuid.uuid4())

        entity_name = interaction_data.get("entity_name", "")
        raw_transcript = interaction_data.get("raw_transcript", "")
        deal_id = interaction_data.get("deal_id")

        # Resolve contact_id: prefer deal.company_contact_id, fallback to auto_link
        contact_id = None
        if deal_id:
            deal = DealRepo().get(org_id, deal_id)
            if deal and deal.company_contact_id:
                contact_id = deal.company_contact_id
        if not contact_id and entity_name:
            contact_id = auto_link_or_create_contact(entity_name, org_id)

        activity_data = {
            "org_id": org_id,
            "deal_id": deal_id,
            "contact_id": contact_id,
            "entity_name": entity_name,
            "raw_transcript": raw_transcript,
            "ai_key_insights": interaction_data.get("ai_key_insights", []),
            "sentiment": interaction_data.get("sentiment", "Neutral"),
            "is_human_corrected": False,
            "added_by": user.user_id,
            "created_at": now,
        }
        activity_data = {k: v for k, v in activity_data.items() if v is not None}

        self.activity_repo.save(org_id, activity_id, activity_data)
        return self.activity_repo.get(org_id, activity_id)

    def list_activities(self, org_id: str, user: UserContext) -> List[Activity]:
        """List activities. Members see own; admins see all."""
        all_activities = self.activity_repo.list_all(org_id)
        if user.is_admin:
            return sorted(all_activities.values(), key=lambda a: a.created_at, reverse=True)
        return sorted(
            [a for a in all_activities.values() if a.added_by == user.user_id],
            key=lambda a: a.created_at,
            reverse=True,
        )
