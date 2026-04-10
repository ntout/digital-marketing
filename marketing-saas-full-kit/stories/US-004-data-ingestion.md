# US-004 — Background data ingestion & sync

## Epic
Platform Connections

## Title
System pulls and stores performance data from connected platforms

## User story
As a marketer, I want the app to automatically sync my campaign data from all connected platforms on a regular schedule so that my dashboard always reflects current performance without me manually refreshing anything.

## Context & scope
This is a background service (cron/queue), not a UI story. Data is fetched per workspace per connected platform. Initial sync on connection: pulls last 90 days. Ongoing sync: every 4 hours. Data is normalized into a unified schema regardless of source platform. Raw API responses are not stored — only normalized records.

## Acceptance criteria
- **AC1:** Given a platform connection is created, when the connection is saved, then a one-time backfill job is enqueued to fetch the last 90 days of data.
- **AC2:** Given the backfill job runs, when data is returned, then it is normalized and upserted into the metrics table keyed by (workspaceId, platform, campaignId, date).
- **AC3:** Given an ongoing sync cycle runs every 4 hours, when new data is available for the last 3 days, then existing records are updated and new records are inserted.
- **AC4:** Given a sync job fails due to a rate limit, when the error is caught, then the job is re-queued with exponential backoff (5 min, 15 min, 60 min).
- **AC5:** Given a sync job fails 3 consecutive times, when the third failure occurs, then the connection status is set to "Reconnect required" and an admin notification is triggered.
- **AC6:** Given I am on the Connections page, when I view a connected platform, then I can see "Last synced: X minutes ago" and a "Sync now" button.

## Data model
```json
{
  "metricRecord": {
    "id": "uuid",
    "workspaceId": "uuid",
    "platform": "string",
    "campaignId": "string",
    "campaignName": "string",
    "adSetId": "string (nullable)",
    "adSetName": "string (nullable)",
    "date": "date (YYYY-MM-DD)",
    "spend": "decimal",
    "impressions": "integer",
    "clicks": "integer",
    "conversions": "integer",
    "revenue": "decimal (nullable)",
    "currency": "string (ISO 4217)"
  },
  "syncLog": {
    "id": "uuid",
    "connectionId": "uuid",
    "startedAt": "timestamp",
    "completedAt": "timestamp (nullable)",
    "status": "running | success | failed",
    "recordsUpserted": "integer",
    "errorMessage": "string (nullable)"
  }
}
```

## Dependencies
US-003 — platform connections must exist with valid tokens.

## Out of scope
Real-time webhooks (future). Storing raw API response payloads. Video/creative asset syncing.

## Priority · Status
High · Now
