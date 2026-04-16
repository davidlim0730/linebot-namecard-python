import uuid
from datetime import datetime
from typing import Dict, List, Optional

from ..models.deal import Deal
from ..models.org import UserContext
from ..repositories.deal_repo import DealRepo
from ..repositories.org_repo import OrgRepo
from .nlu_service import auto_link_or_create_contact


class DealService:

    def __init__(self, deal_repo: DealRepo, org_repo: OrgRepo):
        self.deal_repo = deal_repo
        self.org_repo = org_repo

    def upsert_deal(self, org_id: str, pipeline_data: dict, user: UserContext) -> Deal:
        """Create or update a deal. Writes stage_change_events when stage changes."""
        entity_name = pipeline_data.get("entity_name", "")
        now = datetime.utcnow().isoformat() + "Z"

        # Resolve company_contact_id from entity_name
        company_contact_id = auto_link_or_create_contact(entity_name, org_id) if entity_name else None

        # Try to find an existing deal by entity_name
        existing_deals = self.deal_repo.list_by_entity_name(org_id, entity_name)
        existing_deal = existing_deals[0] if existing_deals else None

        if existing_deal:
            deal_id = existing_deal.id
            old_stage = existing_deal.stage
            new_stage = pipeline_data.get("stage", old_stage)

            update_fields = {k: v for k, v in pipeline_data.items() if v is not None}
            update_fields["updated_at"] = now
            if company_contact_id:
                update_fields["company_contact_id"] = company_contact_id
            self.deal_repo.update(org_id, deal_id, update_fields)

            if new_stage and new_stage != old_stage:
                self.deal_repo.log_stage_change(org_id, deal_id, old_stage, new_stage, user.user_id)

            return self.deal_repo.get(org_id, deal_id)
        else:
            deal_id = str(uuid.uuid4())
            deal_data = {
                "org_id": org_id,
                "entity_name": entity_name,
                "company_contact_id": company_contact_id,
                "stage": pipeline_data.get("stage", "0"),
                "is_pending": pipeline_data.get("is_pending"),
                "product_id": pipeline_data.get("product_id"),
                "est_value": pipeline_data.get("est_value"),
                "next_action_date": pipeline_data.get("next_action_date"),
                "status_summary": pipeline_data.get("status_summary", ""),
                "added_by": user.user_id,
                "created_at": now,
                "updated_at": now,
            }
            deal_data = {k: v for k, v in deal_data.items() if v is not None}
            self.deal_repo.save(org_id, deal_id, deal_data)
            return self.deal_repo.get(org_id, deal_id)

    def list_deals(self, org_id: str, user: UserContext) -> List[Deal]:
        """Members see own deals; admins see all."""
        all_deals = self.deal_repo.list_all(org_id)
        if user.is_admin:
            return list(all_deals.values())
        return [d for d in all_deals.values() if d.added_by == user.user_id]

    def get_pipeline_summary(self, org_id: str, user: UserContext) -> dict:
        """Admin-only: returns stage breakdown, est value totals, and member stats."""
        all_deals = self.deal_repo.list_all(org_id)
        deals = list(all_deals.values())

        by_stage: Dict[str, int] = {}
        total_est_value = 0
        member_deal_counts: Dict[str, int] = {}

        for deal in deals:
            by_stage[deal.stage] = by_stage.get(deal.stage, 0) + 1
            if deal.est_value:
                total_est_value += deal.est_value
            member_deal_counts[deal.added_by] = member_deal_counts.get(deal.added_by, 0) + 1

        members_data = []
        org = self.org_repo.get(org_id)
        if org:
            for member in org.members:
                members_data.append({
                    "user_id": member.user_id,
                    "display_name": member.display_name or member.user_id,
                    "active_deals": member_deal_counts.get(member.user_id, 0),
                })

        today = datetime.utcnow().strftime("%Y-%m-%d")
        overdue_actions: List[dict] = []

        return {
            "by_stage": by_stage,
            "total_est_value": total_est_value,
            "members": members_data,
            "overdue_actions": overdue_actions,
        }
