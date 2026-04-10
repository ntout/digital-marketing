# API Design Standards

> Read this before implementing any API route, middleware, or service method.
> Every endpoint in this application must comply with these standards.

---

## Base URL structure

```
https://api.yourdomain.com/api/v1/{resource}
```

All routes are versioned under `/api/v1/`. The version prefix is applied globally in `apps/api/src/server.ts` — do not add it per-router.

---

## Route file structure

Each resource has its own router file in `apps/api/src/routes/`. Export a single Express router. Register it in `apps/api/src/routes/index.ts`.

```ts
// apps/api/src/routes/campaigns.ts
import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth'
import { requireRole } from '../middleware/requireRole'
import { CampaignService } from '../services/CampaignService'

const router = Router()

router.get('/',           requireAuth,                            listCampaigns)
router.get('/:id',        requireAuth,                            getCampaign)
router.post('/:id/edit',  requireAuth, requireRole('manager', 'admin'), editCampaign)

export default router
```

---

## Middleware stack (applied in this order)

```
1. helmet()               ← security headers
2. cors(config)           ← CORS — only configured origin, never wildcard in prod
3. express.json()         ← JSON body parsing
4. requestLogger          ← logs method, path, workspaceId, latency
5. requireAuth            ← JWT validation (applied per-route, not globally)
6. requireRole(...)       ← role check (applied per-route after requireAuth)
```

### `requireAuth` — what it does
1. Reads `Authorization: Bearer {token}` header
2. Verifies JWT signature using `jwt-secret` from Secrets Manager
3. Checks token is not expired
4. Attaches to request: `req.user = { id, email, workspaceId, role }`
5. On failure: returns `401 UNAUTHORIZED`

### `requireRole(...roles)` — what it does
1. Must be applied after `requireAuth`
2. Checks `req.user.role` is in the provided allowlist
3. On failure: returns `403 FORBIDDEN`
4. Usage: `requireRole('admin', 'owner')` or `requireRole('manager', 'admin', 'owner')`

---

## Route handler pattern

Always use this pattern. Never put business logic directly in route handlers.

```ts
// Route handler — thin layer, delegates to service
async function listCampaigns(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.user   // always from req.user, never req.body
    const { platform, dateFrom, dateTo } = req.query

    const campaigns = await CampaignService.list(workspaceId, { platform, dateFrom, dateTo })
    return res.json({ data: campaigns })
  } catch (err) {
    next(err)   // always pass errors to next() — never catch-and-respond inline
  }
}
```

**Never:**
- Access `dbWrite` or `dbRead` directly from a route handler
- Call `PlatformApiService` directly from a route handler
- Return different response shapes depending on conditions
- Swallow errors with an empty catch block

---

## Request validation

Use `zod` for all request validation. Define schemas in `apps/api/src/schemas/`. Validate before calling any service method.

```ts
import { z } from 'zod'

const editCampaignSchema = z.object({
  body: z.object({
    dailyBudget: z.number().positive().optional(),
    status: z.enum(['active', 'paused']).optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided'
  })
})

// In route handler:
const parsed = editCampaignSchema.safeParse({ body: req.body })
if (!parsed.success) {
  return res.status(400).json({
    error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: parsed.error.flatten() }
  })
}
```

---

## Response format

### Success responses
```json
{
  "data": { }
}
```
For lists:
```json
{
  "data": [],
  "meta": {
    "total": 142,
    "page": 1,
    "pageSize": 50
  }
}
```

### Error responses
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Campaign not found",
    "details": { }
  }
}
```

### Standard error codes and HTTP status mapping
| Code | HTTP Status | When to use |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Valid JWT but insufficient role |
| `RESOURCE_NOT_FOUND` | 404 | Record doesn't exist or doesn't belong to workspace |
| `VALIDATION_ERROR` | 400 | Zod schema failed |
| `CONFLICT` | 409 | Duplicate resource (e.g., platform already connected) |
| `PLATFORM_API_ERROR` | 502 | External platform API call failed |
| `RATE_LIMITED` | 429 | Request rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `LOCKED` | 423 | Action blocked (e.g., AI kill switch active) |

### Global error handler
Registered last in `apps/api/src/server.ts`. All errors propagated via `next(err)` are caught here and formatted into the standard error shape.

```ts
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path })
  // Map known error types to codes, default to INTERNAL_ERROR
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } })
})
```

---

## Workspace scoping rule

This is the most important security rule for all route handlers and services.

**Always derive `workspaceId` from `req.user`** — never from `req.params`, `req.query`, or `req.body`.

```ts
// CORRECT
const { workspaceId } = req.user

// WRONG — user could manipulate this to access another workspace's data
const { workspaceId } = req.params
const { workspaceId } = req.body
```

When fetching a resource by ID, always verify it belongs to `req.user.workspaceId`:
```ts
// In service layer:
const campaign = await dbRead.metricRecord.findFirst({
  where: {
    campaignId: id,
    workspaceId   // always scope — never find by ID alone
  }
})
if (!campaign) throw new NotFoundError('Campaign not found')
```

---

## Pagination

All list endpoints that could return more than 20 records must support pagination.

Query params: `?page=1&pageSize=50` (default page=1, pageSize=50, max pageSize=100)

```ts
const page = parseInt(req.query.page as string) || 1
const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 100)
const skip = (page - 1) * pageSize

const [items, total] = await Promise.all([
  dbRead.metricRecord.findMany({ where, skip, take: pageSize }),
  dbRead.metricRecord.count({ where })
])

res.json({ data: items, meta: { total, page, pageSize } })
```

---

## API route reference

### Auth
| Method | Path | Auth | Min Role | Story |
|--------|------|------|----------|-------|
| POST | /auth/signup | No | — | US-001 |
| GET | /auth/verify | No | — | US-001 |
| POST | /auth/login | No | — | US-001 |
| POST | /auth/refresh | No | — | US-001 |
| POST | /auth/logout | Yes | viewer | US-001 |

### Workspaces & team
| Method | Path | Auth | Min Role | Story |
|--------|------|------|----------|-------|
| POST | /workspaces | No | — | US-001 |
| GET | /team | Yes | marketer | US-002 |
| POST | /invitations | Yes | admin | US-002 |
| GET | /invitations/accept | No | — | US-002 |
| PATCH | /team/:userId/role | Yes | admin | US-002 |
| DELETE | /team/:userId | Yes | admin | US-002 |

### Platform connections
| Method | Path | Auth | Min Role | Story |
|--------|------|------|----------|-------|
| GET | /connections | Yes | marketer | US-003 |
| GET | /connections/:platform/connect | Yes | admin | US-003 |
| GET | /connections/:platform/callback | No | — | US-003 |
| DELETE | /connections/:id | Yes | admin | US-003 |
| POST | /connections/:id/sync | Yes | manager | US-004 |

### Analytics
| Method | Path | Auth | Min Role | Story |
|--------|------|------|----------|-------|
| GET | /dashboard | Yes | viewer | US-005 |
| GET | /analytics/trends | Yes | viewer | US-006 |
| GET | /analytics/campaigns | Yes | viewer | US-007 |
| GET | /analytics/campaigns/:id | Yes | viewer | US-007 |
| GET | /analytics/attribution | Yes | viewer | US-020 |

### Alerts & reports
| Method | Path | Auth | Min Role | Story |
|--------|------|------|----------|-------|
| GET | /alerts | Yes | viewer | US-008 |
| PATCH | /alerts/:id/mute | Yes | marketer | US-008 |
| POST | /reports/generate | Yes | manager | US-009 |
| GET | /reports/schedules | Yes | marketer | US-009 |
| POST | /reports/schedules | Yes | manager | US-009 |
| DELETE | /reports/schedules/:id | Yes | manager | US-009 |

### Campaign editing
| Method | Path | Auth | Min Role | Story |
|--------|------|------|----------|-------|
| GET | /campaigns/:id/edit | Yes | manager | US-010 |
| POST | /campaigns/:id/changes/preview | Yes | manager | US-010 |
| POST | /campaigns/:id/changes/confirm | Yes | manager | US-010 |
| GET | /ads/:id/edit | Yes | marketer | US-011 |
| POST | /ads/:id/copy/preview | Yes | marketer | US-011 |
| POST | /ads/:id/copy/confirm | Yes | manager | US-011 |
| POST | /campaigns/bulk-actions | Yes | manager | US-012 |

### Activity log
| Method | Path | Auth | Min Role | Story |
|--------|------|------|----------|-------|
| GET | /activity-log | Yes | viewer | US-013 |
| POST | /activity-log/:id/revert | Yes | manager | US-013 |

### AI agent
| Method | Path | Auth | Min Role | Story |
|--------|------|------|----------|-------|
| GET | /settings/ai-agent | Yes | viewer | US-014 |
| PATCH | /settings/ai-agent | Yes | admin | US-014 |
| POST | /settings/ai-agent/kill-switch | Yes | admin | US-014 |
| GET | /ai/approval-queue | Yes | manager | US-015 |
| POST | /ai/approval-queue/:id/approve | Yes | manager | US-015 |
| POST | /ai/approval-queue/:id/reject | Yes | manager | US-015 |
| GET | /ai/insights | Yes | viewer | US-019 |
| POST | /ai/insights/:id/dismiss | Yes | marketer | US-019 |
| POST | /ai/insights/:id/action | Yes | manager | US-019 |

---

## Health endpoint

```
GET /health
```
No auth required. Returns:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-04-09T10:00:00.000Z"
}
```
Used by ALB health checks. Must respond within 2 seconds.
