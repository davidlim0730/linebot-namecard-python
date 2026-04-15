from fastapi import APIRouter, Request, HTTPException
import logging

from .. import config
from ..batch_processor import process_batch, check_batch_idle_and_trigger
from ..line_handlers import send_batch_summary_push
from ..repositories.org_repo import OrgRepo

router = APIRouter(prefix="/internal")
logger = logging.getLogger(__name__)
org_repo = OrgRepo()


def get_db_instance():
    """Get Firebase Realtime Database instance for batch idle checking."""
    from firebase_admin import db
    return db


@router.post("/process-batch")
async def internal_process_batch(request: Request):
    queue_name = request.headers.get("X-CloudTasks-QueueName", "")
    if queue_name != config.CLOUD_TASKS_QUEUE:
        raise HTTPException(status_code=403, detail="Forbidden")
    body = await request.json()
    user_id = body.get("user_id")
    org_id = body.get("org_id")
    image_paths = body.get("image_paths", [])
    if not user_id or not org_id or not image_paths:
        raise HTTPException(status_code=400, detail="Missing required fields")
    summary = await process_batch(user_id, org_id, image_paths)
    await send_batch_summary_push(user_id, summary)
    return {"status": "ok", "summary": summary}


@router.post("/check-batch-idle")
def check_batch_idle():
    try:
        from google.cloud import tasks_v2

        db = get_db_instance()
        tasks_client = tasks_v2.CloudTasksClient()
        batch_states_ref = db.reference('batch_states')
        all_batches = batch_states_ref.get() or {}

        for user_id, batch_data in all_batches.items():
            org_id = batch_data.get('org_id')
            status = batch_data.get('status', 'active')
            if status == 'queued':
                logger.info(f"Batch for {user_id} already queued, skipping")
                continue
            check_batch_idle_and_trigger(user_id, org_id, db, tasks_client)

        return {'status': 'ok'}
    except Exception as e:
        logger.error(f"Error in check_batch_idle: {str(e)}")
        return {'status': 'error', 'message': str(e)}


@router.post("/push-action-reminders")
async def push_action_reminders_all():
    """Cloud Scheduler: push today's due actions to all orgs."""
    from ..services.push_service import push_action_reminders
    from firebase_admin import db

    try:
        # Collect all distinct org_ids from user_org_map
        all_org_ids = set()
        user_org_map = db.reference("user_org_map").get() or {}
        for org_id in user_org_map.values():
            if isinstance(org_id, str):
                all_org_ids.add(org_id)

        total_notified = 0
        for org_id in all_org_ids:
            total_notified += await push_action_reminders(org_id)

        return {"status": "ok", "notified": total_notified}
    except Exception as e:
        logger.error("push-action-reminders error: %s", e)
        return {"status": "error", "message": str(e)}


@router.post("/push-weekly-summary")
async def push_weekly_summary_all():
    """Cloud Scheduler: push weekly summary to all orgs."""
    from ..services.push_service import push_weekly_summary
    from firebase_admin import db

    try:
        all_org_ids = set()
        user_org_map = db.reference("user_org_map").get() or {}
        for org_id in user_org_map.values():
            if isinstance(org_id, str):
                all_org_ids.add(org_id)

        total_notified = 0
        for org_id in all_org_ids:
            total_notified += await push_weekly_summary(org_id)

        return {"status": "ok", "notified": total_notified}
    except Exception as e:
        logger.error("push-weekly-summary error: %s", e)
        return {"status": "error", "message": str(e)}
