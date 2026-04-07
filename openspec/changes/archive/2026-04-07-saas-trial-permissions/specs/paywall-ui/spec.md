## ADDED Requirements

### Requirement: Trial welcome message on onboarding
The system SHALL push a welcome message when a new organization is created for a first-time user.

#### Scenario: New user sends first image
- **WHEN** `ensure_user_org` returns `is_new=True` during image or text event handling
- **THEN** a welcome trial message is pushed via `push_message` (not reply) containing trial details (7 days, 50 scans, 3 members)

### Requirement: Paywall on scan denial
The system SHALL display a paywall Flex Message when a scan action is denied by `check_org_permission`.

#### Scenario: User sends image after trial expired
- **WHEN** `handle_image_event` calls `check_org_permission` and receives `reason=trial_expired`
- **THEN** the system replies with a paywall Flex Message with expired-specific copy and upgrade button

#### Scenario: User sends image after scan limit reached
- **WHEN** `handle_image_event` calls `check_org_permission` and receives `reason=scan_limit_reached`
- **THEN** the system replies with a paywall Flex Message with scan-limit-specific copy and upgrade button

### Requirement: Paywall on member limit denial
The system SHALL display a member limit message when an `add_member` action is denied.

#### Scenario: Fourth user tries to join via invite code
- **WHEN** `handle_join` calls `check_org_permission(target_org_id, 'add_member')` and receives `reason=member_limit_reached`
- **THEN** the system replies with a text message explaining the member limit and suggesting upgrade

### Requirement: Upgrade button leads to LINE OA
The paywall Flex Message upgrade button SHALL use URIAction to open the LINE OA conversation.

#### Scenario: LINE_OA_ID is configured
- **WHEN** `LINE_OA_ID` env var is set (e.g., `@abc123`)
- **THEN** the upgrade button uses `URIAction(uri='line://ti/p/@abc123')`

#### Scenario: LINE_OA_ID is not configured
- **WHEN** `LINE_OA_ID` env var is not set
- **THEN** the upgrade button falls back to MessageAction with contact information text

### Requirement: Reason-specific paywall copy
The paywall Flex Message SHALL display different copy based on the denial reason.

#### Scenario: Scan limit reached copy
- **WHEN** paywall is triggered with `reason=scan_limit_reached`
- **THEN** the message displays "已達試用上限" with scan count context

#### Scenario: Trial expired copy
- **WHEN** paywall is triggered with `reason=trial_expired`
- **THEN** the message displays "試用期已結束" with data preservation assurance
