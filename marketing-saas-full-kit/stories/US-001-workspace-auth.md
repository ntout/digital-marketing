# US-001 — User authentication & workspace setup

## Epic
Foundation / Auth

## Title
User can sign in via Auth0 and create a workspace

## User story
As a new user, I want to sign in using Auth0 and create a named workspace so that I have a secure, isolated environment to connect my marketing platforms and manage my team.

## Context & scope
Authentication (signup, login, logout, email verification, password reset) is fully delegated to Auth0. This story covers: integrating the `@auth0/nextjs-auth0` SDK into the Next.js app, syncing the Auth0 identity to a local `user` record on first login, the workspace creation flow shown after first login, and protecting all app routes. Each workspace is fully isolated — data, platform connections, and settings do not bleed between workspaces.

## Acceptance criteria
- **AC1:** Given I visit `/login`, when I click "Sign in", then I am redirected to the Auth0 Universal Login page. After authenticating, I am redirected back to the app.
- **AC2:** Given I sign in for the first time (no local user record), when the Auth0 callback is processed, then a `user` record is created with `auth0Id` = Auth0 subject claim and `email` from the Auth0 profile.
- **AC3:** Given I am a new user with no workspace, when I land on the dashboard, then I am redirected to a workspace creation screen. After submitting a workspace name, a workspace record is created with me as the `owner` and I am redirected to the dashboard.
- **AC4:** Given I am authenticated, when I visit any route under `/(app)/`, then the page renders. Given I am not authenticated, when I visit any route under `/(app)/`, then I am redirected to `/login`.
- **AC5:** Given I click "Sign out", when confirmed, then my Auth0 session is terminated and I am redirected to the marketing/home page.
- **AC6:** Given my Auth0 session is valid, when a Route Handler calls `requireAuth(req)`, then it returns `{ auth0Id, email, workspaceId, role }` correctly. Given the session is missing or expired, then it throws a 401 error.

## Data model
```json
{
  "user": {
    "id": "uuid",
    "auth0Id": "string (e.g. auth0|abc123) — unique",
    "email": "string",
    "createdAt": "timestamp"
  },
  "workspace": {
    "id": "uuid",
    "name": "string",
    "ownerId": "uuid (→ user.id)",
    "createdAt": "timestamp"
  },
  "workspaceMember": {
    "workspaceId": "uuid",
    "userId": "uuid",
    "role": "owner | admin | manager | marketer | viewer"
  }
}
```

## File structure
```
packages/db/prisma/schema.prisma              (User, Workspace, WorkspaceMember models)
apps/web/src/app/api/auth/[auth0]/route.ts    (Auth0 SDK catch-all route handler)
apps/web/src/app/api/v1/workspaces/route.ts   (POST — create workspace)
apps/web/src/lib/auth.ts                      (requireAuth, requireRole helpers)
apps/web/src/lib/services/UserService.ts      (upsertFromAuth0 — first-login sync)
apps/web/src/app/(auth)/login/page.tsx
apps/web/src/app/(app)/layout.tsx             (session guard — redirect if no session)
apps/web/src/app/(app)/onboarding/page.tsx    (workspace creation)
apps/web/src/__tests__/auth.test.ts
apps/web/src/__tests__/workspaces.test.ts
```

## Dependencies
US-000 — monorepo must be bootstrapped. Auth0 tenant must be configured with the app's callback and logout URLs before this story can be tested.

## Out of scope
- Building a custom login/signup UI (Auth0 Universal Login is used)
- Password reset (Auth0 handles this natively)
- MFA configuration (Auth0 handles this)
- Multi-workspace switching UI (US-002)
- Billing setup

## Priority · Status
High · Now
