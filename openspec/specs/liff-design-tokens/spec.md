# liff-design-tokens Specification

## Purpose
TBD - created by archiving change liff-ui-design-system. Update Purpose after archive.
## Requirements
### Requirement: CSS custom property token system
The system SHALL define all visual constants as CSS custom properties in `app/liff_app/styles/design-tokens.css`, covering color, typography, spacing, shadow, and border-radius.

#### Scenario: Primary brand color available as token
- **WHEN** any LIFF page references `var(--color-primary)`
- **THEN** it resolves to `#06C755` (LINE Green)

#### Scenario: Semantic left-accent colors defined
- **WHEN** CRM components reference accent tokens
- **THEN** `--color-deal` = `#0084FF`, `--color-activity` = `#31A24C`, `--color-action` = `#FF6B00`

#### Scenario: Typography scale available
- **WHEN** text elements use typography tokens
- **THEN** `--font-headline` = `'Plus Jakarta Sans', sans-serif` and `--font-body` = `'Inter', sans-serif` are available

#### Scenario: Surface and background tokens defined
- **WHEN** cards and page backgrounds use surface tokens
- **THEN** `--color-surface` = `#F8FAFC`, `--color-card` = `#ffffff`, `--color-text-primary` = `#1A1A2E`

