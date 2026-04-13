from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from .. import config
from ..services.auth_service import AuthService, AuthError
from ..services.card_service import CardService, PermissionError as CardPermError, NotFoundError
from ..services.tag_service import TagService
from ..models.org import UserContext
from ..models.card import CardUpdate
from ..repositories.org_repo import OrgRepo
from ..repositories.card_repo import CardRepo

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
