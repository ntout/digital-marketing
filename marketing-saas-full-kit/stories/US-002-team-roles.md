# US-002 — Team invitations & role management

## Epic
Foundation / Auth

## Title
Admin can invite team members and assign roles

## User story
As a workspace admin, I want to invite team members by email and assign them a role so that each person has the right level of access to the platform.

## Context & scope
Settings > Team page. Roles are: Owner, Admin, Manager, Marketer, Viewer. Role permissions are enforced at the API middleware layer, not just the UI. Invitations expire after 7 days.

## Acceptance criteria
- **AC1:** Given I am an Admin or Owner, when I enter an email and select a role and click Invite, then an invitation email is sent and a pending invite record is created.
- **AC2:** Given the invitee clicks the email link, when the token is valid, then they are prompted to create a password (if new user) or log in (if existing), and are added to the workspace with the assigned role.
- **AC3:** Given I am on the Team page, when I view the member list, then I see each member's name, email, role, and status (active / pending).
- **AC4:** Given I am an Admin, when I change a member's role, then the change takes effect immediately on their next request.
- **AC5:** Given I am an Admin, when I remove a member, then their access is revoked immediately and they cannot access any workspace data.
- **AC6:** Given I am a Viewer, when I attempt to access team settings, then I receive a 403 response.

## Data model
```json
{
  "invitation": {
    "id": "uuid",
    "workspaceId": "uuid",
    "email": "string",
    "role": "admin | manager | marketer | viewer",
    "token": "string (hashed)",
    "expiresAt": "timestamp",
    "status": "pending | accepted | expired"
  }
}
```

## Role permission matrix
| Action                    | Owner | Admin | Manager | Marketer | Viewer |
|---------------------------|-------|-------|---------|----------|--------|
| Invite / remove members   | ✓     | ✓     |         |          |        |
| Connect platforms         | ✓     | ✓     | ✓       |          |        |
| Edit campaigns            | ✓     | ✓     | ✓       |          |        |
| View dashboards           | ✓     | ✓     | ✓       | ✓        | ✓      |
| Change AI permissions     | ✓     | ✓     |         |          |        |

## Dependencies
US-001 — workspace and user records must exist.

## Out of scope
Per-project role overrides. SSO group sync. Custom roles.

## Priority · Status
High · Now
