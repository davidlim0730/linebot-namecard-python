from typing import Optional, List, Literal
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from .. import config
from ..services.auth_service import AuthService, AuthError
from ..services.card_service import CardService, PermissionError as CardPermError, NotFoundError
from ..services.tag_service import TagService
from ..services.org_service import OrgService
from ..services.org_service import PermissionError as OrgPermError
from ..models.org import UserContext
from ..models.card import CardUpdate
from ..repositories.org_repo import OrgRepo
from ..repositories.card_repo import CardRepo
from ..repositories.deal_repo import DealRepo
from ..repositories.stakeholder_repo import StakeholderRepo
from ..models.deal import DealCreate
from ..models.stakeholder import StakeholderCreate
from .. import firebase_utils

router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Module-level singletons (injected in tests via patch)
auth_service = AuthService(
    jwt_secret=config.JWT_SECRET,
    liff_channel_id=config.LIFF_CHANNEL_ID,
)
org_repo = OrgRepo()
_card_repo = CardRepo()
card_service = CardService(_card_repo, org_repo)
tag_service = TagService(org_repo, _card_repo)
org_service = OrgService(org_repo)
_deal_repo = DealRepo()
_stakeholder_repo = StakeholderRepo()


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> UserContext:
    if not credentials:
        raise HTTPException(status_code=403, detail={"error": "forbidden"})
    try:
        return auth_service.verify_jwt(credentials.credentials)
    except AuthError as e:
        raise HTTPException(status_code=401, detail={"error": "unauthorized", "message": str(e)})


# ---- Request/Response models ----

class TokenRequest(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    expires_in: int = 3600


class TagCreate(BaseModel):
    name: str


class CardTagsUpdate(BaseModel):
    tag_names: List[str]


class RoleUpdate(BaseModel):
    role: Literal["admin", "member"]


# ---- Auth ----

@router.post("/auth/token", response_model=TokenResponse)
async def issue_token(body: TokenRequest):
    try:
        user_id = await auth_service.verify_line_token(body.id_token)
    except AuthError:
        raise HTTPException(status_code=401, detail={"error": "invalid_token"})

    org_id = org_repo.get_user_org_id(user_id)
    if not org_id:
        raise HTTPException(status_code=403, detail={"error": "no_org"})

    role = org_repo.get_user_role(org_id, user_id) or "member"
    token = auth_service.issue_jwt(user_id, org_id, role)
    return TokenResponse(access_token=token)


# ---- Cards ----

@router.get("/v1/cards")
async def list_cards(
    search: Optional[str] = None,
    tag: Optional[str] = None,
    user: UserContext = Depends(get_current_user),
):
    cards = card_service.list_cards(user.org_id, user, search=search, tag=tag)
    return [c.model_dump() for c in cards]


@router.get("/v1/cards/{card_id}")
async def get_card(card_id: str, user: UserContext = Depends(get_current_user)):
    card = card_service.get_card(user.org_id, card_id, user)
    if not card:
        raise HTTPException(status_code=404, detail={"error": "not_found"})
    return card.model_dump()


@router.put("/v1/cards/{card_id}")
async def update_card(
    card_id: str,
    body: CardUpdate,
    user: UserContext = Depends(get_current_user),
):
    try:
        card_service.update_card(user.org_id, card_id, body, user)
    except NotFoundError:
        raise HTTPException(status_code=404, detail={"error": "not_found"})
    except CardPermError:
        raise HTTPException(status_code=403, detail={"error": "forbidden"})
    return {"ok": True}


@router.delete("/v1/cards/{card_id}")
async def delete_card(card_id: str, user: UserContext = Depends(get_current_user)):
    try:
        card_service.delete_card(user.org_id, card_id, user)
    except NotFoundError:
        raise HTTPException(status_code=404, detail={"error": "not_found"})
    except CardPermError:
        raise HTTPException(status_code=403, detail={"error": "forbidden"})
    return {"ok": True}


# ---- Tags ----

@router.get("/v1/tags")
async def list_tags(user: UserContext = Depends(get_current_user)):
    return tag_service.list_tags(user.org_id)


@router.post("/v1/tags")
async def add_tag(body: TagCreate, user: UserContext = Depends(get_current_user)):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail={"error": "forbidden"})
    tag_service.add_tag(user.org_id, body.name)
    return {"ok": True}


@router.post("/v1/cards/{card_id}/tags")
async def set_card_tags(
    card_id: str,
    body: CardTagsUpdate,
    user: UserContext = Depends(get_current_user),
):
    try:
        tag_service.set_card_tags(user.org_id, card_id, body.tag_names, user)
    except NotFoundError:
        raise HTTPException(status_code=404, detail={"error": "not_found"})
    except CardPermError:
        raise HTTPException(status_code=403, detail={"error": "forbidden"})
    return {"ok": True}


# ---- Org ----

@router.get("/v1/org")
async def get_org(user: UserContext = Depends(get_current_user)):
    org = org_repo.get(user.org_id)
    if not org:
        raise HTTPException(status_code=404, detail={"error": "not_found"})
    return org.model_dump()


@router.get("/v1/org/members")
async def list_members(user: UserContext = Depends(get_current_user)):
    org = org_repo.get(user.org_id)
    if not org:
        raise HTTPException(status_code=404, detail={"error": "not_found"})
    members = []
    for m in org.members:
        member_data = m.model_dump()
        if not member_data.get("display_name"):
            cached_name = firebase_utils.get_cached_display_name(m.user_id)
            if cached_name:
                member_data["display_name"] = cached_name
        members.append(member_data)
    return members


@router.patch("/v1/org/members/{target_user_id}")
async def update_member_role(
    target_user_id: str,
    body: RoleUpdate,
    user: UserContext = Depends(get_current_user),
):
    try:
        org_service.update_member_role(user.org_id, target_user_id, body.role, user)
    except OrgPermError:
        raise HTTPException(status_code=403, detail={"error": "forbidden"})
    return {"ok": True}


@router.post("/v1/deals")
async def create_deal(
    body: DealCreate,
    user: UserContext = Depends(get_current_user),
):
    import uuid
    from datetime import datetime, timezone
    deal_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    deal_data = body.model_dump()
    deal_data.update({"id": deal_id, "org_id": user.org_id, "added_by": user.user_id, "created_at": now, "updated_at": now})
    _deal_repo.save(user.org_id, deal_id, deal_data)
    return {"id": deal_id, **deal_data}


@router.post("/v1/deals/{deal_id}/stakeholders")
async def add_stakeholder_liff(
    deal_id: str,
    body: StakeholderCreate,
    user: UserContext = Depends(get_current_user),
):
    import uuid
    from datetime import datetime, timezone
    sk_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    sk_data = body.model_dump()
    sk_data.update({"id": sk_id, "org_id": user.org_id, "deal_id": deal_id, "added_by": user.user_id, "created_at": now})
    _stakeholder_repo.save(user.org_id, sk_id, sk_data)
    return {"id": sk_id, **sk_data}


@router.post("/v1/org/invite")
async def generate_invite(user: UserContext = Depends(get_current_user)):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail={"error": "forbidden"})
    code = org_service.generate_invite_code(user.org_id, user.user_id)
    return {"code": code}
