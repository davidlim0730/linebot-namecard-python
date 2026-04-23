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

    def list_by_parent_company(self, org_id: str, company_contact_id: str) -> Dict[str, Contact]:
        contacts = self.list_all(org_id)
        return {
            contact_id: contact
            for contact_id, contact in contacts.items()
            if contact.parent_company_id == company_contact_id
        }

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

    def find_or_create_company(self, org_id: str, company_name: str, added_by: str) -> str:
        """以 display_name（case-insensitive）找到或建立 Company Contact，回傳 contact_id"""
        contacts = self.list_all(org_id)
        name_lower = company_name.strip().lower()
        for contact_id, contact in contacts.items():
            if contact.contact_type == "company" and contact.display_name.strip().lower() == name_lower:
                return contact_id
        contact_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat() + "Z"
        self.save(org_id, contact_id, {
            "contact_type": "company",
            "display_name": company_name.strip(),
            "source": "ocr",
            "added_by": added_by,
            "created_at": now,
        })
        return contact_id

    def check_exists_by_email(self, org_id: str, email: str) -> Optional[str]:
        """以 email（case-insensitive）比對，回傳既有 contact_id 或 None"""
        contacts = self.list_all(org_id)
        email_lower = email.strip().lower()
        for contact_id, contact in contacts.items():
            if contact.email and contact.email.strip().lower() == email_lower:
                return contact_id
        return None

    def add_tag(self, org_id: str, contact_id: str, tag_name: str) -> bool:
        """將 tag_name 加入 Contact.tags（不重複）"""
        contact = self.get(org_id, contact_id)
        if not contact:
            return False
        tags = list(contact.tags)
        if tag_name not in tags:
            tags.append(tag_name)
            return self.update(org_id, contact_id, {"tags": tags})
        return True

    def remove_tag(self, org_id: str, contact_id: str, tag_name: str) -> bool:
        """從 Contact.tags 移除 tag_name"""
        contact = self.get(org_id, contact_id)
        if not contact:
            return False
        tags = [t for t in contact.tags if t != tag_name]
        return self.update(org_id, contact_id, {"tags": tags})

    def set_tags(self, org_id: str, contact_id: str, tags: list) -> bool:
        """整組覆蓋 Contact.tags"""
        return self.update(org_id, contact_id, {"tags": tags})

    def _to_contact(self, contact_id: str, data: dict) -> Contact:
        d = dict(data)
        allowed = {
            "contact_type", "display_name", "legal_name", "aliases",
            "parent_company_id", "company_name", "title", "phone", "mobile", "email",
            "line_id", "address", "memo", "tags", "source", "raw_card_data",
            "industry", "website", "employee_count", "department", "work_phone",
            "added_by", "created_at", "updated_at"
        }
        filtered = {k: v for k, v in d.items() if k in allowed}
        if "aliases" in filtered:
            v = filtered["aliases"]
            if isinstance(v, dict):
                filtered["aliases"] = list(v.values())
            elif not isinstance(v, list):
                filtered["aliases"] = []
        if "tags" in filtered:
            v = filtered["tags"]
            if isinstance(v, dict):
                filtered["tags"] = list(v.values())
            elif not isinstance(v, list):
                filtered["tags"] = []
        filtered.setdefault("contact_type", "person")
        filtered.setdefault("display_name", "（未知）")
        filtered.setdefault("added_by", "system")
        filtered.setdefault("created_at", "")
        filtered.setdefault("source", "manual")
        if "employee_count" in filtered and filtered["employee_count"] is not None:
            try:
                filtered["employee_count"] = int(filtered["employee_count"])
            except (TypeError, ValueError):
                filtered["employee_count"] = None
        return Contact(id=contact_id, **filtered)
