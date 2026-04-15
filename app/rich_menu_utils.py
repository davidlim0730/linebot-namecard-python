"""
Rich Menu 初始化工具。

呼叫 init_rich_menu() 在 Bot 啟動時建立/確認 Rich Menu 存在。
此函式為冪等操作：alias 存在則跳過。

支援兩種 Rich Menu：
  rich-menu-main  : 業務版（6 格）— 預設選單
  rich-menu-admin : 主管版（6 格，含 Pipeline 總覽）— 透過 set_admin_rich_menu(user_id) 套用
"""
import os
import logging

from .bot_instance import line_bot_api
from . import config

logger = logging.getLogger(__name__)

ALIAS_MAIN  = "rich-menu-main"
ALIAS_ADMIN = "rich-menu-admin"

RICH_MENU_IMAGE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "assets", "rich_menu_main.png"
)


def _liff(path: str) -> str:
    """Build a LIFF URL for a given path (e.g. '#/crm')."""
    if not config.LIFF_ID:
        return ""
    return f"https://liff.line.me/{config.LIFF_ID}{path}"


def _uri_or_message(uri: str, fallback_text: str) -> dict:
    """Return uri action if LIFF_ID is set, otherwise message action."""
    if uri:
        return {"type": "uri", "uri": uri, "label": fallback_text}
    return {"type": "message", "text": fallback_text}


def _member_areas() -> list:
    """6-cell layout for regular users."""
    return [
        # Row 1
        {"bounds": {"x":    0, "y":   0, "width": 833, "height": 421},
         "action": _uri_or_message(_liff("#/crm"),     "回報拜訪")},
        {"bounds": {"x":  833, "y":   0, "width": 833, "height": 421},
         "action": _uri_or_message(_liff("#/deals"),   "我的案件")},
        {"bounds": {"x": 1666, "y":   0, "width": 834, "height": 421},
         "action": _uri_or_message(_liff("#/actions"), "我的待辦")},
        # Row 2
        {"bounds": {"x":    0, "y": 421, "width": 833, "height": 422},
         "action": _uri_or_message(_liff("#/"),        "名片管理")},
        {"bounds": {"x":  833, "y": 421, "width": 833, "height": 422},
         "action": _uri_or_message(_liff("#/"),        "查聯絡人")},
        {"bounds": {"x": 1666, "y": 421, "width": 834, "height": 422},
         "action": {"type": "message", "text": "團隊"}},
    ]


def _admin_areas() -> list:
    """6-cell layout for admins (cell 5 = Pipeline 總覽)."""
    base = _member_areas()
    # Replace cell 5 (index 4) with Pipeline link
    base[4] = {
        "bounds": {"x": 833, "y": 421, "width": 833, "height": 422},
        "action": _uri_or_message(_liff("#/pipeline"), "Pipeline"),
    }
    return base


async def _get_menu_id(alias: str):
    """Return richMenuId for alias, or None."""
    try:
        result = await line_bot_api.get_rich_menu_alias(alias)
        return result.rich_menu_id
    except Exception:
        return None


async def _build_menu(name: str, areas: list) -> str | None:
    """Create a Rich Menu and return its ID, or None on failure."""
    from linebot.models import RichMenu, RichMenuSize, RichMenuArea, RichMenuBounds

    menu_obj = RichMenu(
        size=RichMenuSize(width=2500, height=843),
        selected=True,
        name=name,
        chat_bar_text="功能選單",
        areas=[
            RichMenuArea(
                bounds=RichMenuBounds(
                    x=a["bounds"]["x"], y=a["bounds"]["y"],
                    width=a["bounds"]["width"], height=a["bounds"]["height"],
                ),
                action=a["action"],
            )
            for a in areas
        ],
    )
    try:
        menu_id = await line_bot_api.create_rich_menu(menu_obj)
    except Exception as e:
        logger.warning("Failed to create Rich Menu '%s': %s", name, e)
        return None

    if os.path.exists(RICH_MENU_IMAGE_PATH):
        try:
            with open(RICH_MENU_IMAGE_PATH, "rb") as f:
                await line_bot_api.set_rich_menu_image(menu_id, "image/png", f)
        except Exception as e:
            logger.warning("Failed to upload Rich Menu image for '%s': %s", name, e)
    else:
        logger.warning("Rich Menu image not found at %s. Menu will have no image.", RICH_MENU_IMAGE_PATH)

    return menu_id


async def _ensure_menu(alias: str, name: str, areas: list) -> str | None:
    """Create menu + alias if not already present. Returns menu_id."""
    existing = await _get_menu_id(alias)
    if existing:
        logger.info("Rich Menu '%s' already exists (id=%s), skipping.", alias, existing)
        return existing

    menu_id = await _build_menu(name, areas)
    if not menu_id:
        return None

    try:
        from linebot.models import RichMenuAlias
        await line_bot_api.create_rich_menu_alias(
            RichMenuAlias(rich_menu_alias_id=alias, rich_menu_id=menu_id)
        )
    except Exception as e:
        logger.warning("Failed to create alias '%s': %s", alias, e)

    return menu_id


async def init_rich_menu() -> None:
    """
    建立並綁定兩個 Rich Menu（冪等）。

    - rich-menu-main  → 設為預設（所有用戶）
    - rich-menu-admin → 建立但不設預設；透過 set_admin_rich_menu() 套用到特定 admin
    """
    main_id = await _ensure_menu(ALIAS_MAIN,  "主選單（業務）",  _member_areas())
    await    _ensure_menu(ALIAS_ADMIN, "主選單（主管）",  _admin_areas())

    if main_id:
        try:
            await line_bot_api.set_default_rich_menu(main_id)
            logger.info("Rich Menu '%s' set as default (id=%s).", ALIAS_MAIN, main_id)
        except Exception as e:
            logger.warning("Failed to set default Rich Menu: %s", e)


async def set_admin_rich_menu(user_id: str) -> bool:
    """套用主管版 Rich Menu 到指定 user_id。"""
    admin_id = await _get_menu_id(ALIAS_ADMIN)
    if not admin_id:
        logger.warning("Admin Rich Menu not found; call init_rich_menu() first.")
        return False
    try:
        await line_bot_api.link_rich_menu_to_user(user_id, admin_id)
        return True
    except Exception as e:
        logger.warning("Failed to link admin rich menu to %s: %s", user_id, e)
        return False


async def set_member_rich_menu(user_id: str) -> bool:
    """套用業務版 Rich Menu 到指定 user_id（降級/移除 admin 版）。"""
    main_id = await _get_menu_id(ALIAS_MAIN)
    if not main_id:
        return False
    try:
        await line_bot_api.link_rich_menu_to_user(user_id, main_id)
        return True
    except Exception as e:
        logger.warning("Failed to link member rich menu to %s: %s", user_id, e)
        return False
