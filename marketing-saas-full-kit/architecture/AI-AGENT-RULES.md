# AI Agent Rules

> Read this file before implementing any AI agent job, AiGuardrails, AiActionDispatcher,
> or any code that reads AiWorkspaceSettings.
> These rules are non-negotiable. The AI agent must never bypass them.

---

## The three laws of the AI agent

1. **Always check guardrails first.** Every AI job calls `AiGuardrails.check()` before any action. If it returns `allowed: false`, the job exits immediately — no exceptions.
2. **Every action leaves a record.** No AI action (proposed, queued, or executed) is silent. Every path through `AiActionDispatcher` writes to the database.
3. **Humans can always stop it.** The kill switch halts everything instantly. Quiet hours pause everything silently. Both are checked on every cycle.

---

## AiGuardrails — implementation rules

File: `packages/utils/src/AiGuardrails.ts`

### Check order (must be in this exact order)
```
1. Kill switch active?         → return { allowed: false, reason: 'kill_switch' }
2. Within quiet hours?         → return { allowed: false, reason: 'quiet_hours' }
3. Platform in allowlist?      → return { allowed: false, reason: 'platform_not_allowed' }
4. Would exceed hard limits?   → return { allowed: false, reason: 'hard_limit' }
5. All clear                   → return { allowed: true, permissionLevel: '...' }
```

### Quiet hours check
Convert the current UTC time to the workspace's configured timezone before comparing. Use `Intl.DateTimeFormat` — do not use moment.js or any timezone library.

### Hard limit check
For budget changes: `proposedChange.newValue > settings.hardLimits.maxDailyBudgetUsd` → blocked.
For percentage changes: `Math.abs(percentChange) > settings.hardLimits.maxBudgetChangePercent` → cap, do not block. Return `allowed: true` but cap the value and note it in the reason.

### Fresh reads
`AiGuardrails.check()` must read `AiWorkspaceSettings` fresh from `dbWrite` on every call. Do not cache this — the kill switch must take effect immediately.

---

## AiActionDispatcher — routing logic

File: `packages/utils/src/AiActionDispatcher.ts`

```
dispatch(workspaceId, actionType, payload, reason, triggeredBy)
  │
  ├─ permissionLevel === 'suggest'
  │    └─ create AiInsight record
  │         type: infer from actionType (budget_increase → 'opportunity', pause → 'warning')
  │         status: 'active'
  │         recommendedActionType: actionType
  │         recommendedActionPayload: payload
  │
  ├─ permissionLevel === 'approval'
  │    ├─ create AiApprovalQueueItem record (status: 'pending')
  │    └─ send in-app notification to all Manager+ users in workspace
  │
  └─ permissionLevel === 'autonomous'
       ├─ call PlatformApiService write method
       ├─ on success: create CampaignChangeLog (actorType: 'ai', aiReason: reason)
       └─ on failure: log error, do NOT create change log entry, do NOT retry here
                      (job-level retry handles this)
```

### aiReason format
Must be human-readable prose, not JSON or code. Include:
- What metric triggered this (with exact values)
- What the action is (old value → new value)
- Any limits that were applied

Example:
> "Meta campaign 'Summer Sale' averaged a ROAS of 4.8 over the past 3 days, exceeding the target of 3.0 by 60%. Increasing daily budget by 15% ($200 → $230). The workspace hard limit of $500/day is not exceeded."

### triggeredBy format
Short data summary for the audit log. Not a full explanation — just the key data point:
> "3-day avg ROAS: 4.8 (target: 3.0)"

---

## AI job structure — required pattern

Every AI agent job must follow this exact pattern:

```ts
export async function runAiBudgetOptimization(job: Job<{ workspaceId: string }>) {
  const { workspaceId } = job.data

  // 1. ALWAYS check guardrails first for each action type this job uses
  const guard = await AiGuardrails.check(workspaceId, 'budget_increase', { platform: 'meta', newValue: 0 })
  if (!guard.allowed) {
    logger.info('AI job halted by guardrails', { workspaceId, reason: guard.reason, job: 'budget-optimization' })
    return  // exit cleanly — not an error
  }

  // 2. Fetch data
  const campaigns = await BudgetAnalysisService.getCampaignsForEvaluation(workspaceId)

  // 3. Evaluate each campaign
  for (const campaign of campaigns) {
    const action = BudgetAnalysisService.evaluate(campaign, settings)
    if (!action) continue

    // 4. Check guardrails per-action (platform may differ between campaigns)
    const actionGuard = await AiGuardrails.check(workspaceId, action.type, action.proposedChange)
    if (!actionGuard.allowed) continue

    // 5. Dispatch — never call PlatformApiService directly from a job
    await AiActionDispatcher.dispatch(
      workspaceId,
      action.type,
      action.payload,
      action.reason,
      action.triggeredBy
    )
  }

  logger.info('AI budget optimization complete', { workspaceId, evaluated: campaigns.length })
}
```

**Never:**
- Call `PlatformApiService` directly from an AI job
- Write to `CampaignChangeLog` directly from an AI job (dispatcher does this)
- Skip the guardrails check for any reason
- Throw an unhandled error that stops processing all campaigns (use try/catch per campaign)

---

## Deduplication rules

AI jobs run every 4 hours. Without deduplication, the same action would be proposed repeatedly.

### Budget changes
Before proposing a budget change on a campaign, check: has a `CampaignChangeLog` entry for this campaign + this field been created in the last 12 hours?
If yes: skip this campaign for this cycle.

### Insights
Before creating an `AiInsight`, check: does an `AiInsight` with the same `(workspaceId, recommendedActionType, campaignId)` exist with `status = 'active'` created in the last 48 hours?
If yes: skip — do not create a duplicate.

### Creative fatigue alerts
Before creating a `CreativeAlert`, check: does a `CreativeAlert` for this `adId` exist with `status = 'active'` created in the last 7 days?
If yes: skip.

---

## Approval queue rules

- Items expire after 48 hours if not acted on (set `expiresAt = createdAt + 48h` on creation)
- Expiry job runs every hour via BullMQ repeatable job
- Expired items trigger a notification to Manager+ users
- Approving an item: call `PlatformApiService` → on success create `CampaignChangeLog`, mark item `approved`
- Rejecting an item: no platform call, mark item `rejected`, log rejection note
- Kill switch active: `POST /ai/approval-queue/:id/approve` returns `423 LOCKED`

---

## Notification triggers

The following events must create an in-app notification for relevant workspace users:

| Event | Recipients | Message |
|-------|-----------|---------|
| AI approval queue item created | Manager, Admin, Owner | "[Platform] [Campaign]: AI wants to [action]. Review needed." |
| Approval queue item expired | Manager, Admin, Owner | "An AI action proposal for [Campaign] expired without review." |
| Platform connection set to reconnect_required | Admin, Owner | "[Platform] connection needs to be reconnected." |
| Anomaly detected | Manager, Admin, Owner | "[Campaign] [metric] [spiked/dropped] significantly." |
| Kill switch activated | All workspace members | "AI agent has been disabled by [user]." |

Notifications are stored in a `Notification` table and read via `GET /api/v1/notifications`. Mark as read via `POST /api/v1/notifications/:id/read`. Do not send email for every notification — only the types explicitly called out in the notification story.

---

## AI insight rule definitions

Each rule lives in `apps/worker/src/rules/`. Each rule exports:
```ts
interface InsightRule {
  type: string                    // unique identifier, e.g. 'high_cpc_trend'
  evaluate(workspaceId: string, data: MetricSummary[]): InsightCandidate[]
}

interface InsightCandidate {
  type: 'opportunity' | 'warning' | 'info'
  headline: string
  explanation: string
  triggerData: string
  campaignId?: string
  recommendedActionType?: string
  recommendedActionPayload?: object
}
```

The `ai-insights.job.ts` loops through all registered rules, calls `evaluate()`, deduplicates, and persists the results as `AiInsight` records.

---

## Testing AI agent code

Every AI job and service must have unit tests that:
1. Verify the job exits cleanly when guardrails return `allowed: false` (kill switch, quiet hours, hard limit)
2. Verify the correct `AiActionDispatcher` method is called for each permission level
3. Verify deduplication logic prevents duplicate proposals
4. Mock `PlatformApiService` — AI tests must never make real platform API calls
5. Verify `aiReason` strings are non-empty and human-readable (length > 50 chars)

---

## What the AI agent can and cannot do

### Can do (when permitted)
- Increase or decrease campaign daily budget
- Pause or resume a campaign
- Pause or resume an ad set
- Activate a replacement ad creative (swap)
- Reallocate budget across platforms within a configured pool

### Cannot do (ever — not even in autonomous mode)
- Create new campaigns
- Delete campaigns or ad sets
- Change bid strategy or bidding type
- Edit targeting demographics (age, gender, location)
- Upload or replace creative assets (images, videos)
- Change campaign objective
- Exceed the hard limits configured in `AiWorkspaceSettings`
- Act while the kill switch is active
- Act during quiet hours
