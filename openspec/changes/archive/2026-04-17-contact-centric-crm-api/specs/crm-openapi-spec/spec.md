## ADDED Requirements

### Requirement: OpenAPI 3.0 contract for all CRM endpoints
The system SHALL maintain an OpenAPI 3.0 YAML spec covering all CRM API endpoints. This file is the single source of truth for the API contract between backend and frontend/mock server.

File location: `openspec/specs/crm-openapi-spec/openapi.yaml`

The spec MUST cover the following endpoints:

**NLU:**
- `POST /api/v1/crm/parse`
- `POST /api/v1/crm/confirm`

**Deals:**
- `GET /api/v1/deals`
- `GET /api/v1/deals/{deal_id}`
- `PUT /api/v1/deals/{deal_id}`
- `GET /api/v1/deals/{deal_id}/activities`
- `GET /api/v1/deals/{deal_id}/stakeholders`
- `POST /api/v1/deals/{deal_id}/stakeholders`

**Activities:**
- `GET /api/v1/activities`
- `GET /api/v1/contacts/{contact_id}/activities` *(new)*
- `GET /api/v1/contacts/{contact_id}/activities?deal_id={deal_id}` *(new, via query param)*

**Actions:**
- `GET /api/v1/actions`
- `PUT /api/v1/actions/{action_id}`
- `GET /api/v1/contacts/{contact_id}/actions` *(new)*

**Contacts:**
- `GET /api/v1/contacts/{contact_id}/crm`

**Products:**
- `GET /api/v1/products`
- `POST /api/v1/products`
- `PUT /api/v1/products/{product_id}`

**Pipeline:**
- `GET /api/v1/pipeline/summary`

All endpoints MUST include:
- Summary and description
- Auth requirement (`BearerAuth`)
- Request parameters / body schema
- Response schemas for success (200/201) and error (401, 403, 404)

#### Scenario: OpenAPI spec validates without errors
- **WHEN** spec file is linted with an OpenAPI 3.0 validator (e.g., `openapi-spec-validator`)
- **THEN** no errors or warnings are reported

#### Scenario: Mock server can be generated from spec
- **WHEN** spec is loaded by Prism or Mockoon
- **THEN** mock server starts and responds to all defined endpoints with example responses

#### Scenario: New endpoints are included
- **WHEN** spec is inspected for `/contacts/{contact_id}/activities`
- **THEN** endpoint is defined with correct request params and response schema
