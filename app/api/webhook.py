from fastapi import APIRouter, Request, HTTPException
from linebot.models import MessageEvent, PostbackEvent, FollowEvent
from linebot.exceptions import InvalidSignatureError

from ..bot_instance import parser
from ..line_handlers import (
    handle_text_event, handle_image_event,
    handle_postback_event, handle_follow_event,
)
from ..firebase_utils import get_all_cards

router = APIRouter()


@router.post("/")
async def handle_callback(request: Request):
    signature = request.headers["X-Line-Signature"]
    body = (await request.body()).decode()
    try:
        events = parser.parse(body, signature)
    except InvalidSignatureError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    for event in events:
        user_id = event.source.user_id
        if isinstance(event, MessageEvent):
            if event.message.type == "text":
                await handle_text_event(event, user_id)
            elif event.message.type == "image":
                await handle_image_event(event, user_id)
        elif isinstance(event, PostbackEvent):
            await handle_postback_event(event, user_id)
        elif isinstance(event, FollowEvent):
            await handle_follow_event(event)
    return "OK"


@router.get("/")
async def health_check():
    return {"status": "ok"}


@router.get("/api/admin/export/{user_id}")
async def export_user_contacts(user_id: str):
    contacts = get_all_cards(user_id)
    if not contacts:
        return {"user_id": user_id, "total": 0, "contacts": []}
    contact_list = []
    for card_id, card_data in contacts.items():
        if isinstance(card_data, dict):
            card_data["card_id"] = card_id
            contact_list.append(card_data)
    return {"user_id": user_id, "total": len(contact_list), "contacts": contact_list}
