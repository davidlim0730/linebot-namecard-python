from firebase_admin import db
from .. import config
from ..models.deal import Deal, StageChangeEvent
from typing import Optional, Dict, List
import uuid
from datetime import datetime


class DealRepo:
    """Repository for Deal / Pipeline records"""

    DEALS_PATH = "deals"
    STAGE_CHANGES_PATH = "stage_change_events"

    def get(self, org_id: str, deal_id: str) -> Optional[Deal]:
        """Get a single deal"""
        ref = db.reference(f"{self.DEALS_PATH}/{org_id}/{deal_id}")
        data = ref.get()
        if not data:
            return None
        return self._to_deal(deal_id, data)

    def list_all(self, org_id: str) -> Dict[str, Deal]:
        """List all deals in an organization"""
        ref = db.reference(f"{self.DEALS_PATH}/{org_id}")
        data = ref.get() or {}
        return {
            deal_id: self._to_deal(deal_id, deal_data)
            for deal_id, deal_data in data.items()
            if isinstance(deal_data, dict)
        }

    def list_by_entity_name(self, org_id: str, entity_name: str) -> List[Deal]:
        """List all deals for a specific entity name"""
        all_deals = self.list_all(org_id)
        return [
            deal for deal in all_deals.values()
            if deal.entity_name.lower() == entity_name.lower()
        ]

    def list_by_stage(self, org_id: str, stage: str) -> List[Deal]:
        """List all deals in a specific stage"""
        all_deals = self.list_all(org_id)
        return [deal for deal in all_deals.values() if deal.stage == stage]

    def list_by_company_contact_id(self, org_id: str, contact_id: str) -> List[Deal]:
        all_deals = self.list_all(org_id)
        deals = [d for d in all_deals.values() if d.company_contact_id == contact_id]
        return sorted(deals, key=lambda d: d.created_at or "", reverse=True)

    def save(self, org_id: str, deal_id: str, deal_data: dict) -> bool:
        """Create or overwrite a deal"""
        try:
            db.reference(f"{self.DEALS_PATH}/{org_id}/{deal_id}").set(deal_data)
            return True
        except Exception:
            return False

    def update(self, org_id: str, deal_id: str, fields: dict) -> bool:
        """Update specific fields of a deal"""
        try:
            db.reference(f"{self.DEALS_PATH}/{org_id}/{deal_id}").update(fields)
            return True
        except Exception:
            return False

    def delete(self, org_id: str, deal_id: str) -> bool:
        """Delete a deal"""
        try:
            db.reference(f"{self.DEALS_PATH}/{org_id}/{deal_id}").delete()
            return True
        except Exception:
            return False

    def log_stage_change(self, org_id: str, deal_id: str, from_stage: str, to_stage: str, user_id: str) -> bool:
        """Log a stage change event"""
        try:
            event_id = str(uuid.uuid4())
            event_data = {
                "deal_id": deal_id,
                "from_stage": from_stage,
                "to_stage": to_stage,
                "updated_by": user_id,
                "created_at": datetime.utcnow().isoformat() + "Z"
            }
            db.reference(f"{self.STAGE_CHANGES_PATH}/{org_id}/{event_id}").set(event_data)
            return True
        except Exception:
            return False

    def list_stage_changes(self, org_id: str, deal_id: str) -> List[StageChangeEvent]:
        """List all stage changes for a deal"""
        ref = db.reference(f"{self.STAGE_CHANGES_PATH}/{org_id}")
        data = ref.get() or {}
        events = []
        for event_id, event_data in data.items():
            if isinstance(event_data, dict) and event_data.get("deal_id") == deal_id:
                events.append(self._to_stage_change_event(event_id, event_data))
        return sorted(events, key=lambda e: e.created_at, reverse=True)

    def _to_deal(self, deal_id: str, data: dict) -> Deal:
        """Convert Firebase dict to Deal model with type conversion and cleaning"""
        import re
        d = dict(data)
        allowed = {
            "org_id", "entity_name",
            "company_contact_id", "contract_entity_id", "poc_contact_id",
            "stage", "is_pending", "product_id", "est_value",
            "next_action_date", "status_summary",
            "added_by", "created_at", "updated_at"
        }
        filtered = {k: v for k, v in d.items() if k in allowed}

        # Type conversion and normalization
        # est_value: ensure it's an integer (or None)
        if "est_value" in filtered and filtered["est_value"] is not None:
            try:
                filtered["est_value"] = int(filtered["est_value"])
            except (ValueError, TypeError):
                filtered["est_value"] = None

        # is_pending: ensure it's a boolean
        if "is_pending" in filtered and filtered["is_pending"] is not None:
            if isinstance(filtered["is_pending"], str):
                filtered["is_pending"] = filtered["is_pending"].lower() in ("true", "1", "yes")
            else:
                filtered["is_pending"] = bool(filtered["is_pending"])

        # Validate and normalize next_action_date format (YYYY-MM-DD)
        if "next_action_date" in filtered and filtered["next_action_date"]:
            date_str = str(filtered["next_action_date"]).strip()
            # If date format is invalid or empty, set to None
            if not date_str or not re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
                filtered["next_action_date"] = None

        # Ensure required fields have safe defaults
        filtered.setdefault("entity_name", "（未知客戶）")
        filtered.setdefault("stage", "0")
        filtered.setdefault("status_summary", "")

        return Deal(id=deal_id, **filtered)

    def _to_stage_change_event(self, event_id: str, data: dict) -> StageChangeEvent:
        """Convert Firebase dict to StageChangeEvent model"""
        d = dict(data)
        allowed = {"org_id", "deal_id", "from_stage", "to_stage", "updated_by", "created_at"}
        filtered = {k: v for k, v in d.items() if k in allowed}
        return StageChangeEvent(id=event_id, **filtered)
