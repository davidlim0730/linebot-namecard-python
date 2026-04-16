#!/usr/bin/env python3
"""
Migrate namecard/ data to contacts/ with proper FK backfill.

Usage:
    python scripts/migrate_namecard_to_contacts.py --org_id ORG_ID [--dry-run]
    python scripts/migrate_namecard_to_contacts.py --all [--dry-run]
"""

import argparse
import json
import os
import sys
import uuid
from datetime import datetime
from difflib import SequenceMatcher

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import firebase_admin
from firebase_admin import credentials, db


def init_firebase():
    """初始化 Firebase，支援 GOOGLE_APPLICATION_CREDENTIALS_JSON env var"""
    if firebase_admin._apps:
        return

    cred = None
    creds_json = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    if creds_json:
        cred_dict = json.loads(creds_json)
        cred = credentials.Certificate(cred_dict)
    else:
        creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if creds_path:
            cred = credentials.Certificate(creds_path)
        else:
            raise RuntimeError(
                "No Firebase credentials found. Set GOOGLE_APPLICATION_CREDENTIALS_JSON "
                "or GOOGLE_APPLICATION_CREDENTIALS environment variable."
            )

    firebase_url = os.environ.get("FIREBASE_URL")
    if not firebase_url:
        raise RuntimeError("FIREBASE_URL environment variable is required.")

    firebase_admin.initialize_app(cred, {"databaseURL": firebase_url})


def fuzzy_ratio(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


class Migrator:
    def __init__(self, org_id: str, dry_run: bool = False):
        self.org_id = org_id
        self.dry_run = dry_run
        self.stats = {
            "phase1_copied": 0,
            "phase2_companies_created": 0,
            "phase3_deals_backfilled": 0,
            "phase3_deals_missing": 0,
            "phase4_activities_backfilled": 0,
            "phase4_activities_missing": 0,
            "phase5_actions_backfilled": 0,
            "phase5_actions_missing": 0,
        }

    def _write(self, path: str, data: dict, mode: str = "set"):
        """Write to Firebase or print in dry-run mode"""
        if self.dry_run:
            print(f"  [DRY-RUN] {mode.upper()} {path}")
            print(f"  data: {json.dumps(data, ensure_ascii=False, indent=4)}")
        else:
            if mode == "set":
                db.reference(path).set(data)
            elif mode == "update":
                db.reference(path).update(data)

    def _find_company_contact(self, contacts: dict, entity_name: str, threshold: float = 0.6) -> "str | None":
        """在 contacts 中找公司型 contact，回傳 contact_id 或 None"""
        best_id = None
        best_score = 0.0
        for cid, cdata in contacts.items():
            if not isinstance(cdata, dict):
                continue
            if cdata.get("contact_type") != "company":
                continue
            scores = []
            if cdata.get("display_name"):
                scores.append(fuzzy_ratio(entity_name, cdata["display_name"]))
            if cdata.get("legal_name"):
                scores.append(fuzzy_ratio(entity_name, cdata["legal_name"]))
            for alias in (cdata.get("aliases") or []):
                scores.append(fuzzy_ratio(entity_name, alias))
            score = max(scores) if scores else 0.0
            if score > best_score:
                best_score = score
                best_id = cid
        return best_id if best_score >= threshold else None

    def phase1_copy_namecards(self):
        print(f"\n[Phase 1] Copying namecard → contacts (org: {self.org_id})")
        data = db.reference(f"namecard/{self.org_id}").get() or {}
        for card_id, card_data in data.items():
            if not isinstance(card_data, dict):
                continue
            contact_data = dict(card_data)
            contact_data["contact_type"] = "person"
            contact_data["display_name"] = card_data.get("name") or "（未知）"
            contact_data["source"] = "scan"
            contact_data.setdefault("added_by", "migration")
            contact_data.setdefault("created_at", datetime.utcnow().isoformat() + "Z")
            self._write(f"contacts/{self.org_id}/{card_id}", contact_data)
            self.stats["phase1_copied"] += 1
        print(f"  Copied: {self.stats['phase1_copied']} namecards")

    def phase2_create_companies(self):
        print(f"\n[Phase 2] Creating company contacts from deal entity_names")
        deals_data = db.reference(f"deals/{self.org_id}").get() or {}
        contacts_data = db.reference(f"contacts/{self.org_id}").get() or {}

        # 收集所有 deal entity_names
        entity_names = set()
        for deal_data in deals_data.values():
            if isinstance(deal_data, dict) and deal_data.get("entity_name"):
                entity_names.add(deal_data["entity_name"].strip())

        now = datetime.utcnow().isoformat() + "Z"
        for entity_name in entity_names:
            if not entity_name:
                continue
            # 檢查是否已有符合的公司型 contact (threshold 0.8)
            existing = self._find_company_contact(contacts_data, entity_name, threshold=0.8)
            if existing:
                continue
            # 建立新公司型 contact
            contact_id = str(uuid.uuid4())
            contact_data = {
                "contact_type": "company",
                "display_name": entity_name,
                "source": "nlu",
                "added_by": "migration",
                "created_at": now,
            }
            self._write(f"contacts/{self.org_id}/{contact_id}", contact_data)
            # 更新 in-memory contacts_data (供後續 phase 使用)
            contacts_data[contact_id] = contact_data
            self.stats["phase2_companies_created"] += 1

        print(f"  Companies created: {self.stats['phase2_companies_created']}")
        return contacts_data  # 回傳更新後的 contacts（含新建的）

    def phase3_backfill_deals(self, contacts_data: dict):
        print(f"\n[Phase 3] Backfilling deals.company_contact_id")
        deals_data = db.reference(f"deals/{self.org_id}").get() or {}
        for deal_id, deal_data in deals_data.items():
            if not isinstance(deal_data, dict):
                continue
            entity_name = deal_data.get("entity_name", "")
            if not entity_name:
                continue
            contact_id = self._find_company_contact(contacts_data, entity_name, threshold=0.6)
            if contact_id:
                self._write(f"deals/{self.org_id}/{deal_id}", {"company_contact_id": contact_id}, mode="update")
                deal_data["company_contact_id"] = contact_id  # update in-memory
                self.stats["phase3_deals_backfilled"] += 1
            else:
                print(f"  WARNING: No company contact found for deal '{entity_name}' ({deal_id})")
                self.stats["phase3_deals_missing"] += 1
        print(f"  Backfilled: {self.stats['phase3_deals_backfilled']}, Missing: {self.stats['phase3_deals_missing']}")
        return deals_data

    def phase4_backfill_activities(self, contacts_data: dict, deals_data: dict):
        print(f"\n[Phase 4] Backfilling activities.contact_id")
        activities_data = db.reference(f"activities/{self.org_id}").get() or {}
        for activity_id, activity_data in activities_data.items():
            if not isinstance(activity_data, dict):
                continue
            contact_id = None
            # 從 deal 繼承
            deal_id = activity_data.get("deal_id")
            if deal_id and deal_id in deals_data:
                contact_id = deals_data[deal_id].get("company_contact_id")
            # fallback fuzzy match
            if not contact_id:
                entity_name = activity_data.get("entity_name", "")
                if entity_name:
                    contact_id = self._find_company_contact(contacts_data, entity_name, threshold=0.6)
            if contact_id:
                self._write(f"activities/{self.org_id}/{activity_id}", {"contact_id": contact_id}, mode="update")
                self.stats["phase4_activities_backfilled"] += 1
            else:
                self.stats["phase4_activities_missing"] += 1
        print(f"  Backfilled: {self.stats['phase4_activities_backfilled']}, Missing: {self.stats['phase4_activities_missing']}")

    def phase5_backfill_actions(self, contacts_data: dict, deals_data: dict):
        print(f"\n[Phase 5] Backfilling actions.contact_id")
        actions_data = db.reference(f"actions/{self.org_id}").get() or {}
        for action_id, action_data in actions_data.items():
            if not isinstance(action_data, dict):
                continue
            contact_id = None
            deal_id = action_data.get("deal_id")
            if deal_id and deal_id in deals_data:
                contact_id = deals_data[deal_id].get("company_contact_id")
            if not contact_id:
                entity_name = action_data.get("entity_name", "")
                if entity_name:
                    contact_id = self._find_company_contact(contacts_data, entity_name, threshold=0.6)
            if contact_id:
                self._write(f"actions/{self.org_id}/{action_id}", {"contact_id": contact_id}, mode="update")
                self.stats["phase5_actions_backfilled"] += 1
            else:
                self.stats["phase5_actions_missing"] += 1
        print(f"  Backfilled: {self.stats['phase5_actions_backfilled']}, Missing: {self.stats['phase5_actions_missing']}")

    def run(self):
        print(f"\n{'='*60}")
        print(f"Migration: namecard → contacts")
        print(f"Org: {self.org_id} | Dry-run: {self.dry_run}")
        print(f"{'='*60}")

        self.phase1_copy_namecards()
        contacts_data = self.phase2_create_companies()
        deals_data = self.phase3_backfill_deals(contacts_data)
        self.phase4_backfill_activities(contacts_data, deals_data)
        self.phase5_backfill_actions(contacts_data, deals_data)

        print(f"\n{'='*60}")
        print("Summary:")
        for key, val in self.stats.items():
            print(f"  {key}: {val}")
        print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(description="Migrate namecard to contacts")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--org_id", help="Single org ID to migrate")
    group.add_argument("--all", action="store_true", help="Migrate all orgs")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without writing")
    args = parser.parse_args()

    init_firebase()

    if args.org_id:
        org_ids = [args.org_id]
    else:
        # List all orgs from namecard/
        orgs_data = db.reference("namecard").get() or {}
        org_ids = list(orgs_data.keys())

    for org_id in org_ids:
        migrator = Migrator(org_id=org_id, dry_run=args.dry_run)
        migrator.run()


if __name__ == "__main__":
    main()
