## ADDED Requirements

### Requirement: Global Header component
The system SHALL provide a `Header.js` Vue component that renders a consistent top bar (height 56px) across all LIFF pages.

#### Scenario: Detail page shows back button
- **WHEN** `showBack` prop is true
- **THEN** Header renders a `← 返回` button on the left that calls `history.back()`

#### Scenario: List page shows title and action button
- **WHEN** `showBack` is false and `actionLabel` prop is provided
- **THEN** Header renders page title on the left and action button on the right

#### Scenario: Header injected from app.js based on route
- **WHEN** route is a detail page (CardDetail, DealDetail, ContactCrm, CardEdit)
- **THEN** app.js renders Header with `showBack=true` above the view
- **WHEN** route is a list page (CardList, DealList, ActionList)
- **THEN** app.js renders Header with `showBack=false` and appropriate title

### Requirement: BottomNav shows correct active tab
The system SHALL highlight the active tab in BottomNav using the primary color.

#### Scenario: Active tab highlighted
- **WHEN** current route maps to tab `crm`
- **THEN** the CRM tab icon and label render in `var(--color-primary)` weight 600
- **WHEN** tab is inactive
- **THEN** icon and label render in `#666` weight 400
