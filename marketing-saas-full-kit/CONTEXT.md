# Project context — Marketing Analytics SaaS

> Paste this file at the start of every Codex session before implementing any story.

---

## What we are building

A multi-platform digital marketing analytics SaaS. Users connect their ad accounts (Google Ads, Meta, TikTok, LinkedIn, Google Analytics 4), view unified performance data, manage campaigns in-app, and — in future phases — delegate optimization tasks to an AI agent that operates within user-defined guardrails.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) — React + TypeScript |
| Styling | Tailwind CSS |
| UI components | shadcn/ui |
| API | Next.js Route Handlers (`app/api/`) |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (access + refresh tokens, httpOnly cookies) |
| Background jobs | BullMQ + Redis (separate worker service) |
| File storage | S3-compatible |
| Email | Resend (or SendGrid) |
| Testing | Vitest + React Testing Library |

---

## Naming conventions

- **Database tables:** snake_case (e.g. `workspace_member`, `metric_record`)
- **API routes:** REST, kebab-case (e.g. `/api/platform-connections`)
- **TypeScript types/interfaces:** PascalCase (e.g. `MetricRecord`, `AiInsight`)
- **File names:** kebab-case (e.g. `campaign-change-log.ts`)
- **Environment variables:** SCREAMING_SNAKE_CASE (e.g. `META_APP_SECRET`)
- **UUIDs:** used for all primary keys — never auto-increment integers

---

## Roles & permissions

| Role | Key permissions |
|------|----------------|
| `owner` | All permissions including billing |
| `admin` | All permissions except billing; manages team and AI settings |
| `manager` | Edit campaigns, configure AI goals, view all data |
| `marketer` | Read access + limited edits |
| `viewer` | Read only |
| `ai_agent` | System actor — used in change logs when AI makes a change |

Role is enforced at the **API middleware layer**, not just the UI. Every protected endpoint checks `req.user.role` against an allowlist.

---

## Core data models (source of truth)

Use these exact field names across all stories. Do not invent new names.

### user
```ts
id: string (uuid)
email: string
passwordHash: string
emailVerified: boolean
createdAt: Date
```

### workspace
```ts
id: string (uuid)
name: string
ownerId: string (→ user.id)
createdAt: Date
```

### workspaceMember
```ts
workspaceId: string
userId: string
role: 'owner' | 'admin' | 'manager' | 'marketer' | 'viewer'
```

### platformConnection
```ts
id: string (uuid)
workspaceId: string
platform: 'google_ads' | 'meta' | 'tiktok' | 'linkedin' | 'google_analytics'
accountId: string
accountName: string
accessToken: string (encrypted at rest)
refreshToken: string (encrypted at rest)
tokenExpiresAt: Date
status: 'active' | 'reconnect_required' | 'disconnected'
connectedAt: Date
connectedByUserId: string
```

### metricRecord
```ts
id: string (uuid)
workspaceId: string
platform: string
campaignId: string
campaignName: string
adSetId: string | null
adSetName: string | null
date: string (YYYY-MM-DD)
spend: number (decimal)
impressions: number
clicks: number
conversions: number
revenue: number | null
currency: string (ISO 4217)
```
Upsert key: `(workspaceId, platform, campaignId, adSetId, date)`

### campaignChangeLog
```ts
id: string (uuid)
workspaceId: string
campaignId: string
platform: string
batchId: string | null
actorType: 'human' | 'ai'
changedByUserId: string | null
timestamp: Date
field: string
oldValue: string
newValue: string
aiReason: string | null        // required when actorType = 'ai'
aiTriggeredBy: string | null
platformApiStatus: 'success' | 'failed'
platformApiError: string | null
revertedAt: Date | null
revertedByLogId: string | null
```

### aiWorkspaceSettings
```ts
workspaceId: string
killSwitchActive: boolean
killSwitchActivatedAt: Date | null
quietHoursEnabled: boolean
quietHoursStart: string (HH:MM)
quietHoursEnd: string (HH:MM)
quietHoursTimezone: string (IANA)
hardLimits: {
  maxDailyBudgetUsd: number
  maxBudgetChangePercent: number
  allowedPlatforms: string[]
}
actionPermissions: {
  budget_increase: 'suggest' | 'approval' | 'autonomous'
  budget_decrease: 'suggest' | 'approval' | 'autonomous'
  pause_campaign: 'suggest' | 'approval' | 'autonomous'
  resume_campaign: 'suggest' | 'approval' | 'autonomous'
  edit_copy: 'suggest' | 'approval' | 'autonomous'
  adjust_targeting: 'suggest' | 'approval' | 'autonomous'
  reallocate_budget: 'suggest' | 'approval' | 'autonomous'
}
updatedAt: Date
updatedByUserId: string
```

### aiApprovalQueueItem
```ts
id: string (uuid)
workspaceId: string
actionType: string
platform: string
campaignId: string
proposedField: string
proposedOldValue: string
proposedNewValue: string
aiReason: string
aiTriggeredBy: string
status: 'pending' | 'approved' | 'rejected' | 'expired'
createdAt: Date
expiresAt: Date
resolvedAt: Date | null
resolvedByUserId: string | null
rejectionNote: string | null
```

### aiInsight
```ts
id: string (uuid)
workspaceId: string
generatedAt: Date
type: 'opportunity' | 'warning' | 'info'
headline: string
explanation: string
triggerData: string
recommendedActionType: string | null
recommendedActionPayload: object | null
status: 'active' | 'dismissed' | 'actioned'
dismissedAt: Date | null
dismissedByUserId: string | null
```

---

## Implementation phases & story order

Build phases in strict order. Never implement a story before its dependencies.

```
Phase 1 — Foundation
  US-001  User auth & workspace setup
  US-002  Team invitations & role management

Phase 2 — Data pipeline
  US-003  Connect platforms via OAuth
  US-004  Background data ingestion & sync

Phase 3 — Core analytics UI
  US-005  Unified KPI dashboard
  US-006  Trend charts & date comparison
  US-007  Campaign & ad set breakdown table
  US-008  Anomaly detection & alerts
  US-009  Report generation & scheduling

Phase 4 — Campaign write-back
  US-010  In-app campaign editing
  US-011  In-app ad copy editing
  US-012  Bulk campaign actions

Phase 5 — AI infrastructure  ← must be complete before Phase 6
  US-013  AI action log & audit trail
  US-014  AI autonomy controls & permission levels
  US-015  AI approval queue

Phase 6 — AI agent actions
  US-016  AI budget optimization
  US-017  AI cross-channel reallocation
  US-018  AI creative fatigue detection
  US-019  AI insights & recommendations
  US-020  Cross-channel attribution model
```

---

## Git branching convention

Every user story or feature must be implemented on a dedicated branch. Never commit directly to `main`.

**Branch naming:** `feature/US-XXX-short-description`

Examples:
- `feature/US-001-workspace-auth`
- `feature/US-005-unified-dashboard`
- `feature/US-013-ai-action-log`

Before starting any story:
```bash
git checkout main && git pull origin main
git checkout -b feature/US-XXX-short-description
```

Open a pull request to `main` when the story is complete and all tests pass.

---

## Key architectural rules for Codex to follow

1. **Every API endpoint checks role permissions** at middleware level before executing.
2. **All platform API calls go through a single PlatformApiService** class that handles token refresh, error handling, and rate limit backoff — never call platform APIs directly from route handlers.
3. **All AI agent actions must check** `killSwitchActive`, quiet hours, and hard limits before doing anything — these checks live in a shared `AiGuardrails` utility.
4. **Every AI action (propose or execute) creates a record** in `campaignChangeLog` or `aiApprovalQueueItem` — no silent actions.
5. **Tests are written first** (TDD). Each acceptance criterion maps to at least one test.
6. **Never store plain-text tokens** — `accessToken` and `refreshToken` on `platformConnection` are always encrypted using AES-256-GCM before writing and decrypted on read.
7. **UUIDs everywhere** for primary keys — use `crypto.randomUUID()` or the Prisma `@default(uuid())` directive.

