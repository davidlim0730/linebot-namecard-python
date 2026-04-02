## ADDED Requirements

### Requirement: All org members share the same namecard pool
The system SHALL store all namecards under the org's path, accessible to every member of that org.

#### Scenario: Member searches namecards
- **WHEN** any org member sends a search query
- **THEN** system searches `namecard/{org_id}/` and returns results regardless of who scanned each card

#### Scenario: Member scans a new namecard
- **WHEN** any org member sends a namecard image
- **THEN** system stores the extracted card under `namecard/{org_id}/{card_id}/` with `added_by: user_id`

### Requirement: Namecard shows who added it
The system SHALL display the `added_by` field (as a LINE display name or shortened user_id) in the namecard detail view.

#### Scenario: Viewing a namecard detail
- **WHEN** a user views a namecard Flex Message detail card
- **THEN** the card includes a「新增者」field showing the LINE display name of the user who scanned it

### Requirement: Member list view
The system SHALL allow any org member to view the list of current org members and their roles.

#### Scenario: Member requests member list
- **WHEN** a user sends「成員」or「members」
- **THEN** system replies with a list of org members showing display name (or user_id) and role for each
