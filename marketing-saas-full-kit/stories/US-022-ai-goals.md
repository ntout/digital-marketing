# US-022 — AI goals & performance targets

## Epic
AI Infrastructure

## Title
AI goals & performance targets settings

## User story
As a workspace admin, I want to configure ROAS targets and CPA limits so that the AI agent knows what performance thresholds to optimize toward.

## Context & scope
Settings > AI Agent page has an "AI Goals" section. This story must be implemented before US-016 (AI budget optimization), which reads from the `aiGoals` table. One `aiGoals` record exists per workspace. All AI threshold comparisons use the currency defined here.

## Acceptance criteria
- **AC1:** The Settings > AI Agent page has an "AI Goals" section with fields: ROAS target (required), CPA limit (optional), evaluation window in days (default 3), and reporting currency (ISO 4217 dropdown, default USD).
- **AC2:** Saving goals validates: ROAS target must be > 0; CPA limit must be > 0 if provided; evaluation window must be between 1 and 30 days.
- **AC3:** If no AI goals are saved, the US-016 budget optimization job skips all evaluation and logs "no AI goals configured for workspace {id}".
- **AC4:** Goal changes take effect immediately — the next AI job run uses the new thresholds without a restart.
- **AC5:** Only `owner` and `admin` roles can save AI goals. `manager` can view the current values but all inputs are disabled.
- **AC6:** The currency field is a searchable dropdown of ISO 4217 currency codes. The selected currency is displayed alongside all spend/ROAS/CPA values in the AI settings page.

## Data model
```ts
// aiGoals (see CONTEXT.md for canonical field list)
workspaceId: string   // primary key — one record per workspace
roasTarget: number (decimal)
cpaLimit: number | null (decimal)
currency: string (ISO 4217, default 'USD')
evaluationWindowDays: number (default 3)
updatedAt: Date
updatedByUserId: string
```

## File structure
```
packages/db/prisma/schema.prisma              (add AiGoals model)
apps/web/src/lib/services/AiGoalsService.ts
apps/web/src/app/api/v1/settings/ai-goals/route.ts
apps/web/src/app/(app)/settings/ai-agent/page.tsx  (extend to include goals form)
apps/web/src/__tests__/ai-goals.test.ts
```

## Dependencies
US-001 — auth.
US-014 — AI settings page must exist (this story extends it).

## Out of scope
Per-campaign goal overrides. Bid strategy targets. Platform-specific goal thresholds. Goal history / changelog.

## Priority · Status
High · Phase 5 — must be implemented before US-016
