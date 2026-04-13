# LIFF Phase F — Vue 3 Frontend SPA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vue 3 SPA served from `/liff/` that lets LINE users browse their card list, view card details, and edit cards — authenticating via `liff.getIDToken()` → backend JWT.

**Architecture:** Pure static SPA (no SSR). FastAPI serves `app/liff_app/dist/` as static files at `/liff/`. Vue 3 with Composition API and Vite build. Single `api.js` module wraps all fetch calls with JWT bearer token. No state management library — `ref`/`reactive` only. Three views: CardList, CardDetail, CardEdit. LIFF SDK loaded via CDN script tag.

**Tech Stack:** Vue 3 (Composition API, CDN build for simplicity — no npm build pipeline), LIFF SDK 2.x (CDN), Fetch API, FastAPI StaticFiles.

**Working directory:** `.worktrees/liff-refactor` (branch `feature/liff-refactor`)

> **Note on "CDN build for simplicity":** We are NOT using Vite/npm build. Instead, we use Vue 3 via CDN (`<script src="https://unpkg.com/vue@3/dist/vue.esm-browser.js" type="module">`). This means no build step, no `package.json`, no `node_modules`. The frontend is vanilla HTML/JS files served directly by FastAPI StaticFiles. This trades tree-shaking for zero toolchain setup — acceptable for an MVP LIFF app.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `app/liff_app/index.html` | Create | Shell HTML, loads LIFF SDK + Vue 3 CDN, mounts app |
| `app/liff_app/app.js` | Create | Vue 3 app definition, routing (hash-based), root component |
| `app/liff_app/api.js` | Create | All backend API calls with Bearer token management |
| `app/liff_app/views/CardList.js` | Create | Card list view with search input |
| `app/liff_app/views/CardDetail.js` | Create | Card detail read-only view |
| `app/liff_app/views/CardEdit.js` | Create | Card edit form (all fields), submit to PUT /api/v1/cards/{id} |
| `app/liff_app/views/Login.js` | Create | Fallback login page (shown when LIFF init fails or no org) |
| `app/main.py` | Modify | Mount StaticFiles at `/liff` |

---

## API Reference (backend already implemented)

```
POST /api/auth/token         body: {id_token}  → {access_token, expires_in}
GET  /api/v1/cards           ?search=&tag=     → [{id, name, company, phone, email, tags, ...}]
GET  /api/v1/cards/{id}                        → {id, name, title, company, address, phone, mobile, email, line_id, memo, tags, added_by, created_at}
PUT  /api/v1/cards/{id}      body: CardUpdate  → {ok: true}
GET  /api/v1/tags                              → ["tag1", "tag2"]
```

All calls except POST /api/auth/token require `Authorization: Bearer <jwt>` header.

Error format: `{error: "error_code", message?: "..."}`

---

## Task 1: FastAPI StaticFiles Mount

**Files:**
- Modify: `app/main.py`

Mount the `liff_app/` directory so FastAPI serves it at `/liff/`.

- [ ] **Step 1: Check current main.py router mounts**

Read `app/main.py` to find where `include_router` calls are:

```bash
grep -n "include_router\|StaticFiles\|mount" .worktrees/liff-refactor/app/main.py
```

- [ ] **Step 2: Add StaticFiles mount**

In `app/main.py`, add after the existing imports:

```python
from fastapi.staticfiles import StaticFiles
import os
```

Then after the `app.include_router(liff_router)` line, add:

```python
_liff_app_dir = os.path.join(os.path.dirname(__file__), "liff_app")
if os.path.isdir(_liff_app_dir):
    app.mount("/liff", StaticFiles(directory=_liff_app_dir, html=True), name="liff_app")
```

> `html=True` makes FastAPI serve `index.html` for directory requests (e.g., `/liff/` returns `liff_app/index.html`).
> The `if os.path.isdir(...)` guard prevents startup failure when the directory doesn't exist yet in tests.

- [ ] **Step 3: Create the liff_app directory**

```bash
mkdir -p .worktrees/liff-refactor/app/liff_app/views
```

- [ ] **Step 4: Verify FastAPI still starts**

```bash
cd .worktrees/liff-refactor
python -c "from app.main import app; print('OK')"
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add app/main.py
git commit -m "feat: mount liff_app StaticFiles at /liff"
```

---

## Task 2: API Module (`api.js`)

**Files:**
- Create: `app/liff_app/api.js`

This module manages JWT storage and wraps all backend fetch calls.

- [ ] **Step 1: Create `app/liff_app/api.js`**

```javascript
// api.js — backend API wrapper
// JWT is stored in sessionStorage (cleared when browser tab closes)

const BASE = "";  // same origin

function getToken() {
  return sessionStorage.getItem("jwt");
}

export function setToken(token) {
  sessionStorage.setItem("jwt", token);
}

export function clearToken() {
  sessionStorage.removeItem("jwt");
}

export function isAuthenticated() {
  return !!getToken();
}

async function request(method, path, body) {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || "request_failed"), { status: res.status, data });
  return data;
}

export async function login(id_token) {
  const data = await request("POST", "/api/auth/token", { id_token });
  setToken(data.access_token);
  return data;
}

export function listCards(search, tag) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (tag) params.set("tag", tag);
  const qs = params.toString();
  return request("GET", `/api/v1/cards${qs ? "?" + qs : ""}`);
}

export function getCard(id) {
  return request("GET", `/api/v1/cards/${id}`);
}

export function updateCard(id, body) {
  return request("PUT", `/api/v1/cards/${id}`, body);
}

export function listTags() {
  return request("GET", "/api/v1/tags");
}
```

- [ ] **Step 2: Verify syntax (no build step needed)**

```bash
node --input-type=module < .worktrees/liff-refactor/app/liff_app/api.js 2>&1 | head -5
```

Expected: no output (no errors). If `node` isn't available, skip this step.

- [ ] **Step 3: Commit**

```bash
git add app/liff_app/api.js
git commit -m "feat: add LIFF api.js module with JWT management"
```

---

## Task 3: Login View

**Files:**
- Create: `app/liff_app/views/Login.js`

Shown when LIFF init fails or user has no org. Displays an error message.

- [ ] **Step 1: Create `app/liff_app/views/Login.js`**

```javascript
// Login.js — shown when auth fails or user has no org
import { defineComponent, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

export default defineComponent({
  name: "Login",
  props: {
    message: { type: String, default: "請從 LINE 聊天室開啟此頁面" },
  },
  setup(props) {
    return () =>
      h("div", { style: "text-align:center;padding:40px 20px;font-family:sans-serif;" }, [
        h("p", { style: "font-size:18px;color:#555;" }, "⚠️"),
        h("p", { style: "font-size:16px;color:#333;margin-top:8px;" }, props.message),
      ]);
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/liff_app/views/Login.js
git commit -m "feat: add LIFF Login fallback view"
```

---

## Task 4: CardList View

**Files:**
- Create: `app/liff_app/views/CardList.js`

Shows org's card list with a search bar. Tapping a card navigates to `#/cards/{id}`.

- [ ] **Step 1: Create `app/liff_app/views/CardList.js`**

```javascript
// CardList.js — shows card list with search
import { defineComponent, ref, onMounted, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { listCards } from "../api.js";

export default defineComponent({
  name: "CardList",
  emits: ["navigate"],
  setup(_, { emit }) {
    const cards = ref([]);
    const search = ref("");
    const loading = ref(true);
    const error = ref("");

    async function load() {
      loading.value = true;
      error.value = "";
      try {
        cards.value = await listCards(search.value || undefined);
      } catch (e) {
        error.value = e.message || "載入失敗";
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    function goDetail(id) {
      window.location.hash = `#/cards/${id}`;
    }

    function renderCard(card) {
      return h(
        "div",
        {
          key: card.id,
          onClick: () => goDetail(card.id),
          style:
            "padding:14px 16px;border-bottom:1px solid #eee;cursor:pointer;background:#fff;",
        },
        [
          h("div", { style: "font-weight:600;font-size:15px;" }, card.name || "（無姓名）"),
          h(
            "div",
            { style: "font-size:13px;color:#666;margin-top:2px;" },
            [card.title, card.company].filter(Boolean).join(" · ") || ""
          ),
          card.tags && card.tags.length
            ? h(
                "div",
                { style: "margin-top:4px;" },
                card.tags.map((t) =>
                  h(
                    "span",
                    {
                      key: t,
                      style:
                        "background:#e8f4fd;color:#1a7abf;font-size:11px;padding:2px 6px;border-radius:10px;margin-right:4px;",
                    },
                    t
                  )
                )
              )
            : null,
        ]
      );
    }

    return () => {
      const searchBar = h("div", { style: "padding:10px 16px;background:#f7f7f7;border-bottom:1px solid #e0e0e0;" }, [
        h("input", {
          value: search.value,
          onInput: (e) => { search.value = e.target.value; },
          onKeydown: (e) => { if (e.key === "Enter") load(); },
          placeholder: "搜尋名字、公司、電話...",
          style: "width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #ccc;border-radius:6px;font-size:14px;",
        }),
      ]);

      if (loading.value) return h("div", null, [searchBar, h("p", { style: "text-align:center;padding:40px;color:#999;" }, "載入中…")]);
      if (error.value) return h("div", null, [searchBar, h("p", { style: "text-align:center;padding:40px;color:#e33;" }, error.value)]);
      if (!cards.value.length) return h("div", null, [searchBar, h("p", { style: "text-align:center;padding:40px;color:#999;" }, "沒有名片")]);

      return h("div", null, [searchBar, ...cards.value.map(renderCard)]);
    };
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/liff_app/views/CardList.js
git commit -m "feat: add LIFF CardList view with search"
```

---

## Task 5: CardDetail View

**Files:**
- Create: `app/liff_app/views/CardDetail.js`

Read-only card detail. Shows all fields, an Edit button navigates to `#/cards/{id}/edit`.

- [ ] **Step 1: Create `app/liff_app/views/CardDetail.js`**

```javascript
// CardDetail.js — read-only card detail with edit button
import { defineComponent, ref, onMounted, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { getCard } from "../api.js";

const FIELD_LABELS = {
  name: "姓名", title: "職稱", company: "公司",
  phone: "電話", mobile: "手機", email: "Email",
  address: "地址", line_id: "LINE ID", memo: "備忘錄",
};

export default defineComponent({
  name: "CardDetail",
  props: { cardId: { type: String, required: true } },
  setup(props) {
    const card = ref(null);
    const loading = ref(true);
    const error = ref("");

    onMounted(async () => {
      try {
        card.value = await getCard(props.cardId);
      } catch (e) {
        error.value = e.message || "載入失敗";
      } finally {
        loading.value = false;
      }
    });

    function goEdit() {
      window.location.hash = `#/cards/${props.cardId}/edit`;
    }

    function goBack() {
      window.location.hash = "#/";
    }

    return () => {
      const header = h(
        "div",
        { style: "display:flex;align-items:center;padding:12px 16px;background:#fff;border-bottom:1px solid #eee;" },
        [
          h("button", { onClick: goBack, style: "background:none;border:none;font-size:20px;cursor:pointer;padding:0 8px 0 0;" }, "←"),
          h("span", { style: "font-weight:600;font-size:16px;" }, "名片詳情"),
        ]
      );

      if (loading.value) return h("div", null, [header, h("p", { style: "text-align:center;padding:40px;color:#999;" }, "載入中…")]);
      if (error.value) return h("div", null, [header, h("p", { style: "text-align:center;padding:40px;color:#e33;" }, error.value)]);

      const rows = Object.entries(FIELD_LABELS)
        .filter(([k]) => card.value[k])
        .map(([k, label]) =>
          h("div", { key: k, style: "padding:12px 16px;border-bottom:1px solid #f0f0f0;" }, [
            h("div", { style: "font-size:11px;color:#999;margin-bottom:2px;" }, label),
            h("div", { style: "font-size:15px;" }, card.value[k]),
          ])
        );

      const tags =
        card.value.tags && card.value.tags.length
          ? h("div", { style: "padding:12px 16px;" }, [
              h("div", { style: "font-size:11px;color:#999;margin-bottom:6px;" }, "標籤"),
              h(
                "div",
                null,
                card.value.tags.map((t) =>
                  h("span", { key: t, style: "background:#e8f4fd;color:#1a7abf;font-size:12px;padding:3px 8px;border-radius:10px;margin-right:6px;" }, t)
                )
              ),
            ])
          : null;

      const editBtn = h(
        "div",
        { style: "padding:20px 16px;" },
        h("button", {
          onClick: goEdit,
          style: "width:100%;padding:12px;background:#06c755;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;",
        }, "✏️ 編輯名片")
      );

      return h("div", null, [header, ...rows, tags, editBtn].filter(Boolean));
    };
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/liff_app/views/CardDetail.js
git commit -m "feat: add LIFF CardDetail read-only view"
```

---

## Task 6: CardEdit View

**Files:**
- Create: `app/liff_app/views/CardEdit.js`

Edit form for all card fields. Submits to `PUT /api/v1/cards/{id}`, then navigates back to detail.

- [ ] **Step 1: Create `app/liff_app/views/CardEdit.js`**

```javascript
// CardEdit.js — edit form for all card fields
import { defineComponent, ref, reactive, onMounted, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { getCard, updateCard, listTags } from "../api.js";

const FIELDS = [
  { key: "name", label: "姓名" },
  { key: "title", label: "職稱" },
  { key: "company", label: "公司" },
  { key: "phone", label: "電話" },
  { key: "mobile", label: "手機" },
  { key: "email", label: "Email", type: "email" },
  { key: "address", label: "地址" },
  { key: "line_id", label: "LINE ID" },
  { key: "memo", label: "備忘錄", multiline: true },
];

export default defineComponent({
  name: "CardEdit",
  props: { cardId: { type: String, required: true } },
  setup(props) {
    const form = reactive({
      name: "", title: "", company: "", phone: "", mobile: "",
      email: "", address: "", line_id: "", memo: "",
    });
    const loading = ref(true);
    const saving = ref(false);
    const error = ref("");
    const success = ref(false);
    const availableTags = ref([]);
    const selectedTags = ref([]);

    onMounted(async () => {
      try {
        const [card, tags] = await Promise.all([getCard(props.cardId), listTags()]);
        for (const f of FIELDS) {
          if (card[f.key] != null) form[f.key] = card[f.key];
        }
        availableTags.value = tags;
        selectedTags.value = card.tags || [];
      } catch (e) {
        error.value = e.message || "載入失敗";
      } finally {
        loading.value = false;
      }
    });

    async function save() {
      saving.value = true;
      error.value = "";
      try {
        const body = {};
        for (const f of FIELDS) {
          body[f.key] = form[f.key] || null;
        }
        await updateCard(props.cardId, body);
        success.value = true;
        setTimeout(() => {
          window.location.hash = `#/cards/${props.cardId}`;
        }, 800);
      } catch (e) {
        error.value = e.message || "儲存失敗";
      } finally {
        saving.value = false;
      }
    }

    function goBack() {
      window.location.hash = `#/cards/${props.cardId}`;
    }

    function toggleTag(tag) {
      const idx = selectedTags.value.indexOf(tag);
      if (idx >= 0) selectedTags.value.splice(idx, 1);
      else selectedTags.value.push(tag);
    }

    return () => {
      const header = h(
        "div",
        { style: "display:flex;align-items:center;padding:12px 16px;background:#fff;border-bottom:1px solid #eee;" },
        [
          h("button", { onClick: goBack, style: "background:none;border:none;font-size:20px;cursor:pointer;padding:0 8px 0 0;" }, "←"),
          h("span", { style: "font-weight:600;font-size:16px;" }, "編輯名片"),
        ]
      );

      if (loading.value) return h("div", null, [header, h("p", { style: "text-align:center;padding:40px;color:#999;" }, "載入中…")]);

      const fields = FIELDS.map(({ key, label, type, multiline }) => {
        const inputEl = multiline
          ? h("textarea", {
              value: form[key],
              onInput: (e) => { form[key] = e.target.value; },
              rows: 3,
              style: "width:100%;box-sizing:border-box;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;resize:vertical;",
            })
          : h("input", {
              type: type || "text",
              value: form[key],
              onInput: (e) => { form[key] = e.target.value; },
              style: "width:100%;box-sizing:border-box;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;",
            });

        return h("div", { key, style: "padding:10px 16px;" }, [
          h("label", { style: "display:block;font-size:12px;color:#666;margin-bottom:4px;" }, label),
          inputEl,
        ]);
      });

      const tagSection =
        availableTags.value.length
          ? h("div", { style: "padding:10px 16px;" }, [
              h("div", { style: "font-size:12px;color:#666;margin-bottom:6px;" }, "標籤"),
              h("div", null,
                availableTags.value.map((t) => {
                  const active = selectedTags.value.includes(t);
                  return h("span", {
                    key: t,
                    onClick: () => toggleTag(t),
                    style: `display:inline-block;padding:4px 10px;border-radius:12px;margin:2px 4px 2px 0;font-size:12px;cursor:pointer;border:1px solid ${active ? "#06c755" : "#ccc"};background:${active ? "#e8f8ee" : "#f7f7f7"};color:${active ? "#06c755" : "#555"};`,
                  }, t);
                })
              ),
            ])
          : null;

      const errMsg = error.value
        ? h("p", { style: "text-align:center;color:#e33;padding:0 16px;" }, error.value)
        : null;

      const successMsg = success.value
        ? h("p", { style: "text-align:center;color:#06c755;padding:0 16px;" }, "✅ 已儲存")
        : null;

      const saveBtn = h(
        "div",
        { style: "padding:20px 16px;" },
        h("button", {
          onClick: save,
          disabled: saving.value || success.value,
          style: `width:100%;padding:12px;background:${saving.value || success.value ? "#ccc" : "#06c755"};color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:${saving.value ? "not-allowed" : "pointer"};`,
        }, saving.value ? "儲存中…" : "儲存")
      );

      return h("div", null, [header, ...fields, tagSection, errMsg, successMsg, saveBtn].filter(Boolean));
    };
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/liff_app/views/CardEdit.js
git commit -m "feat: add LIFF CardEdit form view"
```

---

## Task 7: App Entry (`app.js` + `index.html`)

**Files:**
- Create: `app/liff_app/app.js`
- Create: `app/liff_app/index.html`

The main app entry: LIFF init → auth → hash-based routing.

- [ ] **Step 1: Create `app/liff_app/app.js`**

```javascript
// app.js — LIFF init, auth, and hash router
import { createApp, defineComponent, ref, shallowRef, computed, onMounted, onUnmounted, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { login, isAuthenticated, clearToken } from "./api.js";
import Login from "./views/Login.js";
import CardList from "./views/CardList.js";
import CardDetail from "./views/CardDetail.js";
import CardEdit from "./views/CardEdit.js";

// ---- Router ----
// Routes: #/ → CardList, #/cards/:id → CardDetail, #/cards/:id/edit → CardEdit

function parseRoute(hash) {
  const path = hash.replace(/^#/, "") || "/";
  const editMatch = path.match(/^\/cards\/([^/]+)\/edit$/);
  if (editMatch) return { view: "CardEdit", cardId: editMatch[1] };
  const detailMatch = path.match(/^\/cards\/([^/]+)$/);
  if (detailMatch) return { view: "CardDetail", cardId: detailMatch[1] };
  return { view: "CardList" };
}

const App = defineComponent({
  name: "App",
  setup() {
    const liffReady = ref(false);
    const authError = ref("");
    const route = ref(parseRoute(window.location.hash));

    function onHashChange() {
      route.value = parseRoute(window.location.hash);
    }

    onMounted(async () => {
      window.addEventListener("hashchange", onHashChange);

      // LIFF init
      try {
        await liff.init({ liffId: window.__LIFF_ID__ });
      } catch (e) {
        authError.value = "LIFF 初始化失敗，請從 LINE 開啟";
        return;
      }

      // Auth: skip if already have JWT
      if (!isAuthenticated()) {
        try {
          const idToken = liff.getIDToken();
          if (!idToken) throw new Error("no id_token");
          await login(idToken);
        } catch (e) {
          authError.value = e.data?.error === "no_org"
            ? "您尚未加入任何團隊，請先在 LINE Bot 完成設定"
            : "登入失敗，請重新開啟";
          return;
        }
      }

      liffReady.value = true;
    });

    onUnmounted(() => {
      window.removeEventListener("hashchange", onHashChange);
    });

    return () => {
      if (authError.value) return h(Login, { message: authError.value });
      if (!liffReady.value) return h("div", { style: "text-align:center;padding:60px;color:#999;font-family:sans-serif;" }, "載入中…");

      const { view, cardId } = route.value;
      if (view === "CardEdit") return h(CardEdit, { cardId });
      if (view === "CardDetail") return h(CardDetail, { cardId });
      return h(CardList);
    };
  },
});

createApp(App).mount("#app");
```

- [ ] **Step 2: Create `app/liff_app/index.html`**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>名片管理</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f5f5; min-height: 100vh; }
    #app { max-width: 480px; margin: 0 auto; background: #fff; min-height: 100vh; }
  </style>
  <!-- LIFF SDK -->
  <script charset="utf-8" src="https://static.line-scdn.net/liff/edge/versions/2.22.3/sdk.js"></script>
  <!-- Inject LIFF ID from server (or use a placeholder for local dev) -->
  <script>
    window.__LIFF_ID__ = "YOUR_LIFF_ID_HERE";
  </script>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

> **Note:** `window.__LIFF_ID__` must be replaced with the actual LIFF ID. For local testing without a real LIFF ID, the Login fallback view will show because `liff.init()` will fail. That's expected — see "Local Testing" section below.

- [ ] **Step 3: Commit**

```bash
git add app/liff_app/app.js app/liff_app/index.html
git commit -m "feat: add LIFF app entry point with hash router and auth flow"
```

---

## Task 8: Local Smoke Test (Manual)

No automated tests for frontend HTML/JS — verify manually.

- [ ] **Step 1: Start the FastAPI server**

```bash
cd .worktrees/liff-refactor
JWT_SECRET=test-secret LIFF_CHANNEL_ID=test uvicorn app.main:app --host=0.0.0.0 --port=8080
```

- [ ] **Step 2: Open browser**

Navigate to: `http://localhost:8080/liff/`

Expected: "LIFF 初始化失敗，請從 LINE 開啟" — this is correct because no real LIFF environment.

- [ ] **Step 3: Verify /liff/ returns the HTML**

```bash
curl -s http://localhost:8080/liff/ | grep -c "名片管理"
```

Expected: `1`

- [ ] **Step 4: Verify API still works**

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"id_token":"fake"}'
```

Expected: `401`

- [ ] **Step 5: Verify protected endpoint returns 403 without token**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/v1/cards
```

Expected: `403`

- [ ] **Step 6: Run pytest to ensure no regressions**

```bash
pytest tests/ -q --tb=short
```

Expected: same result as before (141 passed, 7 pre-existing failures).

- [ ] **Step 7: Commit if all looks good**

```bash
git add app/liff_app/
git commit -m "feat: Phase F LIFF Vue 3 frontend SPA complete"
```

---

## Local Testing Without Real LIFF

To test the full card list/detail/edit flow without a LINE LIFF environment:

1. Start server with a known JWT_SECRET:
   ```bash
   JWT_SECRET=test-secret uvicorn app.main:app --port=8080
   ```

2. Generate a valid JWT manually:
   ```python
   import jwt, datetime
   token = jwt.encode(
       {"sub": "U123", "org_id": "org_test", "role": "admin",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1),
        "iat": datetime.datetime.utcnow()},
       "test-secret", algorithm="HS256"
   )
   print(token)
   ```

3. In browser DevTools console at `http://localhost:8080/liff/`:
   ```javascript
   sessionStorage.setItem("jwt", "<token from step 2>");
   location.reload();
   ```

4. The LIFF init will still fail (no real LIFF), but if you bypass by patching `liff` globally:
   ```javascript
   window.liff = { init: () => Promise.resolve(), getIDToken: () => null };
   sessionStorage.setItem("jwt", "<token>");
   location.reload();
   ```

This lets you test the Vue UI against a real backend with real Firebase data.

---

## Deployment Note

When deploying to Cloud Run, set `LIFF_ID` and update `index.html` with the actual LIFF ID from LINE Developers Console. Or better, serve it dynamically:

In `app/main.py`, optionally add a template endpoint:
```python
# Optional: serve index.html with injected LIFF_ID
@app.get("/liff/", include_in_schema=False)
async def liff_index():
    from fastapi.responses import HTMLResponse
    liff_id = os.environ.get("LIFF_ID", "YOUR_LIFF_ID_HERE")
    with open(os.path.join(os.path.dirname(__file__), "liff_app/index.html")) as f:
        html = f.read().replace("YOUR_LIFF_ID_HERE", liff_id)
    return HTMLResponse(html)
```

This is optional and can be added post-MVP.
