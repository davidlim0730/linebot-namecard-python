# LIFF 後端重構 Implementation Plan (Phase A-D)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將現有 `line_handlers.py` / `firebase_utils.py` 重構為 Modular Monolith 架構（models → repositories → services → handlers），為 LIFF API 和 SaaS 擴展打好基礎，全程不中斷現有 LINE Bot 功能。

**Architecture:** 依賴方向單向：`handlers → services → repositories → Firebase SDK`。`firebase_utils.py` 暫時保留作為過渡橋接，Phase C 完成後逐步廢棄。

**Tech Stack:** FastAPI, Python 3.11+, firebase-admin, pydantic v2, pytest, pytest-asyncio

---

## File Map

### 新增檔案

| 檔案 | 職責 |
|------|------|
| `app/models/__init__.py` | package |
| `app/models/card.py` | Card / CardUpdate Pydantic models |
| `app/models/org.py` | Org / Member / UserContext models |
| `app/repositories/__init__.py` | package |
| `app/repositories/card_repo.py` | Firebase 名片讀寫，回傳 `Card` |
| `app/repositories/org_repo.py` | Firebase 組織讀寫，回傳 `Org` / `Member` |
| `app/repositories/state_repo.py` | user_states in-memory 存取 |
| `app/services/__init__.py` | package |
| `app/services/card_service.py` | 名片業務邏輯（CRUD、權限、去重） |
| `app/services/org_service.py` | 組織業務邏輯（成員、邀請碼、試用） |
| `app/services/tag_service.py` | 標籤業務邏輯 |
| `app/handlers/__init__.py` | package |
| `app/handlers/text_handler.py` | 文字事件處理（薄層） |
| `app/handlers/image_handler.py` | 圖片事件處理（薄層） |
| `app/handlers/postback_handler.py` | Postback 事件處理（薄層） |
| `app/api/__init__.py` | package |
| `app/api/webhook.py` | LINE webhook 路由 |
| `app/api/internal.py` | Cloud Tasks callback 路由 |

### 修改檔案

| 檔案 | 變更 |
|------|------|
| `app/main.py` | 改用 router 掛載，移除直接 handler import |
| `app/firebase_utils.py` | 保留不動（Phase B-C 逐步替換呼叫方） |
| `tests/conftest.py` | 新增 `CardRepo` / `OrgRepo` mock fixtures |

---

## Task 1: Pydantic Models

**Files:**
- Create: `app/models/__init__.py`
- Create: `app/models/card.py`
- Create: `app/models/org.py`
- Test: `tests/test_models.py`

- [ ] **Step 1: 建立 models package**

```bash
mkdir -p app/models
touch app/models/__init__.py
```

- [ ] **Step 2: 寫 card model 測試**

建立 `tests/test_models.py`：

```python
from app.models.card import Card, CardUpdate


def test_card_minimal():
    card = Card(
        id="card_001",
        added_by="U123",
        created_at="2026-04-13T00:00:00"
    )
    assert card.id == "card_001"
    assert card.tags == []
    assert card.name is None


def test_card_with_all_fields():
    card = Card(
        id="card_001",
        name="王小明",
        title="業務經理",
        company="ABC 科技",
        phone="02-1234-5678",
        mobile="0912-345-678",
        email="wang@abc.com",
        line_id="wangxm",
        address="台北市信義區",
        memo="重要客戶",
        tags=["VIP", "客戶"],
        added_by="U123",
        created_at="2026-04-13T00:00:00"
    )
    assert card.tags == ["VIP", "客戶"]


def test_card_update_partial():
    update = CardUpdate(name="新姓名")
    assert update.name == "新姓名"
    assert update.title is None


def test_org_member_role():
    from app.models.org import Member
    member = Member(user_id="U123", role="admin", joined_at="2026-04-13T00:00:00")
    assert member.role == "admin"


def test_user_context():
    from app.models.org import UserContext
    ctx = UserContext(user_id="U123", org_id="org_abc", role="member")
    assert ctx.is_admin is False


def test_user_context_admin():
    from app.models.org import UserContext
    ctx = UserContext(user_id="U123", org_id="org_abc", role="admin")
    assert ctx.is_admin is True
```

- [ ] **Step 3: 執行測試，確認失敗**

```bash
pytest tests/test_models.py -v
```

預期：`ModuleNotFoundError: No module named 'app.models.card'`

- [ ] **Step 4: 實作 `app/models/card.py`**

```python
from pydantic import BaseModel
from typing import Optional, List


class Card(BaseModel):
    id: str
    name: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    line_id: Optional[str] = None
    memo: Optional[str] = None
    tags: List[str] = []
    added_by: str
    created_at: str


class CardUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    line_id: Optional[str] = None
    memo: Optional[str] = None
```

- [ ] **Step 5: 實作 `app/models/org.py`**

```python
from pydantic import BaseModel, computed_field
from typing import Optional, List


class Member(BaseModel):
    user_id: str
    role: str  # "admin" | "member"
    joined_at: str
    display_name: Optional[str] = None


class Org(BaseModel):
    id: str
    name: str
    created_by: str
    plan_type: Optional[str] = None
    trial_ends_at: Optional[str] = None
    members: List[Member] = []


class UserContext(BaseModel):
    user_id: str
    org_id: str
    role: str  # "admin" | "member"

    @computed_field
    @property
    def is_admin(self) -> bool:
        return self.role == "admin"
```

- [ ] **Step 6: 執行測試，確認通過**

```bash
pytest tests/test_models.py -v
```

預期：6 tests PASSED

- [ ] **Step 7: Commit**

```bash
git add app/models/ tests/test_models.py
git commit -m "feat: add Card, CardUpdate, Org, Member, UserContext Pydantic models"
```

---

## Task 2: CardRepo

**Files:**
- Create: `app/repositories/__init__.py`
- Create: `app/repositories/card_repo.py`
- Test: `tests/test_card_repo.py`

- [ ] **Step 1: 建立 repositories package**

```bash
mkdir -p app/repositories
touch app/repositories/__init__.py
touch app/repositories/state_repo.py
```

在 `app/repositories/state_repo.py` 寫入：
```python
# In-memory state store（未來可換成 Redis）
_user_states: dict = {}


def get(user_id: str) -> dict:
    return _user_states.get(user_id, {})


def set(user_id: str, state: dict) -> None:
    _user_states[user_id] = state


def delete(user_id: str) -> None:
    _user_states.pop(user_id, None)


def exists(user_id: str) -> bool:
    return user_id in _user_states
```

- [ ] **Step 2: 寫 CardRepo 測試**

建立 `tests/test_card_repo.py`：

```python
from unittest.mock import MagicMock, patch


def test_card_repo_get_returns_card():
    mock_data = {
        "name": "王小明",
        "title": "業務",
        "company": "ABC",
        "phone": "02-1234",
        "mobile": "0912",
        "email": "wang@abc.com",
        "line_id": "wangxm",
        "address": "台北",
        "memo": "備註",
        "added_by": "U123",
        "created_at": "2026-04-13T00:00:00",
        "role_tags": ["VIP"],
    }
    with patch("app.repositories.card_repo.db") as mock_db:
        mock_db.reference.return_value.get.return_value = mock_data
        from app.repositories.card_repo import CardRepo
        repo = CardRepo()
        card = repo.get("org_abc", "card_001")
        assert card is not None
        assert card.id == "card_001"
        assert card.name == "王小明"
        assert card.tags == ["VIP"]


def test_card_repo_get_returns_none_when_not_found():
    with patch("app.repositories.card_repo.db") as mock_db:
        mock_db.reference.return_value.get.return_value = None
        from app.repositories.card_repo import CardRepo
        repo = CardRepo()
        card = repo.get("org_abc", "nonexistent")
        assert card is None


def test_card_repo_list_all():
    mock_data = {
        "card_001": {
            "name": "王小明", "added_by": "U1",
            "created_at": "2026-04-13T00:00:00",
            "role_tags": ["VIP"]
        },
        "card_002": {
            "name": "李大華", "added_by": "U2",
            "created_at": "2026-04-13T00:00:00",
        },
    }
    with patch("app.repositories.card_repo.db") as mock_db:
        mock_db.reference.return_value.get.return_value = mock_data
        from app.repositories.card_repo import CardRepo
        repo = CardRepo()
        cards = repo.list_all("org_abc")
        assert len(cards) == 2
        assert cards["card_001"].tags == ["VIP"]
        assert cards["card_002"].tags == []


def test_card_repo_update():
    with patch("app.repositories.card_repo.db") as mock_db:
        from app.repositories.card_repo import CardRepo
        repo = CardRepo()
        result = repo.update("org_abc", "card_001", {"name": "新名字"})
        assert result is True
        mock_db.reference.return_value.update.assert_called_once_with({"name": "新名字"})


def test_card_repo_delete():
    with patch("app.repositories.card_repo.db") as mock_db:
        from app.repositories.card_repo import CardRepo
        repo = CardRepo()
        result = repo.delete("org_abc", "card_001")
        assert result is True
        mock_db.reference.return_value.delete.assert_called_once()
```

- [ ] **Step 3: 執行測試，確認失敗**

```bash
pytest tests/test_card_repo.py -v
```

預期：`ModuleNotFoundError: No module named 'app.repositories.card_repo'`

- [ ] **Step 4: 實作 `app/repositories/card_repo.py`**

```python
from firebase_admin import db
from .. import config
from ..models.card import Card, CardUpdate
from typing import Optional, Dict


class CardRepo:

    def get(self, org_id: str, card_id: str) -> Optional[Card]:
        ref = db.reference(f"{config.NAMECARD_PATH}/{org_id}/{card_id}")
        data = ref.get()
        if not data:
            return None
        return self._to_card(card_id, data)

    def list_all(self, org_id: str) -> Dict[str, Card]:
        ref = db.reference(f"{config.NAMECARD_PATH}/{org_id}")
        data = ref.get() or {}
        return {
            card_id: self._to_card(card_id, card_data)
            for card_id, card_data in data.items()
            if isinstance(card_data, dict)
        }

    def save(self, org_id: str, card_id: str, card_data: dict) -> bool:
        try:
            db.reference(f"{config.NAMECARD_PATH}/{org_id}/{card_id}").set(card_data)
            return True
        except Exception:
            return False

    def update(self, org_id: str, card_id: str, fields: dict) -> bool:
        try:
            db.reference(f"{config.NAMECARD_PATH}/{org_id}/{card_id}").update(fields)
            return True
        except Exception:
            return False

    def delete(self, org_id: str, card_id: str) -> bool:
        try:
            db.reference(f"{config.NAMECARD_PATH}/{org_id}/{card_id}").delete()
            return True
        except Exception:
            return False

    def check_exists_by_email(self, org_id: str, email: str) -> Optional[str]:
        """以 email 查重，回傳既有 card_id 或 None"""
        cards = self.list_all(org_id)
        for card_id, card in cards.items():
            if card.email and card.email.lower() == email.lower():
                return card_id
        return None

    def set_tags(self, org_id: str, card_id: str, tags: list) -> bool:
        return self.update(org_id, card_id, {"role_tags": tags})

    def _to_card(self, card_id: str, data: dict) -> Card:
        d = dict(data)
        tags = d.pop("role_tags", None) or []
        # 過濾掉 Card model 不認識的欄位
        allowed = {
            "name", "title", "company", "address", "phone",
            "mobile", "email", "line_id", "memo", "added_by", "created_at"
        }
        filtered = {k: v for k, v in d.items() if k in allowed}
        return Card(id=card_id, tags=tags, **filtered)
```

- [ ] **Step 5: 執行測試，確認通過**

```bash
pytest tests/test_card_repo.py -v
```

預期：5 tests PASSED

- [ ] **Step 6: Commit**

```bash
git add app/repositories/ tests/test_card_repo.py
git commit -m "feat: add CardRepo and StateRepo with tests"
```

---

## Task 3: OrgRepo

**Files:**
- Create: `app/repositories/org_repo.py`
- Test: `tests/test_org_repo.py`

- [ ] **Step 1: 寫 OrgRepo 測試**

建立 `tests/test_org_repo.py`：

```python
from unittest.mock import MagicMock, patch


def test_org_repo_get_user_org_id():
    with patch("app.repositories.org_repo.db") as mock_db:
        mock_db.reference.return_value.get.return_value = "org_abc"
        from app.repositories.org_repo import OrgRepo
        repo = OrgRepo()
        result = repo.get_user_org_id("U123")
        assert result == "org_abc"
        mock_db.reference.assert_called_with("user_org_map/U123")


def test_org_repo_get_user_org_id_returns_none():
    with patch("app.repositories.org_repo.db") as mock_db:
        mock_db.reference.return_value.get.return_value = None
        from app.repositories.org_repo import OrgRepo
        repo = OrgRepo()
        assert repo.get_user_org_id("U_unknown") is None


def test_org_repo_get_user_role():
    with patch("app.repositories.org_repo.db") as mock_db:
        mock_db.reference.return_value.get.return_value = "admin"
        from app.repositories.org_repo import OrgRepo
        repo = OrgRepo()
        role = repo.get_user_role("org_abc", "U123")
        assert role == "admin"


def test_org_repo_get_returns_org():
    mock_data = {
        "name": "測試團隊",
        "created_by": "U123",
        "plan_type": "trial",
        "members": {"U123": {"role": "admin", "joined_at": "2026-04-13T00:00:00"}}
    }
    with patch("app.repositories.org_repo.db") as mock_db:
        mock_db.reference.return_value.get.return_value = mock_data
        from app.repositories.org_repo import OrgRepo
        repo = OrgRepo()
        org = repo.get("org_abc")
        assert org is not None
        assert org.name == "測試團隊"
        assert len(org.members) == 1
        assert org.members[0].role == "admin"


def test_org_repo_get_returns_none():
    with patch("app.repositories.org_repo.db") as mock_db:
        mock_db.reference.return_value.get.return_value = None
        from app.repositories.org_repo import OrgRepo
        repo = OrgRepo()
        assert repo.get("org_nonexistent") is None
```

- [ ] **Step 2: 執行測試，確認失敗**

```bash
pytest tests/test_org_repo.py -v
```

預期：`ModuleNotFoundError: No module named 'app.repositories.org_repo'`

- [ ] **Step 3: 實作 `app/repositories/org_repo.py`**

```python
import uuid
from datetime import datetime, timedelta, timezone
from firebase_admin import db
from ..models.org import Org, Member
from typing import Optional


class OrgRepo:

    def get_user_org_id(self, user_id: str) -> Optional[str]:
        try:
            return db.reference(f"user_org_map/{user_id}").get()
        except Exception:
            return None

    def set_user_org_id(self, user_id: str, org_id: str) -> None:
        db.reference(f"user_org_map/{user_id}").set(org_id)

    def get(self, org_id: str) -> Optional[Org]:
        try:
            data = db.reference(f"organizations/{org_id}").get()
            if not data:
                return None
            return self._to_org(org_id, data)
        except Exception:
            return None

    def get_user_role(self, org_id: str, user_id: str) -> Optional[str]:
        try:
            return db.reference(
                f"organizations/{org_id}/members/{user_id}/role"
            ).get()
        except Exception:
            return None

    def create(self, user_id: str, org_name: str) -> Optional[str]:
        org_id = f"org_{uuid.uuid4().hex[:8]}"
        now = datetime.now().isoformat()
        trial_ends_at = (
            datetime.now(timezone.utc) + timedelta(days=7)
        ).strftime('%Y-%m-%dT%H:%M:%SZ')
        try:
            db.reference(f"organizations/{org_id}").set({
                "name": org_name,
                "created_by": user_id,
                "created_at": now,
                "plan_type": "trial",
                "trial_ends_at": trial_ends_at,
                "usage": {"scan_count": 0},
                "members": {
                    user_id: {"role": "admin", "joined_at": now}
                }
            })
            db.reference(f"user_org_map/{user_id}").set(org_id)
            return org_id
        except Exception:
            return None

    def update_name(self, org_id: str, name: str) -> bool:
        try:
            db.reference(f"organizations/{org_id}/name").set(name)
            return True
        except Exception:
            return False

    def add_member(self, org_id: str, user_id: str, role: str = "member") -> bool:
        try:
            now = datetime.now().isoformat()
            db.reference(f"organizations/{org_id}/members/{user_id}").set({
                "role": role, "joined_at": now
            })
            db.reference(f"user_org_map/{user_id}").set(org_id)
            return True
        except Exception:
            return False

    def remove_member(self, org_id: str, user_id: str) -> bool:
        try:
            db.reference(f"organizations/{org_id}/members/{user_id}").delete()
            db.reference(f"user_org_map/{user_id}").delete()
            return True
        except Exception:
            return False

    def update_member_role(self, org_id: str, user_id: str, role: str) -> bool:
        try:
            db.reference(
                f"organizations/{org_id}/members/{user_id}/role"
            ).set(role)
            return True
        except Exception:
            return False

    def get_invite_code(self, code: str) -> Optional[dict]:
        try:
            return db.reference(f"invite_codes/{code}").get()
        except Exception:
            return None

    def create_invite_code(self, code: str, org_id: str, created_by: str,
                           expires_at: str) -> bool:
        try:
            db.reference(f"invite_codes/{code}").set({
                "org_id": org_id,
                "created_by": created_by,
                "created_at": datetime.now().isoformat(),
                "expires_at": expires_at,
            })
            return True
        except Exception:
            return False

    def increment_scan_count(self, org_id: str) -> int:
        try:
            ref = db.reference(f"organizations/{org_id}/usage/scan_count")
            return ref.transaction(lambda current: (current or 0) + 1)
        except Exception:
            return 0

    def get_all_role_tags(self, org_id: str) -> list:
        try:
            data = db.reference(f"organizations/{org_id}/tags/roles").get()
            return list(data.values()) if data else []
        except Exception:
            return []

    def add_role_tag(self, org_id: str, tag_name: str) -> bool:
        try:
            existing = self.get_all_role_tags(org_id)
            if tag_name in existing:
                return False
            db.reference(f"organizations/{org_id}/tags/roles").push(tag_name)
            return True
        except Exception:
            return False

    def delete_role_tag(self, org_id: str, tag_name: str) -> bool:
        try:
            ref = db.reference(f"organizations/{org_id}/tags/roles")
            data = ref.get()
            if not data:
                return False
            for key, value in data.items():
                if value == tag_name:
                    ref.child(key).delete()
                    return True
            return False
        except Exception:
            return False

    def _to_org(self, org_id: str, data: dict) -> Org:
        members_data = data.get("members") or {}
        members = [
            Member(user_id=uid, **m)
            for uid, m in members_data.items()
            if isinstance(m, dict) and "role" in m
        ]
        return Org(
            id=org_id,
            name=data.get("name", ""),
            created_by=data.get("created_by", ""),
            plan_type=data.get("plan_type"),
            trial_ends_at=data.get("trial_ends_at"),
            members=members,
        )
```

- [ ] **Step 4: 執行測試，確認通過**

```bash
pytest tests/test_org_repo.py -v
```

預期：5 tests PASSED

- [ ] **Step 5: Commit**

```bash
git add app/repositories/org_repo.py tests/test_org_repo.py
git commit -m "feat: add OrgRepo with tests"
```

---

## Task 4: CardService

**Files:**
- Create: `app/services/__init__.py`
- Create: `app/services/card_service.py`
- Test: `tests/test_card_service.py`

- [ ] **Step 1: 建立 services package**

```bash
mkdir -p app/services
touch app/services/__init__.py
```

- [ ] **Step 2: 寫 CardService 測試**

建立 `tests/test_card_service.py`：

```python
from unittest.mock import MagicMock
from app.models.card import Card, CardUpdate
from app.models.org import UserContext


def _make_card(card_id="card_001", added_by="U123", email="test@test.com"):
    return Card(
        id=card_id, name="王小明", email=email,
        added_by=added_by, created_at="2026-04-13T00:00:00"
    )


def _admin_ctx():
    return UserContext(user_id="U123", org_id="org_abc", role="admin")


def _member_ctx(user_id="U456"):
    return UserContext(user_id=user_id, org_id="org_abc", role="member")


def test_get_card_admin_can_access_any():
    mock_repo = MagicMock()
    mock_repo.get.return_value = _make_card(added_by="U999")

    from app.services.card_service import CardService
    svc = CardService(card_repo=mock_repo, org_repo=MagicMock())
    card = svc.get_card("org_abc", "card_001", _admin_ctx())
    assert card is not None


def test_get_card_member_can_only_access_own():
    mock_repo = MagicMock()
    mock_repo.get.return_value = _make_card(added_by="U999")

    from app.services.card_service import CardService
    svc = CardService(card_repo=mock_repo, org_repo=MagicMock())
    card = svc.get_card("org_abc", "card_001", _member_ctx("U456"))
    assert card is None


def test_get_card_member_can_access_own():
    mock_repo = MagicMock()
    mock_repo.get.return_value = _make_card(added_by="U456")

    from app.services.card_service import CardService
    svc = CardService(card_repo=mock_repo, org_repo=MagicMock())
    card = svc.get_card("org_abc", "card_001", _member_ctx("U456"))
    assert card is not None


def test_update_card_forbidden_for_member():
    mock_repo = MagicMock()
    mock_repo.get.return_value = _make_card(added_by="U999")

    from app.services.card_service import CardService, PermissionError
    svc = CardService(card_repo=mock_repo, org_repo=MagicMock())
    try:
        svc.update_card("org_abc", "card_001", CardUpdate(name="新名"), _member_ctx("U456"))
        assert False, "Should have raised PermissionError"
    except PermissionError:
        pass


def test_update_card_succeeds_for_owner():
    mock_repo = MagicMock()
    mock_repo.get.return_value = _make_card(added_by="U456")
    mock_repo.update.return_value = True

    from app.services.card_service import CardService
    svc = CardService(card_repo=mock_repo, org_repo=MagicMock())
    result = svc.update_card("org_abc", "card_001", CardUpdate(name="新名"), _member_ctx("U456"))
    assert result is True
    mock_repo.update.assert_called_once()


def test_check_duplicate_returns_existing_id():
    existing = _make_card(card_id="existing_001", email="dup@test.com")
    mock_repo = MagicMock()
    mock_repo.check_exists_by_email.return_value = "existing_001"

    from app.services.card_service import CardService
    svc = CardService(card_repo=mock_repo, org_repo=MagicMock())
    result = svc.check_duplicate("org_abc", "dup@test.com")
    assert result == "existing_001"
```

- [ ] **Step 3: 執行測試，確認失敗**

```bash
pytest tests/test_card_service.py -v
```

預期：`ModuleNotFoundError: No module named 'app.services.card_service'`

- [ ] **Step 4: 實作 `app/services/card_service.py`**

```python
from typing import Optional, Dict, List
from ..models.card import Card, CardUpdate
from ..models.org import UserContext
from ..repositories.card_repo import CardRepo
from ..repositories.org_repo import OrgRepo


class PermissionError(Exception):
    pass


class NotFoundError(Exception):
    pass


class CardService:

    def __init__(self, card_repo: CardRepo, org_repo: OrgRepo):
        self.card_repo = card_repo
        self.org_repo = org_repo

    def get_card(self, org_id: str, card_id: str,
                 user: UserContext) -> Optional[Card]:
        card = self.card_repo.get(org_id, card_id)
        if not card:
            return None
        if not self._can_access(card, user):
            return None
        return card

    def list_cards(self, org_id: str, user: UserContext,
                   search: str = None, tag: str = None) -> List[Card]:
        all_cards = self.card_repo.list_all(org_id)
        cards = [
            c for c in all_cards.values()
            if self._can_access(c, user)
        ]
        if search:
            q = search.lower()
            cards = [
                c for c in cards
                if q in (c.name or "").lower()
                or q in (c.company or "").lower()
                or q in (c.title or "").lower()
                or q in (c.email or "").lower()
            ]
        if tag:
            cards = [c for c in cards if tag in c.tags]
        return cards

    def update_card(self, org_id: str, card_id: str,
                    update: CardUpdate, user: UserContext) -> bool:
        card = self.card_repo.get(org_id, card_id)
        if not card:
            raise NotFoundError(card_id)
        if not self._can_access(card, user):
            raise PermissionError(f"User {user.user_id} cannot edit card {card_id}")
        fields = {k: v for k, v in update.model_dump().items() if v is not None}
        return self.card_repo.update(org_id, card_id, fields)

    def delete_card(self, org_id: str, card_id: str,
                    user: UserContext) -> bool:
        card = self.card_repo.get(org_id, card_id)
        if not card:
            raise NotFoundError(card_id)
        if not self._can_access(card, user):
            raise PermissionError(f"User {user.user_id} cannot delete card {card_id}")
        return self.card_repo.delete(org_id, card_id)

    def check_duplicate(self, org_id: str, email: str) -> Optional[str]:
        if not email or email == "N/A":
            return None
        return self.card_repo.check_exists_by_email(org_id, email)

    def set_card_tags(self, org_id: str, card_id: str,
                      tags: List[str], user: UserContext) -> bool:
        card = self.card_repo.get(org_id, card_id)
        if not card:
            raise NotFoundError(card_id)
        if not self._can_access(card, user):
            raise PermissionError(f"User {user.user_id} cannot tag card {card_id}")
        return self.card_repo.set_tags(org_id, card_id, tags)

    def _can_access(self, card: Card, user: UserContext) -> bool:
        if user.is_admin:
            return True
        return card.added_by == user.user_id
```

- [ ] **Step 5: 執行測試，確認通過**

```bash
pytest tests/test_card_service.py -v
```

預期：7 tests PASSED

- [ ] **Step 6: Commit**

```bash
git add app/services/ tests/test_card_service.py
git commit -m "feat: add CardService with permission checks and tests"
```

---

## Task 5: OrgService

**Files:**
- Create: `app/services/org_service.py`
- Create: `app/services/tag_service.py`
- Test: `tests/test_org_service.py`

- [ ] **Step 1: 寫 OrgService 測試**

建立 `tests/test_org_service.py`：

```python
from unittest.mock import MagicMock
from app.models.org import UserContext, Org, Member


def _admin_ctx():
    return UserContext(user_id="U123", org_id="org_abc", role="admin")


def _member_ctx():
    return UserContext(user_id="U456", org_id="org_abc", role="member")


def test_ensure_user_org_creates_new():
    mock_repo = MagicMock()
    mock_repo.get_user_org_id.return_value = None
    mock_repo.create.return_value = "org_new"

    from app.services.org_service import OrgService
    svc = OrgService(org_repo=mock_repo)
    org_id, is_new = svc.ensure_user_org("U_new")
    assert org_id == "org_new"
    assert is_new is True


def test_ensure_user_org_existing():
    mock_repo = MagicMock()
    mock_repo.get_user_org_id.return_value = "org_abc"

    from app.services.org_service import OrgService
    svc = OrgService(org_repo=mock_repo)
    org_id, is_new = svc.ensure_user_org("U123")
    assert org_id == "org_abc"
    assert is_new is False


def test_join_org_with_valid_code():
    from datetime import datetime, timezone, timedelta
    future = (datetime.now(timezone.utc) + timedelta(days=1)).strftime(
        '%Y-%m-%dT%H:%M:%SZ'
    )
    mock_repo = MagicMock()
    mock_repo.get_invite_code.return_value = {
        "org_id": "org_target", "expires_at": future
    }
    mock_repo.add_member.return_value = True

    from app.services.org_service import OrgService
    svc = OrgService(org_repo=mock_repo)
    result = svc.join_org_with_code("U456", "ABC123")
    assert result == "org_target"


def test_join_org_with_expired_code():
    from datetime import datetime, timezone, timedelta
    past = (datetime.now(timezone.utc) - timedelta(days=1)).strftime(
        '%Y-%m-%dT%H:%M:%SZ'
    )
    mock_repo = MagicMock()
    mock_repo.get_invite_code.return_value = {
        "org_id": "org_target", "expires_at": past
    }

    from app.services.org_service import OrgService
    svc = OrgService(org_repo=mock_repo)
    result = svc.join_org_with_code("U456", "EXPIRED")
    assert result is None


def test_update_member_role_requires_admin():
    mock_repo = MagicMock()

    from app.services.org_service import OrgService, PermissionError
    svc = OrgService(org_repo=mock_repo)
    try:
        svc.update_member_role("org_abc", "U456", "admin", _member_ctx())
        assert False, "Should raise PermissionError"
    except PermissionError:
        pass
```

- [ ] **Step 2: 執行測試，確認失敗**

```bash
pytest tests/test_org_service.py -v
```

預期：`ModuleNotFoundError`

- [ ] **Step 3: 實作 `app/services/org_service.py`**

```python
import random
import string
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from ..models.org import Org, UserContext
from ..repositories.org_repo import OrgRepo


class PermissionError(Exception):
    pass


class OrgService:

    def __init__(self, org_repo: OrgRepo):
        self.org_repo = org_repo

    def ensure_user_org(self, user_id: str) -> Tuple[str, bool]:
        org_id = self.org_repo.get_user_org_id(user_id)
        if not org_id:
            short_id = user_id[-8:] if len(user_id) > 8 else user_id
            org_id = self.org_repo.create(user_id, f"{short_id}的團隊")
            return org_id, True
        return org_id, False

    def join_org_with_code(self, user_id: str, code: str) -> Optional[str]:
        invite = self.org_repo.get_invite_code(code)
        if not invite:
            return None
        expires_at = invite.get("expires_at", "")
        try:
            expires_dt = datetime.fromisoformat(
                expires_at.replace("Z", "+00:00")
            )
            if datetime.now(timezone.utc) > expires_dt:
                return None
        except Exception:
            return None
        org_id = invite["org_id"]
        self.org_repo.add_member(org_id, user_id)
        return org_id

    def generate_invite_code(self, org_id: str, created_by: str) -> str:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        expires_at = (
            datetime.now(timezone.utc) + timedelta(days=7)
        ).strftime('%Y-%m-%dT%H:%M:%SZ')
        self.org_repo.create_invite_code(code, org_id, created_by, expires_at)
        return code

    def update_member_role(self, org_id: str, target_user_id: str,
                           new_role: str, requester: UserContext) -> bool:
        if not requester.is_admin:
            raise PermissionError("Only admins can change roles")
        return self.org_repo.update_member_role(org_id, target_user_id, new_role)

    def check_scan_permission(self, org_id: str) -> dict:
        org = self.org_repo.get(org_id)
        if not org or org.plan_type is None or org.plan_type == "pro":
            return {"allowed": True, "reason": "ok"}
        if org.trial_ends_at:
            try:
                ends_dt = datetime.fromisoformat(
                    org.trial_ends_at.replace("Z", "+00:00")
                )
                if datetime.now(timezone.utc) > ends_dt:
                    return {"allowed": False, "reason": "trial_expired"}
            except Exception:
                pass
        return {"allowed": True, "reason": "ok"}
```

- [ ] **Step 4: 實作 `app/services/tag_service.py`**

```python
from typing import List
from ..models.org import UserContext
from ..repositories.org_repo import OrgRepo
from ..repositories.card_repo import CardRepo
from .card_service import PermissionError, NotFoundError


class TagService:

    def __init__(self, org_repo: OrgRepo, card_repo: CardRepo):
        self.org_repo = org_repo
        self.card_repo = card_repo

    def list_tags(self, org_id: str) -> List[str]:
        return self.org_repo.get_all_role_tags(org_id)

    def add_tag(self, org_id: str, tag_name: str) -> bool:
        return self.org_repo.add_role_tag(org_id, tag_name)

    def delete_tag(self, org_id: str, tag_name: str) -> bool:
        return self.org_repo.delete_role_tag(org_id, tag_name)

    def set_card_tags(self, org_id: str, card_id: str,
                      tag_names: List[str], user: UserContext) -> bool:
        card = self.card_repo.get(org_id, card_id)
        if not card:
            raise NotFoundError(card_id)
        if not user.is_admin and card.added_by != user.user_id:
            raise PermissionError(f"Cannot tag card {card_id}")
        return self.card_repo.set_tags(org_id, card_id, tag_names)
```

- [ ] **Step 5: 執行測試，確認通過**

```bash
pytest tests/test_org_service.py -v
```

預期：5 tests PASSED

- [ ] **Step 6: Commit**

```bash
git add app/services/org_service.py app/services/tag_service.py tests/test_org_service.py
git commit -m "feat: add OrgService and TagService with tests"
```

---

## Task 6: 抽離 API 路由（main.py 重構）

**Files:**
- Create: `app/api/__init__.py`
- Create: `app/api/webhook.py`
- Create: `app/api/internal.py`
- Modify: `app/main.py`

- [ ] **Step 1: 建立 api package**

```bash
mkdir -p app/api
touch app/api/__init__.py
```

- [ ] **Step 2: 建立 `app/api/webhook.py`**

```python
from fastapi import APIRouter, Request, HTTPException
from linebot.models import MessageEvent, PostbackEvent, FollowEvent
from linebot.exceptions import InvalidSignatureError

from ..bot_instance import parser
from ..line_handlers import (
    handle_text_event, handle_image_event,
    handle_postback_event, handle_follow_event,
)

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
```

- [ ] **Step 3: 建立 `app/api/internal.py`**

```python
from fastapi import APIRouter, Request, HTTPException

from .. import config
from ..batch_processor import process_batch
from ..line_handlers import send_batch_summary_push

router = APIRouter(prefix="/internal")


@router.post("/process-batch")
async def internal_process_batch(request: Request):
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
```

- [ ] **Step 4: 改寫 `app/main.py`**

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
```

- [ ] **Step 5: 確認現有測試全通過**

```bash
pytest -v
```

預期：所有既有測試 PASS，無 regression

- [ ] **Step 6: Commit**

```bash
git add app/api/ app/main.py
git commit -m "refactor: extract webhook and internal routes to app/api/"
```

---

## Task 7: 拆分 Handler（Phase D）

**Files:**
- Create: `app/handlers/__init__.py`
- Create: `app/handlers/text_handler.py`
- Create: `app/handlers/image_handler.py`
- Create: `app/handlers/postback_handler.py`
- Modify: `app/line_handlers.py`（成為 compatibility shim）

> **注意**：這個 task 最大，採用「複製 + 橋接」策略：先將現有函式移到對應 handler 檔案，再讓 `line_handlers.py` re-export 這些函式，最後在所有測試通過後才刪除橋接。

- [ ] **Step 1: 建立 handlers package**

```bash
mkdir -p app/handlers
touch app/handlers/__init__.py
```

- [ ] **Step 2: 建立 `app/handlers/text_handler.py`**

從 `app/line_handlers.py` 搬移 `handle_text_event` 及其所有 helper：

```python
from linebot.models import TextSendMessage, QuickReply, QuickReplyButton, PostbackAction

from .. import firebase_utils, gemini_utils, utils, flex_messages, config
from ..bot_instance import line_bot_api, user_states
from ..repositories.state_repo import get as state_get, set as state_set, delete as state_delete
from .postback_handler import FIELD_LABELS

# 從 line_handlers 複製 handle_text_event 及所有文字 handler
# （完整程式碼 — 從 line_handlers.py 搬移，不要摘要）
```

> 此 step 需要開啟 `app/line_handlers.py`，找到 `handle_text_event` 函式及其呼叫的所有 helper（`handle_editing_field_state`、`handle_smart_query`、`handle_adding_memo_state` 等），逐一複製到 `text_handler.py`。

- [ ] **Step 3: 建立 `app/handlers/image_handler.py`**

從 `app/line_handlers.py` 搬移 `handle_image_event` 及其 helper。

- [ ] **Step 4: 建立 `app/handlers/postback_handler.py`**

從 `app/line_handlers.py` 搬移 `handle_postback_event` 及其所有 action handler。

- [ ] **Step 5: 改寫 `app/line_handlers.py` 為 compatibility shim**

```python
# Compatibility shim — 保持舊 import 路徑可用，逐步廢棄
from .handlers.text_handler import handle_text_event  # noqa: F401
from .handlers.image_handler import handle_image_event  # noqa: F401
from .handlers.postback_handler import handle_postback_event  # noqa: F401
from .handlers.postback_handler import (  # noqa: F401
    handle_follow_event,
    send_batch_summary_push,
    attach_cancel_quick_reply,
)
```

- [ ] **Step 6: 執行全套測試，確認無 regression**

```bash
pytest -v
```

預期：所有測試 PASS

- [ ] **Step 7: Commit**

```bash
git add app/handlers/ app/line_handlers.py
git commit -m "refactor: split line_handlers into handlers/ (text/image/postback)"
```

---

## Task 8: 全套驗收

- [ ] **Step 1: 執行完整測試套件**

```bash
pytest -v --tb=short
```

預期：所有測試 PASS

- [ ] **Step 2: 本地啟動確認**

```bash
uvicorn app.main:app --host=0.0.0.0 --port=8080
```

預期：啟動無 error，`GET /` 回傳 `{"status": "ok"}`

- [ ] **Step 3: 確認依賴方向**

確認以下 import 不存在（handler 不能直接 import firebase_admin）：

```bash
grep -r "from firebase_admin" app/handlers/ app/services/
```

預期：無輸出（handler 和 service 不直接碰 firebase_admin）

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "refactor: Phase A-D complete — modular monolith foundation"
```

---

## 後續 Plan

- **Plan 2**：`2026-04-13-liff-api.md` — Phase E，LIFF API endpoints + JWT 認證（`POST /api/auth/token`、`GET /api/v1/cards` 等）
- **Plan 3**：`2026-04-13-liff-frontend.md` — Phase F，Vue 3 SPA
