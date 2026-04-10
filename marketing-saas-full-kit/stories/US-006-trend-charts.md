# US-006 — Trend charts & date comparison

## Epic
Trend Analysis

## Title
Marketer views trend charts for key metrics over time

## User story
As a marketer, I want to see line charts for spend, impressions, clicks, and conversions over time so that I can quickly spot patterns, dips, and spikes across my campaigns.

## Context & scope
Analytics > Trends page. Charts show daily granularity for ranges up to 90 days, weekly for ranges over 90 days. Users can toggle which metrics are overlaid on the chart. Platform filter allows isolating one platform or viewing all combined. Compare mode overlays the prior equivalent period as a dashed line.

## Acceptance criteria
- **AC1:** Given I am on the Trends page, when the page loads, then I see a line chart for Spend by default, with daily data points for the selected date range.
- **AC2:** Given I toggle additional metrics (Clicks, Impressions, Conversions), when a metric is toggled on, then it is added as a second Y-axis series on the same chart.
- **AC3:** Given I select a specific platform from the filter dropdown, when filtered, then the chart updates to show only data from that platform.
- **AC4:** Given I enable "Compare to prior period", when enabled, then the prior period data is overlaid as a dashed line in a muted color with a legend label.
- **AC5:** Given I hover over a data point, when the tooltip appears, then it shows the exact value, date, and (if compare mode is on) the prior period value and % change.
- **AC6:** Given the selected date range has no data for a day (e.g., platform was not connected), when rendered, then the gap is shown as a break in the line rather than interpolated to zero.

## Data model
No new tables. Chart data endpoint queries `metricRecord`, groups by date, returns:
```json
{
  "granularity": "day | week",
  "series": [
    {
      "date": "YYYY-MM-DD",
      "spend": "decimal",
      "impressions": "integer",
      "clicks": "integer",
      "conversions": "integer"
    }
  ],
  "priorSeries": [ "same shape, nullable" ]
}
```

## Dependencies
US-004 — metric data must be synced.
US-005 — date range picker component can be shared.

## Out of scope
Hourly granularity. Custom metric formulas. Forecasting/projections.

## Priority · Status
High · Now
