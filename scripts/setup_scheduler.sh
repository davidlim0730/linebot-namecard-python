#!/usr/bin/env bash
# setup_scheduler.sh — 建立 Cloud Scheduler jobs for CRM push notifications
# Usage: PROJECT_ID=xxx SERVICE_URL=https://xxx.run.app bash scripts/setup_scheduler.sh

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Please set PROJECT_ID}"
SERVICE_URL="${SERVICE_URL:?Please set SERVICE_URL}"
REGION="${REGION:-asia-east1}"
SA_EMAIL="${SA_EMAIL:-}"  # Cloud Scheduler 用 SA（需有 roles/run.invoker）

echo "Setting up Cloud Scheduler in project=${PROJECT_ID}, region=${REGION}"

# ---- 每日上午 09:00 推播今日到期 actions ----
gcloud scheduler jobs create http crm-push-action-reminders \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="0 9 * * *" \
  --time-zone="Asia/Taipei" \
  --uri="${SERVICE_URL}/internal/push-action-reminders" \
  --http-method=POST \
  --message-body='{}' \
  --headers="Content-Type=application/json" \
  ${SA_EMAIL:+--oidc-service-account-email="${SA_EMAIL}"} \
  --attempt-deadline=120s \
  --description="Daily 09:00 — push today due actions to LINE users" \
  2>/dev/null || \
gcloud scheduler jobs update http crm-push-action-reminders \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="0 9 * * *" \
  --time-zone="Asia/Taipei" \
  --uri="${SERVICE_URL}/internal/push-action-reminders" \
  --http-method=POST \
  --message-body='{}' \
  --headers="Content-Type=application/json" \
  ${SA_EMAIL:+--oidc-service-account-email="${SA_EMAIL}"} \
  --attempt-deadline=120s

echo "✅ crm-push-action-reminders created/updated"

# ---- 每週五 18:00 推播週報 ----
gcloud scheduler jobs create http crm-push-weekly-summary \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="0 18 * * 5" \
  --time-zone="Asia/Taipei" \
  --uri="${SERVICE_URL}/internal/push-weekly-summary" \
  --http-method=POST \
  --message-body='{}' \
  --headers="Content-Type=application/json" \
  ${SA_EMAIL:+--oidc-service-account-email="${SA_EMAIL}"} \
  --attempt-deadline=120s \
  --description="Weekly Friday 18:00 — push weekly CRM summary to LINE users" \
  2>/dev/null || \
gcloud scheduler jobs update http crm-push-weekly-summary \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="0 18 * * 5" \
  --time-zone="Asia/Taipei" \
  --uri="${SERVICE_URL}/internal/push-weekly-summary" \
  --http-method=POST \
  --message-body='{}' \
  --headers="Content-Type=application/json" \
  ${SA_EMAIL:+--oidc-service-account-email="${SA_EMAIL}"} \
  --attempt-deadline=120s

echo "✅ crm-push-weekly-summary created/updated"
echo ""
echo "Done! Verify with: gcloud scheduler jobs list --project=${PROJECT_ID} --location=${REGION}"
