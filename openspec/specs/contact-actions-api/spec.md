# contact-actions-api Specification

## Purpose
TBD - created by archiving change contact-centric-crm-api. Update Purpose after archive.
## Requirements
### Requirement: List actions by contact
The system SHALL provide an endpoint to list all actions (to-dos) belonging to a contact.

URL: `GET /api/v1/contacts/{contact_id}/actions`

Request headers: `Authorization: Bearer <jwt>`

Optional query param: `status` (string, `"pending"` | `"completed"`) — filter by status.

Response: HTTP 200, JSON array of Action objects sorted by `due_date` ascending:
```json
[
  {
    "id": "string",
    "org_id": "string",
    "deal_id": "string | null",
    "contact_id": "string",
    "entity_name": "string | null",
    "task_detail": "string",
    "due_date": "YYYY-MM-DD | null",
    "status": "pending | completed",
    "added_by": "string",
    "created_at": "ISO8601"
  }
]
```

#### Scenario: List all actions for a contact
- **WHEN** authenticated user sends `GET /api/v1/contacts/{contact_id}/actions`
- **THEN** system returns HTTP 200 with all actions (pending + completed) for that contact

#### Scenario: Filter pending actions only
- **WHEN** authenticated user sends `GET /api/v1/contacts/{contact_id}/actions?status=pending`
- **THEN** system returns only actions with `status == "pending"`

#### Scenario: Contact with no actions
- **WHEN** authenticated user queries a contact that has zero actions
- **THEN** system returns HTTP 200 with empty array `[]`

#### Scenario: Unauthenticated request
- **WHEN** request has no Authorization header
- **THEN** system returns HTTP 403

