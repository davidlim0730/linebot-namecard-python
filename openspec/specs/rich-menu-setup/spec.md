## ADDED Requirements

### Requirement: Bot initializes Rich Menu on startup
Bot SHALL automatically create and link a Rich Menu to all users during application startup. The process MUST be idempotent — if a Rich Menu with the same alias already exists, no new menu SHALL be created.

#### Scenario: First-time startup creates Rich Menu
- **WHEN** the application starts and no Rich Menu exists for the Bot
- **THEN** the system SHALL create a Rich Menu with 3 tap areas, upload the menu image, and link it as the default menu for all users

#### Scenario: Idempotent startup skips creation
- **WHEN** the application starts and a Rich Menu with alias `rich-menu-main` already exists
- **THEN** the system SHALL skip creation and log a message indicating the existing menu was reused

### Requirement: Rich Menu layout has 3 primary action areas
The Rich Menu SHALL display a 3-column horizontal layout covering the full width (2500×1686px), with the following tap areas:
1. **名片操作** (Card Actions) — leftmost
2. **團隊功能** (Team Features) — center
3. **資料與設定** (Data & Settings) — rightmost

Each area SHALL trigger a PostbackAction with a distinct `action` parameter.

#### Scenario: User taps 名片操作
- **WHEN** user taps the 名片操作 area in the Rich Menu
- **THEN** system SHALL send a postback event with `action=menu_card`

#### Scenario: User taps 團隊功能
- **WHEN** user taps the 團隊功能 area in the Rich Menu
- **THEN** system SHALL send a postback event with `action=menu_team`

#### Scenario: User taps 資料與設定
- **WHEN** user taps the 資料與設定 area in the Rich Menu
- **THEN** system SHALL send a postback event with `action=menu_data`
