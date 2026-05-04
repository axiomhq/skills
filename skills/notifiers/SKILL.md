---
name: notifiers
description: Create and manage Axiom notifiers via the v2 public API. Use when setting up alert routing destinations and maintaining notifier configurations.
---

# Notifiers

You create and manage Axiom notifiers for alert routing. All operations use the Axiom v2 public API.

## API Overview

Base URL: `https://api.axiom.co/v2/` with Bearer token auth from `.axiom.toml` (project root or `~/.axiom.toml`).

### Notifiers (`/v2/notifiers`)

| Operation | Method | Path |
|-----------|--------|------|
| List | GET | `/v2/notifiers` |
| Get | GET | `/v2/notifiers/{id}` |
| Create | POST | `/v2/notifiers` |
| Update | PUT | `/v2/notifiers/{id}` |
| Delete | DELETE | `/v2/notifiers/{id}` |

## Prerequisites

1. Run `scripts/setup`
2. Ensure `.axiom.toml` has a deployment:

```toml
[deployments.prod]
url = "https://api.axiom.co"
token = "xaat-your-token"
org_id = "your-org-id"
```

## Scripts

All scripts live in `scripts/` and take `<deployment>` as the first argument.

- `scripts/axiom-api <deploy> <method> <path> [body]` - Low-level authenticated API wrapper
- `scripts/notifier-list <deployment> [--json]`
- `scripts/notifier-get <deployment> <id>`
- `scripts/notifier-create <deployment> <json-file>`
- `scripts/notifier-update <deployment> <id> <json-file>`
- `scripts/notifier-delete <deployment> <id>`

## Supported notifier types

- `slack`
- `email`
- `pagerduty`
- `opsgenie`
- `discord`
- `discordWebhook`
- `webhook`
- `customWebhook`
- `microsoftTeams`

Important API behavior:
- Configure only one channel per notifier in `properties`.

## Setup

Run:

```bash
scripts/setup
```

## Workflow: Setting Up Notifiers

1. Build notifier JSON from scratch or a template.
2. Deploy:

```bash
scripts/notifier-create prod ./my-notifier.json
```

3. Attach notifier IDs to monitor `notifierIds` in monitor JSON.

## Notifier JSON Examples

Slack:

```json
{
  "name": "Oncall Slack",
  "properties": {
    "slack": {
      "slackUrl": "https://hooks.slack.com/services/T.../B.../XXX"
    }
  }
}
```

Email:

```json
{
  "name": "Oncall Email",
  "properties": {
    "email": {
      "emails": ["oncall@example.com"]
    }
  }
}
```

PagerDuty:

```json
{
  "name": "Oncall PagerDuty",
  "properties": {
    "pagerduty": {
      "routingKey": "1234567890abcdef1234567890abcdef",
      "token": "u+1234567890abcdef1234567890abcdef"
    }
  }
}
```

OpsGenie:

```json
{
  "name": "Oncall OpsGenie",
  "properties": {
    "opsgenie": {
      "apiKey": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "isEU": true
    }
  }
}
```

Discord:

```json
{
  "name": "Oncall Discord",
  "properties": {
    "discord": {
      "discordChannel": "123456789012345678",
      "discordToken": "Bot 123456789012345678"
    }
  }
}
```

Discord Webhook:

```json
{
  "name": "Oncall Discord Webhook",
  "properties": {
    "discordWebhook": {
      "discordWebhookUrl": "https://discord.com/api/webhooks/123/abc"
    }
  }
}
```

Microsoft Teams:

```json
{
  "name": "Oncall Teams",
  "properties": {
    "microsoftTeams": {
      "microsoftTeamsUrl": "https://outlook.office.com/webhook/..."
    }
  }
}
```

Webhook:

```json
{
  "name": "Oncall Webhook",
  "properties": {
    "webhook": {
      "url": "https://api.example.com/webhooks/alerts"
    }
  }
}
```

Custom Webhook:

```json
{
  "name": "Oncall Custom Webhook",
  "properties": {
    "customWebhook": {
      "url": "https://api.example.com/alerts",
      "body": "{\"action\":\"{{.Action}}\",\"monitorID\":\"{{.MonitorID}}\",\"title\":\"{{.Title}}\",\"description\":\"{{.Description}}\",\"value\":{{.Value}},\"groupKeys\":{{jsonArray .GroupKeys}},\"groupValues\":{{jsonArray .GroupValues}}}",
      "headers": {
        "Content-Type": "application/json"
      },
      "secretHeaders": {
        "Authorization": "Bearer {{token}}"
      }
    }
  }
}
```

Custom webhook template variables commonly used:
- `.Action`
- `.MonitorID`
- `.Body`
- `.Description`
- `.QueryStartTime`
- `.QueryEndTime`
- `.Timestamp`
- `.Title`
- `.Value`
- `.MatchedEvent`
- `.GroupKeys`
- `.GroupValues`

## Best Practices

- Create separate notifiers per destination/team rather than reusing one notifier for unrelated services.
- Keep secrets in secure headers/fields only (for example `customWebhook.secretHeaders`), not in plain-text payloads.
- Test notifier payload shape and endpoint acceptance before attaching notifier IDs to production monitors.
- Prefer temporary disable/enable in the Axiom UI instead of deleting notifiers that are still referenced by monitors.
