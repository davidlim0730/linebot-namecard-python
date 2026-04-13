from typing import Optional, List
from ..models.card import Card, CardUpdate
from ..models.org import UserContext
from ..repositories.card_repo import CardRepo
from ..repositories.org_repo import OrgRepo


class PermissionError(Exception):
    pass


class NotFoundError(Exception):
    pass


class CardService:

    def __init__(self, card_repo: CardRepo, org_repo: OrgRepo):
        self.card_repo = card_repo
        self.org_repo = org_repo

    def get_card(self, org_id: str, card_id: str,
                 user: UserContext) -> Optional[Card]:
        card = self.card_repo.get(org_id, card_id)
        if not card:
            return None
        if not self._can_access(card, user):
            return None
        return card

    def list_cards(self, org_id: str, user: UserContext,
                   search: str = None, tag: str = None) -> List[Card]:
        all_cards = self.card_repo.list_all(org_id)
        cards = [
            c for c in all_cards.values()
            if self._can_access(c, user)
        ]
        if search:
            q = search.lower()
            cards = [
                c for c in cards
                if q in (c.name or "").lower()
                or q in (c.company or "").lower()
                or q in (c.title or "").lower()
                or q in (c.email or "").lower()
            ]
        if tag:
            cards = [c for c in cards if tag in c.tags]
        return cards

    def update_card(self, org_id: str, card_id: str,
                    update: CardUpdate, user: UserContext) -> bool:
        card = self.card_repo.get(org_id, card_id)
        if not card:
            raise NotFoundError(card_id)
        if not self._can_access(card, user):
            raise PermissionError(f"User {user.user_id} cannot edit card {card_id}")
        fields = {k: v for k, v in update.model_dump().items() if v is not None}
        return self.card_repo.update(org_id, card_id, fields)

    def delete_card(self, org_id: str, card_id: str,
                    user: UserContext) -> bool:
        card = self.card_repo.get(org_id, card_id)
        if not card:
            raise NotFoundError(card_id)
        if not self._can_access(card, user):
            raise PermissionError(f"User {user.user_id} cannot delete card {card_id}")
        return self.card_repo.delete(org_id, card_id)

    def check_duplicate(self, org_id: str, email: str) -> Optional[str]:
        if not email or email == "N/A":
            return None
        return self.card_repo.check_exists_by_email(org_id, email)

    def set_card_tags(self, org_id: str, card_id: str,
                      tags: List[str], user: UserContext) -> bool:
        card = self.card_repo.get(org_id, card_id)
        if not card:
            raise NotFoundError(card_id)
        if not self._can_access(card, user):
            raise PermissionError(f"User {user.user_id} cannot tag card {card_id}")
        return self.card_repo.set_tags(org_id, card_id, tags)

    def _can_access(self, card: Card, user: UserContext) -> bool:
        if user.is_admin:
            return True
        return card.added_by == user.user_id
