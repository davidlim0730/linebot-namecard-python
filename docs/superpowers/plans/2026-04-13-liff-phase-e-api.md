# LIFF Phase E — API Endpoints + JWT Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add LIFF REST API endpoints (`/api/auth/token`, `/api/v1/cards`, `/api/v1/tags`, `/api/v1/org`) with LINE id_token → JWT authentication, backed by the existing service/repository layer.

**Architecture:** LINE LIFF app calls `POST /api/auth/token` with `liff.getIDToken()`, backend verifies with LINE API and issues a short-lived JWT. All subsequent `/api/v1/*` endpoints require `Authorization: Bearer <jwt>`, which is decoded into a `UserContext` via FastAPI dependency injection. All business logic delegates to existing `CardService`, `OrgService`, `TagService`.

**Tech Stack:** FastAPI, PyJWT, httpx (async LINE id_token verification), Pydantic v2, pytest + httpx AsyncClient for tests.

**Working directory:** `.worktrees/liff-refactor` (branch `feature/liff-refactor`)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `app/services/auth_service.py` | Create | LINE id_token verify + JWT issue/verify |
| `app/api/liff.py` | Create | All LIFF REST endpoints + `get_current_user` dependency |
| `app/config.py` | Modify | Add `JWT_SECRET`, `LIFF_CHANNEL_ID` env vars |
| `app/main.py` | Modify | Register `liff_router` |
| `requirements.txt` | Modify | Add `PyJWT`, `httpx` |
| `tests/test_auth_service.py` | Create | Unit tests for AuthService |
| `tests/test_liff_api.py` | Create | Integration tests for LIFF endpoints |

---

## Task 1: Add Dependencies + Config

**Files:**
- Modify: `requirements.txt`
- Modify: `app/config.py`

- [ ] **Step 1: Add PyJWT and httpx to requirements**

Edit `requirements.txt` — append two lines:
```
PyJWT
httpx
```

- [ ] **Step 2: Add JWT_SECRET and LIFF_CHANNEL_ID to config**

In `app/config.py`, after the `SMTP_PASSWORD` line, add:

```python
# =====================
# LIFF / JWT 設定
# =====================
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-in-production")
LIFF_CHANNEL_ID = os.environ.get("LIFF_CHANNEL_ID", "")
```

- [ ] **Step 3: Install new dependencies**

```bash
pip install PyJWT httpx
```

Expected: Successfully installed PyJWT-... httpx-...

- [ ] **Step 4: Verify existing tests still pass**

```bash
cd .worktrees/liff-refactor
pytest tests/ -q --tb=short
```

Expected: same pass/fail count as before (112 passed, 7 failed — no new failures)

- [ ] **Step 5: Commit**

```bash
git add requirements.txt app/config.py
git commit -m "chore: add PyJWT, httpx deps and JWT_SECRET/LIFF_CHANNEL_ID config"
```

---

## Task 2: AuthService — LINE Token Verification + JWT

**Files:**
- Create: `app/services/auth_service.py`
- Create: `tests/test_auth_service.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_auth_service.py`:

```python
import pytest
from unittest.mock import patch, AsyncMock
from app.services.auth_service import AuthService, AuthError
from app.models.org import UserContext


@pytest.fixture
def auth_service():
    return AuthService(jwt_secret="test-secret", liff_channel_id="test-channel")


@pytest.mark.asyncio
async def test_verify_line_token_returns_user_id(auth_service):
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"sub": "U123456", "iss": "https://access.line.me"}

    with patch("app.services.auth_service.httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)
        result = await auth_service.verify_line_token("fake-id-token")

    assert result == "U123456"


@pytest.mark.asyncio
async def test_verify_line_token_raises_on_error(auth_service):
    mock_response = AsyncMock()
    mock_response.status_code = 400
    mock_response.json.return_value = {"error": "invalid_request"}

    with patch("app.services.auth_service.httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)
        with pytest.raises(AuthError):
            await auth_service.verify_line_token("bad-token")


def test_issue_and_verify_jwt(auth_service):
    token = auth_service.issue_jwt("U123", "org_abc", "admin")
    ctx = auth_service.verify_jwt(token)
    assert ctx.user_id == "U123"
    assert ctx.org_id == "org_abc"
    assert ctx.role == "admin"
    assert ctx.is_admin is True


def test_verify_jwt_raises_on_invalid(auth_service):
    with pytest.raises(AuthError):
        auth_service.verify_jwt("not-a-jwt")


def test_verify_jwt_raises_on_wrong_secret(auth_service):
    other = AuthService(jwt_secret="other-secret", liff_channel_id="x")
    token = other.issue_jwt("U1", "org1", "member")
    with pytest.raises(AuthError):
        auth_service.verify_jwt(token)
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pytest tests/test_auth_service.py -v
```

Expected: FAIL — `ImportError: cannot import name 'AuthService'`

- [ ] **Step 3: Implement AuthService**

Create `app/services/auth_service.py`:

```python
import httpx
import jwt as pyjwt
from datetime import datetime, timezone, timedelta
from ..models.org import UserContext


class AuthError(Exception):
    pass


class AuthService:

    def __init__(self, jwt_secret: str, liff_channel_id: str):
        self.jwt_secret = jwt_secret
        self.liff_channel_id = liff_channel_id

    async def verify_line_token(self, id_token: str) -> str:
        """Verify LINE id_token with LINE API. Returns user_id (sub)."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.line.me/oauth2/v2.1/verify",
                data={"id_token": id_token, "client_id": self.liff_channel_id},
            )
        data = resp.json()
        if resp.status_code != 200 or "sub" not in data:
            raise AuthError(f"LINE token verification failed: {data.get('error', 'unknown')}")
        return data["sub"]

    def issue_jwt(self, user_id: str, org_id: str, role: str) -> str:
        payload = {
            "sub": user_id,
            "org_id": org_id,
            "role": role,
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "iat": datetime.now(timezone.utc),
        }
        return pyjwt.encode(payload, self.jwt_secret, algorithm="HS256")

    def verify_jwt(self, token: str) -> UserContext:
        try:
            payload = pyjwt.decode(token, self.jwt_secret, algorithms=["HS256"])
        except pyjwt.PyJWTError as e:
            raise AuthError(f"Invalid JWT: {e}")
        return UserContext(
            user_id=payload["sub"],
            org_id=payload["org_id"],
            role=payload["role"],
        )
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pytest tests/test_auth_service.py -v
```

Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add app/services/auth_service.py tests/test_auth_service.py
git commit -m "feat: add AuthService with LINE id_token verify and JWT issue/verify"
```

---

## Task 3: Auth Endpoint — POST /api/auth/token

**Files:**
- Create: `app/api/liff.py` (auth endpoint only for now)
- Create: `tests/test_liff_api.py` (auth endpoint tests)
- Modify: `app/main.py` (register liff_router)

- [ ] **Step 1: Write failing tests**

Create `tests/test_liff_api.py`:

```python
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    # Import after patching config to avoid sys.exit on missing env vars
    import os
    os.environ.setdefault("ChannelSecret", "test")
    os.environ.setdefault("ChannelAccessToken", "test")
    os.environ.setdefault("GEMINI_API_KEY", "test")
    os.environ.setdefault("FIREBASE_URL", "https://test.firebaseio.com")
    os.environ.setdefault("JWT_SECRET", "test-secret")
    os.environ.setdefault("LIFF_CHANNEL_ID", "test-channel")

    with patch("firebase_admin.initialize_app"), \
         patch("firebase_admin.credentials.ApplicationDefault"), \
         patch("google.generativeai.configure"):
        from app.main import app
        return TestClient(app)


def test_auth_token_success(client):
    with patch("app.api.liff.auth_service") as mock_auth, \
         patch("app.api.liff.org_repo") as mock_org:
        mock_auth.verify_line_token = AsyncMock(return_value="U123456")
        mock_auth.issue_jwt.return_value = "eyJ.fake.jwt"
        mock_org.get_user_org_id.return_value = "org_abc"
        mock_org.get_user_role.return_value = "admin"

        resp = client.post("/api/auth/token", json={"id_token": "line-token"})

    assert resp.status_code == 200
    data = resp.json()
    assert data["access_token"] == "eyJ.fake.jwt"
    assert data["expires_in"] == 3600


def test_auth_token_invalid_line_token(client):
    from app.services.auth_service import AuthError
    with patch("app.api.liff.auth_service") as mock_auth:
        mock_auth.verify_line_token = AsyncMock(side_effect=AuthError("bad token"))

        resp = client.post("/api/auth/token", json={"id_token": "bad-token"})

    assert resp.status_code == 401
    assert resp.json()["error"] == "invalid_token"


def test_auth_token_user_not_in_org(client):
    with patch("app.api.liff.auth_service") as mock_auth, \
         patch("app.api.liff.org_repo") as mock_org:
        mock_auth.verify_line_token = AsyncMock(return_value="U999")
        mock_org.get_user_org_id.return_value = None

        resp = client.post("/api/auth/token", json={"id_token": "line-token"})

    assert resp.status_code == 403
    assert resp.json()["error"] == "no_org"
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pytest tests/test_liff_api.py -v
```

Expected: FAIL — `ImportError` or 404

- [ ] **Step 3: Create liff.py with auth endpoint**

Create `app/api/liff.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from .. import config
from ..services.auth_service import AuthService, AuthError
from ..models.org import UserContext
from ..repositories.org_repo import OrgRepo

router = APIRouter(prefix="/api")
security = HTTPBearer()

# Module-level singletons (injected in tests via patch)
auth_service = AuthService(
    jwt_secret=config.JWT_SECRET,
    liff_channel_id=config.LIFF_CHANNEL_ID,
)
org_repo = OrgRepo()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserContext:
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
```

- [ ] **Step 4: Register liff router in main.py**

In `app/main.py`, add import and `app.include_router`:

```python
from .api.liff import router as liff_router
# ... after existing include_router calls:
app.include_router(liff_router)
```

The full `app/main.py` after modification:

```python
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
from .api.liff import router as liff_router

logger = logging.getLogger(__name__)

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


@app.on_event("startup")
async def on_startup():
    try:
        await init_rich_menu()
    except Exception as e:
        logger.warning("Rich Menu initialization failed: %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    await close_session()
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
pytest tests/test_liff_api.py -v
```

Expected: 3 passed

- [ ] **Step 6: Run full test suite to confirm no regressions**

```bash
pytest tests/ -q --tb=short
```

Expected: same pass count as before + 3 new passes

- [ ] **Step 7: Commit**

```bash
git add app/api/liff.py app/main.py tests/test_liff_api.py
git commit -m "feat: add LIFF auth endpoint POST /api/auth/token with JWT issuance"
```

---

## Task 4: Cards Endpoints

**Files:**
- Modify: `app/api/liff.py` (add card endpoints)
- Modify: `tests/test_liff_api.py` (add card endpoint tests)

- [ ] **Step 1: Write failing tests**

Append to `tests/test_liff_api.py`:

```python
# ---- Cards ----

def make_card(card_id="card1", added_by="U123456"):
    from app.models.card import Card
    return Card(
        id=card_id,
        name="王小明",
        title="業務經理",
        company="測試公司",
        address="台北市",
        phone="02-1234-5678",
        mobile="0912-345-678",
        email="wang@test.com",
        line_id="wang_line",
        memo="備注",
        tags=["VIP"],
        added_by=added_by,
        created_at="2026-04-01T00:00:00",
    )


def jwt_header(client, user_id="U123456", org_id="org_abc", role="admin"):
    """Helper: get a real JWT token for test requests."""
    from app.services.auth_service import AuthService
    svc = AuthService(jwt_secret="test-secret", liff_channel_id="test-channel")
    token = svc.issue_jwt(user_id, org_id, role)
    return {"Authorization": f"Bearer {token}"}


def test_list_cards_returns_list(client):
    with patch("app.api.liff.card_service") as mock_svc:
        mock_svc.list_cards.return_value = [make_card()]
        resp = client.get("/api/v1/cards", headers=jwt_header(client))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == "card1"
    assert data[0]["name"] == "王小明"


def test_list_cards_with_search_param(client):
    with patch("app.api.liff.card_service") as mock_svc:
        mock_svc.list_cards.return_value = []
        resp = client.get("/api/v1/cards?search=王&tag=VIP", headers=jwt_header(client))
    assert resp.status_code == 200
    mock_svc.list_cards.assert_called_once()
    call_kwargs = mock_svc.list_cards.call_args
    assert call_kwargs.kwargs.get("search") == "王" or call_kwargs.args[2] == "王"


def test_get_card_found(client):
    with patch("app.api.liff.card_service") as mock_svc:
        mock_svc.get_card.return_value = make_card("card1")
        resp = client.get("/api/v1/cards/card1", headers=jwt_header(client))
    assert resp.status_code == 200
    assert resp.json()["id"] == "card1"


def test_get_card_not_found(client):
    with patch("app.api.liff.card_service") as mock_svc:
        mock_svc.get_card.return_value = None
        resp = client.get("/api/v1/cards/missing", headers=jwt_header(client))
    assert resp.status_code == 404


def test_update_card_success(client):
    with patch("app.api.liff.card_service") as mock_svc:
        mock_svc.update_card.return_value = True
        resp = client.put(
            "/api/v1/cards/card1",
            json={"name": "新名字", "memo": "更新備注"},
            headers=jwt_header(client),
        )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True


def test_update_card_permission_denied(client):
    from app.services.card_service import PermissionError as CardPermError
    with patch("app.api.liff.card_service") as mock_svc:
        mock_svc.update_card.side_effect = CardPermError("no access")
        resp = client.put(
            "/api/v1/cards/card1",
            json={"name": "x"},
            headers=jwt_header(client, role="member"),
        )
    assert resp.status_code == 403


def test_delete_card_success(client):
    with patch("app.api.liff.card_service") as mock_svc:
        mock_svc.delete_card.return_value = True
        resp = client.delete("/api/v1/cards/card1", headers=jwt_header(client))
    assert resp.status_code == 200
    assert resp.json()["ok"] is True


def test_cards_require_auth(client):
    resp = client.get("/api/v1/cards")
    assert resp.status_code == 403  # FastAPI HTTPBearer returns 403 when no header
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pytest tests/test_liff_api.py::test_list_cards_returns_list -v
```

Expected: FAIL — 404 (endpoint not yet defined)

- [ ] **Step 3: Add card endpoints to liff.py**

In `app/api/liff.py`, add imports and card router section after the auth endpoint:

```python
# Add to imports at top of file:
from typing import Optional, List
from ..services.card_service import CardService, PermissionError as CardPermError, NotFoundError
from ..repositories.card_repo import CardRepo
from ..models.card import CardUpdate

# Add after org_repo singleton:
_card_repo = CardRepo()
card_service = CardService(_card_repo, org_repo)


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
```

- [ ] **Step 4: Run card tests**

```bash
pytest tests/test_liff_api.py -k "card" -v
```

Expected: 8 passed

- [ ] **Step 5: Commit**

```bash
git add app/api/liff.py tests/test_liff_api.py
git commit -m "feat: add LIFF card endpoints GET/PUT/DELETE /api/v1/cards"
```

---

## Task 5: Tags Endpoints

**Files:**
- Modify: `app/api/liff.py` (add tag endpoints)
- Modify: `tests/test_liff_api.py` (add tag tests)

- [ ] **Step 1: Write failing tests**

Append to `tests/test_liff_api.py`:

```python
# ---- Tags ----

def test_list_tags(client):
    with patch("app.api.liff.tag_service") as mock_svc:
        mock_svc.list_tags.return_value = ["VIP", "潛力客戶"]
        resp = client.get("/api/v1/tags", headers=jwt_header(client))
    assert resp.status_code == 200
    assert resp.json() == ["VIP", "潛力客戶"]


def test_add_tag(client):
    with patch("app.api.liff.tag_service") as mock_svc:
        mock_svc.add_tag.return_value = True
        resp = client.post(
            "/api/v1/tags",
            json={"name": "新標籤"},
            headers=jwt_header(client),
        )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True


def test_set_card_tags(client):
    with patch("app.api.liff.tag_service") as mock_svc:
        mock_svc.set_card_tags.return_value = True
        resp = client.post(
            "/api/v1/cards/card1/tags",
            json={"tag_names": ["VIP", "潛力客戶"]},
            headers=jwt_header(client),
        )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pytest tests/test_liff_api.py::test_list_tags -v
```

Expected: FAIL — 404

- [ ] **Step 3: Add tag endpoints to liff.py**

In `app/api/liff.py`, add imports and tag section:

```python
# Add to imports:
from ..services.tag_service import TagService

# Add after card_service singleton:
tag_service = TagService(org_repo, _card_repo)


# ---- Tags ----

class TagCreate(BaseModel):
    name: str

class CardTagsUpdate(BaseModel):
    tag_names: List[str]


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
```

- [ ] **Step 4: Run tag tests**

```bash
pytest tests/test_liff_api.py -k "tag" -v
```

Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add app/api/liff.py tests/test_liff_api.py
git commit -m "feat: add LIFF tag endpoints GET/POST /api/v1/tags and POST /api/v1/cards/{id}/tags"
```

---

## Task 6: Org Endpoints

**Files:**
- Modify: `app/api/liff.py` (add org endpoints)
- Modify: `tests/test_liff_api.py` (add org tests)

- [ ] **Step 1: Write failing tests**

Append to `tests/test_liff_api.py`:

```python
# ---- Org ----

def make_org():
    from app.models.org import Org, Member
    return Org(
        id="org_abc",
        name="測試團隊",
        created_by="U123456",
        plan_type=None,
        trial_ends_at=None,
        members=[
            Member(user_id="U123456", role="admin", joined_at="2026-01-01T00:00:00"),
            Member(user_id="U999", role="member", joined_at="2026-02-01T00:00:00"),
        ],
    )


def test_get_org(client):
    with patch("app.api.liff.org_repo") as mock_repo:
        mock_repo.get_user_org_id.return_value = "org_abc"
        mock_repo.get_user_role.return_value = "admin"
        mock_repo.get.return_value = make_org()
        resp = client.get("/api/v1/org", headers=jwt_header(client))
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "org_abc"
    assert data["name"] == "測試團隊"


def test_list_org_members(client):
    with patch("app.api.liff.org_repo") as mock_repo:
        mock_repo.get_user_org_id.return_value = "org_abc"
        mock_repo.get_user_role.return_value = "admin"
        org = make_org()
        mock_repo.get.return_value = org
        resp = client.get("/api/v1/org/members", headers=jwt_header(client))
    assert resp.status_code == 200
    members = resp.json()
    assert len(members) == 2
    assert members[0]["user_id"] == "U123456"


def test_update_member_role_admin_only(client):
    with patch("app.api.liff.org_service") as mock_svc:
        mock_svc.update_member_role.return_value = True
        resp = client.patch(
            "/api/v1/org/members/U999",
            json={"role": "admin"},
            headers=jwt_header(client, role="admin"),
        )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True


def test_update_member_role_non_admin_forbidden(client):
    from app.services.org_service import PermissionError as OrgPermError
    with patch("app.api.liff.org_service") as mock_svc:
        mock_svc.update_member_role.side_effect = OrgPermError("not admin")
        resp = client.patch(
            "/api/v1/org/members/U999",
            json={"role": "admin"},
            headers=jwt_header(client, role="member"),
        )
    assert resp.status_code == 403


def test_generate_invite_code(client):
    with patch("app.api.liff.org_service") as mock_svc:
        mock_svc.generate_invite_code.return_value = "ABC123"
        resp = client.post("/api/v1/org/invite", headers=jwt_header(client))
    assert resp.status_code == 200
    assert resp.json()["code"] == "ABC123"
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pytest tests/test_liff_api.py::test_get_org -v
```

Expected: FAIL — 404

- [ ] **Step 3: Add org endpoints to liff.py**

In `app/api/liff.py`, add imports and org section:

```python
# Add to imports:
from ..services.org_service import OrgService
from ..services.org_service import PermissionError as OrgPermError

# Add after tag_service singleton:
org_service = OrgService(org_repo)


# ---- Org ----

class RoleUpdate(BaseModel):
    role: str


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
    return [m.model_dump() for m in org.members]


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


@router.post("/v1/org/invite")
async def generate_invite(user: UserContext = Depends(get_current_user)):
    code = org_service.generate_invite_code(user.org_id, user.user_id)
    return {"code": code}
```

- [ ] **Step 4: Run org tests**

```bash
pytest tests/test_liff_api.py -k "org" -v
```

Expected: 5 passed

- [ ] **Step 5: Run full test suite**

```bash
pytest tests/ -q --tb=short
```

Expected: all new tests pass, pre-existing failures unchanged

- [ ] **Step 6: Commit**

```bash
git add app/api/liff.py tests/test_liff_api.py
git commit -m "feat: add LIFF org endpoints GET /api/v1/org, members, invite"
```

---

## Task 7: Smoke Test with curl

**Files:**
- No code changes — manual verification

- [ ] **Step 1: Start local server**

```bash
cd .worktrees/liff-refactor
export $(cat ../../.env.test | grep -v '^#' | xargs)
export JWT_SECRET=local-dev-secret
export LIFF_CHANNEL_ID=placeholder
uvicorn app.main:app --host=0.0.0.0 --port=8080
```

Expected: Server starts, `Application startup complete.`

- [ ] **Step 2: Health check**

```bash
curl http://localhost:8080/
```

Expected: `{"status": "ok"}` or similar

- [ ] **Step 3: Verify auth endpoint reachable**

```bash
curl -X POST http://localhost:8080/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"id_token": "fake"}' 
```

Expected: `{"error": "invalid_token"}` with HTTP 401 (LINE verification will fail with fake token — this confirms the endpoint is wired up correctly)

- [ ] **Step 4: Verify protected endpoint requires auth**

```bash
curl http://localhost:8080/api/v1/cards
```

Expected: HTTP 403 (no Authorization header)

- [ ] **Step 5: Commit smoke test result note + final run**

```bash
pytest tests/ -q
git add -A
git commit -m "feat: Phase E complete — LIFF API endpoints with JWT auth"
```

---

## Self-Review

### Spec coverage

From the architecture plan API Contract:
- `POST /api/auth/token` ✅ Task 3
- `GET /api/v1/cards` ✅ Task 4
- `GET /api/v1/cards/{card_id}` ✅ Task 4
- `PUT /api/v1/cards/{card_id}` ✅ Task 4
- `DELETE /api/v1/cards/{card_id}` ✅ Task 4
- `GET /api/v1/tags` ✅ Task 5
- `POST /api/v1/tags` ✅ Task 5
- `POST /api/v1/cards/{card_id}/tags` ✅ Task 5
- `GET /api/v1/org` ✅ Task 6
- `GET /api/v1/org/members` ✅ Task 6
- `PATCH /api/v1/org/members/{user_id}` ✅ Task 6
- `POST /api/v1/org/invite` ✅ Task 6
- `POST /api/v1/export/csv` — ❌ Not included (deferred to Phase F, CSV export already works via LINE Bot)
- `GET /api/v1/export/csv/{job_id}` — ❌ Not included (same reason)

CSV export endpoints deferred: existing LINE Bot CSV export is functional, adding async job tracking for LIFF is a separate feature with significant complexity (job storage, polling). Phase F scope.

### Placeholder scan

No TBD/TODO/placeholder patterns found.

### Type consistency

- `CardUpdate` imported from `app.models.card` — consistent with Task 4 and service layer
- `UserContext` returned by `get_current_user` — `user_id`, `org_id`, `role`, `is_admin` consistent throughout
- `OrgPermError` and `CardPermError` imported separately to avoid name collision — consistent
- `tag_service.set_card_tags(org_id, card_id, tag_names, user)` — matches `TagService.set_card_tags` signature in `app/services/tag_service.py`
