from urllib.parse import parse_qsl
from linebot.models import (
    PostbackEvent, MessageEvent, TextSendMessage, ImageSendMessage,
    QuickReply, QuickReplyButton, PostbackAction
)
from io import BytesIO
import PIL.Image
import json

from . import firebase_utils, gemini_utils, utils, flex_messages, config, qrcode_utils
from .bot_instance import line_bot_api, user_states

FIELD_LABELS = {
    "name": "姓名", "title": "職稱", "company": "公司",
    "address": "地址", "phone": "電話", "email": "Email"
}


def get_quick_reply_items():
    """建立常用功能的 Quick Reply 按鈕"""
    return QuickReply(items=[
        QuickReplyButton(
            action=PostbackAction(
                label="📊 統計",
                data="action=show_stats"
            )
        ),
        QuickReplyButton(
            action=PostbackAction(
                label="📋 列表",
                data="action=show_list"
            )
        ),
        QuickReplyButton(
            action=PostbackAction(
                label="🧪 測試",
                data="action=show_test"
            )
        ),
        QuickReplyButton(
            action=PostbackAction(
                label="ℹ️ 說明",
                data="action=show_help"
            )
        )
    ])


async def handle_postback_event(event: PostbackEvent, user_id: str):
    org_id = firebase_utils.ensure_user_org(user_id)
    postback_data = dict(parse_qsl(event.postback.data))
    action = postback_data.get('action')
    card_id = postback_data.get('card_id')

    # 處理功能性 action（不需要 card_id）
    if action == 'show_stats':
        stats = firebase_utils.get_namecard_statistics(org_id)
        stats_text = f"""📊 名片統計資訊

📇 總名片數：{stats['total']} 張
📅 本月新增：{stats['this_month']} 張
🏢 最常合作公司：{stats['top_company']}"""
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text=stats_text, quick_reply=get_quick_reply_items())
        )
        return

    elif action == 'show_list':
        all_cards = firebase_utils.get_all_cards(org_id)
        list_text = f"📋 總共有 {len(all_cards)} 張名片資料。"
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text=list_text, quick_reply=get_quick_reply_items())
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
            TextSendMessage(text=help_text, quick_reply=get_quick_reply_items())
        )
        return

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
            event.reply_token, TextSendMessage(text=reply_text))

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
            event.reply_token, TextSendMessage(text=reply_text))

    elif action == 'download_contact':
        await handle_download_contact(event, user_id, org_id, card_id, card_name)

    elif action == 'delete_card':
        await handle_delete_card(event, user_id, org_id, card_id, card_name)


async def handle_delete_card(
        event: PostbackEvent, user_id: str, org_id: str,
        card_id: str, card_name: str):
    """處理刪除名片，套用角色權限檢查"""
    card_data = firebase_utils.get_card_by_id(org_id, card_id)
    if not card_data:
        await line_bot_api.reply_message(
            event.reply_token, TextSendMessage(text='找不到該名片資料。'))
        return

    is_admin = firebase_utils.require_admin(org_id, user_id)
    added_by = card_data.get('added_by', '')

    if not is_admin and added_by != user_id:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text='此名片非您新增，無法刪除。',
                quick_reply=get_quick_reply_items()
            ))
        return

    firebase_utils.delete_namecard(org_id, card_id)
    await line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(
            text=f'已刪除「{card_name}」的名片。',
            quick_reply=get_quick_reply_items()
        ))


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


async def handle_text_event(event: MessageEvent, user_id: str) -> None:
    msg = event.message.text

    # 加入流程優先處理（加入前 user 可能沒有 org）
    if msg.upper().startswith("加入 "):
        await handle_join(event, user_id, msg)
        return

    org_id = firebase_utils.ensure_user_org(user_id)
    user_action = user_states.get(user_id, {}).get('action')

    if user_action == 'adding_memo':
        await handle_add_memo_state(event, user_id, org_id, msg)
    elif user_action == 'editing_field':
        await handle_edit_field_state(event, user_id, org_id, msg)
    elif msg == "remove":
        firebase_utils.remove_redundant_data(org_id)
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text="重複名片清理完成。",
                quick_reply=get_quick_reply_items()
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
    else:
        await handle_smart_query(event, org_id, msg)


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
    """回傳成員清單 Flex Message"""
    org = firebase_utils.get_org(org_id)
    org_name = org.get("name", "未命名團隊")
    raw_members = org.get("members", {})

    members = [
        {
            "display_name": uid[-8:],
            "role": info.get("role", "member")
        }
        for uid, info in raw_members.items()
    ]

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
    firebase_utils.add_member(target_org_id, user_id)

    org = firebase_utils.get_org(target_org_id)
    org_name = org.get("name", "未命名團隊")

    await line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(
            text=f'歡迎加入「{org_name}」！您現在可以存取團隊的名片庫了。',
            quick_reply=get_quick_reply_items()
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
            text=f'團隊名稱已更新為「{new_name}」。',
            quick_reply=get_quick_reply_items()
        ))


async def handle_add_memo_state(
        event: MessageEvent, user_id: str, org_id: str, msg: str):
    state = user_states[user_id]
    card_id = state['card_id']

    if firebase_utils.update_namecard_memo(card_id, org_id, msg):
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text='備忘錄已成功更新！',
                quick_reply=get_quick_reply_items()
            ))
    else:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text='新增備忘錄時發生錯誤，請稍後再試。',
                quick_reply=get_quick_reply_items()
            ))
    del user_states[user_id]


async def handle_edit_field_state(
        event: MessageEvent, user_id: str, org_id: str, msg: str):
    state = user_states[user_id]
    card_id = state['card_id']
    field = state['field']

    if firebase_utils.update_namecard_field(org_id, card_id, field, msg):
        updated_card = firebase_utils.get_card_by_id(org_id, card_id)
        if updated_card:
            reply_msg = flex_messages.get_namecard_flex_msg(
                updated_card, card_id)
            await line_bot_api.reply_message(
                event.reply_token,
                [TextSendMessage(
                    text='資料已成功更新！',
                    quick_reply=get_quick_reply_items()
                ), reply_msg]
            )
        else:
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(
                    text='資料更新成功，但無法立即顯示。',
                    quick_reply=get_quick_reply_items()
                ))
    else:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text='更新資料時發生錯誤，請稍後再試。',
                quick_reply=get_quick_reply_items()
            ))
    del user_states[user_id]


async def handle_smart_query(
        event: MessageEvent, org_id: str, msg: str):
    all_cards_dict = firebase_utils.get_all_cards(org_id)
    if not all_cards_dict:
        await line_bot_api.reply_message(
            event.reply_token,
            [TextSendMessage(
                text="目前團隊尚未建立任何名片。",
                quick_reply=get_quick_reply_items()
            )])
        return

    all_cards_list = []
    for card_id, card_data in all_cards_dict.items():
        card_data_with_id = card_data.copy()
        card_data_with_id['card_id'] = card_id
        all_cards_list.append(card_data_with_id)

    smart_query_prompt = (
        "你是一個名片助理，以下是所有名片資料（JSON 陣列），"
        "請根據使用者輸入的查詢，回傳最相關的一或多張名片 JSON"
        "（只回傳 JSON 陣列，不要多餘說明）。"
        "每張名片物件中都要包含 'card_id'.\n"
        f"名片資料: {json.dumps(all_cards_list, ensure_ascii=False)}\n"
        f"查詢: {msg}"
    )
    messages = [{"role": "user", "parts": [smart_query_prompt]}]

    try:
        response = gemini_utils.generate_gemini_text_complete(messages)
        card_objs = utils.load_json_string_to_object(response.text)
        if isinstance(card_objs, dict):
            card_objs = [card_objs]

        reply_msgs = []
        if card_objs:
            for card_obj in card_objs[:5]:
                card_id = card_obj.get("card_id")
                if card_id:
                    reply_msgs.append(
                        flex_messages.get_namecard_flex_msg(
                            card_obj, card_id))

        if reply_msgs:
            await line_bot_api.reply_message(event.reply_token, reply_msgs)
        else:
            await line_bot_api.reply_message(
                event.reply_token,
                [TextSendMessage(
                    text="查無相關名片資料。",
                    quick_reply=get_quick_reply_items()
                )],
            )

    except Exception as e:
        print(f"Error processing LLM response: {e}")
        await line_bot_api.reply_message(
            event.reply_token,
            [TextSendMessage(text="處理您的查詢時發生錯誤，請稍後再試。")],
        )


async def handle_image_event(event: MessageEvent, user_id: str) -> None:
    org_id = firebase_utils.ensure_user_org(user_id)

    message_content = await line_bot_api.get_message_content(event.message.id)
    image_content = b""
    async for s in message_content.iter_content():
        image_content += s
    img = PIL.Image.open(BytesIO(image_content))
    result = gemini_utils.generate_json_from_image(img, config.IMGAGE_PROMPT)
    card_obj = utils.parse_gemini_result_to_json(result.text)
    if not card_obj:
        error_msg = f"無法解析這張名片，請再試一次。 錯誤資訊: {result.text}"
        await line_bot_api.reply_message(
            event.reply_token,
            [TextSendMessage(text=error_msg)]
        )
        return

    if isinstance(card_obj, list):
        if not card_obj:
            error_msg = f"無法解析這張名片，Gemini 回傳了空的資料。 資訊: {result.text}"
            await line_bot_api.reply_message(
                event.reply_token,
                [TextSendMessage(text=error_msg)]
            )
            return
        card_obj = card_obj[0]

    card_obj = {k.lower(): v for k, v in card_obj.items()}

    existing_card_id = firebase_utils.check_if_card_exists(card_obj, org_id)
    if existing_card_id:
        existing_card_data = firebase_utils.get_card_by_id(
            org_id, existing_card_id)
        reply_msg = flex_messages.get_namecard_flex_msg(
            existing_card_data, existing_card_id)
        await line_bot_api.reply_message(
            event.reply_token,
            [TextSendMessage(
                text="這個名片已經存在資料庫中。",
                quick_reply=get_quick_reply_items()
            ), reply_msg],
        )
        return

    card_id = firebase_utils.add_namecard(card_obj, org_id, user_id)
    if card_id:
        reply_msg = flex_messages.get_namecard_flex_msg(card_obj, card_id)
        chinese_reply_msg = TextSendMessage(
            text="名片資料已經成功加入資料庫。",
            quick_reply=get_quick_reply_items()
        )
        await line_bot_api.reply_message(
            event.reply_token, [reply_msg, chinese_reply_msg])
    else:
        await line_bot_api.reply_message(
            event.reply_token,
            [TextSendMessage(
                text="儲存名片時發生錯誤。",
                quick_reply=get_quick_reply_items()
            )])
