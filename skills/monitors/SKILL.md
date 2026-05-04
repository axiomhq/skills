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
  "resolvable": true,
  "notifyByGroup": false,
  "secondDelay": 300,
  "disabledUntil": null,
  "disabled": false,
  "triggerAfterNPositiveResults": 2,
  "triggerFromNRuns": 3
}
```

Key fields:
- `type`: `Threshold`, `MatchEvent`, or `AnomalyDetection`
- `operator`: `Above`, `Below`, `AboveOrEqual`, `BelowOrEqual`, `AboveOrBelow`
- `rangeMinutes`: Query time window
- `intervalMinutes`: Evaluation frequency
- `notifierIds`: Notifier IDs to notify (public API field name)
- `resolvable`: Whether alerts can be resolved
- `notifyByGroup`: Whether to notify per group result
- `secondDelay`: Delay in seconds to tolerate late-arriving data
- `disabledUntil`: Timestamp for temporary disable/snooze
- `notifyEveryRun`: Whether to notify on every positive evaluation
- `skipResolved`: Whether to skip sending resolved notifications
- `triggerAfterNPositiveResults` / `triggerFromNRuns`: N-of-M triggering behavior

## Other Monitor Payload Variants

`MatchEvent` monitors trigger on matching events and use event-style conditions.

```json
{
  "name": "Prod Error Event Match",
  "type": "MatchEvent",
  "description": "Alert when matching error events are seen",
  "aplQuery": "['logs'] | where service == 'api' and level == 'error'",
  "operator": "",
  "triggerAfterNPositiveResults": 0,
  "triggerFromNRuns": 1,
  "rangeMinutes": 5,
  "intervalMinutes": 5,
  "notifierIds": ["notifier-id-here"],
  "disabled": false
}
```

Notes for `MatchEvent`:
- Some deployments return `operator` as an empty string and may use zero/one-style trigger defaults for event-match behavior.
- Validate effective persisted values with `scripts/monitor-get` after create/update.

`AnomalyDetection` monitors use additional anomaly fields such as `columnName`, `compareDays`, and `tolerance`.

```json
{
  "name": "CPU Usage Anomaly",
  "type": "AnomalyDetection",
  "description": "Alert when cpu_usage deviates from baseline",
  "aplQuery": "['metrics'] | summarize avg(cpu_usage)",
  "columnName": "cpu_usage",
  "compareDays": 7,
  "tolerance": 10,
  "operator": "AboveOrBelow",
  "rangeMinutes": 5,
  "intervalMinutes": 5,
  "notifierIds": ["notifier-id-here"],
  "disabled": false
}
```

## Best Practices

- Prefer `triggerAfterNPositiveResults` + `triggerFromNRuns` (for example 2 of 3) to reduce noise from short spikes.
- Keep `rangeMinutes` aligned with your signal volatility, then set `intervalMinutes` to a reasonable cadence; both must be at least 1.
- Start with `alertOnNoData: false` unless missing data is itself an incident condition.
- Use `monitor-history` after create/update to validate expected firing behavior over a known window.
- Ensure your API token has dataset query permission; otherwise monitor lists can appear empty.
- Use explicit `bin()` in monitor APL; avoid `bin_auto()` for alert logic to prevent resolution drift between UI exploration and monitor execution.
- For metrics-backed monitors, prefer `mplQuery` for monitor definitions; API responses may include both `aplQuery` and `mplQuery`.
