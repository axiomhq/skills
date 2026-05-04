---
name: monitors
description: Create and manage Axiom monitors via the v2 public API. Use when building alerting monitors, inspecting monitor state/history, or updating monitor thresholds and routing.
---

# Monitors

You create and manage Axiom monitors for alerting. All operations use the Axiom v2 public API.

## API Overview

Base URL: `https://api.axiom.co/v2/` with Bearer token auth from `.axiom.toml` (project root or `~/.axiom.toml`).

### Monitors (`/v2/monitors`)

| Operation | Method | Path |
|-----------|--------|------|
| List | GET | `/v2/monitors` |
| Get | GET | `/v2/monitors/{id}` |
| History | GET | `/v2/monitors/{id}/history` |
| Create | POST | `/v2/monitors` |
| Update | PUT | `/v2/monitors/{id}` |
| Delete | DELETE | `/v2/monitors/{id}` |

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
- `scripts/monitor-list <deployment> [--json]` - List all monitors
- `scripts/monitor-get <deployment> <id>` - Fetch monitor JSON
- `scripts/monitor-history <deployment> <id> <startTime> <endTime>` - Fetch monitor run history for a time range (ISO 8601 UTC)
- `scripts/monitor-create <deployment> <json-file>` - Create monitor from JSON
- `scripts/monitor-update <deployment> <id> <json-file>` - Update monitor from JSON
- `scripts/monitor-delete <deployment> <id>` - Delete monitor (with confirmation)

## Monitor Types

- `Threshold`
- `MatchEvent`
- `AnomalyDetection`

## Setup

Run:

```bash
scripts/setup
```

## Workflow: Creating a Monitor

1. Build monitor JSON from scratch or a template.
2. Set monitor query, thresholding, schedule, and notifier IDs.
3. Deploy with:

```bash
scripts/monitor-create prod ./my-monitor.json
```

4. Validate monitor behavior with:

```bash
scripts/monitor-history prod <monitor-id> 2026-05-03T00:00:00Z 2026-05-04T00:00:00Z
```

## Monitor JSON Structure (Threshold)

```json
{
  "name": "High Error Rate",
  "type": "Threshold",
  "description": "Alerts when error rate exceeds threshold",
  "aplQuery": "['logs'] | where status >= 500 | summarize count()",
  "operator": "Above",
  "threshold": 100,
  "rangeMinutes": 5,
  "intervalMinutes": 5,
  "alertOnNoData": false,
  "notifierIds": ["notifier-id-here"],
  "disabled": false,
  "triggerAfterNPositiveResults": 2,
  "triggerFromNRuns": 3
}
```

Key fields:
- `type`: `Threshold`, `MatchEvent`, or `AnomalyDetection`
- `operator`: `Above`, `Below`, `AboveOrEqual`, `BelowOrEqual`
- `rangeMinutes`: Query time window
- `intervalMinutes`: Evaluation frequency
- `triggerAfterNPositiveResults` / `triggerFromNRuns`: N-of-M triggering behavior

## Best Practices

- Prefer `triggerAfterNPositiveResults` + `triggerFromNRuns` (for example 2 of 3) to reduce noise from short spikes.
- Keep `rangeMinutes` aligned with your signal volatility, then set `intervalMinutes` to a reasonable cadence; both must be at least 1.
- Start with `alertOnNoData: false` unless missing data is itself an incident condition.
- Use `monitor-history` after create/update to validate expected firing behavior over a known window.
- Ensure your API token has dataset query permission; otherwise monitor lists can appear empty.
