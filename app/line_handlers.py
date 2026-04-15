from urllib.parse import parse_qsl
from typing import Union
from linebot.models import (
    PostbackEvent, MessageEvent, TextSendMessage, ImageSendMessage,
    QuickReply, QuickReplyButton, PostbackAction, FollowEvent,
    FlexSendMessage
)
from io import BytesIO
import os
import PIL.Image
import threading
import smtplib
from email.mime.text import MIMEText
import time
import logging
import json

from . import firebase_utils, gemini_utils, utils, flex_messages, config, qrcode_utils
from .bot_instance import line_bot_api, user_states
from .cloud_tasks_utils import create_process_batch_task
from .repositories.action_repo import ActionRepo
from .repositories.deal_repo import DealRepo
from .repositories.card_repo import CardRepo
from .repositories.org_repo import OrgRepo
from .services.nlu_service import fuzzy_match_entity

logger = logging.getLogger(__name__)

_action_repo = ActionRepo()
_deal_repo = DealRepo()
_card_repo = CardRepo()
_org_repo = OrgRepo()

def _log_ocr_event(event: str, org_id: str, user_id: str, mode: str, reason: str = None):
    """Log structured OCR event to Cloud Logging."""
    payload = {"event": event, "org_id": org_id, "user_id": user_id, "mode": mode}
    if reason:
        payload["reason"] = reason
    if event.endswith("_failure") or event.endswith("_error"):
        logger.error(json.dumps(payload))
    else:
        logger.info(json.dumps(payload))

def get_valid_state(user_id: str) -> dict | None:
    """讀取 user_states，若 state 過期（>30 min）則自動清除並回傳 None。"""
    state = user_states.get(user_id)
    if state is None:
        return None
    if state.get('expires_at', 0) < time.time():
        del user_states[user_id]
        return None
    return state

FIELD_LABELS = {
    "name": "姓名", "title": "職稱", "company": "公司",
    "address": "地址", "phone": "電話", "mobile": "手機",
    "email": "Email", "line_id": "LINE ID"
}


def attach_cancel_quick_reply(
    reply_message: Union[TextSendMessage, FlexSendMessage]
) -> Union[TextSendMessage, FlexSendMessage]:
    """為訊息附加取消 Quick Reply

    Mutates the input message in-place by adding a cancel quick reply button.

    Args:
        reply_message: LINE MessageObject (TextSendMessage or FlexMessage)

    Returns:
        The same message object with quick_reply attached: ❌ 取消

    Raises:
        ValueError: If reply_message is None
    """
    if reply_message is None:
        raise ValueError("reply_message cannot be None")

    quick_reply = QuickReply(
        items=[
            QuickReplyButton(
                action=PostbackAction(
                    label="❌ 取消",
                    data="action=cancel_state"
                )
            )
        ]
    )
    reply_message.quick_reply = quick_reply
    return reply_message


async def handle_cancel_state_postback(user_id: str, reply_token: str):
    """處理 cancel_state postback

    Flow:
    1. 清除 user_states[user_id]
    2. 回覆「已取消」訊息
    """
    if user_id in user_states:
        del user_states[user_id]

    reply = TextSendMessage(text="✓ 已取消操作")
    await line_bot_api.reply_message(reply_token, reply)


async def check_onboarding(user_id: str, reply_token: str) -> bool:
    """若用戶無 org，回覆 onboarding 選擇訊息並回傳 True（表示已攔截）。"""
    if firebase_utils.get_user_org_id(user_id):
        return False
    await line_bot_api.reply_message(
        reply_token,
        flex_messages.get_onboarding_welcome_message()
    )
    return True


async def handle_postback_event(event: PostbackEvent, user_id: str):
    postback_data = dict(parse_qsl(event.postback.data))
    action = postback_data.get('action')
    card_id = postback_data.get('card_id')

    # Route cancel_state first (before onboarding check)
    if action == 'cancel_state':
        await handle_cancel_state_postback(user_id, event.reply_token)
        return

    # create_org：onboarding 選擇「建立團隊」（在 onboarding 攔截前處理，避免死鎖）
    if action == 'create_org':
        org_id, is_new_org = firebase_utils.ensure_user_org(user_id)
        if is_new_org:
            await line_bot_api.push_message(
                user_id, flex_messages.get_trial_welcome_message()
            )
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='您的團隊已建立！現在可以開始掃描名片了。📇')
        )
        return

    # Onboarding 攔截：新用戶尚未選擇組織
    if await check_onboarding(user_id, event.reply_token):
        return

    org_id, _ = firebase_utils.ensure_user_org(user_id)

    # 處理功能性 action（不需要 card_id）
    if action == 'show_stats':
        stats = firebase_utils.get_namecard_statistics(org_id)
        stats_text = f"""📊 名片統計資訊

📇 總名片數：{stats['total']} 張
📅 本月新增：{stats['this_month']} 張
🏢 最常合作公司：{stats['top_company']}"""
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text=stats_text)
        )
        return

    elif action == 'show_list':
        all_cards = firebase_utils.get_all_cards(org_id)
        list_text = f"📋 總共有 {len(all_cards)} 張名片資料。"
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text=list_text)
        )
        return

    elif action == 'show_test':
        test_namecard = utils.generate_sample_namecard()
        reply_card_msg = flex_messages.get_namecard_flex_msg(
            test_namecard, "test_card_id")
        await line_bot_api.reply_message(event.reply_token, [reply_card_msg])
        return

    elif action == 'show_help':
        help_text = """ℹ️ 名片管理機器人使用說明

📸 上傳名片圖片 → 自動辨識並儲存
🔍 輸入文字 → 智能搜尋相關名片
📊 統計 → 查看名片統計資訊
📋 列表 → 顯示名片總數
🧪 測試 → 查看範例名片
👥 團隊 → 查看團隊資訊
👤 成員 → 查看成員清單
📨 邀請 → 產生邀請碼（管理員）
加入 XXXXXX → 用邀請碼加入團隊

💡 小提示：
• 點擊名片可以編輯、加入備註
• 使用「加入通訊錄」可下載 QR Code"""
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text=help_text)
        )
        return

    elif action == 'show_team':
        await handle_team_info(event, user_id, org_id)
        return

    elif action == 'show_members':
        await handle_member_list(event, org_id)
        return

    elif action == 'show_invite':
        await handle_invite(event, user_id, org_id)
        return

    elif action == 'show_tags':
        await handle_show_tags(event, user_id, org_id)
        return

    elif action == 'manage_tags':
        await handle_manage_tags(event, user_id, org_id)
        return

    elif action == 'add_tag_input':
        await handle_add_tag_input(event, user_id, org_id)
        return

    elif action == 'confirm_delete_tag':
        tag_name = postback_data.get('tag_name', '')
        await handle_confirm_delete_tag(event, user_id, org_id, tag_name)
        return

    elif action == 'exec_delete_tag':
        tag_name = postback_data.get('tag_name', '')
        await handle_exec_delete_tag(event, user_id, org_id, tag_name)
        return

    elif action == 'show_export':
        await handle_export(event, user_id, org_id)
        return

    elif action == 'list_by_tag':
        tag_name = postback_data.get('tag_name', '')
        await handle_list_by_tag(event, org_id, tag_name)
        return

    elif action == 'tag_card':
        await handle_tag_card(event, org_id, card_id)
        return

    elif action == "start_search":
        user_states[user_id] = {'action': 'searching', 'expires_at': time.time() + 1800}
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text="🔍 請輸入姓名、公司或職稱關鍵字：",
                quick_reply=QuickReply(items=[
                    QuickReplyButton(
                        action=PostbackAction(label="❌ 取消", data="action=cancel_search")
                    )
                ])
            )
        )
        return

    elif action == "cancel_search":
        user_states.pop(user_id, None)
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text="已取消搜尋。"
            )
        )
        return

    elif action == "single_add":
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text="請傳送名片照片 📷"
            )
        )
        return

    elif action == "batch_start":
        firebase_utils.init_batch_state(user_id, org_id)
        message_text = """批量上傳模式已開啟！請逐一傳送名片照片。
傳完所有照片後，輸入「完成」開始處理。

⚠️ 系統將依序辨識並於全部完成後通知結果，
   完成前請勿輸入其他指令。"""
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text=message_text)
        )
        return

    elif action == "scan_back":
        _state = get_valid_state(user_id)
        if _state and _state.get('action') == 'scanning_back':
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(text="請傳送名片背面照片 📷")
            )
        else:
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(
                    text="找不到正面名片資料，請重新掃描。"
                )
            )
        return

    elif action == "save_front":
        state = get_valid_state(user_id)
        if state and state.get('action') == 'scanning_back':
            front_data = state['front_data']
            front_data = utils.validate_namecard_fields(front_data)
            user_states.pop(user_id, None)
            await _save_and_reply_namecard(event, user_id, org_id, front_data)
        else:
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(
                    text="找不到待儲存的名片資料，請重新掃描。"
                )
            )
        return

    elif action == 'toggle_role':
        tag_name = postback_data.get('tag_name', '')
        await handle_toggle_role(event, user_id, org_id, card_id, tag_name)
        return

    elif action == 'finish_tag':
        await handle_finish_tag(event, org_id, card_id)
        return

    elif action == 'view_card':
        card = firebase_utils.get_card_by_id(org_id, card_id)
        if card:
            await line_bot_api.reply_message(
                event.reply_token,
                [flex_messages.get_namecard_flex_msg(card, card_id)])
        else:
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(text='此名片已不存在。'))
        return

    # ── Rich Menu 主選單 actions ────────────────────────────────────────────
    elif action == 'menu_card':
        await handle_menu_card(event.reply_token)
        return

    elif action == 'menu_team':
        await handle_menu_team(event.reply_token)
        return

    elif action == 'menu_data':
        await handle_menu_data(event.reply_token)
        return

    elif action == 'menu_search_prompt':
        user_states[user_id] = {'action': 'searching', 'expires_at': time.time() + 1800}
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text="🔍 請輸入關鍵字搜尋名片，例如：王小明、ABC 公司"
            )
        )
        return

    elif action == 'menu_join_prompt':
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text="請輸入邀請碼，格式：加入 <邀請碼>"
            )
        )
        return

    elif action == 'menu_sheets_status':
        if config.GOOGLE_SHEET_ID:
            status_text = f"✅ Google Sheets 同步已啟用\nSheet ID: {config.GOOGLE_SHEET_ID}"
        else:
            status_text = "❌ Google Sheets 同步未設定（請聯絡管理員設定 GOOGLE_SHEET_ID）"
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text=status_text)
        )
        return
    # ── end Rich Menu actions ───────────────────────────────────────────────

    # 處理需要 card_id 的 action
    card_name = firebase_utils.get_name_from_card(org_id, card_id)
    if not card_name:
        await line_bot_api.reply_message(
            event.reply_token, TextSendMessage(text='找不到該名片資料。'))
        return

    if action == 'add_memo':
        user_states[user_id] = {
            'action': 'adding_memo',
            'card_id': card_id,
            'expires_at': time.time() + 1800
        }
        reply_text = f"請輸入「{card_name}」的備忘錄內容，完成後直接送出。"
        await line_bot_api.reply_message(
            event.reply_token, TextSendMessage(
                text=reply_text,
                quick_reply=QuickReply(items=[
                    QuickReplyButton(action=PostbackAction(label="❌ 取消操作", data="action=cancel_state"))
                ])
            ))

    elif action == 'edit_card':
        reply_msg = flex_messages.get_edit_options_flex_msg(card_id, card_name)
        await line_bot_api.reply_message(event.reply_token, [reply_msg])

    elif action == 'edit_field':
        field_to_edit = postback_data.get('field')
        field_label = FIELD_LABELS.get(field_to_edit, "資料")
        user_states[user_id] = {
            'action': 'editing_field',
            'card_id': card_id,
            'field': field_to_edit,
            'expires_at': time.time() + 1800
        }
        reply_text = f"請輸入「{card_name}」的新{field_label}，完成後直接送出。"
        await line_bot_api.reply_message(
            event.reply_token, TextSendMessage(
                text=reply_text,
                quick_reply=QuickReply(items=[
                    QuickReplyButton(action=PostbackAction(label="❌ 取消操作", data="action=cancel_state"))
                ])
            ))

    elif action == 'download_contact':
        await handle_download_contact(event, user_id, org_id, card_id, card_name)

    elif action == 'delete_card':
        await handle_delete_card(event, user_id, org_id, card_id, card_name)


async def handle_delete_card(
        event: PostbackEvent, user_id: str, org_id: str,
        card_id: str, card_name: str):
    """處理刪除名片，套用角色權限檢查"""
    # 取得使用者角色
    user_role = firebase_utils.require_admin(org_id, user_id)
    user_role = "admin" if user_role else "member"

    # 嘗試刪除名片（參數順序：card_id, user_id, org_id, user_role）
    success = firebase_utils.delete_namecard(card_id, user_id, org_id, user_role)

    if success:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text=f'已刪除「{card_name}」的名片。'
            ))
    else:
        # 檢查名片是否存在
        if firebase_utils.check_card_exists(org_id, card_id):
            # 名片存在但無權限
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(
                    text='抱歉，您沒有權限刪除此名片。'
                ))
        else:
            # 名片不存在
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(text='找不到該名片資料。'))


async def handle_download_contact(
        event: PostbackEvent, user_id: str, org_id: str,
        card_id: str, card_name: str):
    """處理下載聯絡人 QR Code 的請求"""
    try:
        card_data = firebase_utils.get_card_by_id(org_id, card_id)
        if not card_data:
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(text='找不到該名片資料。'))
            return

        qrcode_image = qrcode_utils.generate_vcard_qrcode(card_data)

        image_url = firebase_utils.upload_qrcode_to_storage(
            qrcode_image, user_id, card_id)

        if not image_url:
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(text='生成 QR Code 時發生錯誤，請稍後再試。'))
            return

        instruction_text = qrcode_utils.get_qrcode_usage_instruction(card_name)

        image_message = ImageSendMessage(
            original_content_url=image_url,
            preview_image_url=image_url
        )
        text_message = TextSendMessage(text=instruction_text)

        await line_bot_api.reply_message(
            event.reply_token,
            [image_message, text_message])

    except Exception as e:
        print(f"Error in handle_download_contact: {e}")
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='處理您的請求時發生錯誤，請稍後再試。'))


async def handle_menu_card(reply_token: str) -> None:
    """名片操作主選單 Quick Reply"""
    quick_reply = flex_messages.build_quick_reply([
        {"label": "➕ 新增名片", "action_type": "message", "text": "新增"},
        {"label": "🔍 智慧搜尋", "action_type": "postback",
         "data": "action=menu_search_prompt"},
        {"label": "🏷 標籤管理", "action_type": "postback",
         "data": "action=show_tags"},
        {"label": "🧹 清理重複", "action_type": "message", "text": "remove"},
    ])
    await line_bot_api.reply_message(
        reply_token,
        TextSendMessage(text="請選擇名片操作 👇", quick_reply=quick_reply)
    )


async def handle_menu_team(reply_token: str) -> None:
    """團隊功能主選單 Quick Reply"""
    quick_reply = flex_messages.build_quick_reply([
        {"label": "👥 查看團隊資訊", "action_type": "message", "text": "team"},
        {"label": "👤 查看成員", "action_type": "message", "text": "members"},
        {"label": "📨 邀請成員", "action_type": "message", "text": "invite"},
        {"label": "🔗 加入團隊", "action_type": "postback",
         "data": "action=menu_join_prompt"},
    ])
    await line_bot_api.reply_message(
        reply_token,
        TextSendMessage(text="請選擇團隊功能 👇", quick_reply=quick_reply)
    )


async def handle_menu_data(reply_token: str) -> None:
    """資料與設定主選單 Quick Reply"""
    quick_reply = flex_messages.build_quick_reply([
        {"label": "📊 統計", "action_type": "postback", "data": "action=show_stats"},
        {"label": "📤 匯出 CSV", "action_type": "message", "text": "匯出"},
    ])
    await line_bot_api.reply_message(
        reply_token,
        TextSendMessage(text="請選擇資料功能 👇", quick_reply=quick_reply)
    )


async def handle_text_event(event: MessageEvent, user_id: str) -> None:
    msg = event.message.text

    # 加入流程優先處理（加入前 user 可能沒有 org）
    if msg.upper().startswith("加入 "):
        await handle_join(event, user_id, msg)
        return

    # Onboarding 攔截：新用戶尚未選擇組織
    if await check_onboarding(user_id, event.reply_token):
        return

    org_id, is_new_org = firebase_utils.ensure_user_org(user_id)
    if is_new_org:
        await line_bot_api.push_message(
            user_id, flex_messages.get_trial_welcome_message()
        )
    _state = get_valid_state(user_id)
    user_action = _state.get('action') if _state else None

    # 若在等待背面照片期間收到文字，靜默清除 state，讓指令繼續正常執行
    if user_action == 'scanning_back':
        user_states.pop(user_id, None)
        user_action = None

    if user_action == 'adding_memo':
        await handle_add_memo_state(event, user_id, org_id, msg)
    elif user_action == 'editing_field':
        await handle_edit_field_state(event, user_id, org_id, msg)
    elif user_action == 'exporting_csv':
        await handle_export_email_state(event, user_id, org_id, msg)
    elif user_action == 'adding_tag':
        await handle_adding_tag_state(event, user_id, org_id, msg)
    elif user_action == 'reporting_issue':
        await handle_reporting_issue_state(user_id, org_id, msg, event.reply_token)
    elif msg == "remove":
        firebase_utils.remove_redundant_data(org_id)
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text="重複名片清理完成。"
            ),
        )
    elif msg in ("團隊", "team"):
        await handle_team_info(event, user_id, org_id)
    elif msg in ("成員", "members"):
        await handle_member_list(event, org_id)
    elif msg in ("邀請", "invite"):
        await handle_invite(event, user_id, org_id)
    elif msg.startswith("設定團隊名稱 "):
        await handle_set_team_name(event, user_id, org_id, msg)
    elif msg in ("標籤", "tags"):
        await handle_show_tags(event, user_id, org_id)
    elif user_action == 'searching':
        user_states.pop(user_id, None)
        await handle_smart_query(event, org_id, msg)
    elif msg in ("匯出", "export"):
        await handle_export(event, user_id, org_id)
    elif msg == "新增":
        add_items = [
            {"label": "📸 單張上傳", "action_type": "message", "text": "單張上傳"},
        ]
        if config.BATCH_UPLOAD_ENABLED:
            add_items.append(
                {"label": "🗂️ 批量上傳", "action_type": "postback",
                 "data": "action=batch_start", "display_text": "批量排程上傳"}
            )
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text="請選擇上傳方式 👇",
                quick_reply=flex_messages.build_quick_reply(add_items)
            )
        )
    elif msg == "單張上傳":
        firebase_utils.clear_batch_state(user_id)
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text="請直接傳送名片照片，Bot 將自動辨識並儲存。")
        )
    elif msg == "管理":
        manage_items = [
            {"label": "🏷 群組管理", "action_type": "message", "text": "群組"},
            {"label": "🧹 清理重複名片", "action_type": "message", "text": "remove"},
        ]
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text="請選擇管理操作 👇",
                quick_reply=flex_messages.build_quick_reply(manage_items)
            )
        )
    elif msg == "群組":
        await handle_show_tags(event, user_id, org_id)
    elif msg.strip() == "回報問題":
        await handle_reporting_issue_trigger(user_id, org_id, event.reply_token)
    elif msg == "完成":
        await handle_batch_done(event, user_id, org_id)
    elif msg == "取消":
        await handle_batch_cancel(event, user_id, org_id)
    elif msg in ("我的待辦", "today"):
        await handle_crm_today(event.reply_token, user_id, org_id)
    elif msg.startswith("查 ") and len(msg) > 2:
        await handle_crm_search(event.reply_token, org_id, msg[2:].strip())
    elif msg == "pipeline":
        await handle_crm_pipeline(event.reply_token, user_id, org_id)
    else:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text="找不到對應指令，請點下方選單操作。")
        )


async def handle_team_info(
        event: MessageEvent, user_id: str, org_id: str):
    """回傳組織資訊 Flex Message"""
    org = firebase_utils.get_org(org_id)
    org_name = org.get("name", "未命名團隊")
    members = org.get("members", {})
    member_count = len(members)
    user_role = firebase_utils.get_user_role(org_id, user_id) or "member"

    reply_msg = flex_messages.team_info_flex(org_name, member_count, user_role)
    await line_bot_api.reply_message(event.reply_token, [reply_msg])


async def handle_member_list(event: MessageEvent, org_id: str):
    """回傳成員清單 Flex Message，以 LINE 真實暱稱顯示"""
    org = firebase_utils.get_org(org_id)
    org_name = org.get("name", "未命名團隊")
    raw_members = org.get("members", {})

    members = []
    for uid, info in raw_members.items():
        display_name = firebase_utils.get_cached_display_name(uid)
        if not display_name:
            try:
                profile = await line_bot_api.get_profile(uid)
                display_name = profile.display_name
                firebase_utils.cache_display_name(uid, display_name)
            except Exception:
                display_name = uid[-8:]
        members.append({
            "display_name": display_name,
            "role": info.get("role", "member")
        })

    reply_msg = flex_messages.member_list_flex(org_name, members)
    await line_bot_api.reply_message(event.reply_token, [reply_msg])


async def handle_invite(
        event: MessageEvent, user_id: str, org_id: str):
    """產生邀請碼（管理員限定）"""
    if not firebase_utils.require_admin(org_id, user_id):
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='此功能僅限管理員使用。'))
        return

    code, expires_at = firebase_utils.create_invite_code(org_id, user_id)
    if not code:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='產生邀請碼時發生錯誤，請稍後再試。'))
        return

    org = firebase_utils.get_org(org_id)
    org_name = org.get("name", "未命名團隊")

    reply_msg = flex_messages.invite_code_flex(code, expires_at, org_name)
    await line_bot_api.reply_message(event.reply_token, [reply_msg])


async def handle_join(event: MessageEvent, user_id: str, msg: str):
    """處理加入組織（輸入「加入 <code>」）"""
    code = msg[3:].strip().upper()

    existing_org = firebase_utils.get_user_org_id(user_id)
    if existing_org:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='您已經在一個團隊中，無法重複加入。'))
        return

    invite = firebase_utils.get_invite_code(code)
    if not invite:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text=f'找不到邀請碼「{code}」，請確認後再試。'))
        return

    from datetime import datetime
    if datetime.fromisoformat(invite['expires_at']) < datetime.now():
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='此邀請碼已過期，請請管理員重新產生。'))
        return

    target_org_id = invite['org_id']

    # 成員上限檢查
    perm = firebase_utils.check_org_permission(target_org_id, 'add_member')
    if not perm['allowed']:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text='該團隊成員人數已達試用上限（3 人），需升級方案才能繼續邀請。'
            )
        )
        return

    firebase_utils.add_member(target_org_id, user_id)

    org = firebase_utils.get_org(target_org_id)
    org_name = org.get("name", "未命名團隊")

    await line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(
            text=f'歡迎加入「{org_name}」！您現在可以存取團隊的名片庫了。'
        ))


async def handle_set_team_name(
        event: MessageEvent, user_id: str, org_id: str, msg: str):
    """設定團隊名稱（管理員限定）"""
    if not firebase_utils.require_admin(org_id, user_id):
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='此功能僅限管理員使用。'))
        return

    new_name = msg[len("設定團隊名稱 "):].strip()
    if not new_name:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='請輸入有效的團隊名稱。'))
        return

    firebase_utils.update_org_name(org_id, new_name)
    await line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(
            text=f'團隊名稱已更新為「{new_name}」。'
        ))


async def handle_manage_tags(
        event: PostbackEvent, user_id: str, org_id: str):
    """顯示標籤管理介面（管理員限定）"""
    if not firebase_utils.require_admin(org_id, user_id):
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='此功能僅限管理員使用。'))
        return
    firebase_utils.ensure_default_role_tags(org_id)
    tags = firebase_utils.get_all_role_tags(org_id)
    reply_msg = flex_messages.tag_management_flex(tags)
    await line_bot_api.reply_message(event.reply_token, [reply_msg])


async def handle_add_tag_input(
        event: PostbackEvent, user_id: str, org_id: str):
    """進入新增標籤的文字輸入狀態（管理員限定）"""
    if not firebase_utils.require_admin(org_id, user_id):
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='此功能僅限管理員使用。'))
        return
    user_states[user_id] = {'action': 'adding_tag', 'org_id': org_id, 'expires_at': time.time() + 1800}
    await line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(
            text='請輸入新標籤名稱，完成後直接送出。',
            quick_reply=QuickReply(items=[
                QuickReplyButton(action=PostbackAction(label="❌ 取消操作", data="action=cancel_state"))
            ])
        ))


async def handle_confirm_delete_tag(
        event: PostbackEvent, user_id: str, org_id: str, tag_name: str):
    """顯示刪除標籤確認訊息（管理員限定）"""
    if not firebase_utils.require_admin(org_id, user_id):
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='此功能僅限管理員使用。'))
        return
    reply_msg = flex_messages.confirm_delete_tag_flex(tag_name)
    await line_bot_api.reply_message(event.reply_token, [reply_msg])


async def handle_exec_delete_tag(
        event: PostbackEvent, user_id: str, org_id: str, tag_name: str):
    """執行刪除標籤（管理員限定）"""
    if not firebase_utils.require_admin(org_id, user_id):
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='此功能僅限管理員使用。'))
        return
    firebase_utils.delete_role_tag(org_id, tag_name)
    tags = firebase_utils.get_all_role_tags(org_id)
    reply_msg = flex_messages.tag_management_flex(tags)
    await line_bot_api.reply_message(
        event.reply_token,
        [TextSendMessage(text=f'已刪除標籤「{tag_name}」。'),
         reply_msg])


async def handle_adding_tag_state(
        event: MessageEvent, user_id: str, org_id: str, msg: str):
    """處理新增標籤的文字輸入"""
    state = get_valid_state(user_id)
    if state is None:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='操作已逾時，請重新開始。'))
        return
    tag_name = msg.strip()
    del user_states[user_id]
    if not tag_name:
        reply = TextSendMessage(text='請輸入有效的標籤名稱。')
        reply = attach_cancel_quick_reply(reply)
        await line_bot_api.reply_message(event.reply_token, reply)
        return
    result = firebase_utils.add_role_tag(org_id, tag_name)
    tags = firebase_utils.get_all_role_tags(org_id)
    reply_msg = flex_messages.tag_management_flex(tags)
    if result:
        text = f'已新增標籤「{tag_name}」。'
    else:
        text = f'標籤「{tag_name}」已存在。'
    text_msg = TextSendMessage(text=text)
    text_msg = attach_cancel_quick_reply(text_msg)
    await line_bot_api.reply_message(
        event.reply_token,
        [text_msg, reply_msg])


async def handle_show_tags(event: MessageEvent, user_id: str, org_id: str):
    """顯示組織角色標籤清單（管理員可見管理按鈕）"""
    firebase_utils.ensure_default_role_tags(org_id)
    tags = firebase_utils.get_all_role_tags(org_id)
    all_cards = firebase_utils.get_all_cards(org_id)

    tag_counts = {}
    for tag in tags:
        tag_counts[tag] = sum(
            1 for card in all_cards.values()
            if tag in (card.get("role_tags") or [])
        )

    is_admin = firebase_utils.require_admin(org_id, user_id)
    reply_msg = flex_messages.tag_list_flex(tags, tag_counts, is_admin=is_admin)
    await line_bot_api.reply_message(event.reply_token, [reply_msg])


async def handle_tag_card(
        event: PostbackEvent, org_id: str, card_id: str):
    """顯示名片的角色標籤 toggle 選單"""
    if not card_id:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='找不到名片資料。'))
        return

    firebase_utils.ensure_default_role_tags(org_id)
    tags = firebase_utils.get_all_role_tags(org_id)
    card = firebase_utils.get_card_by_id(org_id, card_id)
    current_tags = (card or {}).get("role_tags") or []

    reply_msg = flex_messages.role_tag_select_flex(card_id, tags, current_tags)
    await line_bot_api.reply_message(event.reply_token, [reply_msg])


async def handle_toggle_role(
        event: PostbackEvent, user_id: str, org_id: str, card_id: str, tag_name: str):
    """Toggle 名片上的角色標籤，完成後重新顯示選單"""
    if not card_id or not tag_name:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='操作失敗，請稍後再試。'))
        return

    # 取得使用者角色
    user_role = firebase_utils.require_admin(org_id, user_id)
    user_role = "admin" if user_role else "member"

    card = firebase_utils.get_card_by_id(org_id, card_id)
    current_tags = (card or {}).get("role_tags") or []

    success = False
    if tag_name in current_tags:
        success = firebase_utils.remove_card_role_tag(org_id, card_id, tag_name, user_id, user_role)
    else:
        success = firebase_utils.add_card_role_tag(org_id, card_id, tag_name, user_id, user_role)

    if not success:
        # 檢查名片是否存在
        if firebase_utils.check_card_exists(org_id, card_id):
            # 名片存在但無權限
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(
                    text='抱歉，您沒有權限給此名片加標籤。'
                ))
        else:
            # 名片不存在
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(text='找不到該名片資料。'))
        return

    # 重新讀取並顯示更新後的選單
    tags = firebase_utils.get_all_role_tags(org_id)
    updated_card = firebase_utils.get_card_by_id(org_id, card_id)
    updated_tags = (updated_card or {}).get("role_tags") or []

    reply_msg = flex_messages.role_tag_select_flex(card_id, tags, updated_tags)
    await line_bot_api.reply_message(event.reply_token, [reply_msg])


async def handle_finish_tag(
        event: PostbackEvent, org_id: str, card_id: str):
    """標籤選取完成，顯示更新後的名片"""
    card = firebase_utils.get_card_by_id(org_id, card_id)
    if card:
        reply_msg = flex_messages.get_namecard_flex_msg(card, card_id)
        tags = (card.get("role_tags") or [])
        tag_text = "、".join(tags) if tags else "無"
        await line_bot_api.reply_message(
            event.reply_token,
            [TextSendMessage(
                text=f'標籤已更新：{tag_text}'),
             reply_msg])
    else:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='找不到名片資料。'))


async def handle_list_by_tag(
        event: PostbackEvent, org_id: str, tag_name: str):
    """顯示指定標籤下的名片列表（最多 10 張）"""
    try:
        matched = firebase_utils.get_cards_by_role_tag(org_id, tag_name)
        if not matched:
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(
                    text=f'「{tag_name}」標籤下尚無名片。'))
            return

        total = len(matched)
        items = list(matched.items())[:10]
        if len(items) == 1:
            card_id, card_data = items[0]
            msgs = [flex_messages.get_namecard_flex_msg(card_data, card_id)]
        else:
            msgs = [flex_messages.get_namecard_carousel_msg(items)]
            if total > 10:
                msgs.append(TextSendMessage(
                    text=f'共 {total} 張名片，顯示前 10 張。'))
        await line_bot_api.reply_message(event.reply_token, msgs)
    except Exception as e:
        print(f"Error in handle_list_by_tag: {e}")
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text='載入名片時發生錯誤，請稍後再試。'))


async def handle_export(
        event: MessageEvent, user_id: str, org_id: str):
    """啟動 CSV 匯出流程"""
    from . import config as cfg
    if not cfg.SMTP_USER or not cfg.SMTP_PASSWORD:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text='匯出功能尚未設定，請聯繫管理員。'))
        return

    user_states[user_id] = {'action': 'exporting_csv', 'org_id': org_id, 'expires_at': time.time() + 1800}
    await line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(
            text='請輸入收件 Email，系統將寄送名片清單至該信箱。',
            quick_reply=QuickReply(items=[
                QuickReplyButton(action=PostbackAction(label="❌ 取消操作", data="action=cancel_state"))
            ])
        ))


async def handle_export_email_state(
        event: MessageEvent, user_id: str, org_id: str, msg: str):
    """處理匯出流程中的 email 輸入"""
    state = get_valid_state(user_id)
    if state is None:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='操作已逾時，請重新開始。'))
        return
    import re
    if not re.match(r'^[^@]+@[^@]+\.[^@]+$', msg.strip()):
        reply = TextSendMessage(text='email 格式不正確，請重新輸入。')
        reply = attach_cancel_quick_reply(reply)
        await line_bot_api.reply_message(event.reply_token, reply)
        return

    to_email = msg.strip()
    del user_states[user_id]

    try:
        from .csv_export import generate_csv, send_csv_email
        user_role = firebase_utils.get_user_role(org_id, user_id) or "member"
        all_cards = firebase_utils.get_all_namecards(
            org_id, user_id, user_role)
        org = firebase_utils.get_org(org_id)
        org_name = org.get("name", "團隊")
        csv_bytes = generate_csv(all_cards, org_name)
        send_csv_email(csv_bytes, to_email, org_name)
        reply = TextSendMessage(text=f'CSV 已寄送至 {to_email}，請查收信箱。')
        reply = attach_cancel_quick_reply(reply)
        await line_bot_api.reply_message(event.reply_token, reply)
    except Exception as e:
        print(f"Error in CSV export: {e}")
        reply = TextSendMessage(text='CSV 寄送失敗，請稍後再試或確認 email 地址。')
        reply = attach_cancel_quick_reply(reply)
        await line_bot_api.reply_message(event.reply_token, reply)


async def handle_add_memo_state(
        event: MessageEvent, user_id: str, org_id: str, msg: str):
    state = get_valid_state(user_id)
    if state is None:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='操作已逾時，請重新開始。'))
        return
    card_id = state['card_id']

    if firebase_utils.update_namecard_memo(card_id, org_id, msg):
        reply = TextSendMessage(text='備忘錄已成功更新！')
        reply = attach_cancel_quick_reply(reply)
        await line_bot_api.reply_message(event.reply_token, reply)
    else:
        reply = TextSendMessage(text='新增備忘錄時發生錯誤，請稍後再試。')
        reply = attach_cancel_quick_reply(reply)
        await line_bot_api.reply_message(event.reply_token, reply)
    del user_states[user_id]


async def handle_edit_field_state(
        event: MessageEvent, user_id: str, org_id: str, msg: str):
    state = get_valid_state(user_id)
    if state is None:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='操作已逾時，請重新開始。'))
        return
    card_id = state['card_id']
    field = state['field']

    # 取得使用者角色
    user_role = firebase_utils.require_admin(org_id, user_id)
    user_role = "admin" if user_role else "member"

    # 嘗試更新名片（參數順序：card_id, user_id, org_id, field, value, user_role）
    success = firebase_utils.update_namecard_field(card_id, user_id, org_id, field, msg, user_role)

    if success:
        updated_card = firebase_utils.get_card_by_id(org_id, card_id)
        if updated_card:
            reply_msg = flex_messages.get_namecard_flex_msg(
                updated_card, card_id)
            text_msg = TextSendMessage(text='資料已成功更新！')
            text_msg = attach_cancel_quick_reply(text_msg)
            await line_bot_api.reply_message(
                event.reply_token,
                [text_msg, reply_msg]
            )
        else:
            reply = TextSendMessage(text='資料更新成功，但無法立即顯示。')
            reply = attach_cancel_quick_reply(reply)
            await line_bot_api.reply_message(event.reply_token, reply)
    else:
        # 檢查名片是否存在
        if firebase_utils.check_card_exists(org_id, card_id):
            # 名片存在但無權限
            reply = TextSendMessage(text='抱歉，您沒有權限訪問或修改此名片。')
            reply = attach_cancel_quick_reply(reply)
            await line_bot_api.reply_message(event.reply_token, reply)
        else:
            # 名片不存在或欄位不允許編輯
            reply = TextSendMessage(text='更新資料時發生錯誤，請稍後再試。')
            reply = attach_cancel_quick_reply(reply)
            await line_bot_api.reply_message(event.reply_token, reply)
    del user_states[user_id]


async def handle_reporting_issue_trigger(user_id: str, org_id: str, reply_token: str):
    """用戶輸入「回報問題」時觸發"""
    from datetime import datetime
    user_states[user_id] = {
        'action': 'reporting_issue',
        'org_id': org_id,
        'created_at': datetime.utcnow().isoformat(),
        'expires_at': time.time() + 1800
    }

    reply = TextSendMessage(
        text="請描述您遇到的問題，完成後直接送出。",
        quick_reply=QuickReply(items=[
            QuickReplyButton(action=PostbackAction(label="❌ 取消操作", data="action=cancel_state"))
        ])
    )
    await line_bot_api.reply_message(reply_token, reply)


async def handle_reporting_issue_state(user_id: str, org_id: str, content: str,
                                       reply_token: str):
    """用戶在 reporting_issue 狀態下輸入內容或傳圖"""
    state = get_valid_state(user_id)
    if state is None:
        await line_bot_api.reply_message(
            reply_token,
            TextSendMessage(text='操作已逾時，請重新開始。'))
        return
    from datetime import datetime
    timestamp = datetime.utcnow().isoformat()

    # 寫入 Firebase
    feedback_data = {
        'content': content,
        'type': 'text',
        'created_at': timestamp,
        'user_id': user_id
    }
    firebase_utils.write_feedback(org_id, user_id, timestamp, feedback_data)

    # 清除 state
    del user_states[user_id]

    # 回覆確認訊息
    reply = TextSendMessage(
        text="感謝回報！我們已收到您的反映，將盡快改善。"
    )
    await line_bot_api.reply_message(reply_token, reply)


async def handle_smart_query(
        event: MessageEvent, org_id: str, msg: str):
    all_cards_dict = firebase_utils.get_all_cards(org_id)
    if not all_cards_dict:
        await line_bot_api.reply_message(
            event.reply_token,
            [TextSendMessage(
                text="目前團隊尚未建立任何名片。"
            )])
        return

    try:
        matched = firebase_utils.search_cards(org_id, msg)

        if not matched:
            await line_bot_api.reply_message(
                event.reply_token,
                [TextSendMessage(
                    text=f"查無「{msg}」相關名片。"
                )])
        elif len(matched) == 1:
            cid, card_obj = matched[0]
            await line_bot_api.reply_message(
                event.reply_token,
                [flex_messages.get_namecard_flex_msg(card_obj, cid)])
        else:
            display = matched[:10]
            msgs = [flex_messages.get_namecard_carousel_msg(display)]
            if len(matched) > 10:
                msgs.append(TextSendMessage(
                    text=f"共 {len(matched)} 筆，顯示前 10 筆，請縮小搜尋範圍。"))
            await line_bot_api.reply_message(event.reply_token, msgs)
    except Exception as e:
        print(f"Error in handle_smart_query: {e}")
        import traceback
        traceback.print_exc()
        try:
            await line_bot_api.reply_message(
                event.reply_token,
                [TextSendMessage(
                    text="搜尋時發生錯誤，請稍後再試。"
                )]
            )
        except Exception as reply_err:
            print(f"Error sending error reply: {reply_err}")


async def handle_batch_done(
        event: MessageEvent, user_id: str, org_id: str):
    """處理批量上傳「完成」指令：建立 Cloud Task 排程處理"""
    batch_state = firebase_utils.get_batch_state(user_id)
    if not batch_state:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text="您目前不在批量上傳模式中。輸入『新增』開始。"
            )
        )
        return

    # pending_images 為 Map {push_id: storage_path}，取 values 得路徑 list
    pending_map = batch_state.get("pending_images") or {}
    image_paths = list(pending_map.values()) if isinstance(pending_map, dict) else pending_map
    if not image_paths:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text="尚未收到任何圖片，請先傳送名片照片。")
        )
        return

    task_name = create_process_batch_task(user_id, org_id, image_paths)
    firebase_utils.clear_batch_state(user_id)

    if task_name:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text=f"✅ 已排程 {len(image_paths)} 張名片，辨識中請稍候..."
            )
        )
    else:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text="建立排程時發生錯誤，請稍後再試。"
            )
        )


async def handle_batch_cancel(
        event: MessageEvent, user_id: str, org_id: str):
    """處理批量上傳「取消」指令：刪除暫存圖並清除狀態"""
    batch_state = firebase_utils.get_batch_state(user_id)
    if not batch_state:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text="您目前不在批量上傳模式中。"
            )
        )
        return

    pending_map = batch_state.get("pending_images") or {}
    image_paths = list(pending_map.values()) if isinstance(pending_map, dict) else pending_map
    for storage_path in image_paths:
        firebase_utils.delete_raw_image(storage_path)
    firebase_utils.clear_batch_state(user_id)

    await line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(
            text=f"已取消，共丟棄 {len(image_paths)} 張圖片。"
        )
    )


async def _save_and_reply_namecard(event, user_id: str, org_id: str, card_obj: dict):
    """去重、儲存、回覆名片 Flex Message。供正面直接儲存與雙面合併共用。"""
    existing_card_id = firebase_utils.check_if_card_exists(card_obj, org_id)
    if existing_card_id:
        existing_card_data = firebase_utils.get_card_by_id(org_id, existing_card_id)
        reply_msg = flex_messages.get_namecard_flex_msg(existing_card_data, existing_card_id)
        await line_bot_api.reply_message(
            event.reply_token,
            [TextSendMessage(
                text="這個名片已經存在資料庫中。"
            ), reply_msg],
        )
        return

    card_id = firebase_utils.add_namecard(card_obj, org_id, user_id)
    if card_id:
        reply_msg = flex_messages.get_namecard_flex_msg(card_obj, card_id)
        await line_bot_api.reply_message(
            event.reply_token,
            [reply_msg, TextSendMessage(
                text="名片資料已經成功加入資料庫。"
            )]
        )
    else:
        await line_bot_api.reply_message(
            event.reply_token,
            [TextSendMessage(
                text="儲存名片時發生錯誤。"
            )]
        )


async def handle_image_event(event: MessageEvent, user_id: str) -> None:
    # Onboarding 攔截：新用戶尚未選擇組織
    if await check_onboarding(user_id, event.reply_token):
        return

    org_id, is_new_org = firebase_utils.ensure_user_org(user_id)
    if is_new_org:
        await line_bot_api.push_message(
            user_id, flex_messages.get_trial_welcome_message()
        )

    # 權限檢查：試用期或用量上限
    permission = firebase_utils.check_org_permission(org_id, 'scan')
    if not permission['allowed']:
        await line_bot_api.reply_message(
            event.reply_token,
            flex_messages.get_paywall_flex(permission['reason'])
        )
        return

    # 批量模式：靜默收集圖片到 Firebase Storage
    batch_state = firebase_utils.get_batch_state(user_id)
    if batch_state:
        pending_map = batch_state.get("pending_images") or {}
        pending_count = len(pending_map) if isinstance(pending_map, dict) else len(pending_map)
        if pending_count >= 30:
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(
                    text="已達批次上限 30 張，請輸入『完成』送出辨識，或輸入『取消』放棄"
                )
            )
            return
        message_content = await line_bot_api.get_message_content(event.message.id)
        image_bytes = b""
        async for s in message_content.iter_content():
            image_bytes += s
        storage_path = firebase_utils.upload_raw_image_to_storage(
            org_id, user_id, image_bytes)
        if storage_path:
            count = firebase_utils.append_batch_image(user_id, storage_path)
            # 無訊息回應（靜默收集）
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(text=f"已收到第 {count} 張，繼續傳送或輸入『完成』送出辨識")
            )
        else:
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(text="上傳圖片時發生錯誤，請稍後再試。")
            )
        return

    message_content = await line_bot_api.get_message_content(event.message.id)
    image_content = b""
    async for s in message_content.iter_content():
        image_content += s
    img = PIL.Image.open(BytesIO(image_content))
    result = gemini_utils.generate_json_from_image(img, config.IMGAGE_PROMPT)
    card_obj = utils.parse_gemini_result_to_json(result.text)

    if not card_obj:
        _log_ocr_event("ocr_failure", org_id, user_id, "single", reason=result.text[:200])
        await line_bot_api.reply_message(
            event.reply_token,
            [TextSendMessage(text=f"無法解析這張名片，請再試一次。 錯誤資訊: {result.text}")]
        )
        return

    if isinstance(card_obj, list):
        if not card_obj:
            await line_bot_api.reply_message(
                event.reply_token,
                [TextSendMessage(text=f"無法解析這張名片，Gemini 回傳了空的資料。 資訊: {result.text}")]
            )
            return
        card_obj = card_obj[0]

    card_obj = {k.lower(): v for k, v in card_obj.items()}
    _log_ocr_event("ocr_success", org_id, user_id, "single")

    # 背面掃描狀態：合併正背面後儲存
    _state = get_valid_state(user_id)
    if _state and _state.get('action') == 'scanning_back':
        front_data = _state['front_data']
        merged = utils.merge_namecard_data(front_data, card_obj)
        merged = utils.validate_namecard_fields(merged)
        user_states.pop(user_id, None)
        await _save_and_reply_namecard(event, user_id, org_id, merged)
        return

    # 正面掃描：暫存並詢問是否有背面
    name = card_obj.get("name", "N/A")
    company = card_obj.get("company", "N/A")
    user_states[user_id] = {'action': 'scanning_back', 'front_data': card_obj, 'expires_at': time.time() + 1800}
    await line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(
            text=f"已辨識：{name}（{company}）\n\n⚠️ 名片建檔尚未完成，請選擇以下動作：",
            quick_reply=QuickReply(items=[
                QuickReplyButton(
                    action=PostbackAction(label="📷 有背面", data="action=scan_back")
                ),
                QuickReplyButton(
                    action=PostbackAction(label="✅ 直接儲存", data="action=save_front")
                ),
                QuickReplyButton(
                    action=PostbackAction(label="❌ 取消", data="action=cancel_state")
                ),
            ])
        )
    )


async def send_batch_summary_push(user_id: str, summary: dict) -> None:
    """推送批次處理結果摘要給用戶（含成功/失敗清單）"""
    success_count = summary.get('success', 0)
    failed_count = summary.get('failed', 0)
    total = success_count + failed_count
    successes = summary.get('successes', [])
    failures = summary.get('failures', [])

    success_list = ""
    for idx, card in enumerate(successes, 1):
        name = card.get('name', '')
        company = card.get('company', '')
        display = name or company or f"卡片 {idx}"
        if name and company:
            success_list += f"・[{idx}] {name} / {company}\n"
        else:
            success_list += f"・[{idx}] {display}\n"

    failed_list = ""
    for idx, failure in enumerate(failures, 1):
        reason = failure.get('reason', '辨識失敗')
        if 'OCR 無法解析' in reason or '無可讀資料' in reason or 'OCR 回傳空資料' in reason:
            reason = "辨識失敗（無可讀資料）"
        elif 'quota_exceeded' in reason:
            reason = "已超出上傳額度"
        failed_list += f"・[{idx}] {reason}\n"

    text = f"""✅ 批次處理完成！

共上傳 {total} 張，成功 {success_count} 張，失敗 {failed_count} 張。

✅ 成功（{success_count} 張）：
{success_list if success_list else "（無）"}
❌ 失敗（{failed_count} 張）：
{failed_list if failed_list else "（無）"}
可重新傳送失敗的名片照片進行補上傳。"""

    if summary.get("quota_hit"):
        text += "\n\n⚠️ 已達用量上限，後續圖片未處理。請升級方案以繼續使用。"

    try:
        await line_bot_api.push_message(user_id, TextSendMessage(text=text))
    except Exception as e:
        print(f"Batch: failed to send push summary to {user_id}: {e}")


async def handle_follow_event(event: FollowEvent):
    """處理 Follow 事件：推播 onboarding 歡迎訊息"""
    user_id = event.source.user_id
    try:
        await line_bot_api.push_message(
            user_id,
            flex_messages.get_onboarding_welcome_message()
        )
    except Exception as e:
        print(f"Follow event: failed to send welcome message to {user_id}: {e}")


def send_feedback_notification_async(org_id: str, user_id: str, feedback_data: dict):
    """異步發送 PM email 通知（若 FEEDBACK_EMAIL 已設定）

    Args:
        org_id: Organization ID
        user_id: User ID
        feedback_data: {content, type, created_at, user_id}
    """
    feedback_email = os.getenv('FEEDBACK_EMAIL')
    if not feedback_email:
        return

    def send_email():
        try:
            smtp_user = os.getenv('SMTP_USER')
            smtp_password = os.getenv('SMTP_PASSWORD')

            if not smtp_user or not smtp_password:
                print("SMTP credentials not configured, skipping email")
                return

            content = feedback_data.get('content', '（無內容）')
            timestamp = feedback_data.get('created_at', '')

            subject = f"[反映回報] {org_id} - {user_id}"
            body = f"""用戶回報：

組織：{org_id}
用戶ID：{user_id}
時間：{timestamp}

內容：
{content}
"""

            msg = MIMEText(body)
            msg['Subject'] = subject
            msg['From'] = smtp_user
            msg['To'] = feedback_email

            with smtplib.SMTP('smtp.gmail.com', 587) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.send_message(msg)

            print(f"Feedback email sent to {feedback_email}")
        except Exception as e:
            print(f"Failed to send feedback email: {str(e)}")

    # 在背景執行緒中發送
    thread = threading.Thread(target=send_email, daemon=True)
    thread.start()


# ---- CRM LINE Chat 快速指令 ----

async def handle_crm_today(reply_token: str, user_id: str, org_id: str) -> None:
    """「我的待辦」/ today — 列出今日到期的 pending actions"""
    from datetime import datetime
    today = datetime.utcnow().strftime("%Y-%m-%d")
    all_actions = _action_repo.list_all(org_id)
    due = [
        a for a in all_actions.values()
        if a.added_by == user_id and a.status == "pending" and a.due_date <= today
    ]
    if not due:
        await line_bot_api.reply_message(
            reply_token, TextSendMessage(text="🎉 今日無到期待辦！")
        )
        return

    lines = [f"📌 今日待辦（{len(due)} 筆）"]
    for a in due[:10]:
        lines.append(f"• {a.entity_name}｜{a.task_detail}｜{a.due_date}")
    if len(due) > 10:
        lines.append(f"…還有 {len(due) - 10} 筆，請至 LIFF 查看")

    liff_url = f"https://liff.line.me/{config.LIFF_ID}#/actions" if config.LIFF_ID else ""
    text = "\n".join(lines)
    if liff_url:
        text += f"\n\n👉 {liff_url}"
    await line_bot_api.reply_message(reply_token, TextSendMessage(text=text))


async def handle_crm_search(reply_token: str, org_id: str, query: str) -> None:
    """「查 [名稱]」— fuzzy match namecard/entity，回傳聯絡人摘要 + 最新 deal status"""
    # 取得所有名片作為候選清單
    all_cards = _card_repo.list_all(org_id)
    names = []
    name_to_card = {}
    for card in all_cards.values():
        display = card.company or card.name
        if display:
            names.append(display)
            name_to_card[display] = card

    matched_name = fuzzy_match_entity(query, names)
    if not matched_name:
        await line_bot_api.reply_message(
            reply_token,
            TextSendMessage(text=f"❌ 找不到「{query}」相關聯絡人。")
        )
        return

    card = name_to_card[matched_name]
    lines = [
        f"👤 {card.name}" + (f"（{card.title}）" if card.title else ""),
        f"🏢 {card.company}" if card.company else "",
        f"📱 {card.phone}" if card.phone else "",
        f"✉️ {card.email}" if card.email else "",
    ]

    # 最新 deal
    deals = _deal_repo.list_by_entity_name(org_id, matched_name)
    if deals:
        latest = sorted(deals, key=lambda d: d.updated_at, reverse=True)[0]
        lines.append(f"\n📊 最新案件：Stage {latest.stage}｜{latest.status_summary or '無備註'}")

    liff_url = ""
    if config.LIFF_ID:
        liff_url = f"https://liff.line.me/{config.LIFF_ID}#/contacts/{card.id}/crm"
        lines.append(f"\n👉 {liff_url}")

    await line_bot_api.reply_message(
        reply_token, TextSendMessage(text="\n".join(l for l in lines if l))
    )


async def handle_crm_pipeline(reply_token: str, user_id: str, org_id: str) -> None:
    """「pipeline」— admin 限定，回傳本週 stage 分佈快照"""
    role = _org_repo.get_user_role(org_id, user_id) or "member"
    if role != "admin":
        await line_bot_api.reply_message(
            reply_token, TextSendMessage(text="❌ 此功能僅限主管使用。")
        )
        return

    all_deals = _deal_repo.list_all(org_id)
    by_stage: dict = {}
    total_value = 0
    stage_labels = {
        "0": "洽詢", "1": "報價", "2": "提案", "3": "評估",
        "4": "談判", "5": "決策", "6": "簽約", "成交": "成交", "失敗": "失敗"
    }
    for deal in all_deals.values():
        by_stage[deal.stage] = by_stage.get(deal.stage, 0) + 1
        if deal.est_value:
            total_value += deal.est_value

    lines = ["📊 Pipeline 快照"]
    for stage in ["0", "1", "2", "3", "4", "5", "6", "成交", "失敗"]:
        count = by_stage.get(stage, 0)
        if count > 0:
            lines.append(f"  {stage_labels[stage]}：{count} 件")
    if total_value:
        lines.append(f"\n💰 預估總金額：NT${total_value:,}")
    lines.append(f"📋 共 {len(all_deals)} 件")

    if config.LIFF_ID:
        lines.append(f"\n👉 https://liff.line.me/{config.LIFF_ID}#/pipeline")

    await line_bot_api.reply_message(
        reply_token, TextSendMessage(text="\n".join(lines))
    )
