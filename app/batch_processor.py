import logging
import json
import os
from io import BytesIO
from datetime import datetime
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


def append_batch_image(user_id: str, org_id: str, storage_path: str, db):
    """新增圖片到批量上傳隊列並記錄時間戳

    Args:
        user_id: LINE user ID
        org_id: Organization ID
        storage_path: Firebase Storage path (e.g., raw_images/org/user/uuid.jpg)
        db: Firebase database instance
    """
    batch_ref = db.reference(f'batch_states/{user_id}')
    batch_data = batch_ref.get() or {}

    # 新增圖片
    pending_images = batch_data.get('pending_images', [])
    if isinstance(pending_images, dict):
        # Firebase push() returns dict, convert to list for appending
        pending_images = list(pending_images.values())
    else:
        pending_images = list(pending_images) if pending_images else []

    pending_images.append(storage_path)

    # 更新 last_image_time（用於 idle detection）
    batch_data['pending_images'] = pending_images
    batch_data['last_image_time'] = datetime.utcnow().isoformat()
    batch_data['updated_at'] = datetime.utcnow().isoformat()

    batch_ref.update(batch_data)
    logger.info(f"Appended image to batch for {user_id}, total: {len(pending_images)}")


def check_batch_idle_and_trigger(user_id: str, org_id: str, db, cloud_tasks_client):
    """檢查批量上傳是否 idle（5 秒無新圖片）

    由 Cloud Scheduler 每 2 秒呼叫一次

    Args:
        user_id: LINE user ID
        org_id: Organization ID
        db: Firebase database instance
        cloud_tasks_client: Google Cloud Tasks client
    """
    batch_ref = db.reference(f'batch_states/{user_id}')
    batch_data = batch_ref.get()

    if not batch_data or not batch_data.get('pending_images'):
        return  # No active batch

    last_image_time_str = batch_data.get('last_image_time')
    if not last_image_time_str:
        return

    last_image_time = datetime.fromisoformat(last_image_time_str)
    elapsed = (datetime.utcnow() - last_image_time).total_seconds()

    if elapsed >= 5:
        logger.info(f"Batch idle detected for {user_id} ({elapsed:.1f}s), triggering completion")
        trigger_batch_completion(user_id, org_id, db, cloud_tasks_client)
    else:
        logger.info(f"Batch still active for {user_id} ({elapsed:.1f}s), waiting...")


def trigger_batch_completion(user_id: str, org_id: str, db, cloud_tasks_client):
    """觸發批量上傳完成流程

    相當於用戶輸入「完成」，建立 Cloud Task 呼叫 /internal/process-batch

    Args:
        user_id: LINE user ID
        org_id: Organization ID
        db: Firebase database instance
        cloud_tasks_client: Google Cloud Tasks client
    """
    batch_ref = db.reference(f'batch_states/{user_id}')
    batch_data = batch_ref.get() or {}

    if not batch_data.get('pending_images'):
        logger.warning(f"No images to process for {user_id}")
        return

    # 建立 Cloud Task
    task = {
        'http_request': {
            'http_method': 'POST',
            'url': f"{os.getenv('CLOUD_RUN_URL')}/internal/process-batch",
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'user_id': user_id,
                'org_id': org_id
            }).encode()
        }
    }

    request = {
        'parent': cloud_tasks_client.queue_path(
            os.getenv('GOOGLE_CLOUD_PROJECT'),
            os.getenv('CLOUD_TASKS_LOCATION'),
            os.getenv('CLOUD_TASKS_QUEUE')
        ),
        'task': task
    }

    cloud_tasks_client.create_task(request)

    # 標記為「已排隊」，避免重複觸發
    batch_data['status'] = 'queued'
    batch_ref.update(batch_data)

    logger.info(f"Created Cloud Task for batch completion: {user_id}")
