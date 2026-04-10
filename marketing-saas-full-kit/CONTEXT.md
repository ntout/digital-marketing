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

Role is enforced at the **Route Handler layer** via `requireRole(user, roles)` from `apps/web/src/lib/auth.ts` — not just the UI. Every protected Route Handler calls `requireAuth(req)` then `requireRole(user, [...])` before executing.

---

## Auth contract

Authentication is handled entirely by **Auth0**. Do not build custom signup, login, token issuance, or password reset flows — Auth0 owns all of that.

### Package
Use `@auth0/nextjs-auth0` (the official Next.js SDK). It wraps the full auth lifecycle and provides session management via httpOnly cookies.

### How it works
- **Login/signup/logout:** Handled by Auth0 Universal Login. No custom auth pages needed. Routes `/api/auth/login`, `/api/auth/logout`, `/api/auth/callback`, `/api/auth/me` are provided by the SDK's route handler — mount at `apps/web/src/app/api/auth/[auth0]/route.ts`.
- **Session:** The SDK stores the session in an encrypted httpOnly cookie. Access tokens are managed by Auth0 — never stored manually.
- **Server-side session:** Use `getSession()` from `@auth0/nextjs-auth0` in Server Components and Route Handlers.
- **Client-side session:** Use the `useUser()` hook from `@auth0/nextjs-auth0/client` in Client Components.

### `requireAuth` helper
`apps/web/src/lib/auth.ts` wraps the SDK to return our app's user shape and enforce workspace scoping:

```ts
// Returns { auth0Id, email, workspaceId, role } or throws 401
export async function requireAuth(req?: Request): Promise<AppUser>

// Throws 403 if user.role not in allowedRoles
export function requireRole(user: AppUser, allowedRoles: Role[]): void
```

`requireAuth` reads the Auth0 session, looks up the local `user` record by `auth0Id`, and attaches `workspaceId` and `role` from `workspaceMember`. If the user has no local record (first login), it creates one automatically.

### Auth0 tenant configuration (per environment)
- Application type: Regular Web Application
- Allowed callback URLs: `https://{domain}/api/auth/callback`
- Allowed logout URLs: `https://{domain}`
- Auth0 API audience: `https://api.{domain}` (used to issue access tokens for M2M if needed)

### Environment variables required
```
AUTH0_SECRET          ← 32-byte random secret for cookie encryption
AUTH0_BASE_URL        ← app base URL (e.g. https://app.yourdomain.com)
AUTH0_ISSUER_BASE_URL ← Auth0 domain (e.g. https://yourapp.auth0.com)
AUTH0_CLIENT_ID       ← Auth0 app client ID
AUTH0_CLIENT_SECRET   ← Auth0 app client secret
```

---

## Core data models (source of truth)

Use these exact field names across all stories. Do not invent new names.

### user
```ts
id: string (uuid)
auth0Id: string        // Auth0 subject claim (e.g. "auth0|abc123") — unique index
email: string
createdAt: Date
```
Auth0 owns password hashing, email verification, and MFA. These fields do not exist in our database. `auth0Id` is the link between our local user record and the Auth0 identity.

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

### invitation
```ts
id: string (uuid)
workspaceId: string
email: string
role: 'admin' | 'manager' | 'marketer' | 'viewer'
token: string (uuid — single-use)
expiresAt: Date
acceptedAt: Date | null
invitedByUserId: string
```

### syncLog
```ts
id: string (uuid)
workspaceId: string
connectionId: string
platform: string
status: 'running' | 'success' | 'failed'
startedAt: Date
completedAt: Date | null
recordsUpserted: number | null
errorMessage: string | null
```

### anomalyAlert
```ts
id: string (uuid)
workspaceId: string
platform: string
campaignId: string
campaignName: string
metric: string        // e.g. 'spend', 'ctr', 'conversions'
detectedAt: Date
expectedValue: number
actualValue: number
deviationPercent: number
status: 'active' | 'muted'
mutedAt: Date | null
mutedByUserId: string | null
```

### reportSchedule
```ts
id: string (uuid)
workspaceId: string
name: string
frequency: 'daily' | 'weekly' | 'monthly'
recipients: string[]   // email addresses
platforms: string[]
dateRangeType: 'last_7_days' | 'last_30_days' | 'last_month'
format: 'pdf' | 'csv'
createdByUserId: string
nextRunAt: Date
lastRunAt: Date | null
```

### adCreative
```ts
id: string (uuid)
workspaceId: string
platform: string
campaignId: string
adSetId: string
adId: string          // platform-assigned ad ID
headline: string | null
primaryText: string | null
description: string | null
callToAction: string | null
destinationUrl: string | null
status: 'active' | 'paused' | 'archived'
locallyModified: boolean   // true if edited in-app since last sync
lastSyncedAt: Date
```

### campaign (synced entity — separate from metricRecord)
```ts
id: string (uuid)
workspaceId: string
platform: string
platformCampaignId: string   // platform-assigned ID
name: string
status: 'active' | 'paused' | 'archived'
dailyBudget: number | null
lifetimeBudget: number | null
currency: string (ISO 4217)
objective: string | null
lastSyncedAt: Date
```
Upsert key: `(workspaceId, platform, platformCampaignId)`

### adSet (synced entity)
```ts
id: string (uuid)
workspaceId: string
platform: string
platformAdSetId: string
platformCampaignId: string
name: string
status: 'active' | 'paused' | 'archived'
dailyBudget: number | null
lastSyncedAt: Date
```
Upsert key: `(workspaceId, platform, platformAdSetId)`

### bulkActionBatch
```ts
id: string (uuid)
workspaceId: string
action: string          // e.g. 'pause', 'resume', 'set_budget'
campaignIds: string[]
initiatedByUserId: string
createdAt: Date
succeededCount: number
failedCount: number
```

### aiGoals
```ts
workspaceId: string    // primary key — one record per workspace
roasTarget: number (decimal)
cpaLimit: number | null (decimal)
currency: string (ISO 4217, default 'USD')
evaluationWindowDays: number (default 3)
updatedAt: Date
updatedByUserId: string
```

### crossChannelBudgetPool
```ts
workspaceId: string    // primary key
enabledPlatforms: string[]
maxShiftPercent: number (default 15)
evaluationWindowDays: number (default 7)
updatedAt: Date
updatedByUserId: string
```

### creativeAlert
```ts
id: string (uuid)
workspaceId: string
adId: string
adSetId: string
platform: string
detectedAt: Date
currentCtr: number (decimal)
adSetAvgCtr: number (decimal)
daysDecline: number
status: 'active' | 'resolved' | 'swapped'
```

### notification
```ts
id: string (uuid)
workspaceId: string
userId: string
type: 'reconnect_required' | 'anomaly_alert' | 'approval_required' | 'kill_switch' | 'report_ready' | 'sync_failed'
title: string
message: string
link: string | null
read: boolean
createdAt: Date
```

---

## Multi-currency rule

`metricRecord` and `campaign` records store their native platform currency in the `currency` field. The `aiGoals.currency` field defines the workspace's **reporting currency**.

**Rules agents must follow:**
- Never compare spend or budgets from different currencies without converting first.
- All AI threshold comparisons (ROAS target, CPA limit, hard limits) use `aiGoals.currency`.
- Use a static exchange rate table in `packages/utils/src/fx.ts` for MVP (refreshed daily via a scheduled job — not real-time). Do not call a live FX API per-request.
- When displaying blended metrics across platforms in the UI, always show a "values converted to [currency]" note.
- Hard limits (`maxDailyBudgetUsd`) are denominated in USD regardless of workspace currency.

---

## Attribution model disclaimer

Cross-channel attribution (US-020) is computed from **platform-reported aggregate conversion data** — not from pixel/session-level tracking. This means:

- **Last click / First click / Linear / Time decay** models are approximations based on which platform reported the conversion closest in time to the date range boundaries.
- These are **deliberate product-level approximations**, not bugs. Agents must not attempt to build real multi-touch attribution (that requires SDK/pixel integration).
- The UI must display a disclaimer: *"Attribution is estimated from platform-reported data. Results may differ from pixel-based attribution tools."*
- Do not over-engineer the attribution logic. A straightforward weighted distribution across platforms by conversion count is sufficient for MVP.

---

## Implementation phases & story order

Build phases in strict order. Never implement a story before its dependencies.

```
Phase 0 — Bootstrap (run before anything else)
  US-000  Project bootstrap & monorepo setup

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
  US-021  In-app notifications            ← build alongside US-008/009

Phase 4 — Campaign write-back
  US-010  In-app campaign editing
  US-011  In-app ad copy editing
  US-012  Bulk campaign actions

Phase 5 — AI infrastructure  ← must be complete before Phase 6
  US-013  AI action log & audit trail
  US-014  AI autonomy controls & permission levels
  US-022  AI goals & performance targets   ← must precede US-016
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

1. **Every API Route Handler checks role permissions** by calling `requireAuth(req)` then `requireRole(user, [...])` from `apps/web/src/lib/auth.ts` before executing any logic.
2. **All platform API calls go through a single PlatformApiService** class that handles token refresh, error handling, and rate limit backoff — never call platform APIs directly from route handlers.
3. **All AI agent actions must check** `killSwitchActive`, quiet hours, and hard limits before doing anything — these checks live in a shared `AiGuardrails` utility.
4. **Every AI action (propose or execute) creates a record** in `campaignChangeLog` or `aiApprovalQueueItem` — no silent actions.
5. **Tests are written first** (TDD). Each acceptance criterion maps to at least one test.
6. **Never store plain-text tokens** — `accessToken` and `refreshToken` on `platformConnection` (the marketing platform OAuth tokens, e.g. Meta, Google) are always encrypted using AES-256-GCM before writing and decrypted on read. Auth0 session tokens are managed entirely by the `@auth0/nextjs-auth0` SDK — never touch them directly.
7. **UUIDs everywhere** for primary keys — use `crypto.randomUUID()` or the Prisma `@default(uuid())` directive.

