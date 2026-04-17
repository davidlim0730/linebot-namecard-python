# liff-bottom-nav Specification

## Purpose
TBD - created by archiving change liff-ui-design-system. Update Purpose after archive.
## Requirements
### Requirement: BottomNav active tab uses primary color
BottomNav SHALL highlight the active tab with `var(--color-primary)` (#06C755) and weight 600; inactive tabs SHALL use `#666` weight 400. Tab height SHALL be 56px with safe-area inset padding for iOS.

#### Scenario: Active tab highlighted with primary color
- **WHEN** `currentTab` prop matches a tab's key
- **THEN** that tab's icon and label render in `#06C755` (var(--color-primary)) with font-weight 600

#### Scenario: Inactive tabs in neutral color
- **WHEN** tab key does not match `currentTab`
- **THEN** icon and label render in `#666` with font-weight 400

#### Scenario: BottomNav not shown on detail pages
- **WHEN** route is CardDetail, DealDetail, ContactCrm, CardEdit
- **THEN** BottomNav is not rendered (controlled by app.js `showBottomNav` logic)

