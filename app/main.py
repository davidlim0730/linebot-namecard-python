from fastapi import FastAPI
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials
import os
import json
import logging

from . import config
from .bot_instance import close_session
from .rich_menu_utils import init_rich_menu
from .api.webhook import router as webhook_router
from .api.internal import router as internal_router

logger = logging.getLogger(__name__)

# Firebase 初始化
firebase_config = {"databaseURL": config.FIREBASE_URL}
if config.FIREBASE_STORAGE_BUCKET:
    firebase_config["storageBucket"] = config.FIREBASE_STORAGE_BUCKET

try:
    cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred, firebase_config)
except Exception:
    gac_str = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    if gac_str:
        cred_json = json.loads(gac_str)
        cred = credentials.Certificate(cred_json)
        firebase_admin.initialize_app(cred, firebase_config)

genai.configure(api_key=config.GEMINI_KEY)

app = FastAPI()
app.include_router(webhook_router)
app.include_router(internal_router)


@app.on_event("startup")
async def on_startup():
    try:
        await init_rich_menu()
    except Exception as e:
        logger.warning("Rich Menu initialization failed: %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    await close_session()
