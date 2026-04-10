# US-011 — In-app ad copy editing

## Epic
Campaign Management

## Title
Marketer edits ad copy and previews ads before pushing live

## User story
As a marketer, I want to edit ad headlines, descriptions, and CTAs directly in the app and preview how the ad will render before pushing changes live so that I catch mistakes before they reach the audience.

## Context & scope
Campaign > Ad Set > Ads panel. Ad copy fields vary by platform (Meta has headline + primary text + description; Google has up to 15 headlines + 4 descriptions; TikTok has caption + CTA). The preview renders a platform-accurate mockup of the ad using the edited copy. Character limits are enforced per field per platform.

## Acceptance criteria
- **AC1:** Given I open an ad and click Edit Copy, when the editor opens, then I see each copy field (headline, description, CTA) with current values and character count indicators.
- **AC2:** Given I type in a field that exceeds the platform's character limit, when the limit is reached, then further input is blocked and the count turns red.
- **AC3:** Given I have edited copy fields, when I click Preview, then a platform-accurate ad mockup renders showing exactly how the ad will appear to users.
- **AC4:** Given I click Confirm in the preview, when submitted, then the changes are pushed to the platform API and a change log entry is created (same schema as US-010).
- **AC5:** Given the API accepts the changes, when confirmed, then the updated copy is reflected in the app's local record without waiting for the next sync.
- **AC6:** Given I want to discard changes, when I click Cancel, then the original copy is restored and no API call is made.

## Data model
No new tables beyond `campaignChangeLog` from US-010. Ad copy stored in:
```json
{
  "adCreative": {
    "id": "uuid",
    "workspaceId": "uuid",
    "platform": "string",
    "adId": "string",
    "adSetId": "string",
    "campaignId": "string",
    "fields": {
      "headline": "string",
      "description": "string",
      "cta": "string",
      "primaryText": "string (Meta only)"
    },
    "lastSyncedAt": "timestamp",
    "locallyModified": "boolean"
  }
}
```

## Dependencies
US-010 — change log schema and platform write-back pattern established here.

## Out of scope
Image/video creative uploads or replacement. AI-generated copy suggestions (US-016). A/B test creation via the app.

## Priority · Status
Medium · Future
