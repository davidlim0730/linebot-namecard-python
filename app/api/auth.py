import asyncio
import base64
import hashlib
import hmac
import json
import secrets
import time
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
LINE_STATE_TTL_SECONDS = 300


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _issue_oauth_state() -> str:
    payload = {
        "ts": int(time.time()),
        "nonce": secrets.token_urlsafe(24),
    }
    payload_raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_b64 = _b64url(payload_raw)
    signature = hmac.new(
        config.JWT_SECRET.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return f"{payload_b64}.{_b64url(signature)}"


def _verify_oauth_state(state: str) -> bool:
    try:
        payload_b64, signature_b64 = state.split(".", 1)
        expected_signature = hmac.new(
            config.JWT_SECRET.encode("utf-8"),
            payload_b64.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(_b64url(expected_signature), signature_b64):
            return False
        payload = json.loads(_b64url_decode(payload_b64))
        ts = int(payload.get("ts", 0))
        if not ts:
            return False
        return (int(time.time()) - ts) <= LINE_STATE_TTL_SECONDS
    except Exception:
        return False


def _get_callback_url(request: Request) -> str:
    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",")[0].strip()
    forwarded_host = request.headers.get("x-forwarded-host", "").split(",")[0].strip()
    host = forwarded_host or request.headers.get("host", "").strip()
    if host and "localhost" not in host and "127.0.0.1" not in host:
        scheme = forwarded_proto or request.url.scheme or "https"
        return f"{scheme}://{host}/api/auth/line-login/callback"
    if config.CLOUD_RUN_URL:
        return f"{config.CLOUD_RUN_URL.rstrip('/')}/api/auth/line-login/callback"
    base = str(request.base_url).rstrip("/")
    return f"{base}/api/auth/line-login/callback"


@router.get("/line-login/authorize")
async def authorize(request: Request):
    import logging
    state = _issue_oauth_state()
    callback_url = _get_callback_url(request)
    logging.warning("AUTHORIZE called: host=%s callback_url=%s", request.headers.get("host"), callback_url)
    params = urlencode({
        "response_type": "code",
        "client_id": config.LINE_LOGIN_CHANNEL_ID,
        "redirect_uri": callback_url,
        "state": state,
        "scope": "profile openid",
    })
    redirect = RedirectResponse(f"{LINE_AUTHORIZE_URL}?{params}")
    redirect.set_cookie(
        "line_login_state", state,
        httponly=True, secure=True, samesite="none",
        max_age=LINE_STATE_TTL_SECONDS,
        path="/",
    )
    redirect.set_cookie(
        "__Host-line_login_state", state,
        httponly=True, secure=True, samesite="none",
        max_age=LINE_STATE_TTL_SECONDS,
        path="/",
    )
    return redirect


@router.get("/line-login/callback")
async def callback(
    request: Request,
    response: Response,
    code: str = "",
    state: str = "",
    line_login_state: str = Cookie(default=""),
    host_line_login_state: str = Cookie(default="", alias="__Host-line_login_state"),
):
    import logging
    logging.warning("CALLBACK url=%s cookies=%s", str(request.url), dict(request.cookies))
    cookie_state = line_login_state or host_line_login_state
    cookie_valid = bool(cookie_state) and state == cookie_state
    signed_state_valid = _verify_oauth_state(state)
    logging.warning(
        "CSRF check: cookie_state=%r state=%r code=%r cookie_valid=%s signed_valid=%s",
        cookie_state[:20] if cookie_state else "", state[:20] if state else "",
        code[:10] if code else "", cookie_valid, signed_state_valid,
    )
    if not cookie_valid and not signed_state_valid:
        raise HTTPException(status_code=400, detail="CSRF state mismatch")

    response.delete_cookie("line_login_state", httponly=True, secure=True, samesite="none", path="/")
    response.delete_cookie("__Host-line_login_state", httponly=True, secure=True, samesite="none", path="/")

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
        import logging
        logging.error("LINE token exchange failed: status=%s body=%s", token_resp.status_code, token_resp.text)
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
