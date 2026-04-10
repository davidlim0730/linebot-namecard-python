from fastapi import Request, FastAPI, HTTPException
from linebot.models import MessageEvent, PostbackEvent, FollowEvent
from linebot.exceptions import InvalidSignatureError
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials
import os
import json

from . import config
from .line_handlers import (
    handle_text_event, handle_image_event, handle_postback_event,
    send_batch_summary_push, handle_follow_event)
from .bot_instance import close_session, parser
from .firebase_utils import get_all_cards
from .batch_processor import process_batch, check_batch_idle_and_trigger
from .rich_menu_utils import init_rich_menu
import logging

logger = logging.getLogger(__name__)

# =====================
# 初始化區塊
# =====================

# Firebase 初始化
firebase_config = {
    "databaseURL": config.FIREBASE_URL,
}
# 如果設定了 Storage Bucket，則加入配置
if config.FIREBASE_STORAGE_BUCKET:
    firebase_config["storageBucket"] = config.FIREBASE_STORAGE_BUCKET

try:
    cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred, firebase_config)
    print("Firebase Admin SDK initialized successfully.")
except Exception as e:
    # 在 Heroku 上，GOOGLE_APPLICATION_CREDENTIALS 可能不是一個有效的檔案路徑
    # 此時需要從環境變數解析 JSON
    gac_str = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    if gac_str:
        cred_json = json.loads(gac_str)
        cred = credentials.Certificate(cred_json)
        firebase_admin.initialize_app(cred, firebase_config)
        print("Firebase Admin SDK initialized successfully from ENV VAR.")
    else:
        print(f"Firebase initialization failed: {e}")
        # 可以選擇在這裡 sys.exit(1) 或讓程式繼續，但 Firebase 功能會失效


# Gemini 初始化
genai.configure(api_key=config.GEMINI_KEY)

# FastAPI 初始化
app = FastAPI()


@app.on_event("startup")
async def on_startup():
    try:
        await init_rich_menu()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(
            "Rich Menu initialization failed: %s", e)


# =====================
# FastAPI 路由 (主入口)
# =====================
@app.post("/")
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


@app.get("/")
async def health_check():
    return {"status": "ok"}


@app.get("/api/admin/export/{user_id}")
async def export_user_contacts(user_id: str):
    """
    匯出特定使用者所有的名片資料為 JSON
    """
    contacts = get_all_cards(user_id)
    if not contacts:
        return {"user_id": user_id, "total": 0, "contacts": []}
    
    # Optional formatting: convert to list and ensure card_id is in each contact
    contact_list = []
    for card_id, card_data in contacts.items():
        if isinstance(card_data, dict):
            card_data["card_id"] = card_id
            contact_list.append(card_data)
        
    return {"user_id": user_id, "total": len(contact_list), "contacts": contact_list}


@app.post("/internal/process-batch")
async def internal_process_batch(request: Request):
    """
    Cloud Tasks worker endpoint for batch namecard OCR.
    Security: verifies X-CloudTasks-QueueName header matches configured queue.
    """
    queue_name = request.headers.get("X-CloudTasks-QueueName", "")
    if queue_name != config.CLOUD_TASKS_QUEUE:
        raise HTTPException(status_code=403, detail="Forbidden")

    body = await request.json()
    user_id = body.get("user_id")
    org_id = body.get("org_id")
    image_paths = body.get("image_paths", [])

    if not user_id or not org_id or not image_paths:
        raise HTTPException(status_code=400, detail="Missing required fields")

    summary = await process_batch(user_id, org_id, image_paths)
    await send_batch_summary_push(user_id, summary)
    return {"status": "ok", "summary": summary}


def get_db_instance():
    """Get Firebase Realtime Database instance for batch idle checking."""
    from firebase_admin import db
    return db


@app.post('/internal/check-batch-idle')
def check_batch_idle():
    """由 Cloud Scheduler 定期呼叫，檢查是否有 batch 進入 idle 狀態"""
    try:
        from google.cloud import tasks_v2

        db = get_db_instance()
        tasks_client = tasks_v2.CloudTasksClient()

        batch_states_ref = db.reference('batch_states')
        all_batches = batch_states_ref.get() or {}

        for user_id, batch_data in all_batches.items():
            org_id = batch_data.get('org_id')
            status = batch_data.get('status', 'active')

            # 若已排隊，跳過（避免重複）
            if status == 'queued':
                logger.info(f"Batch for {user_id} already queued, skipping")
                continue

            check_batch_idle_and_trigger(user_id, org_id, db, tasks_client)

        return {'status': 'ok'}
    except Exception as e:
        logger.error(f"Error in check_batch_idle: {str(e)}")
        return {'status': 'error', 'message': str(e)}


@app.on_event("shutdown")
async def on_shutdown():
    await close_session()
    print("aiohttp session closed.")
