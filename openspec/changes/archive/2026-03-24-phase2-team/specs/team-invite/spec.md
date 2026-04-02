## ADDED Requirements

### Requirement: Generate invite code
The system SHALL allow an admin to generate a 6-character alphanumeric invite code that expires in 7 days.

#### Scenario: Admin requests invite code
- **WHEN** admin sends「邀請」or「invite」
- **THEN** system generates a unique 6-char code, stores it in `invite_codes/{code}` with org_id, created_by, and expires_at (now + 7 days), and replies with a Flex Message showing the code, expiry date, and a「分享邀請」button using LINE URI Scheme to pre-fill invite text for sharing to LINE friends

#### Scenario: Non-admin attempts to generate invite
- **WHEN** a member (non-admin) sends「邀請」or「invite」
- **THEN** system replies with a permission denied message and does not generate a code

### Requirement: Join organization via invite code
The system SHALL allow a user without an org to join an organization by entering a valid invite code.

#### Scenario: Valid code, user has no org
- **WHEN** a user without an org sends「加入 <code>」
- **THEN** system looks up `invite_codes/{code}`, verifies it is not expired, adds user to `organizations/{org_id}/members/{user_id}` with role `member`, writes `user_org_map/{user_id} = org_id`, and replies with a welcome message

#### Scenario: Expired code
- **WHEN** a user sends「加入 <code>」and the code's `expires_at` is in the past
- **THEN** system replies that the code has expired and does not add the user

#### Scenario: Invalid code
- **WHEN** a user sends「加入 <code>」and the code does not exist in `invite_codes/`
- **THEN** system replies that the code is invalid

#### Scenario: User already in an org
- **WHEN** a user who already has an org_id sends「加入 <code>」
- **THEN** system replies that the user is already in an organization and does not change their org

### Requirement: Remove member from organization
The system SHALL allow an admin to remove a member from the organization.

#### Scenario: Admin removes a member
- **WHEN** admin initiates remove member flow and confirms removal of a specific user
- **THEN** system deletes `organizations/{org_id}/members/{user_id}` and `user_org_map/{user_id}`, and replies with confirmation

#### Scenario: Admin attempts to remove themselves
- **WHEN** admin initiates remove member on their own user_id
- **THEN** system replies that the admin cannot remove themselves
