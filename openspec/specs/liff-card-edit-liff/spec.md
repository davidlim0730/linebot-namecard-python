# liff-card-edit-liff Specification

## Purpose
TBD - created by archiving change liff-ui-design-system. Update Purpose after archive.
## Requirements
### Requirement: CardEdit renders all fields as a form
The system SHALL present name, title, company, phone, email, address, and memo as editable form inputs in a single LIFF page at `#/cards/:id/edit`.

#### Scenario: Form pre-populated with current values
- **WHEN** CardEdit mounts with a valid `cardId`
- **THEN** all fields are pre-filled with the card's current data from `GET /api/v1/cards/:id`

#### Scenario: Save submits all fields at once
- **WHEN** user taps the `儲存` button
- **THEN** a single `PATCH /api/v1/cards/:id` request is sent with all modified fields and user is redirected to `#/cards/:id`

#### Scenario: Discard returns to detail without saving
- **WHEN** user taps `取消` button
- **THEN** `history.back()` is called and no API request is made

#### Scenario: Validation prevents empty name
- **WHEN** user clears the name field and taps `儲存`
- **THEN** an inline error message `姓名不能為空` is shown and the API call is not made

