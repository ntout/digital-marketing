# US-000 — Project bootstrap & monorepo setup

## Epic
Foundation

## Title
Project bootstrap & monorepo setup

## User story
As a developer, I want a fully configured monorepo so that agents can implement user stories without making structural decisions.

## Context & scope
This is the zeroth story — it must be run before US-001. It establishes the full repo skeleton: workspaces, tooling, Docker services, environment variable scaffolding, and test runners. No application feature code is written here. Every subsequent story assumes this structure exists.

## Branching requirement
Before making any changes, create and switch to a dedicated branch for this story:

```bash
git checkout -b feature/US-000-project-bootstrap
```

Do not implement US-000 directly on `main`.

## Acceptance criteria
- **AC1:** pnpm workspace monorepo is initialised with `pnpm-workspace.yaml` declaring `apps/*` and `packages/*`. Workspaces present: `apps/web`, `apps/worker`, `packages/db`, `packages/utils`.
- **AC2:** `apps/web` is a Next.js 14+ App Router project with TypeScript strict mode enabled, Tailwind CSS configured, and shadcn/ui initialised (components.json present, `cn` utility at `src/lib/utils.ts`, base components installed: Button, Input, Badge, Dialog, DropdownMenu, Table, Skeleton, Sonner, Card, Separator, Avatar).
- **AC3:** `packages/db` has Prisma initialised with a PostgreSQL provider. A valid `packages/db/prisma/schema.prisma` file exists with `datasource db { provider = "postgresql" }` and `generator client { provider = "prisma-client-js" }`. A `packages/db/src/clients.ts` file exports `dbWrite` and `dbRead` PrismaClient instances.
- **AC4:** `packages/utils/src/` contains four stubbed modules: `encrypt.ts` (AES-256-GCM using Node.js `crypto`), `logger.ts` (Winston with JSON output), `secrets.ts` (AWS Secrets Manager wrapper with 5-minute in-memory cache), `email.ts` (Resend client wrapper stub).
- **AC5:** `apps/worker` is a plain TypeScript Node.js app with BullMQ installed. Its `src/index.ts` starts a BullMQ worker. Its `package.json` references `packages/db` and `packages/utils` as workspace dependencies.
- **AC6:** Root `package.json` has a `dev` script that runs `apps/web` and `apps/worker` in parallel using `concurrently`, and a `db:migrate` script that runs `prisma migrate dev` inside `packages/db`.
- **AC7:** `.env.example` files exist at `apps/web/.env.example` and `apps/worker/.env.example` with all required variable names (no values). Variable names must match the list in `CONTEXT.md` / `AWS-INFRASTRUCTURE.md`.
- **AC8:** ESLint and Prettier are configured at the repo root (`.eslintrc.js` and `.prettierrc`). Both tools are applied to all workspaces via the root config.
- **AC9:** Vitest is configured in `apps/web` and `apps/worker` (each has a `vitest.config.ts`). Running `pnpm test` from either app directory executes the test suite.
- **AC10:** A `docker-compose.yml` at the repo root defines two services: `postgres` (image `postgres:15`, port `5432`) and `redis` (image `redis:7`, port `6379`) for local development.

## Data model
None — this story is infrastructure only. No Prisma models are defined here.

## Dependencies
None — this is the root story.

## Out of scope
CI/CD pipeline, AWS deployment configuration, actual `.env` values, any application feature code.

## Priority · Status
High · Now
