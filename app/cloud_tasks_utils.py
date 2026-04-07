import json
from google.cloud import tasks_v2
from google.protobuf import duration_pb2
from . import config


def create_process_batch_task(
        user_id: str, org_id: str, image_paths: list) -> str:
    """
    建立 Cloud Task 指向 /internal/process-batch endpoint。
    回傳 task name，失敗時回傳 None。
    dispatch_deadline 設定為 30 分鐘。
    """
    try:
        client = tasks_v2.CloudTasksClient()
        parent = client.queue_path(
            project=_get_project_id(),
            location=config.CLOUD_TASKS_LOCATION,
            queue=config.CLOUD_TASKS_QUEUE,
        )
        payload = {
            "user_id": user_id,
            "org_id": org_id,
            "image_paths": image_paths,
        }
        deadline = duration_pb2.Duration()
        deadline.seconds = 30 * 60  # 30 分鐘

        task = {
            "http_request": {
                "http_method": tasks_v2.HttpMethod.POST,
                "url": f"{config.CLOUD_RUN_URL}/internal/process-batch",
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps(payload).encode(),
            },
            "dispatch_deadline": deadline,
        }
        response = client.create_task(request={"parent": parent, "task": task})
        return response.name
    except Exception as e:
        print(f"Error creating Cloud Task: {e}")
        return None


def _get_project_id() -> str:
    """從 ADC metadata 或環境變數取得 GCP project ID"""
    import os
    project = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCLOUD_PROJECT")
    if project:
        return project
    try:
        import requests
        resp = requests.get(
            "http://metadata.google.internal/computeMetadata/v1/project/project-id",
            headers={"Metadata-Flavor": "Google"},
            timeout=2,
        )
        return resp.text
    except Exception:
        raise RuntimeError(
            "Cannot determine GCP project ID. "
            "Set GOOGLE_CLOUD_PROJECT environment variable."
        )
