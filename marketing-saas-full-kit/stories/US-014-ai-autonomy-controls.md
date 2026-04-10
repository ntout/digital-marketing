# US-014 — AI autonomy controls & permission levels

## Epic
AI Autonomy Controls

## Title
Manager configures what the AI agent is and is not allowed to do autonomously

## User story
As a manager, I want to set a permission level for each AI action type — suggest only, require my approval, or fully autonomous — and define hard limits on what the agent can change so that I stay in control of how much the agent can act without my input.

## Context & scope
Settings > AI Agent page. Permission levels and hard limits are stored per workspace. Only Admin and Owner roles can modify these settings. These settings are read by all AI agent jobs (US-015 through US-019) before taking any action. This story must be implemented before any AI autonomous actions are built.

## Acceptance criteria
- **AC1:** Given I am an Admin and navigate to Settings > AI Agent, when the page loads, then I see a list of all AI action types, each with a permission level dropdown defaulting to "Suggest only".
- **AC2:** Given I change a permission level and click Save, when saved, then the new setting is persisted and the AI agent reads it on its next cycle.
- **AC3:** Given I set hard limits (max daily budget the AI can set, max % budget change per cycle), when the AI evaluates an action, then it never proposes or executes a change that would violate a hard limit even in autonomous mode.
- **AC4:** Given I set quiet hours (e.g., 10 PM – 7 AM in my timezone), when the AI's action cycle falls within quiet hours, then no autonomous actions are executed and no approval requests are sent until after quiet hours end.
- **AC5:** Given I am not an Admin or Owner, when I navigate to Settings > AI Agent, then I can view the current settings but all inputs are disabled.
- **AC6:** Given I click the master kill switch "Disable all AI actions", when confirmed, then all AI autonomous and approval-queue actions are immediately halted across the workspace and the kill switch shows as active with a timestamp.

## Data model
```json
{
  "aiWorkspaceSettings": {
    "workspaceId": "uuid",
    "killSwitchActive": "boolean",
    "killSwitchActivatedAt": "timestamp (nullable)",
    "quietHoursEnabled": "boolean",
    "quietHoursStart": "HH:MM",
    "quietHoursEnd": "HH:MM",
    "quietHoursTimezone": "string (IANA tz)",
    "hardLimits": {
      "maxDailyBudgetUsd": "decimal",
      "maxBudgetChangePercent": "decimal",
      "allowedPlatforms": ["platform strings"]
    },
    "actionPermissions": {
      "budget_increase":       "suggest | approval | autonomous",
      "budget_decrease":       "suggest | approval | autonomous",
      "pause_campaign":        "suggest | approval | autonomous",
      "resume_campaign":       "suggest | approval | autonomous",
      "edit_copy":             "suggest | approval | autonomous",
      "adjust_targeting":      "suggest | approval | autonomous",
      "reallocate_budget":     "suggest | approval | autonomous"
    },
    "updatedAt": "timestamp",
    "updatedByUserId": "uuid"
  }
}
```

## Dependencies
US-001, US-002 — workspace and role system.
US-013 — AI action log must exist before autonomous actions run.

## Out of scope
Per-campaign permission overrides. Per-user AI settings. AI budget for creating new campaigns.

## Priority · Status
High · Future (must be built before US-015+)
