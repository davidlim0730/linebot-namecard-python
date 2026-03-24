Guide the deployment of this LINE Bot application to Google Cloud Run.

## Pre-deployment Checks

Run these checks before deploying and report any issues:

1. **Lint**: Run `flake8 .` and report any errors
2. **Dependencies**: Verify `requirements.txt` is consistent with imports in `app/` modules
3. **Environment Variables**: Check that `app/config.py` references match the required env vars:
   - `ChannelSecret`
   - `ChannelAccessToken`
   - `GEMINI_API_KEY`
   - `FIREBASE_URL`
   - `FIREBASE_STORAGE_BUCKET`
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON`
4. **Docker**: Verify `Dockerfile` is valid and consistent with `runtime.txt`

## Deployment Steps

After checks pass, provide the deployment commands with the user's project configuration:

1. Build and push image:
   ```
   gcloud builds submit --tag gcr.io/{PROJECT_ID}/{IMAGE_NAME}
   ```

2. Deploy to Cloud Run:
   ```
   gcloud run deploy {IMAGE_NAME} \
     --image gcr.io/{PROJECT_ID}/{IMAGE_NAME} \
     --platform managed \
     --region asia-east1 \
     --allow-unauthenticated
   ```

Ask the user to confirm PROJECT_ID and IMAGE_NAME before generating the final commands. Do NOT execute deployment commands automatically — always ask for confirmation first.

## Post-deployment

After the user confirms deployment is complete:
- Suggest testing the webhook endpoint with a curl health check
- Remind to verify the LINE Bot webhook URL is updated in LINE Developers Console if the Cloud Run URL changed
