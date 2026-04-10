# US-017 — AI agent: cross-channel budget reallocation

## Epic
AI Agent — Autonomous Actions

## Title
AI agent reallocates budget across platforms based on real-time ROAS

## User story
As an AI agent, I want to shift budget from lower-performing platforms to higher-performing ones based on real-time ROAS data so that total spend is always weighted toward the channel delivering the best return.

## Context & scope
Extension of US-016. Operates at the workspace level across platforms, not just within a single platform. Requires the manager to have set a "cross-channel reallocation" budget pool — a total daily spend ceiling shared across platforms. The AI redistributes within this pool. Actions are subject to the same permission levels, hard limits, and kill switch from US-014.

## Acceptance criteria
- **AC1:** Given a cross-channel budget pool is configured, when the AI job runs, then it ranks connected platforms by 7-day ROAS and proposes shifting up to 15% of spend from the lowest to the highest performer.
- **AC2:** Given a platform has insufficient campaign headroom to absorb additional budget, when evaluated, then the AI notes this in reasoning and skips that platform as a destination.
- **AC3:** Given the proposed reallocation is actioned, when executed, then budget decreases on the source platform and increases on the destination platform are applied as separate change log entries linked by a shared batchId.
- **AC4:** Given a platform is not connected or has a sync error, when evaluating, then it is excluded from reallocation consideration and flagged in the AI reasoning.
- **AC5:** Given the permission level is "Require approval", when the AI proposes a reallocation, then a single approval queue item is created describing the full cross-platform move (not one per platform).
- **AC6:** Given the reallocation would cause any individual campaign to exceed the hard limit maxDailyBudgetUsd, when evaluated, then the reallocation is capped to stay within limits.

## Data model
```json
{
  "crossChannelBudgetPool": {
    "workspaceId": "uuid",
    "totalDailyBudgetUsd": "decimal",
    "reallocationEnabled": "boolean",
    "maxReallocationPercent": "decimal (default 0.15)",
    "evaluationWindowDays": "integer (default 7)"
  }
}
```

## Dependencies
US-016 — single-platform budget logic must be working first.
US-013, US-014, US-015 — log, permissions, and queue infrastructure.

## Out of scope
Reallocating between campaigns within the same platform (covered by US-016). Currency conversion for multi-currency workspaces (future).

## Priority · Status
Medium · Future
