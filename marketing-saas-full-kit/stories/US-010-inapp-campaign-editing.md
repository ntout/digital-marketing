# US-010 — In-app campaign editing (write-back to platforms)

## Epic
Campaign Management

## Title
Manager edits campaign settings directly within the app

## User story
As a manager, I want to edit campaign budgets, status, and ad copy directly in the app and have those changes pushed to the originating platform so that I never need to leave the app to make adjustments.

## Context & scope
Campaigns > [Campaign Name] > Edit panel. This requires write-scope OAuth permissions in addition to the read scopes from US-003 — platforms must be reconnected if write scope was not originally granted. Editable fields per platform: daily budget, lifetime budget, campaign status (active/paused), ad set status. Ad copy editing is a separate story (US-011). All changes go through a preview + confirm step before being pushed.

## Acceptance criteria
- **AC1:** Given I open a campaign and click Edit, when the edit panel opens, then I see current values for: daily budget, lifetime budget (if applicable), and campaign status.
- **AC2:** Given I change a budget value and click Preview, when the preview modal opens, then I see a before/after comparison of each changed field.
- **AC3:** Given I click Confirm in the preview modal, when the change is submitted, then the app calls the platform API with the updated values and shows a success or error toast.
- **AC4:** Given the platform API call succeeds, when confirmed, then a change log entry is created recording: user, timestamp, field changed, old value, new value, platform, campaign ID.
- **AC5:** Given the platform API call fails, when the error is returned, then the original values are preserved, the error message is shown, and no change log entry is created.
- **AC6:** Given I am a Viewer or Marketer, when I open a campaign, then the Edit button is not visible.

## Data model
```json
{
  "campaignChangeLog": {
    "id": "uuid",
    "workspaceId": "uuid",
    "campaignId": "string",
    "platform": "string",
    "changedByUserId": "uuid (nullable — null = AI agent)",
    "changedByAI": "boolean",
    "timestamp": "timestamp",
    "field": "string (e.g. daily_budget, status)",
    "oldValue": "string",
    "newValue": "string",
    "platformApiStatus": "success | failed",
    "platformApiError": "string (nullable)"
  }
}
```

## Dependencies
US-003 — platform connections (with write scope).
US-007 — campaign list to navigate from.

## Out of scope
Bulk multi-campaign edits (US-012). Ad copy / creative editing (US-011). Creating new campaigns.

## Priority · Status
High · Future
