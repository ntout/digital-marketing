# US-013 — AI action log & audit trail

## Epic
AI Transparency

## Title
All AI and human campaign changes are logged with full context

## User story
As a marketer, I want to see a complete log of every change made to my campaigns — whether by a human or the AI agent — with timestamps, reasoning, and before/after values so that I can audit decisions and understand what changed and why.

## Context & scope
This story establishes the audit infrastructure that all AI agent stories (US-015 through US-019) depend on. The change log table from US-010 is extended here to support AI entries with reasoning fields. A dedicated Activity Log page surfaces this data. This must be built before any AI autonomous actions are implemented.

## Acceptance criteria
- **AC1:** Given any campaign change occurs (human or AI), when it is committed, then a log entry is created with: actor type (human/AI), actor identity, timestamp, campaign, field changed, old value, new value, and reason (required for AI entries, optional for human).
- **AC2:** Given I navigate to Activity Log, when the page loads, then I see a reverse-chronological list of all changes across all campaigns, filterable by: actor (human/AI/specific user), platform, campaign, and date range.
- **AC3:** Given an AI-authored log entry, when I view it, then I see the AI's reasoning in plain English explaining what data triggered the action and why.
- **AC4:** Given I want to revert a change, when I click "Revert" on a log entry, then a confirmation modal shows the before/after values and, on confirm, re-applies the old value via the platform API (creating a new log entry for the revert).
- **AC5:** Given a revert action is triggered, when the platform API call succeeds, then the original log entry is marked as "reverted" and the new entry references it as a revert of that ID.
- **AC6:** Given I am a Viewer, when I view the Activity Log, then I can read entries but the Revert button is not visible.

## Data model
Extends `campaignChangeLog` from US-010:
```json
{
  "campaignChangeLog": {
    "id": "uuid",
    "workspaceId": "uuid",
    "campaignId": "string",
    "platform": "string",
    "batchId": "uuid (nullable)",
    "actorType": "human | ai",
    "changedByUserId": "uuid (nullable)",
    "timestamp": "timestamp",
    "field": "string",
    "oldValue": "string",
    "newValue": "string",
    "aiReason": "string (nullable — required when actorType = ai)",
    "aiTriggeredBy": "string (nullable — e.g. 'ROAS below 1.5 threshold for 3 days')",
    "platformApiStatus": "success | failed",
    "platformApiError": "string (nullable)",
    "revertedAt": "timestamp (nullable)",
    "revertedByLogId": "uuid (nullable)"
  }
}
```

## Dependencies
US-010 — establishes change log and platform write-back pattern.

## Out of scope
Exporting audit log to external SIEM systems. Log retention policies / archiving.

## Priority · Status
High · Future (must be built before US-015+)
