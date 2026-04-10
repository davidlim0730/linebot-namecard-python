from urllib.parse import parse_qsl
from linebot.models import (
    PostbackEvent, MessageEvent, TextSendMessage, ImageSendMessage,
    QuickReply, QuickReplyButton, PostbackAction, MessageAction, FollowEvent
)
from io import BytesIO
import PIL.Image
import json

from . import firebase_utils, gemini_utils, utils, flex_messages, config, qrcode_utils
from .bot_instance import line_bot_api, user_states
from .cloud_tasks_utils import create_process_batch_task

FIELD_LABELS = {
    "name": "姓名", "title": "職稱", "company": "公司",
    "address": "地址", "phone": "電話", "mobile": "手機",
    "email": "Email", "line_id": "LINE ID"
}


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
        user_states[user_id] = {'action': 'searching'}
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

    elif action == "cancel_state":
        user_states.pop(user_id, None)
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text="已取消目前操作。")
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
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text="已進入批量上傳模式，請開始傳送名片照片，全部傳送完畢後請輸入『完成』"
            )
        )
        return

    elif action == "scan_back":
        if user_states.get(user_id, {}).get('action') == 'scanning_back':
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
        state = user_states.get(user_id, {})
        if state.get('action') == 'scanning_back':
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
        user_states[user_id] = {'action': 'searching'}
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
        user_states[user_id] = {'action': 'adding_memo', 'card_id': card_id}
        reply_text = f"請輸入關於「{card_name}」的備忘錄："
        await line_bot_api.reply_message(
            event.reply_token, TextSendMessage(
                text=reply_text,
                quick_reply=QuickReply(items=[
                    QuickReplyButton(action=PostbackAction(label="❌ 取消", data="action=cancel_state"))
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
            'field': field_to_edit
        }
        reply_text = f"請輸入「{card_name}」的新「{field_label}」："
        await line_bot_api.reply_message(
            event.reply_token, TextSendMessage(
                text=reply_text,
                quick_reply=QuickReply(items=[
                    QuickReplyButton(action=PostbackAction(label="❌ 取消", data="action=cancel_state"))
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
    user_action = user_states.get(user_id, {}).get('action')

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
    elif msg == "完成":
        await handle_batch_done(event, user_id, org_id)
    elif msg == "取消":
        await handle_batch_cancel(event, user_id, org_id)
    else:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text="找不到對應指令，請點下方選單操作。"
            )
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
    user_states[user_id] = {'action': 'adding_tag', 'org_id': org_id}
    await line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(
            text='請輸入新群組名稱：',
            quick_reply=QuickReply(items=[
                QuickReplyButton(action=PostbackAction(label="❌ 取消", data="action=cancel_state"))
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
    tag_name = msg.strip()
    del user_states[user_id]
    if not tag_name:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='請輸入有效的標籤名稱。'))
        return
    result = firebase_utils.add_role_tag(org_id, tag_name)
    tags = firebase_utils.get_all_role_tags(org_id)
    reply_msg = flex_messages.tag_management_flex(tags)
    if result:
        text = f'已新增標籤「{tag_name}」。'
    else:
        text = f'標籤「{tag_name}」已存在。'
    await line_bot_api.reply_message(
        event.reply_token,
        [TextSendMessage(text=text), reply_msg])


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

    user_states[user_id] = {'action': 'exporting_csv', 'org_id': org_id}
    await line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(
            text='請輸入您的 email 地址，CSV 將寄送至該信箱：',
            quick_reply=QuickReply(items=[
                QuickReplyButton(action=PostbackAction(label="❌ 取消", data="action=cancel_state"))
            ])
        ))


async def handle_export_email_state(
        event: MessageEvent, user_id: str, org_id: str, msg: str):
    """處理匯出流程中的 email 輸入"""
    import re
    if not re.match(r'^[^@]+@[^@]+\.[^@]+$', msg.strip()):
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text='email 格式不正確，請重新輸入。'))
        return

    to_email = msg.strip()
    del user_states[user_id]

    try:
        from .csv_export import generate_csv, send_csv_email
        all_cards = firebase_utils.get_all_cards(org_id)
        org = firebase_utils.get_org(org_id)
        org_name = org.get("name", "團隊")
        csv_bytes = generate_csv(all_cards, org_name)
        send_csv_email(csv_bytes, to_email, org_name)
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text=f'CSV 已寄送至 {to_email}，請查收信箱。'))
    except Exception as e:
        print(f"Error in CSV export: {e}")
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text='CSV 寄送失敗，請稍後再試或確認 email 地址。'))


async def handle_add_memo_state(
        event: MessageEvent, user_id: str, org_id: str, msg: str):
    state = user_states[user_id]
    card_id = state['card_id']

    if firebase_utils.update_namecard_memo(card_id, org_id, msg):
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text='備忘錄已成功更新！'
            ))
    else:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text='新增備忘錄時發生錯誤，請稍後再試。'
            ))
    del user_states[user_id]


async def handle_edit_field_state(
        event: MessageEvent, user_id: str, org_id: str, msg: str):
    state = user_states[user_id]
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
            await line_bot_api.reply_message(
                event.reply_token,
                [TextSendMessage(
                    text='資料已成功更新！'
                ), reply_msg]
            )
        else:
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(
                    text='資料更新成功，但無法立即顯示。'
                ))
    else:
        # 檢查名片是否存在
        if firebase_utils.check_card_exists(org_id, card_id):
            # 名片存在但無權限
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(
                    text='抱歉，您沒有權限訪問或修改此名片。'
                ))
        else:
            # 名片不存在或欄位不允許編輯
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(
                    text='更新資料時發生錯誤，請稍後再試。'
                ))
    del user_states[user_id]


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

    # 背面掃描狀態：合併正背面後儲存
    if user_states.get(user_id, {}).get('action') == 'scanning_back':
        front_data = user_states[user_id]['front_data']
        merged = utils.merge_namecard_data(front_data, card_obj)
        merged = utils.validate_namecard_fields(merged)
        user_states.pop(user_id, None)
        await _save_and_reply_namecard(event, user_id, org_id, merged)
        return

    # 正面掃描：暫存並詢問是否有背面
    name = card_obj.get("name", "N/A")
    company = card_obj.get("company", "N/A")
    user_states[user_id] = {'action': 'scanning_back', 'front_data': card_obj}
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
    """推送批次處理結果摘要給用戶"""
    total = summary["success"] + summary["failed"]
    text = (
        f"✅ 批次處理完成！共 {total} 張，"
        f"成功 {summary['success']} 張，失敗 {summary['failed']} 張。"
    )
    if summary.get("quota_hit"):
        text += "\n\n⚠️ 已達用量上限，後續圖片未處理。請升級方案以繼續使用。"
    elif summary["failures"]:
        details = "；".join(
            f"第 {f['index']} 張 — {f['reason']}"
            for f in summary["failures"]
            if not f["reason"].startswith("quota_exceeded")
        )
        if details:
            text += f"\n\n失敗原因：{details}"
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
