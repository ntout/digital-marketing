# AWS Infrastructure Reference

> Read this file when writing any infrastructure code (CDK stacks, Dockerfiles, CI/CD config)
> or when a service needs to know which AWS resource to connect to.

---

## Resource naming convention

All AWS resources follow this pattern:
```
{app}-{env}-{resource}
```
Examples: `mktg-prod-api`, `mktg-staging-rds`, `mktg-dev-redis`

The app prefix is `mktg` throughout. Set via CDK context: `--context env=prod|staging|dev`

---

## ECS Fargate — Compute

Two task definitions in the same ECS cluster. Built from the same Docker image but run different entrypoints.

### API task
```
Entry:    node dist/api/server.js
Port:     3000
CPU:      512 (dev/staging) | 1024 (prod)
Memory:   1024 MB (dev/staging) | 2048 MB (prod)
Min tasks: 1 (dev) | 2 (staging) | 3 (prod)
Max tasks: 5 (dev) | 10 (staging) | 20 (prod)
Scale on: CPU > 70% for 2 minutes
```

### Worker task
```
Entry:    node dist/worker/index.js
Port:     none (no inbound traffic)
CPU:      1024 (all envs)
Memory:   2048 MB (all envs)
Min tasks: 1 (dev/staging) | 2 (prod)
Max tasks: 3 (dev) | 5 (staging) | 10 (prod)
Scale on: Redis queue depth > 50 jobs
```

### Health checks
- API: `GET /health` → `{ status: 'ok', version: string, timestamp: string }`
- Worker: writes a heartbeat key to Redis every 30s. CloudWatch alarm if missing for 2 min.

### IAM task role permissions (least privilege)
```
API task role:
  - secretsmanager:GetSecretValue (resource: arn:aws:secretsmanager:{region}:{account}:secret:{env}/*)
  - s3:PutObject, s3:GetObject (resource: mktg-{env}-assets bucket only)
  - ses:SendEmail
  - logs:CreateLogStream, logs:PutLogEvents

Worker task role:
  - secretsmanager:GetSecretValue (same as API)
  - s3:PutObject, s3:GetObject (same as API)
  - ses:SendEmail
  - sqs:SendMessage (DLQ only)
  - logs:CreateLogStream, logs:PutLogEvents
```

---

## RDS PostgreSQL — Database

### Connection
- **Write client** (primary): connect via `DATABASE_URL` secret → `mktg-{env}-rds`
- **Read client** (replica): connect via `DATABASE_READ_URL` secret → `mktg-{env}-rds-replica`

Two Prisma client instances are exported from `packages/db/src/clients.ts`:
```ts
export const dbWrite = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL })
export const dbRead  = new PrismaClient({ datasourceUrl: process.env.DATABASE_READ_URL })
```

**Rule:** Route all analytics queries (dashboards, charts, attribution, reports) through `dbRead`. All mutations through `dbWrite`. Never mix them.

### Specs
```
Engine:          PostgreSQL 15
Instance (prod): db.t4g.medium (Multi-AZ enabled)
Instance (stage): db.t4g.small (single AZ)
Instance (dev):  db.t4g.micro (single AZ)
Storage:         100 GB gp3, autoscaling to 500 GB
Backups:         7-day retention (prod), 1-day (staging/dev)
Encryption:      Enabled (AWS managed key)
```

### Connection pooling
Use PgBouncer as a sidecar in the ECS task (transaction mode). Max connections per task: 10. This prevents connection exhaustion when ECS scales out.

```
ECS Task → PgBouncer (localhost:5432) → RDS (actual port 5432)
```

### Migrations
Run on deploy as a one-off ECS task before the new API task starts:
```bash
node -e "require('@prisma/client'); require('child_process').execSync('prisma migrate deploy')"
```
Never run migrations from application startup code.

---

## ElastiCache Redis — Queue & Cache

### Connection
```
REDIS_URL secret → mktg-{env}-redis
```

BullMQ connects to this. Session cache also uses this instance with a key prefix `session:`.

### Specs
```
Engine:          Redis 7
Node type (prod): cache.t4g.small
Node type (dev/stage): cache.t4g.micro
Mode:            Single node (dev/stage) | Cluster mode disabled, Multi-AZ with replica (prod)
Encryption:      In-transit + at-rest enabled
```

### Key namespacing
```
bull:{queue-name}:*     ← BullMQ managed keys (do not touch)
session:{token-hash}    ← JWT refresh token validation cache (TTL: 30 days)
workspace:{id}:*        ← any future workspace-level caching
```

---

## S3 — Storage

### Buckets

| Bucket name | Purpose | Public? |
|-------------|---------|---------|
| `mktg-{env}-assets` | Generated PDFs, CSV exports | No — pre-signed URLs only |
| `mktg-{env}-web` | Next.js static build output | Yes — via CloudFront only |

### Pre-signed URL pattern
Files are never served directly. Generate a pre-signed GET URL (15 min expiry) when a user requests a download:
```ts
const url = await s3.getSignedUrlPromise('getObject', {
  Bucket: process.env.ASSETS_BUCKET,
  Key: `reports/${workspaceId}/${reportId}.pdf`,
  Expires: 900  // 15 minutes
})
```

### File key structure
```
reports/{workspaceId}/{reportId}.pdf
exports/{workspaceId}/{exportId}.csv
```

---

## CloudFront + WAF

- CloudFront distribution sits in front of both the S3 web bucket and the ALB
- Two origins: `S3` (for static assets) and `ALB` (for `/api/*` paths)
- WAF rules enabled: AWS managed Core Rule Set, IP rate limiting (2000 req/5min per IP)
- Cache behavior: static assets cached 1 year (content-hashed filenames), API requests not cached

---

## Secrets Manager — Secret Paths

All application secrets are stored here. The app never reads from `.env` in production — only from Secrets Manager.

```
{env}/database-url             → PostgreSQL primary connection string
{env}/database-read-url        → PostgreSQL read replica connection string
{env}/redis-url                → Redis connection string
{env}/encryption-key           → AES-256 key for OAuth token encryption (32-byte hex)
{env}/jwt-secret               → JWT signing secret (64-byte hex)
{env}/meta-app-id              → Meta (Facebook) App ID
{env}/meta-app-secret          → Meta App Secret
{env}/google-client-id         → Google OAuth Client ID
{env}/google-client-secret     → Google OAuth Client Secret
{env}/tiktok-app-id            → TikTok App ID
{env}/tiktok-app-secret        → TikTok App Secret
{env}/linkedin-client-id       → LinkedIn Client ID
{env}/linkedin-client-secret   → LinkedIn Client Secret
{env}/ses-smtp-password        → SES SMTP password
{env}/openai-api-key           → OpenAI API key (or leave empty if using Bedrock)
```

### Reading secrets in code
Use `packages/utils/src/secrets.ts`:
```ts
import { getSecret } from '@mktg/utils/secrets'

const encryptionKey = await getSecret(`${process.env.ENV}/encryption-key`)
```

This wrapper caches secrets in memory for the lifetime of the process (refreshes every 5 minutes). Never call Secrets Manager inline in hot paths.

---

## SES — Email

Sending domain: configured per environment. Verify the domain in SES before deploying.

```
From address (prod):    noreply@yourdomain.com
From address (staging): noreply@staging.yourdomain.com
```

All email sending goes through `packages/utils/src/email.ts`:
```ts
sendEmail({
  to: string | string[],
  subject: string,
  html: string,
  text: string          // plain text fallback, always required
})
```

SES sandbox mode is active in `dev` — only verified email addresses can receive mail. Request production access before staging launch.

---

## SQS — Dead Letter Queue

Queue name: `mktg-{env}-dlq`

BullMQ is configured to forward jobs that have exhausted all retries (3 attempts) to this SQS queue. A CloudWatch alarm fires when the queue depth exceeds 0. This is the signal to investigate failed jobs.

Do not consume from this queue automatically — it is for manual inspection and replay only.

---

## CloudWatch — Observability

### Log groups
```
/mktg/{env}/api       ← API service logs
/mktg/{env}/worker    ← Worker service logs
/mktg/{env}/migrations← Migration task logs
```

Log retention: 30 days (prod), 7 days (staging/dev).

### Key alarms (all notify the ops SNS topic)
| Alarm | Threshold |
|-------|-----------|
| API 5xx error rate | > 1% over 5 min |
| API p99 latency | > 2000ms over 5 min |
| RDS CPU | > 80% over 10 min |
| Redis memory | > 75% |
| Worker heartbeat missing | > 2 min |
| SQS DLQ depth | > 0 |
| Failed sync jobs | > 5 in 1 hour |

### Structured logging format
Every log line must be valid JSON:
```json
{
  "level": "info",
  "message": "Sync completed",
  "workspaceId": "uuid",
  "platform": "meta",
  "recordsUpserted": 142,
  "durationMs": 1840,
  "timestamp": "2026-04-09T10:00:00.000Z",
  "service": "worker",
  "jobId": "uuid"
}
```

---

## Networking

### VPC layout
```
VPC CIDR: 10.0.0.0/16

Public subnets (ALB, NAT Gateway):
  10.0.1.0/24  us-east-1a
  10.0.2.0/24  us-east-1b

Private subnets (ECS tasks):
  10.0.10.0/24 us-east-1a
  10.0.11.0/24 us-east-1b

Database subnets (RDS, Redis):
  10.0.20.0/24 us-east-1a
  10.0.21.0/24 us-east-1b
```

ECS tasks run in private subnets. They reach the internet (for external platform APIs) via a NAT Gateway in the public subnet. RDS and Redis are in isolated database subnets with no internet access.

### Security groups
| Resource | Inbound | Outbound |
|----------|---------|----------|
| ALB | 443 from 0.0.0.0/0 | 3000 to ECS API SG |
| ECS API | 3000 from ALB SG | 443 to internet (via NAT), 5432 to RDS SG, 6379 to Redis SG |
| ECS Worker | none | 443 to internet (via NAT), 5432 to RDS SG, 6379 to Redis SG |
| RDS | 5432 from ECS SGs only | none |
| Redis | 6379 from ECS SGs only | none |
