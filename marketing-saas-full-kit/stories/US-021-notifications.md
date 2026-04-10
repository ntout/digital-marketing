# US-021 — In-app notification centre & email notifications

## Epic
Platform Infrastructure

## Title
In-app notification centre & email notifications

## User story
As a user, I want to receive notifications for important system events so that I know when action is required without constantly polling the app.

## Context & scope
A notification bell icon in the top nav shows unread count. Clicking it opens a dropdown of recent notifications. Certain high-priority events also send an email to affected users. This story defines the canonical `notification` table and `NotificationService` that all other stories call — it does not add notification triggers to those stories (those are added as part of US-008, US-015, etc. when they are implemented).

## Acceptance criteria
- **AC1:** A notification bell icon in the top nav displays a badge with the unread notification count. Clicking it opens a dropdown showing the 20 most recent notifications.
- **AC2:** The following system events create a notification: platform reconnect required (US-003), anomaly alert triggered (US-008), AI approval queue item created (US-015), AI kill switch activated (US-014), scheduled report delivered (US-009), background sync failed after 3 retries (US-004).
- **AC3:** Each notification displays: icon (by type), title, message, relative timestamp, and a link if applicable. Unread notifications are visually distinct.
- **AC4:** Clicking a notification marks it as read and navigates to the linked page (if a link exists). A "Mark all as read" button clears all unread badges at once.
- **AC5:** Notifications older than 90 days are automatically purged by a nightly cleanup job.
- **AC6:** For `approval_required` and `reconnect_required` event types, an email notification is also sent to all workspace members with `admin` or `owner` role.

## Data model
```ts
// notification (see CONTEXT.md for canonical field list)
id: string (uuid)
workspaceId: string
userId: string
type: 'reconnect_required' | 'anomaly_alert' | 'approval_required' | 'kill_switch' | 'report_ready' | 'sync_failed'
title: string
message: string
link: string | null
read: boolean
createdAt: Date
```

`NotificationService.create(workspaceId, userIds[], type, title, message, link?)` is the single function all other services call to create notifications. It never raises an exception that would interrupt the caller — notification failures are logged and swallowed.

## File structure
```
packages/db/prisma/schema.prisma              (add Notification model)
packages/utils/src/NotificationService.ts
apps/web/src/app/api/v1/notifications/route.ts
apps/web/src/app/api/v1/notifications/[id]/read/route.ts
apps/web/src/app/api/v1/notifications/read-all/route.ts
apps/web/src/components/ui/NotificationBell.tsx
apps/worker/src/jobs/notification-cleanup.job.ts
apps/web/src/__tests__/notifications.test.ts
```

## Dependencies
US-001 — auth (userId).

This story establishes the shared notification infrastructure in Phase 3. Event producers from US-004, US-008, US-014, and US-015 integrate with this service when those stories are implemented.

## Out of scope
Push notifications (browser/mobile). SMS. Slack or webhook integrations. Real-time WebSocket delivery (polling is acceptable for MVP).

## Priority · Status
Medium · Phase 3 foundation
