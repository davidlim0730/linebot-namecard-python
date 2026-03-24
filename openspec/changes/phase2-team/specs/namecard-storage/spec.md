## MODIFIED Requirements

### Requirement: Namecard storage path uses org_id
Namecards SHALL be stored under `namecard/{org_id}/{card_id}/` instead of `namecard/{user_id}/{card_id}/`. Every namecard record MUST include an `added_by` field containing the LINE user_id of the user who created it.

#### Scenario: New namecard is saved
- **WHEN** OCR extraction succeeds and the card is ready to save
- **THEN** system writes to `namecard/{org_id}/{card_id}/` with all existing fields plus `added_by: user_id`

#### Scenario: Namecard is retrieved by card_id
- **WHEN** system needs to load a specific namecard
- **THEN** it reads from `namecard/{org_id}/{card_id}/` using the org_id from `user_org_map/{user_id}`

#### Scenario: All namecards for an org are listed
- **WHEN** system performs a search or list operation
- **THEN** it scans `namecard/{org_id}/` (not `namecard/{user_id}/`)

## ADDED Requirements

### Requirement: Phase 1 data migration
The system SHALL provide a migration script that moves all existing `namecard/{user_id}/` data to `namecard/{org_id}/` without data loss.

#### Scenario: Migration script runs successfully
- **WHEN** `scripts/migrate_phase2.py` is executed with a designated admin user_id
- **THEN** all existing namecards are copied to `namecard/org_default/`, each with `added_by` set to the original user_id, and `user_org_map` + `organizations/org_default/members` are populated

#### Scenario: Migration is idempotent
- **WHEN** the migration script is run more than once
- **THEN** it does not create duplicate records (checks for existing card_ids before writing)
