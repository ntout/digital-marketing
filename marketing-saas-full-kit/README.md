# Marketing SaaS Full Kit

Bootstrap monorepo for the marketing analytics SaaS. At the current `US-000` stage, this repo gives you:

- A Next.js web app in `apps/web`
- A BullMQ worker in `apps/worker`
- A shared Prisma package in `packages/db`
- Shared utilities in `packages/utils`
- Local Docker services for PostgreSQL and Redis

## Prerequisites

- Node.js 20+
- pnpm
- Docker Desktop

## Local Env Files

These local env files are already set up for the current bootstrap:

- `apps/web/.env.local`
- `apps/worker/.env`

They contain local-only placeholder values plus working local defaults for:

- `DATABASE_URL`
- `DATABASE_READ_URL`
- `REDIS_URL`
- `ENCRYPTION_KEY`
- future Auth0/platform/email variables

These values are for local development only. Do not reuse them for real environments.

## Quick Start

If you only want to see the current bootstrap page in the browser:

```bash
pnpm --filter @mktg/web dev
```

Then open `http://localhost:3000`.

## Full Local Run

Start local infrastructure:

```bash
docker compose up -d
```

Install dependencies if needed:

```bash
pnpm install
```

Start the web app and worker together:

```bash
pnpm dev
```

The web app runs at `http://localhost:3000`.

## Useful Commands

Run the web app only:

```bash
pnpm --filter @mktg/web dev
```

Run the worker only:

```bash
pnpm --filter @mktg/worker dev
```

Run tests:

```bash
pnpm test
```

Run lint:

```bash
pnpm lint
```

Build the web app:

```bash
pnpm --filter @mktg/web build
```

Build the worker:

```bash
pnpm --filter @mktg/worker build
```

## Notes

- `US-000` is infrastructure only. The browser view is a scaffold/placeholder page, not the real product yet.
- The worker expects Redis at `redis://localhost:6379`.
- The local database URLs point to the Postgres container from `docker-compose.yml`.
- Prisma is initialized, but no app data models are defined yet in this story.
