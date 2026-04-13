from typing import List
from ..models.org import UserContext
from ..repositories.org_repo import OrgRepo
from ..repositories.card_repo import CardRepo
from .card_service import PermissionError, NotFoundError


class TagService:

    def __init__(self, org_repo: OrgRepo, card_repo: CardRepo):
        self.org_repo = org_repo
        self.card_repo = card_repo

    def list_tags(self, org_id: str) -> List[str]:
        return self.org_repo.get_all_role_tags(org_id)

    def add_tag(self, org_id: str, tag_name: str) -> bool:
        return self.org_repo.add_role_tag(org_id, tag_name)

    def delete_tag(self, org_id: str, tag_name: str) -> bool:
        return self.org_repo.delete_role_tag(org_id, tag_name)

    def set_card_tags(self, org_id: str, card_id: str,
                      tag_names: List[str], user: UserContext) -> bool:
        card = self.card_repo.get(org_id, card_id)
        if not card:
            raise NotFoundError(card_id)
        if not user.is_admin and card.added_by != user.user_id:
            raise PermissionError(f"Cannot tag card {card_id}")
        return self.card_repo.set_tags(org_id, card_id, tag_names)
