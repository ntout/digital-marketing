# US-005 — Unified KPI dashboard

## Epic
Dashboard & Overview

## Title
Marketer sees unified KPIs from all connected platforms

## User story
As a marketer, I want a single dashboard showing combined KPIs from all my connected platforms so that I can see overall performance at a glance without switching between platform tabs.

## Context & scope
Main dashboard page (default route after login). KPIs are aggregated across all connected platforms for the selected date range. Metrics shown: Total Spend, Total Impressions, Total Clicks, Total Conversions, blended CTR, blended CPC, blended ROAS (if revenue data available). Default date range: last 7 days. Date range picker allows: Last 7 days, Last 14 days, Last 30 days, Last 90 days, Custom.

## Acceptance criteria
- **AC1:** Given I land on the dashboard, when the page loads, then I see aggregate KPI cards for: Spend, Impressions, Clicks, Conversions, CTR, CPC for the default date range (last 7 days).
- **AC2:** Given I change the date range, when a new range is selected, then all KPI cards and charts update to reflect the new range without a full page reload.
- **AC3:** Given multiple platforms are connected, when KPIs are displayed, then each KPI shows both the total and a breakdown by platform (e.g., Meta: $1,200 / Google: $800).
- **AC4:** Given I have no platforms connected, when I view the dashboard, then I see an empty state with a prompt to connect a platform linking to US-003.
- **AC5:** Given a platform sync is in progress, when I view the dashboard, then a subtle "Syncing..." indicator is shown and stale data is still displayed.
- **AC6:** Given I have data for the selected range, when I view a KPI card, then it shows a % change vs. the prior equivalent period (e.g., last 7 days vs. the 7 days before that).

## Data model
No new tables. Queries against `metricRecord` table from US-004, aggregated server-side. API returns:
```json
{
  "dateRange": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" },
  "totals": {
    "spend": "decimal",
    "impressions": "integer",
    "clicks": "integer",
    "conversions": "integer",
    "ctr": "decimal",
    "cpc": "decimal",
    "roas": "decimal | null"
  },
  "byPlatform": [
    { "platform": "string", "spend": "decimal", "impressions": "integer", "..." }
  ],
  "vsprior": { "spendChange": "decimal (% as fraction)", "..." }
}
```

## Dependencies
US-001, US-003, US-004 — auth, connections, and synced data must exist.

## Out of scope
Customizable widget layout (future). Goal/target tracking overlays. Real-time streaming updates.

## Priority · Status
High · Now
