import random
import string
import uuid
from firebase_admin import db, storage
from . import config
from io import BytesIO
from datetime import timedelta, datetime
from collections import Counter
from .gsheets_utils import trigger_sync


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
    """建立新組織，指定使用者為 admin，回傳 org_id"""
    org_id = f"org_{uuid.uuid4().hex[:8]}"
    now = datetime.now().isoformat()
    try:
        db.reference(f"organizations/{org_id}").set({
            "name": org_name,
            "created_by": user_id,
            "created_at": now,
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


def ensure_user_org(user_id: str) -> str:
    """確保使用者有所屬組織，若無則自動建立個人組織，回傳 org_id"""
    org_id = get_user_org_id(user_id)
    if not org_id:
        short_id = user_id[-8:] if len(user_id) > 8 else user_id
        org_id = create_org(user_id, f"{short_id}的團隊")
    return org_id


def require_admin(org_id: str, user_id: str) -> bool:
    """回傳 True 若使用者為組織 admin"""
    return get_user_role(org_id, user_id) == "admin"


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


ALLOWED_EDIT_FIELDS = {"name", "title", "company", "address", "phone", "email"}


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
