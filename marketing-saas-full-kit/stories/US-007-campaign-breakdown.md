# US-007 — Campaign & ad set breakdown table

## Epic
Trend Analysis

## Title
Analyst drills into performance by campaign and ad set

## User story
As an analyst, I want to break down performance by campaign and ad set so that I can identify exactly which campaigns are driving results and which are wasting budget.

## Context & scope
Analytics > Campaigns page. Tabular view with sortable columns. Rows are campaigns; expandable to reveal ad sets within each campaign. Filterable by platform, date range, and status (active/paused/all). Export to CSV available.

## Acceptance criteria
- **AC1:** Given I am on the Campaigns page, when the page loads, then I see a table with columns: Campaign Name, Platform, Status, Spend, Impressions, Clicks, Conversions, CTR, CPC, ROAS (if available).
- **AC2:** Given I click a column header, when sorted, then rows re-order by that metric (ascending/descending toggle).
- **AC3:** Given I click the expand arrow on a campaign row, when expanded, then the ad sets within that campaign are shown as child rows with the same metric columns.
- **AC4:** Given I filter by platform, when a platform is selected, then only campaigns from that platform are shown.
- **AC5:** Given I click "Export CSV", when the export runs, then a CSV file downloads containing all visible rows and columns for the current filter state.
- **AC6:** Given a campaign has zero spend in the selected date range, when displayed, then it still appears in the table with 0 values (not hidden).

## Data model
No new tables. Query `metricRecord` grouped by (campaignId, adSetId), joined with campaign/adSet name. API response:
```json
{
  "campaigns": [
    {
      "campaignId": "string",
      "campaignName": "string",
      "platform": "string",
      "status": "active | paused | archived",
      "metrics": { "spend": "decimal", "impressions": "integer", "..." },
      "adSets": [ { "adSetId": "string", "adSetName": "string", "metrics": {} } ]
    }
  ]
}
```

## Dependencies
US-004 — metric data.
US-006 — date range picker component.

## Out of scope
Ad-level (individual creative) breakdown (future). Inline editing of campaign names.

## Priority · Status
High · Now
