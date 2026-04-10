import random
import string
import uuid
from firebase_admin import db, storage
from . import config
from io import BytesIO
from datetime import timedelta, datetime, timezone
from collections import Counter
from .gsheets_utils import trigger_sync


# ---------------------------------------------------------------------------
# Permission checks
# ---------------------------------------------------------------------------

def _check_card_access(card_added_by: str, current_user_id: str, user_role: str) -> bool:
    """
    檢查使用者是否有權限訪問這張名片。

    Args:
        card_added_by: 名片建立者的 user_id
        current_user_id: 當前使用者的 user_id
        user_role: 當前使用者的角色（"admin" 或 "member"）

    Returns:
        True 如果使用者有權限，False 否則
    """
    if user_role == "admin":
        return True
    return card_added_by == current_user_id


# ---------------------------------------------------------------------------
# Organization helpers
# ---------------------------------------------------------------------------

def get_user_org_id(user_id: str) -> str:
    """從 user_org_map 取得使用者所屬的 org_id，若無則回傳 None"""
    try:
        ref = db.reference(f"user_org_map/{user_id}")
        return ref.get()
    except Exception as e:
        print(f"Error getting user org id: {e}")
        return None


def create_org(user_id: str, org_name: str) -> str:
    """建立新組織，指定使用者為 admin，自動啟動 7 天試用，回傳 org_id"""
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
                user_id: {
                    "role": "admin",
                    "joined_at": now
                }
            }
        })
        db.reference(f"user_org_map/{user_id}").set(org_id)
        return org_id
    except Exception as e:
        print(f"Error creating org: {e}")
        return None


def get_org(org_id: str) -> dict:
    """取得組織資訊（name, members, ...）"""
    try:
        ref = db.reference(f"organizations/{org_id}")
        return ref.get() or {}
    except Exception as e:
        print(f"Error getting org: {e}")
        return {}


def update_org_name(org_id: str, name: str) -> bool:
    """更新組織名稱"""
    try:
        db.reference(f"organizations/{org_id}/name").set(name)
        return True
    except Exception as e:
        print(f"Error updating org name: {e}")
        return False


def get_user_role(org_id: str, user_id: str) -> str:
    """取得使用者在組織中的角色 ('admin' | 'member' | None)"""
    try:
        ref = db.reference(f"organizations/{org_id}/members/{user_id}/role")
        return ref.get()
    except Exception as e:
        print(f"Error getting user role: {e}")
        return None


def add_member(org_id: str, user_id: str, role: str = "member") -> bool:
    """將使用者加入組織"""
    try:
        now = datetime.now().isoformat()
        db.reference(f"organizations/{org_id}/members/{user_id}").set({
            "role": role,
            "joined_at": now
        })
        db.reference(f"user_org_map/{user_id}").set(org_id)
        return True
    except Exception as e:
        print(f"Error adding member: {e}")
        return False


def remove_member(org_id: str, user_id: str) -> bool:
    """從組織移除使用者並清除 user_org_map"""
    try:
        db.reference(f"organizations/{org_id}/members/{user_id}").delete()
        db.reference(f"user_org_map/{user_id}").delete()
        return True
    except Exception as e:
        print(f"Error removing member: {e}")
        return False


def ensure_user_org(user_id: str) -> tuple:
    """確保使用者有所屬組織，若無則自動建立個人組織。
    回傳 (org_id, is_new: bool)，is_new=True 表示剛建立的新組織。
    """
    org_id = get_user_org_id(user_id)
    if not org_id:
        short_id = user_id[-8:] if len(user_id) > 8 else user_id
        org_id = create_org(user_id, f"{short_id}的團隊")
        return org_id, True
    return org_id, False


def require_admin(org_id: str, user_id: str) -> bool:
    """回傳 True 若使用者為組織 admin"""
    return get_user_role(org_id, user_id) == "admin"


TRIAL_SCAN_LIMIT = 50
TRIAL_MEMBER_LIMIT = 3


def check_org_permission(org_id: str, action_type: str) -> dict:
    """
    檢查組織是否允許執行指定動作。
    action_type: 'scan' | 'add_member'
    回傳 {'allowed': bool, 'reason': str}
    reason: 'ok' | 'trial_expired' | 'scan_limit_reached' | 'member_limit_reached'
    """
    org = get_org(org_id)
    plan_type = org.get('plan_type')

    # 祖父條款：舊組織無 plan_type → 預設 pro（無限制）
    if plan_type is None:
        return {'allowed': True, 'reason': 'ok'}

    if plan_type == 'pro':
        return {'allowed': True, 'reason': 'ok'}

    # trial 檢查
    if action_type == 'scan':
        trial_ends_at = org.get('trial_ends_at')
        if trial_ends_at:
            ends_dt = datetime.fromisoformat(
                trial_ends_at.replace('Z', '+00:00')
            )
            if datetime.now(timezone.utc) > ends_dt:
                return {'allowed': False, 'reason': 'trial_expired'}
        scan_count = org.get('usage', {}).get('scan_count', 0)
        if scan_count >= TRIAL_SCAN_LIMIT:
            return {'allowed': False, 'reason': 'scan_limit_reached'}

    if action_type == 'add_member':
        member_count = len(org.get('members', {}))
        if member_count >= TRIAL_MEMBER_LIMIT:
            return {'allowed': False, 'reason': 'member_limit_reached'}

    return {'allowed': True, 'reason': 'ok'}


def increment_scan_count(org_id: str) -> int:
    """Firebase Transaction 原子遞增 scan_count，回傳新的計數值"""
    try:
        ref = db.reference(f'organizations/{org_id}/usage/scan_count')
        result = ref.transaction(lambda current: (current or 0) + 1)
        return result
    except Exception as e:
        print(f"Error incrementing scan count: {e}")
        return 0


# ---------------------------------------------------------------------------
# User profile cache
# ---------------------------------------------------------------------------

def get_cached_display_name(user_id: str):
    """讀取快取的 LINE 顯示名稱，有值回傳字串，無值回傳 None"""
    try:
        ref = db.reference(f"user_profiles/{user_id}/display_name")
        return ref.get()
    except Exception as e:
        print(f"Error getting cached display name: {e}")
        return None


def cache_display_name(user_id: str, display_name: str) -> None:
    """快取 LINE 顯示名稱到 user_profiles/{user_id}/display_name"""
    try:
        db.reference(f"user_profiles/{user_id}/display_name").set(display_name)
    except Exception as e:
        print(f"Error caching display name: {e}")


# ---------------------------------------------------------------------------
# Tag helpers
# ---------------------------------------------------------------------------

DEFAULT_ROLE_TAGS = ["預設", "合作夥伴", "供應商", "客戶", "同業", "媒體/KOL"]


def ensure_default_role_tags(org_id: str) -> None:
    """若組織尚無角色標籤，自動建立預設角色標籤並為無標籤名片貼上「預設」"""
    try:
        ref = db.reference(f"organizations/{org_id}/tags/roles")
        existing = ref.get()
        if not existing:
            tags = {
                f"tag_{i}": name
                for i, name in enumerate(DEFAULT_ROLE_TAGS)
            }
            ref.set(tags)
            # 為所有無標籤名片貼上「預設」
            _assign_default_tag_to_cards(org_id)
    except Exception as e:
        print(f"Error ensuring default role tags: {e}")


def _assign_default_tag_to_cards(org_id: str) -> None:
    """為沒有 role_tags 的名片自動加上「預設」標籤"""
    try:
        all_cards = get_all_cards(org_id)
        for card_id, card_data in all_cards.items():
            if not card_data.get("role_tags"):
                db.reference(
                    f"{config.NAMECARD_PATH}/{org_id}/{card_id}/role_tags"
                ).set(["預設"])
    except Exception as e:
        print(f"Error assigning default tags: {e}")


def get_all_role_tags(org_id: str) -> list:
    """回傳組織所有角色標籤名稱的 list"""
    try:
        ref = db.reference(f"organizations/{org_id}/tags/roles")
        data = ref.get()
        if not data:
            return []
        return list(data.values())
    except Exception as e:
        print(f"Error getting role tags: {e}")
        return []


def add_role_tag(org_id: str, tag_name: str) -> bool:
    """新增角色標籤，重複時回傳 False"""
    try:
        existing = get_all_role_tags(org_id)
        if tag_name in existing:
            return False
        ref = db.reference(f"organizations/{org_id}/tags/roles")
        ref.push(tag_name)
        return True
    except Exception as e:
        print(f"Error adding role tag: {e}")
        return False


def delete_role_tag(org_id: str, tag_name: str) -> bool:
    """刪除角色標籤，找不到時回傳 False"""
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
    except Exception as e:
        print(f"Error deleting role tag: {e}")
        return False


def add_card_role_tag(org_id: str, card_id: str, tag_name: str) -> bool:
    """將角色標籤加入名片的 role_tags 陣列"""
    try:
        ref = db.reference(f"{config.NAMECARD_PATH}/{org_id}/{card_id}/role_tags")
        current = ref.get() or []
        if tag_name not in current:
            current.append(tag_name)
            ref.set(current)
        return True
    except Exception as e:
        print(f"Error adding card role tag: {e}")
        return False


def remove_card_role_tag(org_id: str, card_id: str, tag_name: str) -> bool:
    """從名片的 role_tags 陣列移除指定標籤"""
    try:
        ref = db.reference(f"{config.NAMECARD_PATH}/{org_id}/{card_id}/role_tags")
        current = ref.get() or []
        if tag_name in current:
            current.remove(tag_name)
            ref.set(current)
        return True
    except Exception as e:
        print(f"Error removing card role tag: {e}")
        return False


def search_cards(org_id: str, query: str) -> list:
    """關鍵字搜尋名片（姓名、公司、職稱），回傳 [(card_id, card_data), ...]"""
    try:
        query = query.strip().lower()
        all_cards = get_all_cards(org_id)
        matched = []
        for card_id, card_data in all_cards.items():
            if not isinstance(card_data, dict):
                continue
            searchable = " ".join([
                (card_data.get("name") or ""),
                (card_data.get("company") or ""),
                (card_data.get("title") or ""),
            ]).lower()
            if query in searchable:
                matched.append((card_id, card_data))
        return matched
    except Exception as e:
        print(f"Error searching cards: {e}")
        return []


def get_cards_by_role_tag(org_id: str, tag_name: str) -> dict:
    """回傳包含指定角色標籤的名片 {card_id: card_data}，按 created_at 降序"""
    try:
        all_cards = get_all_cards(org_id)
        matched = {
            card_id: card_data
            for card_id, card_data in all_cards.items()
            if tag_name in (card_data.get("role_tags") or [])
        }
        # 按 created_at 降序排列（最新的排前面）
        sorted_items = sorted(
            matched.items(),
            key=lambda x: x[1].get("created_at", ""),
            reverse=True
        )
        return dict(sorted_items)
    except Exception as e:
        print(f"Error getting cards by role tag: {e}")
        return {}


# ---------------------------------------------------------------------------
# Invite code helpers
# ---------------------------------------------------------------------------

def create_invite_code(org_id: str, created_by: str) -> tuple:
    """產生 6 字元大寫英數邀請碼，有效期 7 天，儲存至 Firebase。回傳 (code, expires_at) 或 (None, None)"""
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    expires_at = (datetime.now() + timedelta(days=7)).isoformat()
    try:
        db.reference(f"invite_codes/{code}").set({
            "org_id": org_id,
            "created_by": created_by,
            "expires_at": expires_at
        })
        return code, expires_at
    except Exception as e:
        print(f"Error creating invite code: {e}")
        return None, None


def get_invite_code(code: str) -> dict:
    """取得邀請碼資料，不存在則回傳 None"""
    try:
        ref = db.reference(f"invite_codes/{code}")
        return ref.get()
    except Exception as e:
        print(f"Error getting invite code: {e}")
        return None


def delete_invite_code(code: str) -> None:
    """刪除邀請碼"""
    try:
        db.reference(f"invite_codes/{code}").delete()
    except Exception as e:
        print(f"Error deleting invite code: {e}")


# ---------------------------------------------------------------------------
# Namecard CRUD (Phase 2: path = namecard/{org_id}/{card_id})
# ---------------------------------------------------------------------------

def get_all_cards(org_id: str) -> dict:
    """取得組織所有名片資料"""
    try:
        ref = db.reference(f"{config.NAMECARD_PATH}/{org_id}")
        namecard_data = ref.get()
        return namecard_data or {}
    except Exception as e:
        print(f"Error fetching namecards: {e}")
        return {}


def add_namecard(namecard_obj: dict, org_id: str, added_by: str) -> str:
    """新增名片資料到 Firebase 並回傳 card_id"""
    try:
        namecard_obj['created_at'] = datetime.now().isoformat()
        namecard_obj['added_by'] = added_by

        ref = db.reference(f"{config.NAMECARD_PATH}/{org_id}")
        new_card_ref = ref.push(namecard_obj)
        card_id = new_card_ref.key
        trigger_sync(org_id, card_id, namecard_obj)
        increment_scan_count(org_id)
        return card_id
    except Exception as e:
        print(f"Error adding namecard: {e}")
        return None


def delete_namecard(org_id: str, card_id: str) -> bool:
    """刪除指定名片"""
    try:
        db.reference(f"{config.NAMECARD_PATH}/{org_id}/{card_id}").delete()
        return True
    except Exception as e:
        print(f"Error deleting namecard: {e}")
        return False


def update_namecard_memo(card_id: str, org_id: str, memo: str) -> bool:
    """更新指定名片的備忘錄"""
    try:
        ref = db.reference(f"{config.NAMECARD_PATH}/{org_id}/{card_id}")
        ref.update({"memo": memo})
        try:
            card_data = ref.get()
            if card_data:
                trigger_sync(org_id, card_id, card_data)
        except Exception as e_sync:
            print(f"Error triggering sync on memo update: {e_sync}")
        return True
    except Exception as e:
        print(f"Error updating memo: {e}")
        return False


def remove_redundant_data(org_id: str) -> None:
    """移除重複 email 的名片資料"""
    try:
        ref = db.reference(f"{config.NAMECARD_PATH}/{org_id}")
        namecard_data = ref.get()
        if namecard_data:
            email_map = {}
            for key, value in namecard_data.items():
                email = value.get("email")
                if email:
                    if email in email_map:
                        ref.child(key).delete()
                    else:
                        email_map[email] = key
    except Exception as e:
        print(f"Error removing redundant data: {e}")


def check_if_card_exists(namecard_obj: dict, org_id: str) -> str:
    """檢查名片是否已存在 (以 email 為主鍵)，若存在則回傳 card_id"""
    try:
        email = namecard_obj.get("email")
        if not email:
            return None
        ref = db.reference(f"{config.NAMECARD_PATH}/{org_id}")
        namecard_data = ref.get()
        if namecard_data:
            for card_id, value in namecard_data.items():
                if value.get("email") == email:
                    return card_id
        return None
    except Exception as e:
        print(f"Error checking if namecard exists: {e}")
        return None


def get_name_from_card(org_id: str, card_id: str) -> str:
    """從 Firebase 取得名片主人的名字"""
    try:
        ref = db.reference(f"{config.NAMECARD_PATH}/{org_id}/{card_id}")
        card_doc = ref.get()
        if not card_doc:
            return None
        return card_doc.get('name', '這位聯絡人')
    except Exception as e:
        print(f"Error getting name from card: {e}")
        return None


def get_card_by_id(org_id: str, card_id: str) -> dict:
    """用 card_id 取得名片"""
    try:
        ref = db.reference(f"{config.NAMECARD_PATH}/{org_id}/{card_id}")
        return ref.get()
    except Exception as e:
        print(f"Error getting card by id: {e}")
        return None


ALLOWED_EDIT_FIELDS = {"name", "title", "company", "address", "phone", "mobile", "email", "line_id"}


def update_namecard_field(
        org_id: str, card_id: str, field: str, value: str) -> bool:
    """更新指定名片的特定欄位（僅允許白名單欄位）"""
    if field not in ALLOWED_EDIT_FIELDS:
        print(f"Rejected update for disallowed field: {field}")
        return False
    try:
        ref = db.reference(f"{config.NAMECARD_PATH}/{org_id}/{card_id}")
        ref.update({field: value})
        try:
            card_data = ref.get()
            if card_data:
                trigger_sync(org_id, card_id, card_data)
        except Exception as e_sync:
            print(f"Error triggering sync on field update: {e_sync}")
        return True
    except Exception as e:
        print(f"Error updating {field}: {e}")
        return False


# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------

def upload_qrcode_to_storage(
        image_bytes: BytesIO, user_id: str, card_id: str) -> str:
    """
    上傳 QR Code 圖片到 Firebase Storage 並回傳公開 URL
    """
    try:
        bucket = storage.bucket()
        blob_name = f"qrcodes/{user_id}/{card_id}.png"
        blob = bucket.blob(blob_name)

        image_bytes.seek(0)
        blob.upload_from_file(image_bytes, content_type='image/png')
        blob.make_public()
        return blob.public_url
    except Exception as e:
        print(f"Error uploading QR code to storage: {e}")
        return None


# ---------------------------------------------------------------------------
# Batch Upload: Firebase Storage helpers
# ---------------------------------------------------------------------------

def upload_raw_image_to_storage(org_id: str, user_id: str, image_bytes: bytes) -> str:
    """上傳名片原圖到 Firebase Storage，回傳 storage path"""
    try:
        bucket = storage.bucket()
        file_uuid = str(uuid.uuid4())
        blob_name = f"raw_images/{org_id}/{user_id}/{file_uuid}.jpg"
        blob = bucket.blob(blob_name)
        blob.upload_from_string(image_bytes, content_type='image/jpeg')
        return blob_name
    except Exception as e:
        print(f"Error uploading raw image to storage: {e}")
        return None


def delete_raw_image(storage_path: str) -> None:
    """刪除 Firebase Storage 上的原圖，容錯（不存在時不 raise）"""
    try:
        bucket = storage.bucket()
        blob = bucket.blob(storage_path)
        blob.delete()
    except Exception as e:
        print(f"Warning: could not delete raw image {storage_path}: {e}")


def download_raw_image(storage_path: str) -> bytes:
    """從 Firebase Storage 下載原圖 bytes，供 Worker 使用"""
    try:
        bucket = storage.bucket()
        blob = bucket.blob(storage_path)
        return blob.download_as_bytes()
    except Exception as e:
        print(f"Error downloading raw image {storage_path}: {e}")
        return None


# ---------------------------------------------------------------------------
# Batch Upload: RTDB batch_states CRUD
# Note: batch_states/{user_id} should be write-protected to admin SDK only
#       (update Firebase RTDB security rules accordingly)
# ---------------------------------------------------------------------------

def get_batch_state(user_id: str) -> dict:
    """取得批量上傳狀態，無狀態時回傳 None"""
    try:
        ref = db.reference(f"batch_states/{user_id}")
        return ref.get()
    except Exception as e:
        print(f"Error getting batch state: {e}")
        return None


def init_batch_state(user_id: str, org_id: str) -> None:
    """初始化批量上傳狀態"""
    try:
        now = datetime.now().isoformat()
        # pending_images 不預設空陣列，使用 push() 原子寫入，避免 race condition
        db.reference(f"batch_states/{user_id}").set({
            "org_id": org_id,
            "created_at": now,
            "updated_at": now,
        })
    except Exception as e:
        print(f"Error init batch state: {e}")


def append_batch_image(user_id: str, storage_path: str) -> int:
    """
    原子性新增一張圖到批量狀態，回傳目前 pending_images 數量。
    使用 Firebase push() 避免高併發（LINE 一次送多張圖）時的 race condition。
    pending_images 結構為 Map：{ push_id: storage_path }
    """
    try:
        # push() 是原子操作，不需先讀再寫，多個併發請求不會互蓋
        db.reference(f"batch_states/{user_id}/pending_images").push(storage_path)
        db.reference(f"batch_states/{user_id}/updated_at").set(
            datetime.now().isoformat()
        )
        # 讀取最新數量（允許短暫不一致，此處僅用於顯示）
        pending_map = db.reference(
            f"batch_states/{user_id}/pending_images").get() or {}
        return len(pending_map)
    except Exception as e:
        print(f"Error appending batch image: {e}")
        return 0


def clear_batch_state(user_id: str) -> None:
    """清除批量上傳狀態"""
    try:
        db.reference(f"batch_states/{user_id}").delete()
    except Exception as e:
        print(f"Error clearing batch state: {e}")


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------

def get_namecard_statistics(org_id: str) -> dict:
    """
    取得組織名片統計資訊

    Returns:
        {
            "total": 總名片數,
            "this_month": 本月新增數量,
            "top_company": 最常聯絡公司名稱
        }
    """
    try:
        all_cards = get_all_cards(org_id)
        if not all_cards:
            return {
                "total": 0,
                "this_month": 0,
                "top_company": "無"
            }

        total = len(all_cards)

        now = datetime.now()
        this_month_count = 0

        for card in all_cards.values():
            created_at = card.get('created_at')
            if created_at:
                try:
                    created_date = datetime.fromisoformat(created_at)
                    if (created_date.year == now.year
                            and created_date.month == now.month):
                        this_month_count += 1
                except ValueError:
                    continue

        companies = [
            card.get('company', '').strip()
            for card in all_cards.values()
            if card.get('company')
            and card.get('company') != 'N/A'
            and card.get('company').strip()
        ]

        if companies:
            company_counter = Counter(companies)
            top_company, count = company_counter.most_common(1)[0]
            top_company = f"{top_company} ({count}張)"
        else:
            top_company = "無"

        return {
            "total": total,
            "this_month": this_month_count,
            "top_company": top_company
        }

    except Exception as e:
        print(f"Error getting statistics: {e}")
        return {
            "total": 0,
            "this_month": 0,
            "top_company": "無"
        }
