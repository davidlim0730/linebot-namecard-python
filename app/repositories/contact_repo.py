from firebase_admin import db
from .. import config
from ..models.card import Contact
from typing import Optional, Dict
import uuid
from datetime import datetime
from difflib import SequenceMatcher


class ContactRepo:

    def get(self, org_id: str, contact_id: str) -> Optional[Contact]:
        ref = db.reference(f"{config.CONTACT_PATH}/{org_id}/{contact_id}")
        data = ref.get()
        if not data:
            return None
        return self._to_contact(contact_id, data)

    def list_all(self, org_id: str) -> Dict[str, Contact]:
        ref = db.reference(f"{config.CONTACT_PATH}/{org_id}")
        data = ref.get() or {}
        return {
            contact_id: self._to_contact(contact_id, contact_data)
            for contact_id, contact_data in data.items()
            if isinstance(contact_data, dict)
        }

    def save(self, org_id: str, contact_id: str, contact_data: dict) -> bool:
        try:
            db.reference(f"{config.CONTACT_PATH}/{org_id}/{contact_id}").set(contact_data)
            return True
        except Exception:
            return False

    def update(self, org_id: str, contact_id: str, fields: dict) -> bool:
        try:
            db.reference(f"{config.CONTACT_PATH}/{org_id}/{contact_id}").update(fields)
            return True
        except Exception:
            return False

    def delete(self, org_id: str, contact_id: str) -> bool:
        try:
            db.reference(f"{config.CONTACT_PATH}/{org_id}/{contact_id}").delete()
            return True
        except Exception:
            return False

    def create_from_nlu(self, org_id: str, display_name: str, company_name: Optional[str] = None) -> Contact:
        """建立 NLU 來源的 Contact，回傳 Contact object（含 id）"""
        contact_id = str(uuid.uuid4())
        contact_type = "person" if company_name else "company"
        now = datetime.utcnow().isoformat() + "Z"
        data = {
            "contact_type": contact_type,
            "display_name": display_name,
            "source": "nlu",
            "added_by": "system",
            "created_at": now,
        }
        if company_name:
            data["memo"] = f"所屬公司: {company_name}"
        self.save(org_id, contact_id, data)
        extra = {k: v for k, v in data.items() if k not in ("added_by", "created_at")}
        return Contact(id=contact_id, added_by="system", created_at=now, **extra)

    def find_by_name_fuzzy(self, org_id: str, entity_name: str) -> Optional[str]:
        """比對 display_name + legal_name + aliases，回傳 contact_id 或 None"""
        contacts = self.list_all(org_id)
        entity_lower = entity_name.lower()

        def ratio(a: str, b: str) -> float:
            return SequenceMatcher(None, a.lower(), b.lower()).ratio()

        best_id = None
        best_score = 0.0

        for contact_id, contact in contacts.items():
            scores = []
            if contact.display_name:
                scores.append(ratio(entity_lower, contact.display_name))
            if contact.legal_name:
                scores.append(ratio(entity_lower, contact.legal_name))
            for alias in (contact.aliases or []):
                scores.append(ratio(entity_lower, alias))

            score = max(scores) if scores else 0.0
            if score > best_score:
                best_score = score
                best_id = contact_id

        if best_score >= 0.4:
            return best_id
        return None

    def _to_contact(self, contact_id: str, data: dict) -> Contact:
        d = dict(data)
        allowed = {
            "contact_type", "display_name", "legal_name", "aliases",
            "parent_company_id", "title", "phone", "mobile", "email",
            "line_id", "memo", "source", "added_by", "created_at"
        }
        filtered = {k: v for k, v in d.items() if k in allowed}
        if "aliases" in filtered:
            v = filtered["aliases"]
            if isinstance(v, dict):
                filtered["aliases"] = list(v.values())
            elif not isinstance(v, list):
                filtered["aliases"] = []
        filtered.setdefault("contact_type", "person")
        filtered.setdefault("display_name", "（未知）")
        filtered.setdefault("added_by", "system")
        filtered.setdefault("created_at", "")
        return Contact(id=contact_id, **filtered)
