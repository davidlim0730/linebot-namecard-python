from firebase_admin import db
from .. import config
from ..models.activity import Activity
from typing import Optional, Dict, List
import uuid
from datetime import datetime


class ActivityRepo:
    """Repository for Activity / Interaction records"""

    ACTIVITIES_PATH = "activities"

    def get(self, org_id: str, activity_id: str) -> Optional[Activity]:
        """Get a single activity"""
        ref = db.reference(f"{self.ACTIVITIES_PATH}/{org_id}/{activity_id}")
        data = ref.get()
        if not data:
            return None
        return self._to_activity(activity_id, data)

    def list_all(self, org_id: str) -> Dict[str, Activity]:
        """List all activities in an organization"""
        ref = db.reference(f"{self.ACTIVITIES_PATH}/{org_id}")
        data = ref.get() or {}
        return {
            activity_id: self._to_activity(activity_id, activity_data)
            for activity_id, activity_data in data.items()
            if isinstance(activity_data, dict)
        }

    def list_by_deal(self, org_id: str, deal_id: str) -> List[Activity]:
        """List all activities for a specific deal"""
        all_activities = self.list_all(org_id)
        activities = [
            activity for activity in all_activities.values()
            if activity.deal_id == deal_id
        ]
        return sorted(activities, key=lambda a: a.created_at, reverse=True)

    def list_by_entity_name(self, org_id: str, entity_name: str) -> List[Activity]:
        """List all activities for an entity"""
        all_activities = self.list_all(org_id)
        activities = [
            activity for activity in all_activities.values()
            if activity.entity_name.lower() == entity_name.lower()
        ]
        return sorted(activities, key=lambda a: a.created_at, reverse=True)

    def save(self, org_id: str, activity_id: str, activity_data: dict) -> bool:
        """Create or overwrite an activity"""
        try:
            db.reference(f"{self.ACTIVITIES_PATH}/{org_id}/{activity_id}").set(activity_data)
            return True
        except Exception:
            return False

    def update(self, org_id: str, activity_id: str, fields: dict) -> bool:
        """Update specific fields of an activity"""
        try:
            db.reference(f"{self.ACTIVITIES_PATH}/{org_id}/{activity_id}").update(fields)
            return True
        except Exception:
            return False

    def delete(self, org_id: str, activity_id: str) -> bool:
        """Delete an activity"""
        try:
            db.reference(f"{self.ACTIVITIES_PATH}/{org_id}/{activity_id}").delete()
            return True
        except Exception:
            return False

    def _to_activity(self, activity_id: str, data: dict) -> Activity:
        """Convert Firebase dict to Activity model"""
        d = dict(data)
        allowed = {
            "org_id", "deal_id", "entity_name", "raw_transcript",
            "ai_key_insights", "sentiment", "is_human_corrected",
            "edit_log", "added_by", "created_at"
        }
        filtered = {k: v for k, v in d.items() if k in allowed}
        return Activity(id=activity_id, **filtered)
