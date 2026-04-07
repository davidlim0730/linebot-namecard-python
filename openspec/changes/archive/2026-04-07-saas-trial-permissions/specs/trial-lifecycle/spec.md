## ADDED Requirements

### Requirement: Auto-provision trial on org creation
The system SHALL automatically set `plan_type=trial`, `trial_ends_at=now+7d` (UTC), and `usage.scan_count=0` when creating a new organization via `create_org`.

#### Scenario: New user triggers org creation
- **WHEN** a user without an existing organization sends their first message
- **THEN** `ensure_user_org` creates a new org with `plan_type=trial`, `trial_ends_at` set to 7 days from now (UTC), and `usage.scan_count=0`

#### Scenario: Existing user already has org
- **WHEN** a user who already belongs to an organization sends a message
- **THEN** `ensure_user_org` returns the existing `org_id` without modifying plan fields

### Requirement: Grandfathering for legacy organizations
The system SHALL treat organizations without a `plan_type` field as `pro` (unlimited access).

#### Scenario: Alpha org without plan_type sends image
- **WHEN** `check_org_permission` is called for an org where `plan_type` is `None`
- **THEN** the system returns `{'allowed': True, 'reason': 'ok'}`

#### Scenario: Pro org sends image
- **WHEN** `check_org_permission` is called for an org where `plan_type` is `pro`
- **THEN** the system returns `{'allowed': True, 'reason': 'ok'}`

### Requirement: Trial expiry detection
The system SHALL deny scan actions when `trial_ends_at` has passed.

#### Scenario: Trial expired, user sends image
- **WHEN** `check_org_permission(org_id, 'scan')` is called and `trial_ends_at` is in the past
- **THEN** the system returns `{'allowed': False, 'reason': 'trial_expired'}`

#### Scenario: Trial still active, under scan limit
- **WHEN** `check_org_permission(org_id, 'scan')` is called, `trial_ends_at` is in the future, and `scan_count < 50`
- **THEN** the system returns `{'allowed': True, 'reason': 'ok'}`

### Requirement: ensure_user_org returns new-org flag
`ensure_user_org` SHALL return a tuple `(org_id, is_new)` where `is_new=True` indicates the org was just created.

#### Scenario: First-time user
- **WHEN** `ensure_user_org` is called for a user with no existing org
- **THEN** it returns `(new_org_id, True)`

#### Scenario: Returning user
- **WHEN** `ensure_user_org` is called for a user with an existing org
- **THEN** it returns `(existing_org_id, False)`
