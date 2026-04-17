## ADDED Requirements

### Requirement: TeamPage displays member list with roles
The system SHALL show all org members with their roles and an invite link generator.

#### Scenario: Admin sees invite link button
- **WHEN** current user role is `admin`
- **THEN** a `產生邀請連結` button is visible and generates a shareable URL on tap

#### Scenario: Member list shows display name and role badge
- **WHEN** TeamPage loads
- **THEN** each member row shows display name, role badge (`管理員` / `成員`), and join date

### Requirement: SettingsPage shows account info and logout
The system SHALL display the current user's LINE display name, org name, and a logout option.

#### Scenario: Org name shown
- **WHEN** SettingsPage loads
- **THEN** the org name is displayed with an edit affordance for admin users

#### Scenario: Logout clears JWT and returns to login
- **WHEN** user taps `登出`
- **THEN** JWT is cleared from localStorage and the page reloads to trigger re-auth
