# Application Architecture

> This file must be read by any AI agent (Codex, Claude Code, Cowork) before writing any code.
> It defines the system design, AWS infrastructure, service boundaries, and rules every piece of code must comply with.
> Cross-reference with `CONTEXT.md` for data models and story implementation order.

---

## System overview

A multi-tenant SaaS application. Users connect digital marketing platform accounts (Meta, Google Ads, TikTok, LinkedIn, Google Analytics 4), view unified analytics, manage campaigns in-app, and optionally delegate optimization to an AI agent operating within user-defined guardrails.

**Multi-tenancy model:** Every database query is scoped to a `workspaceId`. There is no cross-workspace data access. This must be enforced at the service layer — never rely on the frontend to scope queries.

---

## Repository structure

```
/
├── ARCHITECTURE.md         ← this file
├── CONTEXT.md              ← data models, roles, story order
├── stories/                ← user story markdown files
├── prompts/                ← per-story Codex prompts
│
├── apps/
│   ├── web/                ← Next.js app (App Router, Route Handlers, UI)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/         ← login, signup pages
│   │       │   ├── (app)/          ← authenticated pages
│   │       │   └── api/            ← Next.js Route Handlers (API)
│   │       ├── components/
│   │       │   ├── ui/             ← shadcn/ui primitives
│   │       │   ├── charts/
│   │       │   ├── campaigns/
│   │       │   ├── ai/
│   │       │   └── dashboard/
│   │       ├── lib/
│   │       └── hooks/
│   └── worker/             ← BullMQ worker service (background jobs only)
│
├── packages/
│   ├── db/                 ← Prisma schema + migrations (shared)
│   ├── types/              ← shared TypeScript types (shared)
│   └── utils/              ← shared utilities: encrypt, logger, etc.
│
├── infrastructure/
│   ├── cdk/                ← AWS CDK stacks (IaC)
│   └── docker/             ← Dockerfiles for web and worker
│
└── docs/
    └── architecture/       ← ADRs (Architecture Decision Records)
```

This is a **monorepo** managed with pnpm workspaces. The `web` app handles both the frontend UI and the HTTP API (via Next.js Route Handlers). The `worker` app is a separate service for background jobs — deployed as a separate ECS task.

---

## AWS infrastructure

### Services used

| AWS Service | Purpose |
|-------------|---------|
| ECS Fargate | Runs API service and Worker service as separate tasks |
| RDS PostgreSQL | Primary database (Multi-AZ in production) |
| RDS Read Replica | Analytics and reporting queries only |
| ElastiCache Redis | BullMQ job queue + session token cache |
| S3 | Static frontend assets, generated PDFs, CSV exports |
| CloudFront | CDN for frontend + WAF for traffic filtering |
| Application Load Balancer | Routes HTTPS traffic to ECS API tasks |
| API Gateway | Rate limiting, request throttling |
| SES | Transactional email (invitations, reports, alerts) |
| Secrets Manager | OAuth tokens, API keys, encryption keys |
| SQS | Dead letter queue for failed BullMQ jobs |
| CloudWatch | Logs, metrics, alarms |
| ECR | Docker image registry |
| Route 53 | DNS |
| ACM | SSL/TLS certificates |

### Environments

| Environment | Branch | Auto-deploy |
|-------------|--------|-------------|
| `production` | `main` | On merge |
| `staging` | `staging` | On merge |
| `development` | local | Docker Compose |

Every environment has its own isolated RDS instance, Redis cluster, and S3 bucket. Secrets are namespaced by environment in Secrets Manager: `prod/`, `staging/`, `dev/`.

---

## Service architecture

### Two ECS services — never merge them

```
┌─────────────────────────────────────────────────────┐
│                   ECS Fargate Cluster               │
│                                                     │
│  ┌──────────────────┐    ┌───────────────────────┐  │
│  │   Web Service    │    │   Worker Service      │  │
│  │  (Next.js)       │    │                       │  │
│  │ • UI pages       │    │ • BullMQ consumers    │  │
│  │ • Route Handlers │    │ • Sync jobs           │  │
│  │ • Auth middleware│    │ • AI agent jobs       │  │
│  │ • Role checks    │    │ • Report generation   │  │
│  │                  │    │ • Anomaly detection   │  │
│  │ Scales: by RPS   │    │ Scales: by queue depth│  │
│  └──────────────────┘    └───────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Rule:** The Web service (Next.js) never runs background jobs. The Worker service never handles HTTP requests. Communication between them is via Redis queue only — never direct HTTP calls between services.

### Request flow

```
User browser
  → CloudFront (CDN + WAF)
    → ALB (HTTPS termination)
      → API Gateway (rate limiting)
        → ECS API Service
          → RDS PostgreSQL (writes)
          → RDS Read Replica (analytics reads)
          → ElastiCache Redis (enqueue jobs)
          → S3 (file storage)
          → Secrets Manager (token retrieval)
```

### Background job flow

```
Redis Queue (BullMQ)
  → ECS Worker Service
    → Secrets Manager (retrieve platform OAuth tokens)
      → External Platform API (Meta, Google, TikTok, etc.)
        → RDS PostgreSQL (upsert metric records)
          → AI Agent cycle (after each sync)
            → AiGuardrails.check()
              → AiActionDispatcher.dispatch()
                → [suggest] → AiInsight record
                → [approval] → AiApprovalQueueItem record + notification
                → [autonomous] → PlatformApiService.write() + CampaignChangeLog
```

---

## Key services and their responsibilities

### `PlatformApiService` (`apps/web/src/lib/services/PlatformApiService.ts`)

**The single point of contact for all external platform API calls.**

Rules:
- Every read and write to Meta, Google Ads, TikTok, LinkedIn, GA4 goes through this class
- Never call external platform APIs directly from route handlers or jobs
- Handles: OAuth token retrieval from Secrets Manager, automatic token refresh, exponential backoff on rate limits (5min → 15min → 60min), error normalization into a standard `PlatformApiError` shape
- Tokens are never stored in memory longer than the request/job lifecycle — always retrieved fresh from Secrets Manager or the encrypted DB field

```ts
// Interface all callers use
interface PlatformApiService {
  // Read methods
  getCampaigns(connectionId: string): Promise<Campaign[]>
  getMetrics(connectionId: string, dateRange: DateRange): Promise<RawMetric[]>
  getAdCreatives(connectionId: string, adSetId: string): Promise<AdCreative[]>

  // Write methods (require write OAuth scope — US-010+)
  updateCampaignBudget(connectionId: string, campaignId: string, budget: number): Promise<void>
  updateCampaignStatus(connectionId: string, campaignId: string, status: string): Promise<void>
  updateAdCopy(connectionId: string, adId: string, fields: AdCopyFields): Promise<void>
}
```

### `AiGuardrails` (`packages/utils/src/AiGuardrails.ts`)

**Called at the top of every AI agent job before any action is taken.**

Rules:
- Must be the first check in any AI job — if it returns `allowed: false`, exit immediately
- Checks in order: kill switch → quiet hours → platform allowlist → hard limits
- Never bypassed, never optional
- Reads `AiWorkspaceSettings` fresh from DB on each call — never cached

```ts
interface GuardrailsResult {
  allowed: boolean
  permissionLevel: 'suggest' | 'approval' | 'autonomous' | null
  reason: 'kill_switch' | 'quiet_hours' | 'hard_limit' | 'platform_not_allowed' | null
}

AiGuardrails.check(
  workspaceId: string,
  actionType: string,
  proposedChange: { platform: string; newValue: number }
): Promise<GuardrailsResult>
```

### `AiActionDispatcher` (`apps/web/src/lib/services/AiActionDispatcher.ts`)

**Routes AI-proposed actions to the correct outcome based on permission level.**

Rules:
- Called after `AiGuardrails.check()` confirms the action is allowed
- Routes: `suggest` → creates `AiInsight`; `approval` → creates `AiApprovalQueueItem` + sends notification; `autonomous` → calls `PlatformApiService` write method + creates `CampaignChangeLog`
- Every path through this dispatcher results in a database record — no silent actions ever

```ts
AiActionDispatcher.dispatch(
  workspaceId: string,
  actionType: string,
  payload: ActionPayload,
  reason: string,           // human-readable explanation
  triggeredBy: string       // data that caused this action
): Promise<void>
```

### `requireAuth` / `requireRole` (`apps/web/src/lib/auth.ts`)

In Next.js Route Handlers, auth is enforced at the top of each handler (not Express middleware). Use shared helpers:

```ts
// apps/web/src/app/api/campaigns/[id]/route.ts
import { requireAuth, requireRole } from '@/lib/auth'

export async function PATCH(req: Request, { params }) {
  const user = await requireAuth(req)         // throws 401 if invalid
  requireRole(user, ['admin', 'manager'])     // throws 403 if insufficient role

  // user = { id, email, workspaceId, role }
}
```

---

## Database access rules

1. **Always scope to workspaceId** — every query on a multi-tenant table must include `WHERE workspace_id = $1`. Never fetch records without scoping.
2. **Primary DB for writes** — all `INSERT`, `UPDATE`, `DELETE` go to the primary RDS instance via Prisma.
3. **Read replica for analytics** — queries from dashboard, charts, attribution, and reports use the read replica Prisma client. These are defined in `packages/db/src/clients.ts` as `dbWrite` and `dbRead`.
4. **No raw SQL** — use Prisma query builders. Raw SQL is only permitted for complex analytics aggregations that Prisma cannot express, and must be reviewed and documented.
5. **Upsert, don't insert+update** — `metricRecord` uses Prisma `upsert` with the composite key `(workspaceId, platform, campaignId, adSetId, date)`.

---

## Security rules

### Token storage
- OAuth `accessToken` and `refreshToken` are encrypted with AES-256-GCM before writing to `platformConnection.accessToken` / `refreshToken`
- Encryption key is stored in AWS Secrets Manager at `{env}/encryption-key` — never in `.env` files committed to git
- Use `packages/utils/src/encrypt.ts` — `encrypt()` and `decrypt()` — never implement encryption inline

### Secrets
- No secrets in environment variables in production — all retrieved from AWS Secrets Manager at runtime
- `.env` files are for local development only and are gitignored
- Secrets are namespaced: `prod/meta-app-secret`, `staging/meta-app-secret`, etc.

### API security
- All endpoints require `requireAuth` unless explicitly public (`/auth/login`, `/auth/signup`, `/auth/verify`, `/health`)
- Role checks are enforced at the middleware layer — never trust frontend to hide UI elements as a security control
- Rate limiting applied at API Gateway: 100 req/min per IP for auth endpoints, 1000 req/min per workspace for general API
- CORS: only allow requests from the configured frontend domain — no wildcard origins in production

### Multi-tenancy
- Service layer always receives `workspaceId` from `req.user.workspaceId` — never from the request body or query params
- Validate that the resource being accessed (campaign, connection, etc.) belongs to `req.user.workspaceId` before returning or mutating it

---

## Background job architecture

All jobs use BullMQ with Redis. Jobs are defined in `apps/worker/src/jobs/`.

### Job types and schedules

| Job | Trigger | Description |
|-----|---------|-------------|
| `backfill` | On new platform connection | Fetches last 90 days of data |
| `sync` | Every 4 hours per workspace | Fetches last 3 days, upserts records |
| `ai-budget-optimization` | After each sync completes | Evaluates ROAS/CPA, proposes/executes budget changes |
| `ai-cross-channel-reallocation` | After each sync completes | Reallocates budget across platforms |
| `ai-creative-fatigue` | After each sync completes | Detects declining CTR, flags/swaps creatives |
| `ai-insights` | After each sync completes | Generates plain-language insight records |
| `anomaly-detection` | After each sync completes | Statistical anomaly detection, creates alerts |
| `approval-queue-expiry` | Every hour | Marks pending queue items older than 48hrs as expired |
| `report-delivery` | Per schedule (daily/weekly/monthly) | Generates and emails scheduled reports |

### Job rules
- Every job starts by checking relevant guardrails or preconditions before doing any work
- Jobs are idempotent — running the same job twice must produce the same result (use upsert, not insert)
- Failed jobs retry with exponential backoff: attempt 1 → 5min, attempt 2 → 15min, attempt 3 → 60min
- After 3 failures, jobs move to the SQS dead letter queue and trigger a CloudWatch alarm
- Jobs log their start, completion, records processed, and any errors to CloudWatch

### Job chaining
Sync job completion triggers AI jobs via BullMQ events — not via direct function calls:
```ts
// In sync.job.ts, after successful completion:
await aiInsightsQueue.add('run', { workspaceId })
await aiBudgetQueue.add('run', { workspaceId })
// etc.
```

---

## Frontend architecture

### Framework
Next.js 14+ with App Router. TypeScript throughout.

### Key conventions
- **Server Components** for data fetching where possible — reduces client bundle size
- **Client Components** only when interactivity requires it (charts, forms, real-time updates)
- API calls from the frontend always go through `apps/web/src/lib/api.ts` — a typed fetch wrapper that attaches auth headers and handles 401 refresh automatically
- No direct database access from the frontend — always via the API

### State management
- Server state: React Query (TanStack Query) for all API data fetching, caching, and invalidation
- UI state: React `useState` / `useReducer` — no global state library unless complexity demands it

### Component structure
```
apps/web/src/
  app/                    ← Next.js App Router pages
  components/
    ui/                   ← primitive components (Button, Input, Badge, etc.)
    charts/               ← Recharts wrappers (TrendChart, KpiCard, etc.)
    campaigns/            ← campaign-specific components
    ai/                   ← AI agent UI (InsightsPanel, ApprovalQueue, etc.)
  lib/
    api.ts                ← typed API client
    auth.ts               ← auth helpers
  hooks/                  ← custom React hooks
```

---

## Error handling standards

### API errors
All API errors return a consistent shape:
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Campaign not found",
    "details": {}
  }
}
```

Standard error codes: `UNAUTHORIZED`, `FORBIDDEN`, `RESOURCE_NOT_FOUND`, `VALIDATION_ERROR`, `PLATFORM_API_ERROR`, `RATE_LIMITED`, `INTERNAL_ERROR`

### Platform API errors
`PlatformApiService` normalizes all platform errors into:
```ts
class PlatformApiError extends Error {
  platform: string
  code: string          // platform's error code
  retryable: boolean    // true = retry with backoff, false = fail immediately
  connectionId: string
}
```

### Logging
Use the shared `logger` from `packages/utils/src/logger.ts` (wraps Winston → CloudWatch).
```ts
logger.info('Sync completed', { workspaceId, platform, recordsUpserted: 142 })
logger.error('Platform API call failed', { connectionId, error, retryable: true })
```
Never use `console.log` in production code.

---

## Testing standards

- **Unit tests:** Vitest. Every service method and utility function has unit tests. Mock all external dependencies (DB, Redis, platform APIs).
- **Integration tests:** Vitest + supertest. Test full request/response cycles for each API route. Use a test PostgreSQL instance (Docker).
- **TDD rule:** Write tests before implementation for every user story (see prompts/).
- **Coverage target:** 80% minimum on services and utilities. Routes are covered by integration tests.
- **Test file location:** Co-located with source, named `*.test.ts`

---

## Infrastructure as Code

AWS infrastructure is defined using AWS CDK (TypeScript) in `infrastructure/cdk/`.

### Stacks
| Stack | Contents |
|-------|---------|
| `NetworkStack` | VPC, subnets, security groups |
| `DatabaseStack` | RDS PostgreSQL, ElastiCache Redis |
| `ComputeStack` | ECS cluster, Fargate task definitions, ALB |
| `StorageStack` | S3 buckets, CloudFront distribution |
| `SecretsStack` | Secrets Manager entries (values set manually) |
| `MonitoringStack` | CloudWatch dashboards, alarms, SQS DLQ |

### Deployment
```bash
# Deploy to staging
pnpm cdk deploy --context env=staging

# Deploy to production
pnpm cdk deploy --context env=production
```

CI/CD runs via GitHub Actions. Merging to `staging` branch auto-deploys to staging. Merging to `main` requires a manual approval step before deploying to production.

---

## Local development

```bash
# Prerequisites: Docker Desktop, Node.js 20+, pnpm

# Start local infrastructure (PostgreSQL, Redis)
docker compose up -d

# Install dependencies
pnpm install

# Run database migrations
pnpm db:migrate

# Start API and web in parallel
pnpm dev
```

Local `.env` files:
- `apps/api/.env` — database URL, Redis URL, local encryption key, platform app IDs/secrets
- `apps/web/.env.local` — API base URL

Never commit `.env` files. Use `.env.example` files with placeholder values.
