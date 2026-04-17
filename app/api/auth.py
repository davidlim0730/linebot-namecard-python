import asyncio
import secrets
import httpx
from urllib.parse import urlencode
from fastapi import APIRouter, Cookie, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from app import config
from app.services.auth_service import create_access_token, create_refresh_token, verify_token
from app.firebase_utils import ensure_user_org, get_user_org_id

router = APIRouter(prefix="/api/auth", tags=["auth"])

LINE_AUTHORIZE_URL = "https://access.line.me/oauth2/v2.1/authorize"
LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token"
LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify"


def _get_callback_url(request: Request) -> str:
    if config.CLOUD_RUN_URL:
        return f"{config.CLOUD_RUN_URL.rstrip('/')}/api/auth/line-login/callback"
    base = str(request.base_url).rstrip("/")
    return f"{base}/api/auth/line-login/callback"


@router.get("/line-login/authorize")
async def authorize(request: Request, response: Response):
    state = secrets.token_urlsafe(32)
    response.set_cookie(
        "line_login_state", state,
        httponly=True, secure=True, samesite="lax",
        max_age=300
    )
    callback_url = _get_callback_url(request)
    params = urlencode({
        "response_type": "code",
        "client_id": config.LINE_LOGIN_CHANNEL_ID,
        "redirect_uri": callback_url,
        "state": state,
        "scope": "profile openid",
    })
    return RedirectResponse(f"{LINE_AUTHORIZE_URL}?{params}")


@router.get("/line-login/callback")
async def callback(
    request: Request,
    response: Response,
    code: str = "",
    state: str = "",
    line_login_state: str = Cookie(default=""),
):
    if not line_login_state or state != line_login_state:
        raise HTTPException(status_code=400, detail="CSRF state mismatch")

    response.delete_cookie("line_login_state", httponly=True, secure=True, samesite="lax")

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    callback_url = _get_callback_url(request)
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(LINE_TOKEN_URL, data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": callback_url,
            "client_id": config.LINE_LOGIN_CHANNEL_ID,
            "client_secret": config.LINE_LOGIN_CHANNEL_SECRET,
        })
    if token_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to exchange LINE token")

    token_data = token_resp.json()
    id_token = token_data.get("id_token")
    if not id_token:
        raise HTTPException(status_code=502, detail="No id_token from LINE")

    async with httpx.AsyncClient() as client:
        verify_resp = await client.post(LINE_VERIFY_URL, data={
            "id_token": id_token,
            "client_id": config.LINE_LOGIN_CHANNEL_ID,
        })
    if verify_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="id_token verification failed")

    claims = verify_resp.json()
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=502, detail="No user_id in LINE token")

    org_id, _ = await asyncio.to_thread(ensure_user_org, user_id)
    role = "admin"

    access_token = create_access_token(user_id, org_id, role)
    refresh_token = create_refresh_token(user_id)

    redirect = RedirectResponse(f"/admin/auth-callback#access_token={access_token}", status_code=302)
    redirect.set_cookie(
        "admin_refresh", refresh_token,
        httponly=True, secure=True, samesite="lax",
        max_age=30 * 24 * 3600
    )
    return redirect


@router.get("/me")
async def me(admin_refresh: str = Cookie(default="")):
    if not admin_refresh:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = verify_token(admin_refresh, token_type="refresh")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload["sub"]
    org_id = await asyncio.to_thread(get_user_org_id, user_id)
    if not org_id:
        raise HTTPException(status_code=401, detail="User org not found")

    access_token = create_access_token(user_id, org_id, "admin")
    return {"access_token": access_token, "user_id": user_id}


@router.post("/refresh")
async def refresh(admin_refresh: str = Cookie(default="")):
    if not admin_refresh:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = verify_token(admin_refresh, token_type="refresh")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload["sub"]
    org_id = await asyncio.to_thread(get_user_org_id, user_id)
    if not org_id:
        raise HTTPException(status_code=401, detail="User org not found")
    access_token = create_access_token(user_id, org_id, "admin")
    return {"access_token": access_token}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("admin_refresh", httponly=True, secure=True, samesite="lax")
    return {"ok": True}
