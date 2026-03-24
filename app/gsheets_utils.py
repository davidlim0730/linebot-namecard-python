import os
import json
import gspread
from google.oauth2 import service_account
import google.auth
from . import config

# 全域變數供存放 gspread 客戶端與工作表物件
_gc = None
_worksheet = None

# 定義寫入 Google Sheet 的欄位名稱
SHEET_HEADERS = [
    "org_id",
    "card_id",
    "name",
    "title",
    "company",
    "email",
    "phone",
    "address",
    "memo",
    "role_tags",
    "created_at",
    "added_by",
    "photo_url",
    "qrcode_url"
]

def get_gspread_client():
    """初始化並回傳 gspread 客戶端"""
    global _gc
    if _gc is not None:
        return _gc
    
    try:
        # GCP 預設方式，或是透過環境變數傳入 JSON
        gac_str = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
        if gac_str:
            try:
                # 嘗試修復字串中常見的反斜線跳脫問題（Invalid \escape）
                if '\\n' in gac_str and '\\\\n' not in gac_str:
                    gac_str = gac_str.replace('\\n', '\\\\n')
                cred_json = json.loads(gac_str, strict=False)
                credentials = service_account.Credentials.from_service_account_info(
                    cred_json,
                    scopes=[
                        "https://www.googleapis.com/auth/spreadsheets",
                        "https://www.googleapis.com/auth/drive"
                    ]
                )
                _gc = gspread.authorize(credentials)
                print("gspread initialized successfully from ENV VAR.")
                return _gc
            except Exception as e:
                print(f"Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON, falling back to default: {e}")
        
        # GCP 預設授權 (例如 Cloud Run)
        credentials, _ = google.auth.default(scopes=[
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive"
        ])
        _gc = gspread.authorize(credentials)
        print("gspread initialized successfully from default service account.")
            
        return _gc
    except Exception as e:
        print(f"Failed to initialize gspread client: {e}")
        return None

def get_worksheet():
    """取得目標 Google Sheet 工作表"""
    global _worksheet
    if _worksheet is not None:
        return _worksheet
    
    if not config.GOOGLE_SHEET_ID:
        print("GOOGLE_SHEET_ID is not configured. Sync skipped.")
        return None
        
    client = get_gspread_client()
    if not client:
        return None
        
    try:
        spreadsheet = client.open_by_key(config.GOOGLE_SHEET_ID)
        _worksheet = spreadsheet.sheet1
        
        # 確認標題列是否存在，若無則初始化
        first_row = _worksheet.row_values(1)
        if not first_row or first_row[0] != SHEET_HEADERS[0]:
            _worksheet.insert_row(SHEET_HEADERS, index=1)
            print("Initialized Google Sheet headers.")
            
        return _worksheet
    except Exception as e:
        print(f"Failed to open Google Sheet: {e}")
        return None

def sync_card_to_sheet_sync(org_id: str, card_id: str, card_data: dict):
    """同步單筆名片資料到 Google Sheet (同步執行)"""
    worksheet = get_worksheet()
    if not worksheet:
        return

    try:
        # 準備資料列並確保所有值都是字串或基本可被寫入的型別，且不會是 None
        role_tags = card_data.get("role_tags") or []
        raw_data = [
            org_id,
            card_id,
            card_data.get("name", ""),
            card_data.get("title", ""),
            card_data.get("company", ""),
            card_data.get("email", ""),
            card_data.get("phone", ""),
            card_data.get("address", ""),
            card_data.get("memo", ""),
            ",".join(role_tags),
            card_data.get("created_at", ""),
            card_data.get("added_by", ""),
            card_data.get("photo_url", ""),
            card_data.get("qrcode_url", "")
        ]
        row_data = [str(x) if x is not None else "" for x in raw_data]

        # 找尋是否已經存在該 card_id
        # 我們假設 card_id 在 B 欄 (index=2)
        try:
            cell = worksheet.find(str(card_id), in_column=2)
            
            # gspread 6.0+ 會回傳 None 而不會丟出 CellNotFound 的例外
            if cell is None:
                worksheet.append_row(row_data)
                print(f"Appended new card {card_id} to Google Sheet.")
            else:
                # 已存在，則更新該列
                col_start = gspread.utils.rowcol_to_a1(cell.row, 1)
                col_end = gspread.utils.rowcol_to_a1(cell.row, len(SHEET_HEADERS))
                worksheet.update(range_name=f"{col_start}:{col_end}", values=[row_data])
                print(f"Updated card {card_id} in Google Sheet.")
        except Exception as e:
            # 支援舊版 gspread 的 CellNotFound
            if getattr(e, "__class__", None) and getattr(e.__class__, "__name__", "") == "CellNotFound":
                worksheet.append_row(row_data)
                print(f"Appended new card {card_id} to Google Sheet (legacy fallback).")
            else:
                print(f"Error finding/updating card {card_id} to Google Sheet: {e}")
                
    except Exception as e:
        print(f"Error syncing card {card_id} to Google Sheet base loop: {e}")

def trigger_sync(org_id: str, card_id: str, card_data: dict):
    """
    觸發同步操作，在 Cloud Run 環境下我們改為直接同步執行，
    以確保容器的 CPU 不會在背景執行緒完成前被限流或凍結。
    """
    if not config.GOOGLE_SHEET_ID:
        return

    try:
        sync_card_to_sheet_sync(org_id, card_id, card_data)
    except Exception as e:
        print(f"Error in trigger_sync wrapper: {e}")
