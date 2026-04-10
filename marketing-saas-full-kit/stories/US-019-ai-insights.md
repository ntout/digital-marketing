# US-019 — AI insights & recommendations panel

## Epic
Data-Driven Decisions

## Title
AI surfaces plain-language insights and recommendations from performance data

## User story
As a marketer, I want the AI to analyze my campaign data and surface plain-language insights explaining what's performing well, what's underperforming, and what I should do about it so that I can make confident decisions without having to interpret raw numbers myself.

## Context & scope
AI Agent > Insights panel (also surfaced as a widget on the main dashboard). Insights are generated after each sync cycle. Each insight has a type (opportunity, warning, info), a plain-language headline, a supporting explanation with the specific data that triggered it, and an optional recommended action. Insights are read-only — they do not trigger platform changes directly. Actions from insights route to the approval queue (US-015) or execute per permission level (US-014).

## Acceptance criteria
- **AC1:** Given a sync cycle completes, when the AI evaluates performance data, then new insights are generated and appended to the Insights panel within 10 minutes of sync completion.
- **AC2:** Given I open the Insights panel, when insights are present, then each shows: type badge (Opportunity / Warning / Info), headline, explanation in plain English, the specific data that triggered it (e.g. "Meta CPC increased 42% over 7 days"), and a recommended action button where applicable.
- **AC3:** Given an insight has a recommended action, when I click the action button, then the action is either sent to the approval queue (if permission = "Require approval") or executed immediately (if "Autonomous"), following the same flow as US-015 and US-016.
- **AC4:** Given I have already seen an insight, when I dismiss it, then it is marked as dismissed and no longer shown in the panel (but remains in the log).
- **AC5:** Given no new insights have been generated in the last 24 hours, when I view the panel, then a "No new insights" empty state is shown with the timestamp of the last analysis.
- **AC6:** Given I filter insights by type (Opportunity / Warning / Info), when filtered, then only matching insights are shown.

## Data model
```json
{
  "aiInsight": {
    "id": "uuid",
    "workspaceId": "uuid",
    "generatedAt": "timestamp",
    "type": "opportunity | warning | info",
    "headline": "string",
    "explanation": "string",
    "triggerData": "string (human-readable summary of the data that caused this)",
    "recommendedActionType": "string (nullable — maps to an action type from US-014)",
    "recommendedActionPayload": "json (nullable — pre-filled values for the action)",
    "status": "active | dismissed | actioned",
    "dismissedAt": "timestamp (nullable)",
    "dismissedByUserId": "uuid (nullable)"
  }
}
```

## Dependencies
US-004 — synced metric data.
US-013 — if insight leads to an action, it is logged here.
US-014 — permission levels determine how recommended actions execute.
US-015 — approval queue receives actions triggered from insights.

## Out of scope
Natural language chat interface with the AI (future). Insight customization / prompt tuning by users. Exporting insights to PDF (separate from US-009 reports).

## Priority · Status
High · Future
