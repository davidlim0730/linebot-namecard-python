from firebase_admin import db
from .. import config
from ..models.card import Card, CardUpdate
from typing import Optional, Dict


class CardRepo:

    def get(self, org_id: str, card_id: str) -> Optional[Card]:
        ref = db.reference(f"{config.NAMECARD_PATH}/{org_id}/{card_id}")
        data = ref.get()
        if not data:
            return None
        return self._to_card(card_id, data)

    def list_all(self, org_id: str) -> Dict[str, Card]:
        ref = db.reference(f"{config.NAMECARD_PATH}/{org_id}")
        data = ref.get() or {}
        return {
            card_id: self._to_card(card_id, card_data)
            for card_id, card_data in data.items()
            if isinstance(card_data, dict)
        }

    def save(self, org_id: str, card_id: str, card_data: dict) -> bool:
        try:
            db.reference(f"{config.NAMECARD_PATH}/{org_id}/{card_id}").set(card_data)
            return True
        except Exception:
            return False

    def update(self, org_id: str, card_id: str, fields: dict) -> bool:
        try:
            db.reference(f"{config.NAMECARD_PATH}/{org_id}/{card_id}").update(fields)
            return True
        except Exception:
            return False

    def delete(self, org_id: str, card_id: str) -> bool:
        try:
            db.reference(f"{config.NAMECARD_PATH}/{org_id}/{card_id}").delete()
            return True
        except Exception:
            return False

    def check_exists_by_email(self, org_id: str, email: str) -> Optional[str]:
        """以 email 查重，回傳既有 card_id 或 None"""
        cards = self.list_all(org_id)
        for card_id, card in cards.items():
            if card.email and card.email.lower() == email.lower():
                return card_id
        return None

    def set_tags(self, org_id: str, card_id: str, tags: list) -> bool:
        return self.update(org_id, card_id, {"role_tags": tags})

    def _to_card(self, card_id: str, data: dict) -> Card:
        d = dict(data)
        tags = d.pop("role_tags", None) or []
        allowed = {
            "name", "title", "company", "address", "phone",
            "mobile", "email", "line_id", "memo", "added_by", "created_at"
        }
        filtered = {k: v for k, v in d.items() if k in allowed}
        return Card(id=card_id, tags=tags, **filtered)
