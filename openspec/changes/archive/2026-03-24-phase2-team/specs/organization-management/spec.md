## ADDED Requirements

### Requirement: Create organization
When a user sends their first message and has no org, the system SHALL automatically create a personal organization for them and set them as admin.

#### Scenario: First-time user gets personal org
- **WHEN** a LINE user sends any message and `user_org_map/{user_id}` does not exist
- **THEN** system creates `organizations/{org_id}` with the user as admin and writes `user_org_map/{user_id} = org_id`

#### Scenario: Existing user is not affected
- **WHEN** a LINE user sends a message and `user_org_map/{user_id}` already exists
- **THEN** system uses the existing org_id, no new org is created

### Requirement: View organization info
The system SHALL allow any org member to view their current organization name and member count via LINE.

#### Scenario: Member requests org info
- **WHEN** a user sends the text command「團隊」or「team」
- **THEN** system replies with org name, member count, and the user's own role (admin/member)

### Requirement: Organization has a name
The system SHALL allow an admin to set or update the organization name.

#### Scenario: Admin sets org name
- **WHEN** admin sends「設定團隊名稱 <name>」
- **THEN** system updates `organizations/{org_id}/name` and confirms with a reply message

#### Scenario: Non-admin attempts to set org name
- **WHEN** a member (non-admin) sends「設定團隊名稱 <name>」
- **THEN** system replies with a permission denied message and does not update the name
