# US-018 — AI agent: creative fatigue detection

## Epic
AI Agent — Autonomous Actions

## Title
AI agent detects ad creative fatigue and flags or swaps underperforming creatives

## User story
As an AI agent, I want to detect when an ad's CTR is declining over time (creative fatigue) and flag it — or, if permitted, pause it and activate a replacement — so that audiences don't burn out on stale ads.

## Context & scope
Evaluated per ad creative per ad set. Fatigue is defined as: CTR declining for 5 or more consecutive days AND current CTR is more than 30% below the ad set average. "Swap" action (autonomous mode): pause the fatigued ad and activate the next inactive ad in the same ad set (if one exists). If no replacement exists, only a suggestion is created.

## Acceptance criteria
- **AC1:** Given an ad meets the fatigue definition, when the AI job runs, then it creates a fatigue alert flagging the ad, its current CTR, the ad set average CTR, and the number of days declining.
- **AC2:** Given fatigue is detected and permission is "Suggest only", when evaluated, then an insight is created (US-020) and no platform action is taken.
- **AC3:** Given fatigue is detected, a replacement ad exists in the ad set, and permission is "Autonomous", when evaluated, then the fatigued ad is paused and the replacement is activated via the platform API.
- **AC4:** Given no replacement ad exists, when fatigue is detected in autonomous mode, then no swap is made — only a suggestion insight is created recommending the manager upload new creative.
- **AC5:** Given an ad is swapped, when the action completes, then two change log entries are created: one for the pause and one for the activation, both linked by a batchId and with AI reasoning.
- **AC6:** Given I view the Activity Log filtered to AI actions, when creative swap entries are shown, then I can see the before/after creative names and revert each action independently.

## Data model
Uses `campaignChangeLog` (US-013). Fatigue alert:
```json
{
  "creativeAlert": {
    "id": "uuid",
    "workspaceId": "uuid",
    "adId": "string",
    "adSetId": "string",
    "platform": "string",
    "detectedAt": "timestamp",
    "currentCtr": "decimal",
    "adSetAvgCtr": "decimal",
    "daysDecline": "integer",
    "status": "active | resolved | swapped"
  }
}
```

## Dependencies
US-004 — ad-level CTR data must be synced (requires ad-level metric granularity in ingestion).
US-011 — ad creative data model.
US-013, US-014, US-015 — log, permissions, and queue.

## Out of scope
Generating new creative using AI (future). Video creative fatigue detection. Cross-ad-set creative moves.

## Priority · Status
Low · Future
