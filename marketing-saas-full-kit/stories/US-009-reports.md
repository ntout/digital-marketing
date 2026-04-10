# US-009 — Report generation & scheduled delivery

## Epic
Reporting & Sharing

## Title
Manager generates and schedules performance reports

## User story
As a marketing manager, I want to generate a formatted PDF report and optionally schedule it to be emailed to my team weekly so that stakeholders stay informed without me assembling data manually.

## Context & scope
Reports > Generate page. Reports are built from current dashboard/filter state. PDF output includes: cover page with workspace name and date range, KPI summary cards, trend charts (as images), campaign table. Scheduling: daily, weekly (pick day), or monthly (pick date). Recipients are entered as email addresses (not required to be workspace members).

## Acceptance criteria
- **AC1:** Given I am on the Reports page, when I click "Generate Report", then a PDF is created server-side and a download begins within 30 seconds.
- **AC2:** Given the PDF is generated, when I open it, then it contains: date range, KPI totals, a spend trend chart, and a campaign performance table matching my current filter state.
- **AC3:** Given I set up a scheduled report, when I select frequency, day/time, and recipient emails and click Save, then a schedule record is created and I see it listed under "Scheduled Reports".
- **AC4:** Given a scheduled report is active, when the scheduled time arrives, then the report is generated for the prior period and emailed to all recipients.
- **AC5:** Given I want to stop a scheduled report, when I click Pause or Delete, then no further emails are sent.
- **AC6:** Given report generation fails, when the error occurs, then I receive an in-app notification and the report is not sent to recipients.

## Data model
```json
{
  "reportSchedule": {
    "id": "uuid",
    "workspaceId": "uuid",
    "createdByUserId": "uuid",
    "frequency": "daily | weekly | monthly",
    "dayOfWeek": "0-6 (nullable, for weekly)",
    "dayOfMonth": "1-31 (nullable, for monthly)",
    "timeUtc": "HH:MM",
    "recipients": ["email strings"],
    "filterState": "json (date range, platforms, etc.)",
    "status": "active | paused",
    "lastSentAt": "timestamp (nullable)"
  }
}
```

## Dependencies
US-005, US-006, US-007 — dashboard data and charts must exist to populate the report.

## Out of scope
Custom report builder with drag-and-drop sections. White-labeling. Slack delivery.

## Priority · Status
Medium · Now
