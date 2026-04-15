# NLU Service (Day 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實作 `app/services/nlu_service.py`，將業務輸入的自然語言（意識流回報）透過 Gemini 解析為結構化的 NLU 結果，並支援 Fuzzy match 將 entity_name 自動連結到現有名片。

**Architecture:** 
- `app/models/nlu.py`：NLU 輸出的 Pydantic 模型（`NLUResult`, `NLUEntity`, `NLUPipeline`, `NLUInteraction`, `NLUAction`）
- `app/services/nlu_service.py`：四個函式（`build_grounding_context`, `parse_text`, `fuzzy_match_entity`, `auto_link_namecard`）
- 不修改現有任何檔案

**Tech Stack:** Python 3.11, Pydantic v2, google-generativeai (`gemini-2.5-flash`), difflib (stdlib), Firebase Realtime DB (firebase_admin)

---

## File Structure

| 動作 | 路徑 | 職責 |
|------|------|------|
| Create | `app/models/nlu.py` | Pydantic schemas for NLU parse result |
| Create | `app/services/nlu_service.py` | Business logic: grounding context, Gemini call, fuzzy match |
| Create | `tests/test_nlu_service.py` | Unit tests (mocked Gemini, mocked Firebase) |

---

## Task 1: NLU Result Pydantic Models

**Files:**
- Create: `app/models/nlu.py`
- Test: `tests/test_nlu_service.py` (stub only at this step)

- [ ] **Step 1: 建立 `app/models/nlu.py`**

```python
from pydantic import BaseModel, Field
from typing import List, Optional


class NLUEntity(BaseModel):
    name: str
    category: str = "Client"
    industry: Optional[str] = None
    matched_entity_id: Optional[str] = None
    entity_match_confidence: float = 0.0


class NLUPipeline(BaseModel):
    entity_name: str
    stage: Optional[str] = None
    is_pending: Optional[bool] = None
    product_id: Optional[str] = None
    est_value: Optional[int] = None
    next_action_date: Optional[str] = None
    status_summary: str = ""


class NLUInteraction(BaseModel):
    entity_name: str
    raw_transcript: str
    ai_key_insights: List[str] = Field(default_factory=list)
    sentiment: str = "Neutral"


class NLUAction(BaseModel):
    entity_name: str
    task_detail: str
    due_date: str


class NLUResult(BaseModel):
    intents: List[str] = Field(default_factory=list)
    overall_confidence: float = 0.0
    missing_fields: List[str] = Field(default_factory=list)
    entities: List[NLUEntity] = Field(default_factory=list)
    pipelines: List[NLUPipeline] = Field(default_factory=list)
    interactions: List[NLUInteraction] = Field(default_factory=list)
    actions: List[NLUAction] = Field(default_factory=list)
```

- [ ] **Step 2: 建立 test stub，確認 import 正常**

建立 `tests/test_nlu_service.py`：

```python
import pytest
from app.models.nlu import NLUResult, NLUEntity, NLUPipeline, NLUInteraction, NLUAction


def test_nlu_result_defaults():
    result = NLUResult()
    assert result.intents == []
    assert result.overall_confidence == 0.0
    assert result.missing_fields == []
    assert result.entities == []
    assert result.pipelines == []
    assert result.interactions == []
    assert result.actions == []


def test_nlu_entity_defaults():
    entity = NLUEntity(name="台積電")
    assert entity.category == "Client"
    assert entity.matched_entity_id is None
    assert entity.entity_match_confidence == 0.0
```

- [ ] **Step 3: 執行測試，確認通過**

```bash
cd /Users/davidlin/Claude-Code-Project/linebot-namecard-python
python -m pytest tests/test_nlu_service.py::test_nlu_result_defaults tests/test_nlu_service.py::test_nlu_entity_defaults -v
```

Expected: 2 passed

- [ ] **Step 4: Commit**

```bash
git add app/models/nlu.py tests/test_nlu_service.py
git commit -m "feat: add NLU result Pydantic models"
```

---

## Task 2: `fuzzy_match_entity`

**Files:**
- Create: `app/services/nlu_service.py` (初始版本，只含 fuzzy_match_entity)
- Modify: `tests/test_nlu_service.py`

- [ ] **Step 1: 寫 failing test**

在 `tests/test_nlu_service.py` 加入：

```python
from app.services.nlu_service import fuzzy_match_entity


def test_fuzzy_match_exact():
    result = fuzzy_match_entity("台積電", ["台積電", "聯發科", "瑞昱"])
    assert result == "台積電"


def test_fuzzy_match_contains():
    result = fuzzy_match_entity("台積", ["台積電", "聯發科"])
    assert result == "台積電"


def test_fuzzy_match_similar():
    # difflib ratio: "聯發科技" vs "聯發科" ≈ 0.86
    result = fuzzy_match_entity("聯發科技", ["台積電", "聯發科"])
    assert result == "聯發科"


def test_fuzzy_match_no_match():
    result = fuzzy_match_entity("完全不存在的公司", ["台積電", "聯發科"])
    assert result is None


def test_fuzzy_match_empty_list():
    result = fuzzy_match_entity("台積電", [])
    assert result is None
```

- [ ] **Step 2: 執行，確認 FAIL（ImportError）**

```bash
python -m pytest tests/test_nlu_service.py::test_fuzzy_match_exact -v
```

Expected: ERROR — `ModuleNotFoundError: No module named 'app.services.nlu_service'`

- [ ] **Step 3: 建立 `app/services/nlu_service.py`，實作 `fuzzy_match_entity`**

```python
import difflib
from typing import List, Optional


def fuzzy_match_entity(name: str, entity_list: List[str]) -> Optional[str]:
    """
    Fuzzy match a name against a list of known entity names.
    Priority: exact → contains → difflib similarity (threshold 0.4)
    Returns the best match or None.
    """
    if not entity_list:
        return None

    name_lower = name.lower()

    # 1. Exact match
    for candidate in entity_list:
        if candidate.lower() == name_lower:
            return candidate

    # 2. Contains match
    for candidate in entity_list:
        if name_lower in candidate.lower() or candidate.lower() in name_lower:
            return candidate

    # 3. Difflib similarity
    matches = difflib.get_close_matches(name, entity_list, n=1, cutoff=0.4)
    return matches[0] if matches else None
```

- [ ] **Step 4: 執行測試，確認 5 個全過**

```bash
python -m pytest tests/test_nlu_service.py::test_fuzzy_match_exact \
  tests/test_nlu_service.py::test_fuzzy_match_contains \
  tests/test_nlu_service.py::test_fuzzy_match_similar \
  tests/test_nlu_service.py::test_fuzzy_match_no_match \
  tests/test_nlu_service.py::test_fuzzy_match_empty_list -v
```

Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add app/services/nlu_service.py tests/test_nlu_service.py
git commit -m "feat: add fuzzy_match_entity with exact/contains/difflib matching"
```

---

## Task 3: `build_grounding_context`

**Files:**
- Modify: `app/services/nlu_service.py`
- Modify: `tests/test_nlu_service.py`

- [ ] **Step 1: 寫 failing test**

在 `tests/test_nlu_service.py` 加入：

```python
from unittest.mock import patch, MagicMock
from app.services.nlu_service import build_grounding_context
from app.models.card import Card
from app.models.product import Product


def test_build_grounding_context_basic():
    mock_cards = {
        "card-1": Card(id="card-1", name="王大明", company="台積電", added_by="u1", created_at="2026-01-01T00:00:00Z"),
        "card-2": Card(id="card-2", name="李小姐", company="聯發科", added_by="u1", created_at="2026-01-01T00:00:00Z"),
    }
    mock_products = [
        Product(id="PL-0001", org_id="org1", name="AI 質檢方案", status="Active", created_at="2026-01-01T00:00:00Z"),
        Product(id="PL-0002", org_id="org1", name="智慧倉儲系統", status="Active", created_at="2026-01-01T00:00:00Z"),
    ]

    with patch("app.services.nlu_service.CardRepo") as MockCardRepo, \
         patch("app.services.nlu_service.ProductRepo") as MockProductRepo, \
         patch("app.services.nlu_service.DealRepo") as MockDealRepo:

        MockCardRepo.return_value.list_all.return_value = mock_cards
        MockProductRepo.return_value.list_active.return_value = mock_products
        MockDealRepo.return_value.list_all.return_value = {}

        result = build_grounding_context("org1")

    assert "台積電" in result
    assert "聯發科" in result
    assert "PL-0001" in result
    assert "AI 質檢方案" in result
    assert "## 現有客戶名單" in result
    assert "## 可用產品線" in result


def test_build_grounding_context_dedup_companies():
    """同一 company 出現多次只列一次"""
    mock_cards = {
        "card-1": Card(id="card-1", name="王大明", company="台積電", added_by="u1", created_at="2026-01-01T00:00:00Z"),
        "card-2": Card(id="card-2", name="張小姐", company="台積電", added_by="u1", created_at="2026-01-01T00:00:00Z"),
    }

    with patch("app.services.nlu_service.CardRepo") as MockCardRepo, \
         patch("app.services.nlu_service.ProductRepo") as MockProductRepo, \
         patch("app.services.nlu_service.DealRepo") as MockDealRepo:

        MockCardRepo.return_value.list_all.return_value = mock_cards
        MockProductRepo.return_value.list_active.return_value = []
        MockDealRepo.return_value.list_all.return_value = {}

        result = build_grounding_context("org1")

    assert result.count("台積電") == 1
```

- [ ] **Step 2: 執行，確認 FAIL**

```bash
python -m pytest tests/test_nlu_service.py::test_build_grounding_context_basic -v
```

Expected: FAIL — `ImportError` 或 `AttributeError`（函式不存在）

- [ ] **Step 3: 在 `app/services/nlu_service.py` 加入 imports + `build_grounding_context`**

在檔案頂部加入 imports：

```python
from ..repositories.card_repo import CardRepo
from ..repositories.deal_repo import DealRepo
from ..repositories.product_repo import ProductRepo
```

加入函式：

```python
def build_grounding_context(org_id: str) -> str:
    """
    Build grounding context string for Gemini NLU prompt.
    Reads namecards (company field), deals (entity_name), and active products.
    Deduplicates company names. Format is stable to benefit from Prompt Caching.
    """
    card_repo = CardRepo()
    deal_repo = DealRepo()
    product_repo = ProductRepo()

    # Collect unique company names from namecards
    cards = card_repo.list_all(org_id)
    companies = sorted({
        card.company
        for card in cards.values()
        if card.company
    })

    # Also collect entity_names from active deals (may not be in namecards)
    deals = deal_repo.list_all(org_id)
    deal_entities = sorted({
        deal.entity_name
        for deal in deals.values()
        if deal.entity_name and deal.entity_name not in companies
    })

    all_entities = companies + deal_entities

    # Active products
    products = product_repo.list_active(org_id)

    lines = []

    lines.append("## 現有客戶名單")
    if all_entities:
        for i, name in enumerate(all_entities, start=1):
            lines.append(f"- C-{i:04d} | {name}")
    else:
        lines.append("（目前無客戶資料）")

    lines.append("")
    lines.append("## 可用產品線")
    if products:
        for product in products:
            desc = f" | {product.description}" if product.description else ""
            lines.append(f"- {product.id} | {product.name}{desc}")
    else:
        lines.append("（目前無產品資料）")

    return "\n".join(lines)
```

- [ ] **Step 4: 執行測試，確認通過**

```bash
python -m pytest tests/test_nlu_service.py::test_build_grounding_context_basic \
  tests/test_nlu_service.py::test_build_grounding_context_dedup_companies -v
```

Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add app/services/nlu_service.py tests/test_nlu_service.py
git commit -m "feat: add build_grounding_context — reads namecards/deals/products from Firebase"
```

---

## Task 4: `parse_text`

**Files:**
- Modify: `app/services/nlu_service.py`
- Modify: `tests/test_nlu_service.py`

- [ ] **Step 1: 寫 failing test**

在 `tests/test_nlu_service.py` 加入：

```python
import json
from unittest.mock import patch, MagicMock
from app.services.nlu_service import parse_text
from app.models.nlu import NLUResult


SAMPLE_NLU_JSON = {
    "intents": ["UPDATE_PIPELINE", "LOG_INTERACTION"],
    "overall_confidence": 0.88,
    "missing_fields": [],
    "entities": [
        {
            "name": "台積電",
            "category": "Client",
            "industry": "半導體",
            "matched_entity_id": "C-0001",
            "entity_match_confidence": 0.97
        }
    ],
    "pipelines": [
        {
            "entity_name": "台積電",
            "stage": "3",
            "product_id": None,
            "est_value": 5000000,
            "next_action_date": "2026-04-20",
            "status_summary": "進入正式提案階段"
        }
    ],
    "interactions": [
        {
            "entity_name": "台積電",
            "raw_transcript": "台積那邊今天進入正式提案",
            "ai_key_insights": ["關鍵點 1", "關鍵點 2", "關鍵點 3"],
            "sentiment": "Positive"
        }
    ],
    "actions": []
}


def test_parse_text_returns_nlu_result():
    mock_response = MagicMock()
    mock_response.text = json.dumps(SAMPLE_NLU_JSON)

    with patch("app.services.nlu_service.build_grounding_context", return_value="## 現有客戶名單\n- C-0001 | 台積電"), \
         patch("app.services.nlu_service.generate_gemini_text_complete", return_value=mock_response):

        result = parse_text("台積那邊今天進入正式提案", "org1")

    assert isinstance(result, NLUResult)
    assert "UPDATE_PIPELINE" in result.intents
    assert result.overall_confidence == 0.88
    assert len(result.entities) == 1
    assert result.entities[0].name == "台積電"
    assert len(result.pipelines) == 1
    assert result.pipelines[0].stage == "3"


def test_parse_text_gemini_malformed_json():
    """Gemini 回傳無法解析的 JSON 時，回傳空 NLUResult 而非 crash"""
    mock_response = MagicMock()
    mock_response.text = "這不是 JSON"

    with patch("app.services.nlu_service.build_grounding_context", return_value=""), \
         patch("app.services.nlu_service.generate_gemini_text_complete", return_value=mock_response):

        result = parse_text("隨便輸入", "org1")

    assert isinstance(result, NLUResult)
    assert result.intents == []
    assert result.overall_confidence == 0.0
```

- [ ] **Step 2: 執行，確認 FAIL**

```bash
python -m pytest tests/test_nlu_service.py::test_parse_text_returns_nlu_result -v
```

Expected: FAIL — `ImportError`（`parse_text` 不存在）

- [ ] **Step 3: 在 `app/services/nlu_service.py` 加入 `parse_text` 所需 import 及實作**

在頂部 imports 補充：

```python
from datetime import date
from ..gemini_utils import generate_gemini_text_complete
from ..models.nlu import NLUResult
import json
import logging

logger = logging.getLogger(__name__)
```

加入函式：

```python
def parse_text(raw_text: str, org_id: str) -> NLUResult:
    """
    Parse a natural language CRM report via Gemini NLU.
    Injects grounding context (known companies + products) into the prompt.
    Returns NLUResult; returns empty NLUResult on Gemini failure.
    """
    system_prompt_path = __file__.replace(
        "services/nlu_service.py", "nlu/system_prompt.md"
    )
    try:
        with open(system_prompt_path, "r", encoding="utf-8") as f:
            system_prompt = f.read()
    except FileNotFoundError:
        logger.error("system_prompt.md not found at %s", system_prompt_path)
        system_prompt = ""

    grounding_context = build_grounding_context(org_id)
    today = date.today().isoformat()

    prompt_parts = [
        system_prompt,
        f"\n\n**系統提供的今天日期**：{today}\n",
        f"\n**Grounding Context**：\n{grounding_context}\n",
        f"\n**BD 輸入**：\n{raw_text}",
    ]

    try:
        response = generate_gemini_text_complete(prompt_parts)
        data = json.loads(response.text)
        return NLUResult(**data)
    except Exception as e:
        logger.error("NLU parse failed: %s", e)
        return NLUResult()
```

- [ ] **Step 4: 執行測試，確認通過**

```bash
python -m pytest tests/test_nlu_service.py::test_parse_text_returns_nlu_result \
  tests/test_nlu_service.py::test_parse_text_gemini_malformed_json -v
```

Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add app/services/nlu_service.py tests/test_nlu_service.py
git commit -m "feat: add parse_text — Gemini NLU with grounding context injection"
```

---

## Task 5: `auto_link_namecard`

**Files:**
- Modify: `app/services/nlu_service.py`
- Modify: `tests/test_nlu_service.py`

- [ ] **Step 1: 寫 failing test**

在 `tests/test_nlu_service.py` 加入：

```python
from app.services.nlu_service import auto_link_namecard
from app.models.card import Card


def test_auto_link_namecard_found():
    mock_cards = {
        "card-1": Card(id="card-1", name="王大明", company="台積電", added_by="u1", created_at="2026-01-01T00:00:00Z"),
        "card-2": Card(id="card-2", name="李小姐", company="聯發科", added_by="u1", created_at="2026-01-01T00:00:00Z"),
    }

    with patch("app.services.nlu_service.CardRepo") as MockCardRepo:
        MockCardRepo.return_value.list_all.return_value = mock_cards
        result = auto_link_namecard("台積電", "org1")

    assert result == "card-1"


def test_auto_link_namecard_fuzzy():
    """「台積」也能匹配到 company=台積電 的 card"""
    mock_cards = {
        "card-1": Card(id="card-1", name="王大明", company="台積電", added_by="u1", created_at="2026-01-01T00:00:00Z"),
    }

    with patch("app.services.nlu_service.CardRepo") as MockCardRepo:
        MockCardRepo.return_value.list_all.return_value = mock_cards
        result = auto_link_namecard("台積", "org1")

    assert result == "card-1"


def test_auto_link_namecard_not_found():
    mock_cards = {
        "card-1": Card(id="card-1", name="王大明", company="台積電", added_by="u1", created_at="2026-01-01T00:00:00Z"),
    }

    with patch("app.services.nlu_service.CardRepo") as MockCardRepo:
        MockCardRepo.return_value.list_all.return_value = mock_cards
        result = auto_link_namecard("完全不存在公司", "org1")

    assert result is None
```

- [ ] **Step 2: 執行，確認 FAIL**

```bash
python -m pytest tests/test_nlu_service.py::test_auto_link_namecard_found -v
```

Expected: FAIL — `ImportError`（`auto_link_namecard` 不存在）

- [ ] **Step 3: 在 `app/services/nlu_service.py` 加入 `auto_link_namecard`**

```python
def auto_link_namecard(entity_name: str, org_id: str) -> Optional[str]:
    """
    Fuzzy-match entity_name to existing namecards (company field).
    Returns the card_id of the best match, or None if no match found.
    """
    card_repo = CardRepo()
    cards = card_repo.list_all(org_id)

    if not cards:
        return None

    # Build mapping: company_name → card_id (take first match per company)
    company_to_card: dict[str, str] = {}
    for card_id, card in cards.items():
        if card.company and card.company not in company_to_card:
            company_to_card[card.company] = card_id

    matched_company = fuzzy_match_entity(entity_name, list(company_to_card.keys()))
    if matched_company is None:
        return None

    return company_to_card[matched_company]
```

- [ ] **Step 4: 執行所有測試，確認全部通過**

```bash
python -m pytest tests/test_nlu_service.py -v
```

Expected: 全部 passed（共 12+ 個測試）

- [ ] **Step 5: Commit**

```bash
git add app/services/nlu_service.py tests/test_nlu_service.py
git commit -m "feat: add auto_link_namecard — fuzzy matches entity name to existing namecard"
```

---

## 驗收確認

執行全部測試，確認無 regression：

```bash
python -m pytest tests/test_nlu_service.py -v
```

確認 `app/services/nlu_service.py` 對外暴露的 public API：
- `fuzzy_match_entity(name: str, entity_list: List[str]) -> Optional[str]`
- `build_grounding_context(org_id: str) -> str`
- `parse_text(raw_text: str, org_id: str) -> NLUResult`
- `auto_link_namecard(entity_name: str, org_id: str) -> Optional[str]`

以上四個函式是 Day 4（deal_service / activity_service）和 Day 5（API `/crm/parse`）會直接 import 使用的介面。
