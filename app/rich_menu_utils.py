"""
Rich Menu 初始化工具。

呼叫 init_rich_menu() 在 Bot 啟動時建立/確認 Rich Menu 存在。
此函式為冪等操作：若 alias 'rich-menu-main' 已存在則直接返回。
"""
import os
import logging

from .bot_instance import line_bot_api

logger = logging.getLogger(__name__)

RICH_MENU_ALIAS = "rich-menu-main"
RICH_MENU_IMAGE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "assets", "rich_menu_main.png"
)

_RICH_MENU_AREAS = [
    {
        "bounds": {"x": 0, "y": 0, "width": 833, "height": 843},
        "action": {"type": "postback", "data": "action=menu_card",
                   "displayText": "名片操作"}
    },
    {
        "bounds": {"x": 833, "y": 0, "width": 833, "height": 843},
        "action": {"type": "postback", "data": "action=menu_team",
                   "displayText": "團隊功能"}
    },
    {
        "bounds": {"x": 1666, "y": 0, "width": 834, "height": 843},
        "action": {"type": "postback", "data": "action=menu_data",
                   "displayText": "資料與設定"}
    },
]


async def _get_existing_rich_menu_id() -> str | None:
    """查詢現有 Rich Menu，若 alias 存在則回傳 richMenuId，否則回傳 None。"""
    try:
        result = await line_bot_api.get_rich_menu_alias(RICH_MENU_ALIAS)
        return result.rich_menu_id
    except Exception:
        return None


async def init_rich_menu() -> None:
    """
    建立並綁定 Rich Menu（冪等）。

    流程：
    1. 查詢 alias 是否已存在 → 若有則跳過
    2. 建立 Rich Menu 結構
    3. 上傳圖片（若 assets/rich_menu_main.png 存在）
    4. 建立 alias，設為預設選單
    """
    existing_id = await _get_existing_rich_menu_id()
    if existing_id:
        logger.info("Rich Menu already exists (id=%s), skipping init.", existing_id)
        return

    # 建立 Rich Menu
    from linebot.models import RichMenu, RichMenuSize, RichMenuArea, RichMenuBounds
    rich_menu = RichMenu(
        size=RichMenuSize(width=2500, height=843),
        selected=True,
        name="主選單",
        chat_bar_text="功能選單",
        areas=[
            RichMenuArea(
                bounds=RichMenuBounds(
                    x=area["bounds"]["x"],
                    y=area["bounds"]["y"],
                    width=area["bounds"]["width"],
                    height=area["bounds"]["height"],
                ),
                action=area["action"],
            )
            for area in _RICH_MENU_AREAS
        ],
    )

    try:
        rich_menu_id = await line_bot_api.create_rich_menu(rich_menu)
    except Exception as e:
        logger.warning("Failed to create Rich Menu: %s", e)
        return

    # 上傳圖片（若存在）
    if os.path.exists(RICH_MENU_IMAGE_PATH):
        try:
            with open(RICH_MENU_IMAGE_PATH, "rb") as f:
                await line_bot_api.set_rich_menu_image(rich_menu_id, "image/png", f)
            logger.info("Rich Menu image uploaded.")
        except Exception as e:
            logger.warning("Failed to upload Rich Menu image: %s", e)
    else:
        logger.warning(
            "Rich Menu image not found at %s. Menu will have no image.",
            RICH_MENU_IMAGE_PATH,
        )

    # 建立 alias
    try:
        from linebot.models import RichMenuAlias
        alias = RichMenuAlias(rich_menu_alias_id=RICH_MENU_ALIAS, rich_menu_id=rich_menu_id)
        await line_bot_api.create_rich_menu_alias(alias)
    except Exception as e:
        logger.warning("Failed to create Rich Menu alias: %s", e)

    # 設為預設選單
    try:
        await line_bot_api.set_default_rich_menu(rich_menu_id)
        logger.info("Rich Menu set as default (id=%s).", rich_menu_id)
    except Exception as e:
        logger.warning("Failed to set default Rich Menu: %s", e)
