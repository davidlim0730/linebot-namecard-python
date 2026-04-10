import logging
from io import BytesIO
import PIL.Image

from . import firebase_utils, gemini_utils, utils, config
from .gsheets_utils import trigger_sync

logger = logging.getLogger(__name__)


async def process_batch(user_id: str, org_id: str, image_paths: list) -> dict:
    """
    循序處理批量名片圖片：download → OCR → dedup → save → delete raw image。
    回傳摘要 {success, failed, failures: [{index, reason}]}
    """
    success = 0
    failed = 0
    failures = []

    quota_hit = False
    quota_reason = None

    for idx, storage_path in enumerate(image_paths):
        # 額度檢查：每張圖片前先確認組織還有剩餘額度
        permission = firebase_utils.check_org_permission(org_id, 'scan')
        if not permission['allowed']:
            quota_hit = True
            quota_reason = permission['reason']
            failures.append({"index": idx + 1, "reason": f"quota_exceeded:{permission['reason']}"})
            break

        # idempotency：若 storage 檔案不存在，代表已被處理過，跳過
        image_bytes = firebase_utils.download_raw_image(storage_path)
        if image_bytes is None:
            logger.info(f"Batch: image {idx} not found in storage, skipping (idempotent)")
            continue

        try:
            img = PIL.Image.open(BytesIO(image_bytes))
            result = gemini_utils.generate_json_from_image(img, config.IMGAGE_PROMPT)
            card_obj = utils.parse_gemini_result_to_json(result.text)

            if not card_obj:
                raise ValueError(f"OCR 無法解析圖片: {result.text[:100]}")

            if isinstance(card_obj, list):
                if not card_obj:
                    raise ValueError("OCR 回傳空資料")
                card_obj = card_obj[0]

            card_obj = {k.lower(): v for k, v in card_obj.items()}
            card_obj = utils.validate_namecard_fields(card_obj)

            # 去重檢查
            existing_id = firebase_utils.check_if_card_exists(card_obj, org_id)
            if existing_id:
                # 重複名片視為成功（已存在即可）
                success += 1
            else:
                card_id = firebase_utils.add_namecard(card_obj, org_id, user_id)
                if card_id:
                    try:
                        trigger_sync(org_id, card_id, card_obj)
                    except Exception as e_sync:
                        logger.warning(f"Batch: gsheets sync failed for card {card_id}: {e_sync}")
                    success += 1
                else:
                    raise ValueError("寫入 Firebase 失敗")
        except Exception as e:
            failed += 1
            failures.append({"index": idx + 1, "reason": str(e)})
            logger.error(f"Batch: failed processing image {idx}: {e}")
        finally:
            # 無論成功或失敗都刪除暫存圖
            firebase_utils.delete_raw_image(storage_path)

    result = {"success": success, "failed": failed, "failures": failures}
    if quota_hit:
        result["quota_hit"] = True
        result["quota_reason"] = quota_reason
    return result
