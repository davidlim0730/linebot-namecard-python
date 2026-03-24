## ADDED Requirements

### Requirement: Carousel container for multi-card results
The system SHALL use a LINE Flex Carousel container when displaying 2 or more namecard results. The carousel SHALL contain compact namecard bubbles that users can browse by scrolling horizontally.

#### Scenario: Search returns multiple results
- **WHEN** a Gemini NLP search returns 2 or more matching namecards
- **THEN** the system replies with a single Flex Carousel message containing one compact bubble per result, up to 10 bubbles

#### Scenario: Tag filter returns multiple results
- **WHEN** a tag filter (list_by_tag) returns 2 or more matching namecards
- **THEN** the system replies with a single Flex Carousel message containing one compact bubble per result, up to 10 bubbles

#### Scenario: Single result bypasses carousel
- **WHEN** a search or tag filter returns exactly 1 namecard
- **THEN** the system replies with the full namecard detail Flex Message (not a carousel)

#### Scenario: Results exceed carousel limit
- **WHEN** more than 10 namecards match the query
- **THEN** the carousel displays the first 10 results AND a follow-up TextSendMessage states the total count with guidance to narrow the search

### Requirement: Compact namecard bubble design
Each bubble in the carousel SHALL use `kilo` size and display only identification-level information with quick-action buttons.

#### Scenario: Compact bubble content
- **WHEN** a compact namecard bubble is rendered
- **THEN** the bubble SHALL contain:
  - Header: company name (colored background)
  - Body: name (xxl, bold) and title (md)
  - Footer: three buttons — "複製電話" (clipboard action), "複製 Email" (clipboard action), "查看完整名片" (postback action)

#### Scenario: Missing phone or email
- **WHEN** a namecard has phone or email as "N/A" or empty
- **THEN** the corresponding clipboard button SHALL still appear but with clipboardText set to "N/A"

### Requirement: View full card postback from carousel
The system SHALL support a `view_card` postback action that expands a compact carousel card into the full namecard detail view.

#### Scenario: User taps "查看完整名片"
- **WHEN** user taps the "查看完整名片" button on a compact bubble
- **THEN** the system sends a postback with `action=view_card&card_id={card_id}`
- **THEN** the handler reads the full namecard from Firebase and replies with the complete namecard Flex Message (namecard-detail-v2)

#### Scenario: Card not found
- **WHEN** the view_card postback references a card_id that no longer exists
- **THEN** the system replies with a text message "此名片已不存在。"
