"""
Phase 1 → Phase 2 Migration Script

Moves namecard data from per-user paths (namecard/{user_id}/)
to a shared org path (namecard/org_default/).

Usage:
    python scripts/migrate_phase2.py --admin-user-id <LINE_USER_ID>

Requirements:
    - FIREBASE_URL and GOOGLE_APPLICATION_CREDENTIALS_JSON env vars must be set
    - Run BEFORE deploying the Phase 2 app version

Idempotent: safe to run multiple times; skips card_ids that already exist
under the target org path.
"""

import argparse
import os
import sys
import json
from datetime import datetime

# Resolve project root so we can import firebase_admin directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import firebase_admin
from firebase_admin import credentials, db


def init_firebase():
    # 優先使用檔案路徑（GOOGLE_APPLICATION_CREDENTIALS），其次 JSON 字串
    gac_file = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    gac_str = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")

    if gac_file:
        cred = credentials.Certificate(gac_file)
    elif gac_str:
        try:
            if '\\n' in gac_str and '\\\\n' not in gac_str:
                gac_str = gac_str.replace('\\n', '\\\\n')
            cred_json = json.loads(gac_str, strict=False)
            cred = credentials.Certificate(cred_json)
        except Exception as e:
            print(f"Failed to parse credentials JSON: {e}")
            sys.exit(1)
    else:
        cred = credentials.ApplicationDefault()

    firebase_url = os.environ.get("FIREBASE_URL")
    if not firebase_url:
        print("FIREBASE_URL env var is required.")
        sys.exit(1)

    firebase_admin.initialize_app(cred, {"databaseURL": firebase_url})


def migrate(admin_user_id: str, org_id: str = "org_default", dry_run: bool = False):
    print(f"\n{'[DRY RUN] ' if dry_run else ''}Starting Phase 2 migration")
    print(f"  Target org: {org_id}")
    print(f"  Admin user: {admin_user_id}\n")

    namecard_ref = db.reference("namecard")
    all_data = namecard_ref.get() or {}

    # Collect all user_ids that have namecard data (skip org-style keys)
    user_ids = [k for k in all_data if not k.startswith("org_")]
    if not user_ids:
        print("No Phase 1 user data found under namecard/. Nothing to migrate.")
        return

    print(f"Found {len(user_ids)} user(s) with namecard data: {user_ids}\n")

    # Load existing cards under target org (for idempotency check)
    existing_org_cards = all_data.get(org_id, {})

    migrated = 0
    skipped = 0

    for user_id in user_ids:
        user_cards = all_data[user_id]
        if not isinstance(user_cards, dict):
            continue

        for card_id, card_data in user_cards.items():
            if card_id in existing_org_cards:
                print(f"  SKIP  {card_id} (already exists in {org_id})")
                skipped += 1
                continue

            new_card = dict(card_data)
            new_card['added_by'] = user_id

            if not dry_run:
                db.reference(f"namecard/{org_id}/{card_id}").set(new_card)

            print(f"  {'WOULD COPY' if dry_run else 'COPIED'} "
                  f"{card_id} (from {user_id})")
            migrated += 1

    print(f"\nCards migrated: {migrated}, skipped: {skipped}")

    # Create the org node
    now = datetime.now().isoformat()
    org_ref = db.reference(f"organizations/{org_id}")
    existing_org = org_ref.get()

    if existing_org:
        print(f"\nOrg '{org_id}' already exists. Merging members.")
    else:
        org_data = {
            "name": "預設團隊",
            "created_by": admin_user_id,
            "created_at": now,
            "members": {}
        }
        if not dry_run:
            org_ref.set(org_data)
        print(f"\n{'WOULD CREATE' if dry_run else 'CREATED'} org '{org_id}'")

    # Add all users as members; first user (admin_user_id) gets admin role
    for i, user_id in enumerate(user_ids):
        role = "admin" if user_id == admin_user_id else "member"
        member_data = {"role": role, "joined_at": now}

        if not dry_run:
            db.reference(f"organizations/{org_id}/members/{user_id}").set(
                member_data)
            db.reference(f"user_org_map/{user_id}").set(org_id)

        print(f"  {'WOULD ADD' if dry_run else 'ADDED'} "
              f"{user_id} as {role}")

    # Ensure admin is always present even if not in user_ids
    if admin_user_id not in user_ids:
        if not dry_run:
            db.reference(
                f"organizations/{org_id}/members/{admin_user_id}"
            ).set({"role": "admin", "joined_at": now})
            db.reference(f"user_org_map/{admin_user_id}").set(org_id)
        print(f"  {'WOULD ADD' if dry_run else 'ADDED'} "
              f"{admin_user_id} as admin (explicit)")

    print("\nMigration complete.")
    print("Original namecard/{user_id}/ data preserved. "
          "Delete manually after 30 days once Phase 2 is verified.\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Migrate Phase 1 namecard data to Phase 2 org structure")
    parser.add_argument(
        "--admin-user-id", required=True,
        help="LINE user_id to set as org admin")
    parser.add_argument(
        "--org-id", default="org_default",
        help="Target org_id (default: org_default)")
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Preview changes without writing to Firebase")
    args = parser.parse_args()

    init_firebase()
    migrate(
        admin_user_id=args.admin_user_id,
        org_id=args.org_id,
        dry_run=args.dry_run
    )
