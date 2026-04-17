# liff-crm-pages-ui Specification

## Purpose
TBD - created by archiving change liff-ui-design-system. Update Purpose after archive.
## Requirements
### Requirement: DealList renders pipeline stage grouping
The system SHALL group deals by stage and display a card list with stage headers.

#### Scenario: Deals grouped by stage
- **WHEN** DealList loads successfully
- **THEN** deals are visually grouped under stage headers (e.g., 初接觸、需求確認、報價中、成交)

#### Scenario: Empty state shown when no deals
- **WHEN** API returns empty array
- **THEN** DealList shows an empty state illustration with `+ 新增案件` CTA

### Requirement: DealDetail shows full deal context
The system SHALL display deal header, stakeholders, activity timeline, and pending actions on one scrollable page.

#### Scenario: Activity timeline rendered in reverse chronological order
- **WHEN** DealDetail loads activities
- **THEN** activities appear newest-first with date separator and `#31A24C` left accent

#### Scenario: Pending actions shown with due date badge
- **WHEN** action has `due_date` in the past
- **THEN** due date badge renders in red; future due dates render in `#FF6B00`

### Requirement: ContactCrm uses design system card pattern
The system SHALL apply tonal layering (white card on `#F8FAFC` background) to all sections in ContactCrm.

#### Scenario: Sections use card pattern
- **WHEN** ContactCrm renders deals, activities, actions sections
- **THEN** each section is wrapped in a white card with `border-radius: 12px` and box-shadow

### Requirement: ActionList supports status filter tabs
The system SHALL render tab filters (今日 / 本週 / 全部) at the top of ActionList.

#### Scenario: Filter tab changes displayed actions
- **WHEN** user taps 今日 tab
- **THEN** only actions with `due_date` equal to today are shown

#### Scenario: Complete action inline
- **WHEN** user taps the check button on an action
- **THEN** action is marked complete via API and removed from pending list with a success toast

