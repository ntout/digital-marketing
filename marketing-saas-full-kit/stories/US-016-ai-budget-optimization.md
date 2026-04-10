# US-016 — AI agent: budget optimization

## Epic
AI Agent — Autonomous Actions

## Title
AI agent automatically scales budgets based on ROAS performance

## User story
As an AI agent, I want to increase the budget of campaigns exceeding the ROAS target and decrease or pause campaigns falling below the CPA limit so that budget is continuously weighted toward what is working without requiring manual intervention.

## Context & scope
Background AI job runs after each sync cycle (every 4 hours). Evaluates each active campaign against thresholds set by the manager (configured in a forthcoming "AI Goals" settings panel). Actions taken depend on permission level from US-014. Respects hard limits (max budget, max % change). All proposed/taken actions are logged per US-013.

## Acceptance criteria
- **AC1:** Given a campaign's 3-day average ROAS exceeds the workspace ROAS target by 20% or more, when the AI job runs, then it proposes or executes a budget increase of up to 20% (capped by hard limit).
- **AC2:** Given a campaign's 3-day average CPA exceeds the workspace CPA limit by 20% or more, when the AI job runs, then it proposes or executes a budget decrease of up to 20%.
- **AC3:** Given a campaign has exceeded the CPA limit for 7 consecutive days, when the AI job runs, then it proposes or executes a campaign pause.
- **AC4:** Given the proposed change would exceed the workspace hard limit (maxDailyBudgetUsd or maxBudgetChangePercent), when evaluated, then the AI caps the change at the limit and notes this in the reasoning.
- **AC5:** Given the action permission for "budget_increase" is "suggest", when the AI would act, then it creates an AI insight (US-020) but no approval queue item and no platform API call.
- **AC6:** Given the kill switch is active, when the AI job runs, then it skips all actions and logs that it was halted by the kill switch.

## Data model
```json
{
  "aiGoals": {
    "workspaceId": "uuid",
    "roasTarget": "decimal",
    "cpaLimit": "decimal (nullable)",
    "currency": "string",
    "evaluationWindowDays": "integer (default 3)"
  }
}
```
Actions use `campaignChangeLog` (US-013) and `aiApprovalQueueItem` (US-015).

## Dependencies
US-013 — AI action log.
US-014 — permission levels and hard limits and kill switch.
US-015 — approval queue for "Require approval" mode.
US-010 — platform write-back for "autonomous" mode.

## Out of scope
Cross-platform budget reallocation (US-017). Bid strategy changes. Lifetime budget management.

## Priority · Status
High · Future
