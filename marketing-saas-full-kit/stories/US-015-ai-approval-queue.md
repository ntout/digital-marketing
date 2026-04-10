# US-015 — AI approval queue

## Epic
AI Autonomy Controls

## Title
Manager reviews and approves AI-proposed actions before they go live

## User story
As a manager, I want to see a queue of actions the AI wants to take and approve or reject each one so that nothing changes on my campaigns without my explicit sign-off when I want that level of control.

## Context & scope
AI Agent > Approval Queue page. Actions land here when permission level is set to "Require approval" (US-014). Each queued item shows: what the AI wants to do, which campaign, the data that triggered it, and the AI's reasoning. Approving executes the action via the platform API. Rejecting logs the rejection with an optional note and removes it from the queue. Items expire after 48 hours if not acted on.

## Acceptance criteria
- **AC1:** Given the AI proposes an action and the permission level is "Require approval", when the proposal is generated, then a queue item is created and the manager receives an in-app notification.
- **AC2:** Given I open the Approval Queue, when the page loads, then I see all pending items with: action description, campaign name, platform, AI reasoning, triggered-by data, and time queued.
- **AC3:** Given I click Approve on a queue item, when confirmed, then the action is executed via the platform API, a change log entry is created (actorType: ai), and the queue item is marked as approved.
- **AC4:** Given I click Reject on a queue item, when I optionally add a note and confirm, then no platform API call is made, the queue item is marked as rejected, and the rejection is logged.
- **AC5:** Given a queue item has been pending for 48 hours, when it expires, then it is marked as expired, no action is taken, and a notification is sent to the manager.
- **AC6:** Given the kill switch is active (US-014), when the queue page loads, then all Approve buttons are disabled and a banner explains why.

## Data model
```json
{
  "aiApprovalQueueItem": {
    "id": "uuid",
    "workspaceId": "uuid",
    "actionType": "string",
    "platform": "string",
    "campaignId": "string",
    "proposedField": "string",
    "proposedOldValue": "string",
    "proposedNewValue": "string",
    "aiReason": "string",
    "aiTriggeredBy": "string",
    "status": "pending | approved | rejected | expired",
    "createdAt": "timestamp",
    "expiresAt": "timestamp",
    "resolvedAt": "timestamp (nullable)",
    "resolvedByUserId": "uuid (nullable)",
    "rejectionNote": "string (nullable)"
  }
}
```

## Dependencies
US-013 — AI action log (approval resolution creates a log entry).
US-014 — permission level settings determine when items enter this queue.
US-010 — platform write-back pattern used when approving.

## Out of scope
Bulk approve/reject all. Delegation of approval to another user. Slack approval workflow.

## Priority · Status
High · Future
