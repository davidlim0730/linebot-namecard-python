from typing import List
from ..models.org import UserContext
from ..repositories.org_repo import OrgRepo
from ..repositories.card_repo import CardRepo
from ..repositories.contact_repo import ContactRepo
from .card_service import PermissionError, NotFoundError


class TagService:

    def __init__(self, org_repo: OrgRepo, card_repo: CardRepo, contact_repo: ContactRepo):
        self.org_repo = org_repo
        self.card_repo = card_repo
        self.contact_repo = contact_repo

    def list_tags(self, org_id: str) -> List[str]:
        return self.org_repo.get_all_role_tags(org_id)

    def add_tag(self, org_id: str, tag_name: str) -> bool:
        return self.org_repo.add_role_tag(org_id, tag_name)

    def delete_tag(self, org_id: str, tag_name: str) -> bool:
        deleted = self.org_repo.delete_role_tag(org_id, tag_name)
        if not deleted:
            return False

        for contact_id, contact in self.contact_repo.list_all(org_id).items():
            if tag_name in (contact.tags or []):
                self.contact_repo.remove_tag(org_id, contact_id, tag_name)

        for card_id, card in self.card_repo.list_all(org_id).items():
            if tag_name in (card.tags or []):
                remaining = [tag for tag in card.tags if tag != tag_name]
                self.card_repo.set_tags(org_id, card_id, remaining)

        return True

    def set_card_tags(self, org_id: str, card_id: str,
                      tag_names: List[str], user: UserContext) -> bool:
        card = self.card_repo.get(org_id, card_id)
        if not card:
            raise NotFoundError(card_id)
        if not user.is_admin and card.added_by != user.user_id:
            raise PermissionError(f"Cannot tag card {card_id}")
        return self.card_repo.set_tags(org_id, card_id, tag_names)
