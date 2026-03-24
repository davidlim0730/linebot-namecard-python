import csv
import io
import smtplib
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders

from . import config


def generate_csv(cards_dict: dict, org_name: str) -> bytes:
    """產生名片 CSV，UTF-8 BOM 編碼（Excel 相容）"""
    fieldnames = [
        "name", "title", "company", "address", "phone", "email",
        "memo", "role_tags", "added_by", "created_at"
    ]

    output = io.StringIO()
    writer = csv.DictWriter(
        output, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()

    for card_data in cards_dict.values():
        row = {field: str(card_data.get(field, "") or "")
               for field in fieldnames}
        role_tags = card_data.get("role_tags") or []
        row["role_tags"] = ",".join(role_tags)
        writer.writerow(row)

    csv_str = output.getvalue()
    return b'\xef\xbb\xbf' + csv_str.encode("utf-8")


def send_csv_email(csv_bytes: bytes, to_email: str, org_name: str) -> None:
    """用 SMTP 寄送 CSV 附件"""
    today = date.today().strftime("%Y-%m-%d")
    filename = f"namecards_{today}.csv"
    subject = f"名片匯出 - {org_name}"

    msg = MIMEMultipart()
    msg["From"] = config.SMTP_USER
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(f"您好，\n\n附件為「{org_name}」的名片匯出資料。\n\n此為系統自動寄送，請勿回覆。", "plain", "utf-8"))

    part = MIMEBase("application", "octet-stream")
    part.set_payload(csv_bytes)
    encoders.encode_base64(part)
    part.add_header(
        "Content-Disposition", f'attachment; filename="{filename}"')
    msg.attach(part)

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(config.SMTP_USER, config.SMTP_PASSWORD)
        server.sendmail(config.SMTP_USER, to_email, msg.as_string())
