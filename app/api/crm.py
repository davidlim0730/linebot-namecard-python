from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from .. import config
from ..models.org import UserContext
from ..models.deal import DealUpdate
from ..models.action import ActionUpdate
from ..models.card import ContactCreate, ContactUpdate
from ..services.auth_service import AuthService, AuthError
from ..services.nlu_service import parse_text, auto_link_or_create_contact
from ..services.deal_service import DealService
from ..services.activity_service import ActivityService
from ..services.action_service import ActionService
from ..repositories.deal_repo import DealRepo
from ..repositories.activity_repo import ActivityRepo
from ..repositories.action_repo import ActionRepo
from ..repositories.org_repo import OrgRepo
from ..repositories.card_repo import CardRepo
from ..repositories.contact_repo import ContactRepo
from ..repositories.product_repo import ProductRepo
from ..repositories.stakeholder_repo import StakeholderRepo

router = APIRouter(prefix="/api/v1")
security = HTTPBearer(auto_error=False)

# Singletons
auth_service = AuthService(
    jwt_secret=config.JWT_SECRET,
    liff_channel_id=config.LIFF_CHANNEL_ID,
)
org_repo = OrgRepo()
deal_repo = DealRepo()
activity_repo = ActivityRepo()
action_repo = ActionRepo()
card_repo = CardRepo()
contact_repo = ContactRepo()
product_repo = ProductRepo()
stakeholder_repo = StakeholderRepo()

deal_service = DealService(deal_repo, org_repo)
activity_service = ActivityService(activity_repo)
action_service = ActionService(action_repo)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> UserContext:
    if not credentials:
        raise HTTPException(status_code=403, detail={"error": "forbidden"})
    try:
        return auth_service.verify_jwt(credentials.credentials)
    except AuthError as e:
        raise HTTPException(status_code=401, detail={"error": "unauthorized", "message": str(e)})


# ---- Request models ----

class ContextHint(BaseModel):
    contact_id: Optional[str] = None   # pre-known contact FK
    contact_name: Optional[str] = None  # display name for prompt injection
    entity_name: Optional[str] = None   # company name for deal/activity/action


class ParseRequest(BaseModel):
    raw_text: str
    context_hint: Optional[ContextHint] = None


class ConfirmRequest(BaseModel):
    confirmed_data: dict
    context_hint: Optional[ContextHint] = None


class StakeholderCreate(BaseModel):
    name: str
    title: Optional[str] = None
    attitude: Optional[str] = None  # Champion / Decision Maker / Gatekeeper


class ProductCreate(BaseModel):
    name: str
    status: str = "Active"


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None


# ---- NLU ----

@router.post("/crm/parse")
async def crm_parse(body: ParseRequest, user: UserContext = Depends(get_current_user)):
    """Phase 1: NLU only — parse raw text, return structured preview."""
    hint = body.context_hint.model_dump() if body.context_hint else None
    result = parse_text(body.raw_text, user.org_id, context_hint=hint)
    return {"parsed": result.model_dump()}


@router.post("/crm/confirm")
async def crm_confirm(body: ConfirmRequest, user: UserContext = Depends(get_current_user)):
    """Phase 2: Write confirmed NLU data to Firebase."""
    data = body.confirmed_data
    written = {
        "entities_created": [],
        "pipelines_updated": [],
        "interactions_logged": [],
        "actions_scheduled": [],
        "contacts_upserted": [],
    }

    # context_hint：從 LIFF 頁面帶入的已知 contact，直接 bypass 模糊比對
    hint = body.context_hint
    hint_contact_id = hint.contact_id if hint else None
    hint_entity_name = hint.entity_name if hint else None

    # 前置：批次解析所有 entity_name → contact_id，避免重複建立
    all_entity_names = set()
    for pipeline in data.get("pipelines", []):
        if pipeline.get("entity_name"):
            all_entity_names.add(pipeline["entity_name"])
    for interaction in data.get("interactions", []):
        if interaction.get("entity_name"):
            all_entity_names.add(interaction["entity_name"])
    for action in data.get("actions", []):
        if action.get("entity_name"):
            all_entity_names.add(action["entity_name"])

    entity_contact_map: dict = {}
    for entity_name in all_entity_names:
        # 若 hint 提供了 contact_id 且 entity_name 符合，直接使用，不重新建立
        if hint_contact_id and hint_entity_name and (
            entity_name == hint_entity_name or hint_entity_name in entity_name or entity_name in hint_entity_name
        ):
            contact_id = hint_contact_id
        else:
            contact_id = auto_link_or_create_contact(entity_name, user.org_id)
        entity_contact_map[entity_name] = contact_id
        if contact_id not in written["contacts_upserted"]:
            written["contacts_upserted"].append(contact_id)

    # Upsert pipelines（注入 company_contact_id）
    for pipeline in data.get("pipelines", []):
        entity_name = pipeline.get("entity_name", "")
        if entity_name and entity_name in entity_contact_map:
            pipeline["company_contact_id"] = entity_contact_map[entity_name]
        deal = deal_service.upsert_deal(user.org_id, pipeline, user)
        if deal:
            written["pipelines_updated"].append(deal.id)

    # Log interactions（注入 contact_id）
    for interaction in data.get("interactions", []):
        if not interaction.get("raw_transcript"):
            continue
        entity_name = interaction.get("entity_name", "")
        if entity_name and entity_name in entity_contact_map:
            interaction["contact_id"] = entity_contact_map[entity_name]
        activity = activity_service.log_activity(user.org_id, interaction, user)
        if activity:
            written["interactions_logged"].append(activity.id)

    # Schedule actions（注入 contact_id）
    for action in data.get("actions", []):
        if not action.get("due_date"):
            continue
        entity_name = action.get("entity_name", "")
        if entity_name and entity_name in entity_contact_map:
            action["contact_id"] = entity_contact_map[entity_name]
        result = action_service.schedule_action(user.org_id, action, user)
        if result:
            written["actions_scheduled"].append(result.id)

    return {"written": written}


# ---- Deals ----

@router.get("/deals")
async def list_deals(
    stage: Optional[str] = None,
    owner: Optional[str] = None,
    user: UserContext = Depends(get_current_user),
):
    deals = deal_service.list_deals(user.org_id, user)
    if stage:
        deals = [d for d in deals if d.stage == stage]
    if owner:
        deals = [d for d in deals if d.added_by == owner]
    return [d.model_dump() for d in deals]


@router.get("/deals/{deal_id}")
async def get_deal(deal_id: str, user: UserContext = Depends(get_current_user)):
    deal = deal_repo.get(user.org_id, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail={"error": "not_found"})
    activities = activity_repo.list_by_deal(user.org_id, deal_id)
    return {
        **deal.model_dump(),
        "activities": [a.model_dump() for a in activities],
    }


@router.put("/deals/{deal_id}")
async def update_deal(
    deal_id: str,
    body: DealUpdate,
    user: UserContext = Depends(get_current_user),
):
    deal = deal_repo.get(user.org_id, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail={"error": "not_found"})
    update_fields = body.model_dump(exclude_none=True)
    if not update_fields:
        return {"ok": True}

    from datetime import datetime
    update_fields["updated_at"] = datetime.utcnow().isoformat() + "Z"

    old_stage = deal.stage
    new_stage = update_fields.get("stage")
    deal_repo.update(user.org_id, deal_id, update_fields)
    if new_stage and new_stage != old_stage:
        deal_repo.log_stage_change(user.org_id, deal_id, old_stage, new_stage, user.user_id)
    return {"ok": True}


@router.get("/deals/{deal_id}/activities")
async def list_deal_activities(deal_id: str, user: UserContext = Depends(get_current_user)):
    activities = activity_repo.list_by_deal(user.org_id, deal_id)
    return [a.model_dump() for a in activities]


@router.get("/deals/{deal_id}/stakeholders")
async def list_deal_stakeholders(deal_id: str, user: UserContext = Depends(get_current_user)):
    stakeholders = stakeholder_repo.list_by_deal(user.org_id, deal_id)
    return [s.model_dump() for s in stakeholders]


@router.post("/deals/{deal_id}/stakeholders")
async def add_deal_stakeholder(
    deal_id: str,
    body: StakeholderCreate,
    user: UserContext = Depends(get_current_user),
):
    import uuid
    from datetime import datetime
    stakeholder_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    data = {
        "org_id": user.org_id,
        "deal_id": deal_id,
        "name": body.name,
        "title": body.title,
        "attitude": body.attitude,
        "added_by": user.user_id,
        "created_at": now,
    }
    data = {k: v for k, v in data.items() if v is not None}
    stakeholder_repo.save(user.org_id, stakeholder_id, data)
    return {"id": stakeholder_id, "ok": True}


# ---- Activities ----

@router.get("/activities")
async def list_activities(user: UserContext = Depends(get_current_user)):
    activities = activity_service.list_activities(user.org_id, user)
    return [a.model_dump() for a in activities]


# ---- Actions ----

@router.get("/actions")
async def list_actions(
    status: Optional[str] = None,
    user: UserContext = Depends(get_current_user),
):
    actions = action_service.list_actions(user.org_id, user)
    if status:
        actions = [a for a in actions if a.status == status]
    return [a.model_dump() for a in actions]


@router.put("/actions/{action_id}")
async def update_action(
    action_id: str,
    body: ActionUpdate,
    user: UserContext = Depends(get_current_user),
):
    action = action_repo.get(user.org_id, action_id)
    if not action:
        raise HTTPException(status_code=404, detail={"error": "not_found"})
    update_fields = body.model_dump(exclude_none=True)
    if update_fields:
        action_repo.update(user.org_id, action_id, update_fields)
    return {"ok": True}


# ---- Products ----

@router.get("/products")
async def list_products(user: UserContext = Depends(get_current_user)):
    products = product_repo.list_active(user.org_id)
    return [p.model_dump() for p in products]


@router.post("/products")
async def create_product(body: ProductCreate, user: UserContext = Depends(get_current_user)):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail={"error": "forbidden"})
    import uuid
    from datetime import datetime
    product_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    data = {
        "org_id": user.org_id,
        "name": body.name,
        "status": body.status,
        "added_by": user.user_id,
        "created_at": now,
    }
    product_repo.save(user.org_id, product_id, data)
    return {"id": product_id, "ok": True}


@router.put("/products/{product_id}")
async def update_product(
    product_id: str,
    body: ProductUpdate,
    user: UserContext = Depends(get_current_user),
):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail={"error": "forbidden"})
    update_fields = body.model_dump(exclude_none=True)
    if update_fields:
        product_repo.update(user.org_id, product_id, update_fields)
    return {"ok": True}


# ---- Pipeline Summary ----

@router.get("/pipeline/summary")
async def pipeline_summary(user: UserContext = Depends(get_current_user)):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail={"error": "forbidden"})
    summary = deal_service.get_pipeline_summary(user.org_id, user)
    return summary


# ---- Contact-centric endpoints ----

@router.get("/contacts")
async def list_contacts(user: UserContext = Depends(get_current_user)):
    contacts = contact_repo.list_all(user.org_id)
    return [c.model_dump() for c in contacts.values()]


@router.get("/contacts/{contact_id}")
async def get_contact(contact_id: str, user: UserContext = Depends(get_current_user)):
    contact = contact_repo.get(user.org_id, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail={"error": "not_found"})
    return contact.model_dump()


@router.put("/contacts/{contact_id}")
async def update_contact(
    contact_id: str,
    body: ContactUpdate,
    user: UserContext = Depends(get_current_user),
):
    contact = contact_repo.get(user.org_id, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail={"error": "not_found"})
    update_fields = body.model_dump(exclude_none=True)
    if update_fields:
        if "parent_company_id" in update_fields and update_fields["parent_company_id"]:
            parent = contact_repo.get(user.org_id, update_fields["parent_company_id"])
            if parent:
                update_fields["company_name"] = parent.display_name
        if update_fields.get("contact_type") == "company":
            update_fields["parent_company_id"] = None
            update_fields["company_name"] = None
        from datetime import datetime
        update_fields["updated_at"] = datetime.utcnow().isoformat() + "Z"
        contact_repo.update(user.org_id, contact_id, update_fields)
    return {"ok": True}


@router.post("/contacts")
async def create_contact(
    body: ContactCreate,
    user: UserContext = Depends(get_current_user),
):
    import uuid
    from datetime import datetime
    contact_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    data = {
        "org_id": user.org_id,
        "contact_type": body.contact_type,
        "display_name": body.display_name,
        "source": body.source,
        "added_by": user.user_id,
        "created_at": now,
    }
    optional_fields = [
        "legal_name", "aliases", "parent_company_id", "company_name", "title",
        "phone", "mobile", "email", "line_id", "address", "memo", "tags",
        "raw_card_data", "industry", "website", "employee_count", "department",
        "work_phone",
    ]
    for f in optional_fields:
        v = getattr(body, f, None)
        if v is not None:
            data[f] = v
    if body.parent_company_id:
        parent = contact_repo.get(user.org_id, body.parent_company_id)
        if parent:
            data["company_name"] = parent.display_name
    if body.contact_type == "company":
        data["parent_company_id"] = None
        data["company_name"] = None
    contact_repo.save(user.org_id, contact_id, data)
    return {"id": contact_id, "ok": True}


@router.get("/contacts/{contact_id}/members")
async def list_contact_members(contact_id: str, user: UserContext = Depends(get_current_user)):
    contact = contact_repo.get(user.org_id, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail={"error": "not_found"})
    members = contact_repo.list_by_parent_company(user.org_id, contact_id)
    return [c.model_dump() for c in members.values()]


@router.get("/contacts/{contact_id}/activities")
async def list_contact_activities(
    contact_id: str,
    deal_id: Optional[str] = None,
    user: UserContext = Depends(get_current_user),
):
    activities = activity_repo.list_by_contact_id(user.org_id, contact_id)
    if deal_id is not None:
        activities = [a for a in activities if a.deal_id == deal_id]
    return [a.model_dump() for a in activities]


@router.get("/contacts/{contact_id}/actions")
async def list_contact_actions(
    contact_id: str,
    status: Optional[str] = None,
    user: UserContext = Depends(get_current_user),
):
    actions = action_repo.list_by_contact_id(user.org_id, contact_id)
    if status is not None:
        actions = [a for a in actions if a.status == status]
    return [a.model_dump() for a in actions]


# ---- Contact CRM view ----

@router.get("/contacts/{card_id}/crm")
async def contact_crm(card_id: str, user: UserContext = Depends(get_current_user)):
    # Try ContactRepo first, fallback to CardRepo for backward compat
    contact = contact_repo.get(user.org_id, card_id)
    if contact:
        company_contact = None
        members = []
        deal_contact_id = card_id
        if contact.contact_type == "company":
            members = list(contact_repo.list_by_parent_company(user.org_id, card_id).values())
        elif contact.parent_company_id:
            company_contact = contact_repo.get(user.org_id, contact.parent_company_id)
            if company_contact:
                deal_contact_id = company_contact.id

        deals = deal_repo.list_by_company_contact_id(user.org_id, deal_contact_id)
        if not deals and contact.company_name:
            deals = deal_repo.list_by_entity_name(user.org_id, contact.company_name)
        activities = activity_repo.list_by_contact_id(user.org_id, card_id)
        actions = action_repo.list_by_contact_id(user.org_id, card_id)
        return {
            "contact": contact.model_dump(),
            "company_contact": company_contact.model_dump() if company_contact else None,
            "members": [m.model_dump() for m in members],
            "deals": [d.model_dump() for d in deals],
            "activities": [a.model_dump() for a in activities],
            "actions": [a.model_dump() for a in actions],
        }
    # Fallback: legacy card_repo lookup
    card = card_repo.get(user.org_id, card_id)
    if not card:
        raise HTTPException(status_code=404, detail={"error": "not_found"})
    entity_name = card.company or card.name
    deals = deal_repo.list_by_entity_name(user.org_id, entity_name)
    activities = activity_repo.list_by_entity_name(user.org_id, entity_name)
    return {
        "card": card.model_dump(),
        "deals": [d.model_dump() for d in deals],
        "activities": [a.model_dump() for a in activities],
    }
