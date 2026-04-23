from typing import Optional, List
from ..models.card import Contact, ContactUpdate
from ..models.org import UserContext
from ..repositories.contact_repo import ContactRepo
from ..repositories.org_repo import OrgRepo


class PermissionError(Exception):
    pass


class NotFoundError(Exception):
    pass


class ContactService:

    def __init__(self, contact_repo: ContactRepo, org_repo: OrgRepo):
        self.contact_repo = contact_repo
        self.org_repo = org_repo

    def get_contact(self, org_id: str, contact_id: str,
                    user: UserContext) -> Optional[Contact]:
        contact = self.contact_repo.get(org_id, contact_id)
        if not contact:
            return None
        if not self._can_access(contact, user):
            return None
        return contact

    def list_contacts(self, org_id: str, user: UserContext,
                      search: str = None, tag: str = None) -> List[Contact]:
        all_contacts = self.contact_repo.list_all(org_id)
        contacts = [
            c for c in all_contacts.values()
            if self._can_access(c, user)
        ]
        if search:
            q = search.lower()
            contacts = [
                c for c in contacts
                if q in (c.display_name or "").lower()
                or q in (c.company_name or "").lower()
                or q in (c.title or "").lower()
                or q in (c.email or "").lower()
                or q in (c.legal_name or "").lower()
                or q in (c.industry or "").lower()
                or q in (c.website or "").lower()
                or q in (c.department or "").lower()
                or q in (c.phone or "").lower()
                or q in (c.mobile or "").lower()
                or q in (c.work_phone or "").lower()
            ]
        if tag:
            contacts = [c for c in contacts if tag in c.tags]
        return contacts

    def list_company_members(self, org_id: str, company_contact_id: str,
                             user: UserContext) -> List[Contact]:
        company = self.contact_repo.get(org_id, company_contact_id)
        if not company:
            raise NotFoundError(company_contact_id)
        if not self._can_access(company, user):
            raise PermissionError(f"User {user.user_id} cannot access company {company_contact_id}")
        members = self.contact_repo.list_by_parent_company(org_id, company_contact_id)
        visible_members = [
            contact for contact in members.values()
            if self._can_access(contact, user)
        ]
        return sorted(visible_members, key=lambda c: (c.display_name or "").lower())

    def update_contact(self, org_id: str, contact_id: str,
                       update: ContactUpdate, user: UserContext) -> bool:
        contact = self.contact_repo.get(org_id, contact_id)
        if not contact:
            raise NotFoundError(contact_id)
        if not self._can_access(contact, user):
            raise PermissionError(f"User {user.user_id} cannot edit contact {contact_id}")
        fields = {k: v for k, v in update.model_dump().items() if v is not None}
        return self.contact_repo.update(org_id, contact_id, fields)

    def delete_contact(self, org_id: str, contact_id: str,
                       user: UserContext) -> bool:
        contact = self.contact_repo.get(org_id, contact_id)
        if not contact:
            raise NotFoundError(contact_id)
        if not self._can_access(contact, user):
            raise PermissionError(f"User {user.user_id} cannot delete contact {contact_id}")
        return self.contact_repo.delete(org_id, contact_id)

    def set_contact_tags(self, org_id: str, contact_id: str,
                         tags: List[str], user: UserContext) -> bool:
        contact = self.contact_repo.get(org_id, contact_id)
        if not contact:
            raise NotFoundError(contact_id)
        if not self._can_access(contact, user):
            raise PermissionError(f"User {user.user_id} cannot tag contact {contact_id}")
        return self.contact_repo.set_tags(org_id, contact_id, tags)

    def _can_access(self, contact: Contact, user: UserContext) -> bool:
        if user.is_admin:
            return True
        return contact.added_by == user.user_id
