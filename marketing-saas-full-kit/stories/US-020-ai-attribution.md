# US-020 — Cross-channel attribution model

## Epic
Data-Driven Decisions

## Title
Marketer sees which touchpoints across platforms are driving conversions

## User story
As a marketer, I want to see a cross-channel attribution model showing how each platform contributes to conversions so that I can understand the true value of each channel and make smarter budget decisions beyond last-click metrics.

## Context & scope
Analytics > Attribution page. Attribution models available: Last click (default), First click, Linear (equal credit across all touchpoints), and Time decay. Attribution is computed from conversion data available in synced platform APIs — not from pixel/session-level data (which would require SDK integration). Limitations are clearly communicated in the UI. Results shown as a channel contribution chart and a table with assisted vs. direct conversions per platform.

## Acceptance criteria
- **AC1:** Given I navigate to the Attribution page, when the page loads, then I see a bar chart showing each connected platform's share of total attributed conversions for the selected date range and model.
- **AC2:** Given I switch attribution model (Last click / First click / Linear / Time decay), when selected, then the chart and table update to reflect the new model's distribution.
- **AC3:** Given I view the attribution table, when rendered, then it shows for each platform: direct conversions, assisted conversions, total attributed conversions, attributed revenue (if available), and % share.
- **AC4:** Given only one platform is connected, when I view Attribution, then a notice explains that cross-channel attribution requires at least two connected platforms.
- **AC5:** Given I hover over a platform bar in the chart, when the tooltip shows, then it displays the exact conversion count, attributed revenue, and % of total for the hovered model.
- **AC6:** Given a platform does not report conversion data via its API, when displayed, then it is shown with a "No conversion data" label rather than 0, so users understand the absence is a data gap not a performance result.

## Data model
No new persistent tables — attribution is computed on-demand from `metricRecord`. API response:
```json
{
  "model": "last_click | first_click | linear | time_decay",
  "dateRange": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" },
  "platforms": [
    {
      "platform": "string",
      "directConversions": "integer",
      "assistedConversions": "decimal",
      "totalAttributed": "decimal",
      "attributedRevenue": "decimal | null",
      "sharePercent": "decimal",
      "hasConversionData": "boolean"
    }
  ]
}
```

## Dependencies
US-004 — conversion metrics must be synced.
US-005 — date range picker component.

## Out of scope
Pixel / session-level multi-touch attribution (requires SDK). View-through attribution. Custom attribution model builder.

## Priority · Status
Medium · Future
