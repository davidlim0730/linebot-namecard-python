# contact-activities-api Specification

## Purpose
TBD - created by archiving change contact-centric-crm-api. Update Purpose after archive.
## Requirements
### Requirement: List activities by contact
The system SHALL provide an endpoint to list all activities belonging to a contact.

URL: `GET /api/v1/contacts/{contact_id}/activities`

Request headers: `Authorization: Bearer <jwt>`

Optional query param: `deal_id` (string) — filter activities to a specific deal.

Response: HTTP 200, JSON array of Activity objects:
```json
[
  {
    "id": "string",
    "org_id": "string",
    "deal_id": "string | null",
    "contact_id": "string",
    "entity_name": "string | null",
    "raw_transcript": "string | null",
    "ai_key_insights": ["string"],
    "sentiment": "string | null",
    "added_by": "string",
    "created_at": "ISO8601"
  }
]
```

Results are sorted by `created_at` descending (newest first).

#### Scenario: Authenticated user lists activities for existing contact
- **WHEN** authenticated user sends `GET /api/v1/contacts/{contact_id}/activities`
- **THEN** system returns HTTP 200 with array of activities where `contact_id` matches

#### Scenario: Filter activities by deal_id
- **WHEN** authenticated user sends `GET /api/v1/contacts/{contact_id}/activities?deal_id={deal_id}`
- **THEN** system returns only activities matching both `contact_id` and `deal_id`

#### Scenario: Contact with no activities
- **WHEN** authenticated user queries a contact that has zero activities
- **THEN** system returns HTTP 200 with empty array `[]`

#### Scenario: Contact belongs to different org
- **WHEN** user queries a contact_id that does not exist in their org
- **THEN** system returns HTTP 200 with empty array (no cross-org data leakage)

#### Scenario: Unauthenticated request
- **WHEN** request has no Authorization header
- **THEN** system returns HTTP 403

