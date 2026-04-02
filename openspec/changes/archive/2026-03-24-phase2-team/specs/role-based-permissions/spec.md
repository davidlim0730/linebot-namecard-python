## ADDED Requirements

### Requirement: Admin can delete any namecard
The system SHALL allow an admin to delete any namecard in the org, regardless of who added it.

#### Scenario: Admin deletes another member's card
- **WHEN** an admin triggers the delete action on a namecard added by another member
- **THEN** system deletes the card from `namecard/{org_id}/{card_id}/` and replies with confirmation

### Requirement: Member can only delete their own namecards
The system SHALL prevent a member from deleting a namecard added by someone else.

#### Scenario: Member deletes their own card
- **WHEN** a member triggers delete on a card where `added_by == their user_id`
- **THEN** system deletes the card and replies with confirmation

#### Scenario: Member attempts to delete another member's card
- **WHEN** a member triggers delete on a card where `added_by != their user_id`
- **THEN** system replies with a permission denied message and does not delete the card

### Requirement: Admin-only management actions
The system SHALL restrict org management actions (generate invite, remove member, set org name) to admin role only.

#### Scenario: Non-admin sends an admin-only command
- **WHEN** a member (non-admin) sends any admin-only command (邀請, 設定團隊名稱, remove member)
- **THEN** system replies with「此功能僅限管理員使用」and takes no action

### Requirement: Role is checked on every restricted action
The system SHALL look up the user's role from `organizations/{org_id}/members/{user_id}/role` before executing any permission-restricted action.

#### Scenario: Role lookup succeeds
- **WHEN** a restricted action is triggered
- **THEN** system reads the role from RTDB before proceeding and only executes the action if the role permits it

#### Scenario: User has no org (unregistered)
- **WHEN** a user with no entry in `user_org_map` triggers any namecard action
- **THEN** system auto-creates a personal org for the user (per organization-management spec) before proceeding
