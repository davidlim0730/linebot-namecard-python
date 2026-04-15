import logging
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import List

from linebot.models import TextSendMessage, FlexSendMessage

from ..bot_instance import line_bot_api
from ..repositories.action_repo import ActionRepo
from ..repositories.activity_repo import ActivityRepo
from ..repositories.deal_repo import DealRepo
from ..repositories.org_repo import OrgRepo

logger = logging.getLogger(__name__)

action_repo = ActionRepo()
activity_repo = ActivityRepo()
deal_repo = DealRepo()
org_repo = OrgRepo()


async def push_action_reminders(org_id: str) -> int:
    """Push today's due actions to each user. Returns number of users notified."""
    due_actions = action_repo.list_due_today(org_id)
    if not due_actions:
        return 0

    by_user = defaultdict(list)
    for action in due_actions:
        by_user[action.added_by].append(action)

    notified = 0
    for user_id, actions in by_user.items():
        lines = [f"📌 今日待辦（{len(actions)} 筆）"]
        for a in actions:
            lines.append(f"• {a.entity_name}｜{a.task_detail}｜{a.due_date}")
        text = "\n".join(lines)
        try:
            await line_bot_api.push_message(user_id, TextSendMessage(text=text))
            notified += 1
        except Exception as e:
            logger.warning("push_action_reminders failed for %s: %s", user_id, e)

    return notified


async def push_weekly_summary(org_id: str) -> int:
    """Push weekly summary to all org members. Returns number of users notified."""
    org = org_repo.get(org_id)
    if not org:
        return 0

    # Count this week's activities
    now = datetime.now(timezone.utc)
    week_start = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%dT00:00:00Z")
    all_activities = activity_repo.list_all(org_id)
    weekly_count = sum(
        1 for a in all_activities.values()
        if a.created_at >= week_start
    )

    # Count overdue actions (due_date < today, still pending)
    today = now.strftime("%Y-%m-%d")
    all_actions = action_repo.list_all(org_id)
    overdue = [
        a for a in all_actions.values()
        if a.status == "pending" and a.due_date < today
    ]

    # Count next week actions
    next_week_end = (now + timedelta(days=7)).strftime("%Y-%m-%d")
    upcoming = [
        a for a in all_actions.values()
        if a.status == "pending" and today <= a.due_date <= next_week_end
    ]

    lines = [
        "📊 本週 CRM 摘要",
        f"• 互動紀錄：{weekly_count} 筆",
        f"• 逾期未處理：{len(overdue)} 筆",
        f"• 下週待辦：{len(upcoming)} 筆",
    ]
    text = "\n".join(lines)

    notified = 0
    for member in org.members:
        try:
            await line_bot_api.push_message(member.user_id, TextSendMessage(text=text))
            notified += 1
        except Exception as e:
            logger.warning("push_weekly_summary failed for %s: %s", member.user_id, e)

    return notified
