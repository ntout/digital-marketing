# US-008 — Anomaly detection & alerts

## Epic
Trend Analysis

## Title
Marketer receives alerts when performance anomalies are detected

## User story
As a marketer, I want to be automatically notified when a key metric spikes or drops significantly so that I can react before budget is wasted or an opportunity is missed.

## Context & scope
Background detection job runs after each sync cycle (every 4 hours). Anomaly = metric deviates more than 2 standard deviations from the rolling 14-day average for that metric/platform/campaign. Alerts appear in-app (notification bell) and optionally via email. Users can configure thresholds and mute specific alerts.

## Acceptance criteria
- **AC1:** Given a sync completes, when a metric for a campaign deviates more than the configured threshold from its 14-day rolling average, then an anomaly alert record is created.
- **AC2:** Given an alert is created, when I am a workspace member with Manager or above role, then I see a badge on the notification bell in the nav.
- **AC3:** Given I open the notification panel, when alerts are present, then each shows: platform, campaign name, metric, current value, expected range, and time detected.
- **AC4:** Given I click an alert, when opened, then I am taken to the relevant campaign in the trends view with the anomaly date highlighted.
- **AC5:** Given I want email alerts, when I enable email notifications in my profile settings, then I receive an email for each new alert within 15 minutes of detection.
- **AC6:** Given I click "Mute" on an alert, when muted, then no further alerts are created for that specific campaign + metric combination for 24 hours.

## Data model
```json
{
  "anomalyAlert": {
    "id": "uuid",
    "workspaceId": "uuid",
    "platform": "string",
    "campaignId": "string",
    "metric": "spend | cpc | ctr | conversions",
    "detectedAt": "timestamp",
    "currentValue": "decimal",
    "expectedMin": "decimal",
    "expectedMax": "decimal",
    "direction": "spike | drop",
    "status": "active | viewed | muted",
    "mutedUntil": "timestamp (nullable)"
  }
}
```

## Dependencies
US-004 — synced metric data (rolling average computed from this).
US-005 — notification bell UI component.

## Out of scope
SMS/Slack notifications (future). Custom alert formulas. ML-based anomaly models (uses statistical method at launch).

## Priority · Status
High · Now
