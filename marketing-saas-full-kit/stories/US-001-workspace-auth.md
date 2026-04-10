# US-001 — User authentication & workspace setup

## Epic
Foundation / Auth

## Title
User can sign up, log in, and create a workspace

## User story
As a new user, I want to sign up, verify my email, and create a named workspace so that I have a secure, isolated environment to connect my marketing platforms and manage my team.

## Context & scope
This is the entry point of the application. Every other feature depends on a workspace existing. Covers: signup form, email verification flow, login, JWT session management, and the initial workspace creation step shown after first login. Each workspace is fully isolated — data, platform connections, and settings do not bleed between workspaces.

## Acceptance criteria
- **AC1:** Given I visit /signup, when I submit a valid email and password, then I receive a verification email and am shown a "check your email" screen.
- **AC2:** Given I click the verification link, when the token is valid and unexpired, then my account is activated and I am redirected to workspace creation.
- **AC3:** Given I am on the workspace creation screen, when I submit a workspace name, then a workspace record is created with me as the Owner, and I am redirected to the dashboard.
- **AC4:** Given I visit /login, when I submit valid credentials, then I receive a JWT access token (15 min expiry) and refresh token (30 day expiry) stored in httpOnly cookies.
- **AC5:** Given my access token has expired, when I make an authenticated request, then the app silently refreshes using the refresh token without logging me out.
- **AC6:** Given I click logout, when confirmed, then both tokens are invalidated server-side and I am redirected to /login.

## Data model
```json
{
  "user": {
    "id": "uuid",
    "email": "string",
    "passwordHash": "string",
    "emailVerified": "boolean",
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

## Dependencies
None — this is the root story.

## Out of scope
SSO / OAuth login (future). Multi-workspace switching UI (US-002). Billing setup.

## Priority · Status
High · Now
