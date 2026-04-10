# US-003 — Connect marketing platforms via OAuth

## Epic
Platform Connections

## Title
User connects their marketing platform accounts

## User story
As a marketer, I want to connect my Google Ads, Meta, TikTok, and LinkedIn accounts via OAuth so that the app can pull data from all my platforms without me sharing passwords.

## Context & scope
Settings > Connections page. Each platform uses its own OAuth 2.0 flow. After authorization, access tokens and refresh tokens are stored encrypted at rest. The connection record stores which platform account/ad account is linked. Supported platforms at launch: Google Ads, Meta (Facebook/Instagram), TikTok Ads, LinkedIn Ads, Google Analytics 4.

## Acceptance criteria
- **AC1:** Given I am on the Connections page, when I click "Connect" for a platform, then I am redirected to that platform's OAuth consent screen with the correct scopes requested.
- **AC2:** Given I approve the OAuth consent, when the callback is received, then an access token and refresh token are stored encrypted in the database linked to my workspace.
- **AC3:** Given a connection exists, when the access token is within 5 minutes of expiry, then the system automatically refreshes it using the stored refresh token.
- **AC4:** Given the refresh token is invalid or revoked, when a refresh attempt fails, then the connection status is set to "Reconnect required" and the workspace admin is notified.
- **AC5:** Given I am on the Connections page, when I view my connected accounts, then I see each platform's name, connected account name, status (Active / Reconnect required), and a Disconnect button.
- **AC6:** Given I click Disconnect, when confirmed, then the tokens are deleted and no further data is fetched from that platform.

## Data model
```json
{
  "platformConnection": {
    "id": "uuid",
    "workspaceId": "uuid",
    "platform": "google_ads | meta | tiktok | linkedin | google_analytics",
    "accountId": "string (platform's account/ad account ID)",
    "accountName": "string",
    "accessToken": "string (encrypted)",
    "refreshToken": "string (encrypted)",
    "tokenExpiresAt": "timestamp",
    "status": "active | reconnect_required | disconnected",
    "connectedAt": "timestamp",
    "connectedByUserId": "uuid"
  }
}
```

## Dependencies
US-001 — workspace must exist.
US-002 — only Admin/Manager can connect platforms.

## Out of scope
Shopify, Snapchat, Pinterest integrations (future). Custom API key connections.

## Priority · Status
High · Now
