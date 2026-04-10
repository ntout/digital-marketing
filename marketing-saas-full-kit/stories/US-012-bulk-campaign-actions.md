# US-012 — Bulk campaign actions

## Epic
Campaign Management

## Title
Manager pauses, resumes, or adjusts budgets across multiple campaigns at once

## User story
As a manager, I want to select multiple campaigns across platforms and apply a bulk action (pause, resume, or budget change) so that I can react to performance changes at scale without editing each campaign one by one.

## Context & scope
Campaigns page table (US-007). Multi-select via checkboxes. Bulk actions available: Pause selected, Resume selected, Increase budget by % or fixed amount, Decrease budget by % or fixed amount. Each action goes through the same preview + confirm pattern as US-010. Mixed-platform selections are supported — the app fans out to each platform's API in parallel.

## Acceptance criteria
- **AC1:** Given I am on the Campaigns page, when I check one or more campaign rows, then a bulk action toolbar appears at the bottom of the screen showing available actions.
- **AC2:** Given I select "Pause" from bulk actions, when I click Apply, then a confirmation modal shows a list of all selected campaigns and their current status before I confirm.
- **AC3:** Given I confirm the bulk action, when submitted, then the app calls each platform's API in parallel and shows a results summary (X succeeded, Y failed).
- **AC4:** Given one platform API call fails in a bulk action, when the error occurs, then only that campaign shows as failed — others that succeeded are not rolled back.
- **AC5:** Given a bulk budget increase is applied, when confirmed, then each affected campaign's budget is updated by the specified amount/percentage and change log entries are created for each.
- **AC6:** Given I am a Viewer, when I view the Campaigns page, then checkboxes and the bulk action toolbar are not rendered.

## Data model
Uses `campaignChangeLog` from US-010. No new tables. API records each campaign change as a separate log entry with a shared `batchId` UUID to group them.

```json
{
  "bulkActionBatch": {
    "batchId": "uuid",
    "initiatedByUserId": "uuid",
    "actionType": "pause | resume | budget_increase | budget_decrease",
    "totalCampaigns": "integer",
    "succeeded": "integer",
    "failed": "integer",
    "createdAt": "timestamp"
  }
}
```

## Dependencies
US-010 — write-back pattern and change log.
US-007 — campaign table with selectable rows.

## Out of scope
Scheduling bulk actions for a future time. Bulk ad copy changes. Cross-workspace bulk actions.

## Priority · Status
Medium · Future
