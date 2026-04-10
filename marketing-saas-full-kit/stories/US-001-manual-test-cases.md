# US-001 — Manual Test Cases
# User authentication & workspace setup

**Prerequisites**
- App is running locally (`pnpm dev`)
- Auth0 tenant is configured with the correct callback and logout URLs
- Database is migrated and reachable
- You have access to at least two test Auth0 accounts (one fresh, one returning)
- Browser dev tools available for cookie/network inspection

---

## TC-001 · Sign-in redirects to Auth0 Universal Login
**AC1** · Happy path

| # | Step | Expected result |
|---|------|-----------------|
| 1 | Open an incognito window and navigate to `http://localhost:3000/login` | Login page renders with a "Sign in" button |
| 2 | Click "Sign in" | Browser redirects to your Auth0 Universal Login page (`https://<tenant>.auth0.com/...`) |
| 3 | Authenticate with a valid test account | Auth0 redirects back to the app |
| 4 | Observe the final URL | You land on `/onboarding` (new user) or `/dashboard` (returning user with workspace) |

---

## TC-002 · User record is created on first login
**AC2** · First-time sign-in

| # | Step | Expected result |
|---|------|-----------------|
| 1 | Use a fresh Auth0 account that has never logged in before | — |
| 2 | Sign in via `http://localhost:3000/login` | Redirected to `/onboarding` |
| 3 | Query the database: `SELECT * FROM "user" WHERE email = '<test-email>';` | A single `user` row exists with `auth0_id` matching the Auth0 subject claim (e.g. `auth0|abc123`) and the correct `email` |
| 4 | Sign in a second time with the same account | No duplicate row is created; the same `user` row is returned |

---

## TC-003 · New user is redirected to onboarding and can create a workspace
**AC3** · New user workspace creation flow

| # | Step | Expected result |
|---|------|-----------------|
| 1 | Sign in with a fresh account (no workspace) | Redirected to `/onboarding` |
| 2 | Observe the page | A workspace name input and submit button are rendered |
| 3 | Submit the form with a valid name (e.g. "Acme Corp") | Redirected to `/dashboard` |
| 4 | Verify the dashboard shows your workspace name or role | User is displayed as `owner` |
| 5 | Query the database: `SELECT * FROM workspace WHERE name = 'Acme Corp';` | One `workspace` row exists with `owner_id` matching your user ID |
| 6 | Query: `SELECT * FROM workspace_member WHERE workspace_id = '<id>';` | One `workspace_member` row exists with `role = 'owner'` |
| 7 | Sign out and sign back in with the same account | Redirected directly to `/dashboard` — not to `/onboarding` |

---

## TC-004 · Returning user with workspace skips onboarding
**AC3** · Returning user

| # | Step | Expected result |
|---|------|-----------------|
| 1 | Sign in with an account that already has a workspace | — |
| 2 | Observe the redirect | Goes directly to `/dashboard`, not `/onboarding` |
| 3 | Manually navigate to `http://localhost:3000/onboarding` | Redirected back to `/dashboard` (the page guards against re-entry) |

---

## TC-005 · Protected routes require authentication
**AC4** · Unauthenticated access

| # | Step | Expected result |
|---|------|-----------------|
| 1 | Open an incognito window (no session) | — |
| 2 | Navigate to `http://localhost:3000/dashboard` | Redirected to `/login` |
| 3 | Navigate to `http://localhost:3000/onboarding` | Redirected to `/login` |
| 4 | Open browser dev tools → Application → Cookies and delete all auth cookies | — |
| 5 | Refresh `/dashboard` | Redirected to `/login` |

---

## TC-006 · Authenticated users can access protected routes
**AC4** · Authenticated access

| # | Step | Expected result |
|---|------|-----------------|
| 1 | Sign in with a valid account that has a workspace | — |
| 2 | Navigate to `http://localhost:3000/dashboard` | Page renders without redirect |
| 3 | Reload the page | Page still renders (session persists) |

---

## TC-007 · Sign out terminates the session
**AC5** · Sign out

| # | Step | Expected result |
|---|------|-----------------|
| 1 | Sign in and reach `/dashboard` | — |
| 2 | Click "Sign out" | Redirected away from the app (Auth0 logout endpoint called) |
| 3 | Navigate to `http://localhost:3000/dashboard` | Redirected to `/login` — session is gone |
| 4 | Check browser cookies | Auth0 session cookie is absent |

---

## TC-008 · Workspace name validation — invalid characters
**Edge case** · Input validation

| # | Step | Expected result |
|---|------|-----------------|
| 1 | Sign in with a fresh account and reach `/onboarding` | — |
| 2 | Submit the form with name `<script>alert(1)</script>` | Form does not submit; error message shown: "Workspace name contains unsupported characters." |
| 3 | Submit with name `'; DROP TABLE workspace; --` | Same error |
| 4 | Submit with a valid name like `Acme & Co.` | Succeeds and redirects to `/dashboard` |

---

## TC-009 · Workspace name validation — too long
**Edge case** · Input validation

| # | Step | Expected result |
|---|------|-----------------|
| 1 | Sign in with a fresh account and reach `/onboarding` | — |
| 2 | Submit a name that is 256 characters long | Error: "Workspace name must be 255 characters or fewer." |
| 3 | Submit a name that is exactly 255 characters | Succeeds |

---

## TC-010 · Workspace name validation — empty
**Edge case** · Input validation

| # | Step | Expected result |
|---|------|-----------------|
| 1 | Sign in with a fresh account and reach `/onboarding` | — |
| 2 | Submit the form with an empty name | Error: "Workspace name is required." |
| 3 | Submit the form with only spaces | Same error (whitespace is trimmed before validation) |

---

## TC-011 · Cannot create a second workspace
**Edge case** · Duplicate workspace guard

| # | Step | Expected result |
|---|------|-----------------|
| 1 | Sign in with an account that already has a workspace | — |
| 2 | `POST /api/v1/workspaces` with `{ "name": "Second" }` via curl or a REST client | `HTTP 409` with `{ "error": { "code": "WORKSPACE_ALREADY_EXISTS", ... } }` |

---

## TC-012 · Auth0 callback error is handled gracefully
**Edge case** · Callback failure

| # | Step | Expected result |
|---|------|-----------------|
| 1 | Simulate a callback error by navigating to `/api/auth/callback?error=access_denied&error_description=User+cancelled` | Redirected to `/login?error=auth_callback_failed` |
| 2 | Observe the login page | No crash; user can attempt sign-in again |

---

## TC-013 · Open redirect is blocked on callback returnTo
**Security** · Open redirect guard

| # | Step | Expected result |
|---|------|-----------------|
| 1 | Craft a login URL with an external `returnTo`: `/api/auth/login?returnTo=https://evil.com` | — |
| 2 | Complete sign-in | After callback, browser lands on `/dashboard` — NOT `https://evil.com` |
| 3 | Try a protocol-relative URL: `/api/auth/login?returnTo=//evil.com` | Same result — redirected to `/dashboard` |

---

## TC-014 · Valid returnTo path is respected
**AC1** · Deep-link after login

| # | Step | Expected result |
|---|------|-----------------|
| 1 | Clear your session cookies | — |
| 2 | Navigate directly to a protected page like `/dashboard` | Redirected to `/login` |
| 3 | Sign in | After Auth0 callback, returned to `/dashboard` (original destination) |
