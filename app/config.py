import os
import sys

# =====================
# LINE Bot 設定
# =====================
CHANNEL_SECRET = os.getenv("ChannelSecret", None)
CHANNEL_ACCESS_TOKEN = os.getenv("ChannelAccessToken", None)

# =====================
# API 金鑰設定
# =====================
GEMINI_KEY = os.getenv("GEMINI_API_KEY")

# =====================
# Firebase 設定
# =====================
FIREBASE_URL = os.environ.get("FIREBASE_URL")
FIREBASE_STORAGE_BUCKET = os.environ.get("FIREBASE_STORAGE_BUCKET")
NAMECARD_PATH = "namecard"
GOOGLE_SHEET_ID = os.environ.get("GOOGLE_SHEET_ID")
DEFAULT_ORG_ID = os.environ.get("DEFAULT_ORG_ID", "org_default")
LINE_OA_ID = os.environ.get("LINE_OA_ID")  # e.g. "@abc123", used for upgrade button

# =====================
# Cloud Tasks 設定（批量上傳，可選）
# =====================
CLOUD_TASKS_QUEUE = os.environ.get("CLOUD_TASKS_QUEUE")
CLOUD_TASKS_LOCATION = os.environ.get("CLOUD_TASKS_LOCATION")
CLOUD_RUN_URL = os.environ.get("CLOUD_RUN_URL")

if not all([CLOUD_TASKS_QUEUE, CLOUD_TASKS_LOCATION, CLOUD_RUN_URL]):
    print("Warning: CLOUD_TASKS_QUEUE, CLOUD_TASKS_LOCATION, or CLOUD_RUN_URL not set. "
          "Batch upload feature is disabled.")
    BATCH_UPLOAD_ENABLED = False
else:
    BATCH_UPLOAD_ENABLED = True

# =====================
# Email 設定（CSV 匯出，可選）
# =====================
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")

# =====================
# Gemini Prompt 設定
# =====================
IMGAGE_PROMPT = """
這是一張名片，你是一個名片秘書。請將以下資訊整理成 json 給我。
如果看不出來的，幫我填寫 N/A。
只回傳 json 就好：name, title, address, email, phone, mobile, line_id, company。
其中：
- phone 是辦公室電話或市話（02、03、04 等開頭，或 +886 2/3/4 等），格式保持原樣
- mobile 是行動電話（09 開頭，或 +886 9 開頭），格式保持原樣
- phone 與 mobile 是不同欄位，請分開填寫，不要混用
- line_id 是 LINE ID（名片上常見 LINE: 或 ID: 標示的英數字帳號）
"""

# =====================
# 環境變數檢查
# =====================
if CHANNEL_SECRET is None:
    print("Specify ChannelSecret as environment variable.")
    sys.exit(1)
if CHANNEL_ACCESS_TOKEN is None:
    print("Specify ChannelAccessToken as environment variable.")
    sys.exit(1)
if GEMINI_KEY is None:
    print("Specify GEMINI_API_KEY as environment variable.")
    sys.exit(1)
if FIREBASE_URL is None:
    print("Specify FIREBASE_URL as environment variable.")
    sys.exit(1)
