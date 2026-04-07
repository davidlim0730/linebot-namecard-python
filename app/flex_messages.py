from urllib.parse import quote
from linebot.models import (
    FlexSendMessage, TextSendMessage, QuickReply, QuickReplyButton, PostbackAction
)
from . import config


def get_compact_namecard_bubble(card_data: dict, card_id: str) -> dict:
    """精簡版名片 bubble dict（用於 carousel），kilo size"""
    def _str(val):
        """Convert to non-empty string or return empty string."""
        if val is None:
            return ""
        return str(val).strip()

    name = _str(card_data.get("name")) or "N/A"
    title = _str(card_data.get("title")) or "N/A"
    company = _str(card_data.get("company")) or "N/A"
    phone = _str(card_data.get("phone"))
    mobile = _str(card_data.get("mobile"))
    email = _str(card_data.get("email"))

    def info_row(label, value):
        return {
            "type": "box", "layout": "horizontal", "margin": "sm",
            "contents": [
                {"type": "text", "text": label, "size": "xs",
                 "color": "#555555", "flex": 2},
                {"type": "text", "text": value, "size": "xs",
                 "color": "#111111", "align": "end", "flex": 5, "wrap": True}
            ]
        }

    info_rows = []
    if phone:
        info_rows.append(info_row("電話", phone))
    if mobile:
        info_rows.append(info_row("手機", mobile))
    if email:
        info_rows.append(info_row("Email", email))

    return {
        "type": "bubble",
        "size": "kilo",
        "header": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {"type": "text", "text": company,
                 "color": "#ffffff", "size": "sm", "wrap": True}
            ],
            "paddingAll": "15px",
            "backgroundColor": "#0367D3"
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "15px",
            "contents": [
                {"type": "text", "text": name,
                 "size": "xl", "weight": "bold", "wrap": True},
                {"type": "text", "text": title,
                 "size": "sm", "color": "#555555",
                 "wrap": True, "margin": "sm"}
            ] + info_rows
        },
        "footer": {
            "type": "box",
            "layout": "vertical",
            "contents": [{
                "type": "button",
                "style": "primary",
                "height": "sm",
                "action": {
                    "type": "postback",
                    "label": "查看完整名片",
                    "data": f"action=view_card&card_id={card_id}"
                }
            }]
        }
    }


def get_namecard_carousel_msg(
        cards: list) -> FlexSendMessage:
    """將多張名片包成 carousel，最多 10 張
    cards: list of (card_id, card_data) tuples
    """
    bubbles = [
        get_compact_namecard_bubble(card_data, card_id)
        for card_id, card_data in cards[:10]
    ]
    carousel = {
        "type": "carousel",
        "contents": bubbles
    }
    return FlexSendMessage(alt_text=f"找到 {len(bubbles)} 張名片", contents=carousel)


def get_namecard_flex_msg(card_data: dict, card_id: str) -> FlexSendMessage:
    def _s(val, default="N/A"):
        if val is None:
            return default
        return str(val).strip() or default

    # 確保基本資料存在
    name = _s(card_data.get("name"))
    title = _s(card_data.get("title"))
    company = _s(card_data.get("company"))
    address = _s(card_data.get("address"))
    phone = _s(card_data.get("phone"))
    email = _s(card_data.get("email"))
    mobile = _s(card_data.get("mobile"))
    line_id = _s(card_data.get("line_id"))
    memo = _s(card_data.get("memo"), default="")
    added_by = _s(card_data.get("added_by"), default="")
    added_by_label = added_by[-8:] if added_by else "—"
    role_tags = card_data.get("role_tags") or []
    role_tags_text = ", ".join(role_tags) if role_tags else None

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
            ] + [
                {"type": "box", "layout": "horizontal", "margin": "md",
                 "contents": [
                     {"type": "text", "text": "Mobile", "size": "sm",
                      "color": "#555555", "flex": 1},
                     {"type": "text", "text": mobile, "size": "sm",
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
                     {"type": "text", "text": "LINE ID", "size": "sm",
                      "color": "#555555", "flex": 1},
                     {"type": "text", "text": line_id, "size": "sm",
                      "color": "#111111", "align": "end", "flex": 3}
                 ]},
            ] + [
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
            ] + ([{
                "type": "box", "layout": "horizontal", "margin": "md",
                "contents": [
                    {"type": "text", "text": "🏷", "size": "sm",
                     "color": "#555555", "flex": 0},
                    {"type": "text", "text": role_tags_text,
                     "size": "sm", "color": "#0367D3",
                     "wrap": True, "margin": "sm", "flex": 1}
                ]
            }] if role_tags_text else [])
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
                        },
                        {
                            "type": "button",
                            "style": "link",
                            "height": "sm",
                            "action": {
                                "type": "postback",
                                "label": "🏷 標籤",
                                "data": f"action=tag_card&card_id={card_id}",
                                "displayText": f"設定 {name} 的標籤"
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
        ("地址", "address"), ("電話", "phone"), ("手機", "mobile"),
        ("Email", "email"), ("LINE ID", "line_id")
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


def tag_list_flex(
        role_tags: list, tag_counts: dict,
        is_admin: bool = False) -> FlexSendMessage:
    """標籤清單 Flex Message，每列顯示標籤名稱 + 名片數量，可點擊查看名片
    role_tags: list of tag name strings
    tag_counts: dict {tag_name: count}
    is_admin: 管理員可見「⚙️ 管理標籤」按鈕
    """
    rows = []
    for tag in role_tags:
        count = tag_counts.get(tag, 0)
        rows.append({
            "type": "box",
            "layout": "horizontal",
            "margin": "sm",
            "action": {
                "type": "postback",
                "label": tag,
                "data": f"action=list_by_tag&tag_name={quote(tag)}"
            },
            "contents": [
                {"type": "text", "text": f"🏷 {tag}", "size": "sm",
                 "color": "#0367D3", "flex": 3},
                {"type": "text", "text": f"{count} 張",
                 "size": "sm", "color": "#888888",
                 "align": "end", "flex": 1}
            ]
        })

    if not rows:
        rows = [{"type": "text", "text": "尚無標籤，請管理員新增",
                 "size": "sm", "color": "#888888"}]

    flex_msg = {
        "type": "bubble",
        "size": "kilo",
        "header": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {"type": "text", "text": "🏷 角色標籤",
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
                {"type": "text",
                 "text": "點擊標籤可查看該分類的名片",
                 "size": "xs", "color": "#888888", "margin": "none"},
                {"type": "separator", "margin": "md"}
            ] + rows
        }
    }

    if is_admin:
        flex_msg["footer"] = {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "button",
                    "style": "secondary",
                    "height": "sm",
                    "action": {
                        "type": "postback",
                        "label": "⚙️ 管理標籤",
                        "data": "action=manage_tags"
                    }
                }
            ]
        }

    return FlexSendMessage(alt_text="角色標籤清單", contents=flex_msg)


def tag_management_flex(tags: list) -> FlexSendMessage:
    """管理員用標籤管理介面：列出所有標籤 + 刪除按鈕 + 新增按鈕"""
    rows = []
    for tag in tags:
        rows.append({
            "type": "box",
            "layout": "horizontal",
            "margin": "md",
            "paddingAll": "10px",
            "contents": [
                {"type": "text", "text": f"🏷 {tag}",
                 "size": "md", "color": "#333333", "flex": 3,
                 "gravity": "center"},
                {
                    "type": "button",
                    "style": "secondary",
                    "height": "sm",
                    "flex": 1,
                    "action": {
                        "type": "postback",
                        "label": "🗑️",
                        "data": (f"action=confirm_delete_tag"
                                 f"&tag_name={quote(tag)}")
                    }
                }
            ]
        })

    if not rows:
        rows = [{"type": "text", "text": "尚無標籤",
                 "size": "sm", "color": "#888888", "align": "center"}]

    flex_msg = {
        "type": "bubble",
        "size": "mega",
        "header": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {"type": "text", "text": "⚙️ 標籤管理",
                 "color": "#ffffff", "size": "md", "weight": "bold"}
            ],
            "paddingAll": "20px",
            "backgroundColor": "#0367D3"
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "spacing": "none",
            "paddingAll": "16px",
            "contents": [
                {"type": "text",
                 "text": "點擊 🗑️ 刪除標籤",
                 "size": "xs", "color": "#888888"},
                {"type": "separator", "margin": "md"}
            ] + rows
        },
        "footer": {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
                {
                    "type": "button",
                    "style": "primary",
                    "height": "sm",
                    "action": {
                        "type": "postback",
                        "label": "➕ 新增標籤",
                        "data": "action=add_tag_input"
                    }
                },
                {
                    "type": "button",
                    "style": "link",
                    "height": "sm",
                    "action": {
                        "type": "postback",
                        "label": "↩️ 返回標籤清單",
                        "data": "action=show_tags"
                    }
                }
            ]
        }
    }
    return FlexSendMessage(alt_text="標籤管理", contents=flex_msg)


def confirm_delete_tag_flex(tag_name: str) -> FlexSendMessage:
    """刪除標籤的確認 Flex Message"""
    flex_msg = {
        "type": "bubble",
        "size": "kilo",
        "body": {
            "type": "box",
            "layout": "vertical",
            "spacing": "md",
            "paddingAll": "20px",
            "contents": [
                {"type": "text", "text": "確認刪除標籤",
                 "weight": "bold", "size": "lg"},
                {"type": "text",
                 "text": f"確定要刪除標籤「{tag_name}」嗎？",
                 "wrap": True, "size": "md", "margin": "md"},
                {"type": "text",
                 "text": "已貼上此標籤的名片不受影響。",
                 "wrap": True, "size": "sm",
                 "color": "#888888", "margin": "sm"}
            ]
        },
        "footer": {
            "type": "box",
            "layout": "horizontal",
            "spacing": "sm",
            "contents": [
                {
                    "type": "button",
                    "style": "secondary",
                    "height": "sm",
                    "action": {
                        "type": "postback",
                        "label": "取消",
                        "data": "action=manage_tags"
                    }
                },
                {
                    "type": "button",
                    "style": "primary",
                    "height": "sm",
                    "color": "#E53E3E",
                    "action": {
                        "type": "postback",
                        "label": "確認刪除",
                        "data": (f"action=exec_delete_tag"
                                 f"&tag_name={quote(tag_name)}")
                    }
                }
            ]
        }
    }
    return FlexSendMessage(
        alt_text=f"確認刪除標籤「{tag_name}」", contents=flex_msg)


def role_tag_select_flex(
        card_id: str, tags: list, current_tags: list) -> FlexSendMessage:
    """角色標籤 toggle 選單，已選標示 ✓，大尺寸方便點擊
    tags: all available role tags
    current_tags: tags already on this card
    """
    rows = []
    for tag in tags:
        selected = tag in (current_tags or [])
        prefix = "✅" if selected else "⬜"
        bg = "#E8F0FE" if selected else "#ffffff"
        color = "#0367D3" if selected else "#333333"
        rows.append({
            "type": "box",
            "layout": "horizontal",
            "margin": "md",
            "paddingAll": "12px",
            "cornerRadius": "8px",
            "backgroundColor": bg,
            "action": {
                "type": "postback",
                "label": f"{prefix} {tag}",
                "data": (f"action=toggle_role&card_id={card_id}"
                         f"&tag_name={quote(tag)}")
            },
            "contents": [
                {"type": "text", "text": f"{prefix}  {tag}",
                 "size": "lg", "color": color, "flex": 1,
                 "weight": "bold" if selected else "regular"}
            ]
        })

    flex_msg = {
        "type": "bubble",
        "size": "mega",
        "header": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {"type": "text", "text": "🏷 設定角色標籤",
                 "color": "#ffffff", "size": "md", "weight": "bold"}
            ],
            "paddingAll": "20px",
            "backgroundColor": "#0367D3"
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "spacing": "none",
            "paddingAll": "16px",
            "contents": [
                {"type": "text",
                 "text": "點擊選取標籤，完成後按下方按鈕",
                 "size": "sm", "color": "#888888",
                 "margin": "none"},
                {"type": "separator", "margin": "lg"}
            ] + rows
        },
        "footer": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "button",
                    "style": "primary",
                    "height": "md",
                    "action": {
                        "type": "postback",
                        "label": "✅ 完成選取",
                        "data": f"action=finish_tag&card_id={card_id}",
                        "displayText": "標籤設定完成"
                    }
                }
            ]
        }
    }
    return FlexSendMessage(alt_text="設定角色標籤", contents=flex_msg)


def build_add_namecard_quick_reply() -> TextSendMessage:
    """回傳新增名片的 Quick Reply 選單（PostbackAction 按鈕）"""
    buttons = [
        QuickReplyButton(
            action=PostbackAction(
                label="📷 單張即時辨識",
                data="action=single_add"
            )
        ),
    ]
    if config.BATCH_UPLOAD_ENABLED:
        buttons.append(
            QuickReplyButton(
                action=PostbackAction(
                    label="🗂️ 批量排程上傳 (最多30張)",
                    data="action=batch_start"
                )
            )
        )
    return TextSendMessage(
        text="請選擇新增名片的方式：",
        quick_reply=QuickReply(items=buttons)
    )