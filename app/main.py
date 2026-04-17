from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials
import os
import json
import logging
from pydantic import ValidationError

from . import config
from .bot_instance import close_session
from .rich_menu_utils import init_rich_menu
from .api.webhook import router as webhook_router
from .api.internal import router as internal_router
from .api.liff import router as liff_router
from .api.crm import router as crm_router
from .api.vcf import router as vcf_router
from .api.auth import router as admin_auth_router

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
app.include_router(liff_router)
app.include_router(crm_router)
app.include_router(vcf_router)
app.include_router(admin_auth_router)


@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    """Catch Pydantic validation errors and return detailed error info"""
    logger.error(f"Validation error on {request.url.path}: {exc}")
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(x) for x in error["loc"]),
            "type": error["type"],
            "message": error["msg"]
        })
    return JSONResponse(
        status_code=400,
        content={
            "error": "validation_failed",
            "detail": "Data validation failed",
            "errors": errors
        }
    )


@app.get("/liff/", include_in_schema=False)
@app.get("/liff/index.html", include_in_schema=False)
async def liff_index():
    from fastapi.responses import HTMLResponse
    _index = os.path.join(os.path.dirname(__file__), "liff_app", "index.html")
    if not os.path.isfile(_index):
        return HTMLResponse("<html><body>LIFF app not found</body></html>", status_code=404)
    import time
    v = str(int(time.time()))
    with open(_index) as f:
        html = f.read().replace("YOUR_LIFF_ID_HERE", config.LIFF_ID)
    html = html.replace(".css", f".css?v={v}")
    return HTMLResponse(html)


_liff_app_dir = os.path.join(os.path.dirname(__file__), "liff_app")
if os.path.isdir(_liff_app_dir):
    app.mount("/liff", StaticFiles(directory=_liff_app_dir, html=True), name="liff_app")

from pathlib import Path
from fastapi.responses import FileResponse

_admin_dist = Path(__file__).parent / "admin_app" / "dist"
if _admin_dist.exists():
    app.mount("/admin", StaticFiles(directory=str(_admin_dist), html=True), name="admin_app")


@app.get("/admin/{full_path:path}", include_in_schema=False)
async def admin_spa_catchall(full_path: str):
    file = _admin_dist / full_path
    if file.is_file():
        return FileResponse(str(file))
    index = _admin_dist / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return {"detail": "Admin app not built"}


@app.on_event("startup")
async def on_startup():
    try:
        await init_rich_menu()
    except Exception as e:
        logger.warning("Rich Menu initialization failed: %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    await close_session()
