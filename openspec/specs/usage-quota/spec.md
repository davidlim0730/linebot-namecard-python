## ADDED Requirements

### Requirement: Atomic scan count increment
The system SHALL atomically increment `organizations/{org_id}/usage/scan_count` using a Firebase Transaction after each successful namecard addition (non-duplicate only).

#### Scenario: Single image scan succeeds
- **WHEN** `add_namecard` successfully stores a new (non-duplicate) namecard
- **THEN** `scan_count` is incremented by exactly 1 via Firebase Transaction

#### Scenario: Duplicate namecard detected
- **WHEN** `check_if_card_exists` returns an existing card ID
- **THEN** `scan_count` is NOT incremented

#### Scenario: Concurrent image submissions
- **WHEN** 5 images are submitted near-simultaneously for the same org
- **THEN** `scan_count` is exactly 5 (no lost increments due to race conditions)

### Requirement: Scan limit enforcement
The system SHALL deny scan actions when `scan_count >= 50` for trial organizations.

#### Scenario: Trial org at scan limit
- **WHEN** `check_org_permission(org_id, 'scan')` is called and `scan_count` is 50
- **THEN** the system returns `{'allowed': False, 'reason': 'scan_limit_reached'}`

#### Scenario: Trial org under scan limit
- **WHEN** `check_org_permission(org_id, 'scan')` is called and `scan_count` is 49, trial not expired
- **THEN** the system returns `{'allowed': True, 'reason': 'ok'}`

### Requirement: Member limit enforcement
The system SHALL deny `add_member` actions when the org already has 3 members.

#### Scenario: Trial org at member limit
- **WHEN** `check_org_permission(org_id, 'add_member')` is called and org has 3 members
- **THEN** the system returns `{'allowed': False, 'reason': 'member_limit_reached'}`

#### Scenario: Pro org unlimited members
- **WHEN** `check_org_permission(org_id, 'add_member')` is called for a `pro` org with 10 members
- **THEN** the system returns `{'allowed': True, 'reason': 'ok'}`

### Requirement: Batch upload quota guard
The `batch_processor` SHALL check quota before processing each image and abort remaining images when quota is exceeded.

#### Scenario: Quota exceeded mid-batch
- **WHEN** `process_batch` processes images and quota is exceeded at image N
- **THEN** images 1 to N-1 are processed, image N and beyond are skipped, result includes `quota_hit=True` and `quota_reason`

#### Scenario: Batch summary includes quota info
- **WHEN** batch processing is interrupted by quota
- **THEN** the push summary message includes a quota exceeded warning with the specific reason
