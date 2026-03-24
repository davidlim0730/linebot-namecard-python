from urllib.parse import quote
from linebot.models import FlexSendMessage


def get_namecard_flex_msg(card_data: dict, card_id: str) -> FlexSendMessage:
    # 確保基本資料存在
    name = card_data.get("name", "N/A")
    title = card_data.get("title", "N/A")
    company = card_data.get("company", "N/A")
    address = card_data.get("address", "N/A")
    phone = card_data.get("phone", "N/A")
    email = card_data.get("email", "N/A")
    memo = card_data.get("memo", "")
    added_by = card_data.get("added_by", "")
    added_by_label = added_by[-8:] if added_by else "—"

    flex_msg = {
        "type": "bubble",
        "size": "giga",
        "header": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {"type": "text", "text": company,
                         "color": "#ffffff", "size": "lg"},
                        {"type": "text", "text": name, "color": "#ffffff",
                         "size": "xxl", "weight": "bold"},
                        {"type": "text", "text": title,
                         "color": "#ffffff", "size": "md"},
                    ]
                }
            ],
            "paddingAll": "20px",
            "backgroundColor": "#0367D3",
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {"type": "box", "layout": "horizontal", "margin": "md",
                 "contents": [
                     {"type": "text", "text": "Phone", "size": "sm",
                      "color": "#555555", "flex": 1},
                     {"type": "text", "text": phone, "size": "sm",
                      "color": "#111111", "align": "end", "flex": 3}
                 ]},
                {"type": "box", "layout": "horizontal", "margin": "md",
                 "contents": [
                     {"type": "text", "text": "Email", "size": "sm",
                      "color": "#555555", "flex": 1},
                     {"type": "text", "text": email, "size": "sm",
                      "color": "#111111", "align": "end", "flex": 3}
                 ]},
                {"type": "box", "layout": "horizontal", "margin": "md",
                 "contents": [
                     {"type": "text", "text": "Address",
                      "size": "sm", "color": "#555555", "flex": 1},
                     {"type": "text",
                      "text": address,
                      "size": "sm",
                      "color": "#111111",
                      "align": "end",
                      "wrap": True,
                      "flex": 3}
                 ]},
                {"type": "box", "layout": "horizontal", "margin": "md",
                 "contents": [
                     {"type": "text", "text": "新增者", "size": "sm",
                      "color": "#555555", "flex": 1},
                     {"type": "text", "text": added_by_label, "size": "sm",
                      "color": "#111111", "align": "end", "flex": 3}
                 ]},
                {"type": "separator", "margin": "xxl"},
                {"type": "box", "layout": "vertical", "margin": "md",
                 "contents": [
                     {"type": "text", "text": "備忘錄",
                      "size": "md", "color": "#555555"},
                     {"type": "text",
                      "text": memo or "尚無備忘錄",
                      "color": "#111111",
                      "size": "sm",
                      "wrap": True,
                      "margin": "md"}
                 ]}
            ]
        },
        "footer": {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
                {
                    "type": "box",
                    "layout": "horizontal",
                    "spacing": "sm",
                    "contents": [
                        {
                            "type": "button",
                            "style": "link",
                            "height": "sm",
                            "action": {
                                "type": "postback",
                                "label": "新增/修改記事",
                                "data": f"action=add_memo&card_id={card_id}",
                                "displayText": f"我想為 {name} 新增記事"
                            },
                            "flex": 1
                        },
                        {
                            "type": "button",
                            "style": "link",
                            "height": "sm",
                            "action": {
                                "type": "postback",
                                "label": "編輯資料",
                                "data": f"action=edit_card&card_id={card_id}",
                                "displayText": f"我想編輯 {name} 的名片"
                            },
                            "flex": 1
                        }
                    ]
                },
                {
                    "type": "button",
                    "style": "primary",
                    "height": "sm",
                    "action": {
                        "type": "postback",
                        "label": "📥 加入通訊錄",
                        "data": f"action=download_contact&card_id={card_id}",
                        "displayText": f"下載 {name} 的聯絡人資訊"
                    },
                    "margin": "sm"
                },
                {
                    "type": "button",
                    "style": "secondary",
                    "height": "sm",
                    "action": {
                        "type": "postback",
                        "label": "🗑️ 刪除名片",
                        "data": f"action=delete_card&card_id={card_id}",
                        "displayText": f"刪除 {name} 的名片"
                    },
                    "margin": "sm"
                }
            ]
        },
        "styles": {
            "footer": {
                "separator": True,
            }
        },
    }

    return FlexSendMessage(alt_text=f"{name} 的名片", contents=flex_msg)


def team_info_flex(
        org_name: str, member_count: int, user_role: str) -> FlexSendMessage:
    """顯示組織資訊的 Flex Message"""
    role_label = "管理員" if user_role == "admin" else "成員"
    role_color = "#FF6B6B" if user_role == "admin" else "#4ECDC4"

    flex_msg = {
        "type": "bubble",
        "size": "kilo",
        "header": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {"type": "text", "text": "👥 團隊資訊",
                 "color": "#ffffff", "size": "sm", "weight": "bold"}
            ],
            "paddingAll": "15px",
            "backgroundColor": "#0367D3"
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "spacing": "md",
            "contents": [
                {"type": "text", "text": org_name,
                 "size": "xl", "weight": "bold", "wrap": True},
                {"type": "box", "layout": "horizontal", "margin": "md",
                 "contents": [
                     {"type": "text", "text": "成員人數", "size": "sm",
                      "color": "#555555", "flex": 1},
                     {"type": "text", "text": f"{member_count} 人",
                      "size": "sm", "color": "#111111",
                      "align": "end", "flex": 1}
                 ]},
                {"type": "box", "layout": "horizontal", "margin": "sm",
                 "contents": [
                     {"type": "text", "text": "我的身份", "size": "sm",
                      "color": "#555555", "flex": 1},
                     {"type": "text", "text": role_label, "size": "sm",
                      "color": role_color, "align": "end",
                      "weight": "bold", "flex": 1}
                 ]}
            ]
        }
    }
    return FlexSendMessage(alt_text=f"團隊：{org_name}", contents=flex_msg)


def member_list_flex(org_name: str, members: list) -> FlexSendMessage:
    """顯示組織成員清單的 Flex Message
    members: list of {"display_name": str, "role": str}
    """
    rows = []
    for m in members:
        role_label = "管理員" if m.get("role") == "admin" else "成員"
        role_color = "#FF6B6B" if m.get("role") == "admin" else "#4ECDC4"
        rows.append({
            "type": "box", "layout": "horizontal", "margin": "sm",
            "contents": [
                {"type": "text", "text": m.get("display_name", "—"),
                 "size": "sm", "color": "#111111", "flex": 3, "wrap": True},
                {"type": "text", "text": role_label, "size": "sm",
                 "color": role_color, "align": "end",
                 "weight": "bold", "flex": 1}
            ]
        })

    flex_msg = {
        "type": "bubble",
        "size": "kilo",
        "header": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {"type": "text", "text": "👤 成員清單",
                 "color": "#ffffff", "size": "sm", "weight": "bold"}
            ],
            "paddingAll": "15px",
            "backgroundColor": "#0367D3"
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
                {"type": "text", "text": org_name, "size": "md",
                 "weight": "bold", "color": "#555555", "margin": "none"},
                {"type": "separator", "margin": "md"}
            ] + rows
        }
    }
    return FlexSendMessage(
        alt_text=f"{org_name} 成員清單（{len(members)} 人）",
        contents=flex_msg)


def invite_code_flex(
        code: str, expires_at: str, org_name: str) -> FlexSendMessage:
    """顯示邀請碼的 Flex Message，含 LINE URI Scheme 分享按鈕"""
    invite_text = (
        f"邀請您加入「{org_name}」的名片管理團隊！\n"
        f"請在 LINE Bot 輸入：加入 {code}"
    )
    share_uri = f"https://line.me/R/msg/text/?{quote(invite_text)}"

    # 只顯示日期部分
    expires_date = expires_at[:10] if expires_at else ""

    flex_msg = {
        "type": "bubble",
        "size": "kilo",
        "header": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {"type": "text", "text": "📨 邀請碼",
                 "color": "#ffffff", "size": "sm", "weight": "bold"}
            ],
            "paddingAll": "15px",
            "backgroundColor": "#0367D3"
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "spacing": "md",
            "contents": [
                {"type": "text", "text": code, "size": "xxl",
                 "weight": "bold", "align": "center",
                 "color": "#0367D3", "letterSpacing": "8px"},
                {"type": "text",
                 "text": f"有效期限：{expires_date}",
                 "size": "xs", "color": "#888888", "align": "center"}
            ]
        },
        "footer": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "button",
                    "style": "primary",
                    "height": "sm",
                    "action": {
                        "type": "uri",
                        "label": "📤 分享邀請",
                        "uri": share_uri
                    }
                }
            ]
        }
    }
    return FlexSendMessage(alt_text=f"邀請碼：{code}", contents=flex_msg)


def get_edit_options_flex_msg(card_id: str, card_name: str) -> FlexSendMessage:
    """產生一個包含所有可編輯欄位的 Flex Message"""
    fields = [
        ("姓名", "name"), ("職稱", "title"), ("公司", "company"),
        ("地址", "address"), ("電話", "phone"), ("Email", "email")
    ]
    buttons = []
    for label, field_key in fields:
        display_text = f"我想修改 {card_name} 的 {label}"
        buttons.append({
            "type": "button",
            "action": {
                "type": "postback",
                "label": label,
                "data": (f"action=edit_field&card_id={card_id}"
                         f"&field={field_key}"),
                "displayText": display_text
            },
            "style": "primary",
            "margin": "sm"
        })

    flex_msg = {
        "type": "bubble",
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": f"請問您想編輯「{card_name}」的哪個欄位？",
                    "weight": "bold",
                    "size": "lg",
                    "wrap": True
                },
                {
                    "type": "box",
                    "layout": "vertical",
                    "margin": "lg",
                    "spacing": "sm",
                    "contents": buttons
                }
            ]
        }
    }

    return FlexSendMessage(
        alt_text=f"編輯 {card_name} 的資料",
        contents=flex_msg
    )