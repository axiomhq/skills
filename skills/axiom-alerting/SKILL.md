---
name: axiom-alerting
description: Create and manage Axiom monitors and notifiers via the v2 public API. Use when building alerting, routing notifications, validating monitor behavior, and maintaining alert configurations end-to-end.
---

# Axiom Alerting

You manage alerting in Axiom end-to-end: notifiers for routing and monitors for detection.

Use the connected Axiom MCP tools for the selected organization and deployment. The scripts below support use without MCP.

## API Overview

The scripts use the `url`, `org_id`, and bearer token from the selected deployment in `~/.axiom.toml`. API requests use `<url>/v2/`.

### Monitors (`/v2/monitors`)

| Operation | Method | Path |
|-----------|--------|------|
| List | GET | `/v2/monitors` |
| Get | GET | `/v2/monitors/{id}` |
| History | GET | `/v2/monitors/{id}/history` |
| Create | POST | `/v2/monitors` |
| Update | PUT | `/v2/monitors/{id}` |
| Delete | DELETE | `/v2/monitors/{id}` |

### Notifiers (`/v2/notifiers`)

| Operation | Method | Path |
|-----------|--------|------|
| List | GET | `/v2/notifiers` |
| Get | GET | `/v2/notifiers/{id}` |
| Create | POST | `/v2/notifiers` |
| Update | PUT | `/v2/notifiers/{id}` |
| Delete | DELETE | `/v2/notifiers/{id}` |

## Script Prerequisites

1. Run `scripts/setup`
2. Ensure `.axiom.toml` has a deployment:

```toml
[deployments.prod]
url = "https://api.axiom.co"
token = "xaat-your-token"
org_id = "your-org-id"
```

## Scripts

Core:
- `scripts/axiom-api <deploy> <method> <path> [body]`

Monitor scripts:
- `scripts/monitor-list <deployment> [--json]`
- `scripts/monitor-get <deployment> <id>`
- `scripts/monitor-history <deployment> <id> <startTime> <endTime>`
- `scripts/monitor-create <deployment> <json-file>`
- `scripts/monitor-update <deployment> <id> <json-file>`
- `scripts/monitor-delete <deployment> <id>`

Notifier scripts:
- `scripts/notifier-list <deployment> [--json]`
- `scripts/notifier-get <deployment> <id>`
- `scripts/notifier-create <deployment> <json-file>`
- `scripts/notifier-update <deployment> <id> <json-file>`
- `scripts/notifier-delete <deployment> <id>`

## Recommended Workflow

1. Reuse a saved notifier when possible.
2. Create monitor and set `notifierIds`.
3. Validate monitor behavior with `getMonitorHistory`.
4. Iterate monitor thresholds and schedule.

## Workflow: End-To-End Alerting

1. Use `listNotifiers` and reuse a suitable saved notifier.
2. If none is suitable, use `createNotifier`:
   - For email, supply the JSON format shown below.
   - For other channels, explain that the user must complete setup in the Console. Supply the name and an empty channel config, such as `"properties": {"slack": {}}`. The tool opens the Console or returns a link. The user enters credentials there. Wait for confirmation that they saved the notifier, then use `listNotifiers` to get its ID.
3. Use `createMonitor` or `updateMonitor` with the selected `notifierIds`.
4. Check the settings with `getMonitor` and behavior with `getMonitorHistory` over an explicit time range.
5. If behavior is noisy or silent, tune `threshold`, `rangeMinutes`, `intervalMinutes`, and N-of-M trigger fields. For `MatchEvent` and `NewValues` monitors, tune the query instead: they have no threshold or trigger fields.
6. Re-check history after each change.

Without MCP, run `scripts/setup` and use the corresponding scripts above. Set up non-email channels under **Notifiers → New notifier** in the user's Console.

## Best Practices

- Configure one channel per notifier.
- Use `emails` (not `recipients`) for email notifier payloads.
- Prefer `triggerAfterNPositiveResults`/`triggerFromNRuns` for noisy signals.
- Use explicit `bin()` in monitor queries; avoid `bin_auto()` for alert logic.
- For metrics-backed monitors, prefer `mplQuery` for definitions; API responses may include both `aplQuery` and `mplQuery`.

## Monitor Types And Operators

Choose the type by what should alert:

- `Threshold`: an aggregated value crosses a fixed number. Good for error counts, latency percentiles, and queue depth.
- `MatchEvent`: every event that matches a filter. Good for events that each need attention, such as a failed deploy, a panic, or a change to a production secret.
- `NewValues`: a column of the query results holds a value it has not held recently. Good for first appearances. Without an aggregation, any first sighting: a new error message, host, or AWS API call. With an aggregation, a new value that passes a bar: a new API client that sends at least 200 requests in an hour.
- `AnomalyDetection`: a time series moves away from its own recent behavior. Good for values with no obvious fixed limit, such as traffic or ingest volume that suddenly drops or spikes.

Query rules:

- `Threshold`: an APL query must aggregate (`summarize`). `mplQuery` is supported.
- `MatchEvent`: APL only. The query cannot aggregate, and it can use only `where`, `project` (and `project-away`, `project-keep`, `project-rename`, `project-reorder`), `extend`, `extend-valid`, `parse`, `parse-kv`, `union`, `lookup`, and `redact`.
- `NewValues`: APL only. The query can filter, project, and aggregate.
- `AnomalyDetection`: the query must return a time series (`summarize ... by bin(_time, ...)`) with at least 11 points per group. `mplQuery` is supported.

Operators:

- `Threshold`: `Above`, `AboveOrEqual`, `Below`, or `BelowOrEqual`.
- `AnomalyDetection`: `Above`, `Below`, or `AboveOrBelow`.
- `MatchEvent` and `NewValues`: none. Do not set `operator` on a `NewValues` monitor.

Alerting:

- `Threshold` and `AnomalyDetection` open an alert on a breach and close it on the first run without one. Notifiers hear about both.
- `MatchEvent` and `NewValues` have no alert to open or close. Each matching event or new value sends its own notification, at most 9 per run, and nothing is sent when it stops appearing.

## Monitor Field Reference

Core fields:
- `name`: Human-readable monitor name.
- `type`: `Threshold`, `MatchEvent`, `NewValues`, or `AnomalyDetection`.
- `aplQuery` / `mplQuery`: Query evaluated by the monitor.
- `notifierIds`: Array of notifier IDs to notify.
- `disabled`: Whether monitor is disabled.
- `disabledUntil`: Optional timestamp for temporary disable/snooze.
- `description`: Optional monitor description.

Schedule fields:
- `intervalMinutes`: Evaluation cadence in minutes.
- `rangeMinutes`: Query evaluation window in minutes. `MatchEvent` monitors always run every minute over the last minute: send 1 for both fields, because other values are ignored. On a `NewValues` monitor, `rangeMinutes` cannot be less than `intervalMinutes`.
- `secondDelay`: Seconds to move the whole window into the past, so that late-arriving data is included.

Threshold and anomaly fields (`Threshold` and `AnomalyDetection` only):
- `operator`: Comparison operator.
- `threshold`: Numeric threshold value (`Threshold`).
- `tolerance`: Required for `AnomalyDetection`. The last point breaches when it is more than this many standard deviations from the mean of the earlier points. Above 0, usually 2 to 5; lower values alert more often.
- `compareDays`: Optional for `AnomalyDetection`. First subtracts, point by point, the same window this many days earlier.
- `alertOnNoData`: Whether no-data should trigger alerting.
- `triggerAfterNPositiveResults`: Positive evaluations required before firing.
- `triggerFromNRuns`: Total evaluation runs considered for N-of-M logic.

Advanced behavior fields:
- `resolvable`: Whether alerts can resolve automatically.
- `notifyByGroup`: Notify per group key/value result.
- `notifyEveryRun`: Notify on every positive evaluation.
- `skipResolved`: Skip sending resolved notifications.

New values fields (`NewValues` only):
- `trackedValue`: Required. The name of the column of the query results to watch. It cannot be the result of an aggregation, such as `count()`.
- `lookbackDays`: Required, at least 1. A value is new when the column has not held it for this many days.
- `backfillDays`: Optional, 0 to `lookbackDays`. Records the values the query returns over this many previous days as already seen before the first run. With 0, the first run that returns values records them and does not alert. Use 0 when the query aggregates: the backfill runs the query once over the whole period, not once per `rangeMinutes`, so a bar such as `where requests >= 200` is applied to totals for the whole period.
- Changing `aplQuery`, `trackedValue`, `intervalMinutes`, `rangeMinutes`, or `secondDelay` on an existing monitor clears the values it has recorded, and it learns again. Changes to `lookbackDays` keep them.
- Limits: fewer than 50,000 distinct values in the column within `lookbackDays`, and at most 1,000 new values in one run. A monitor that exceeds a limit fails its runs.

## Minimal Valid Monitor Examples

Threshold:

```json
{
  "name": "High Error Count",
  "type": "Threshold",
  "aplQuery": "['logs'] | where status >= 500 | summarize count()",
  "operator": "Above",
  "threshold": 100,
  "rangeMinutes": 5,
  "intervalMinutes": 5,
  "notifierIds": ["notifier-id"],
  "triggerAfterNPositiveResults": 2,
  "triggerFromNRuns": 3,
  "disabled": false
}
```

MatchEvent:

```json
{
  "name": "Error Event Match",
  "type": "MatchEvent",
  "aplQuery": "['logs'] | where level == 'error'",
  "rangeMinutes": 1,
  "intervalMinutes": 1,
  "notifierIds": ["notifier-id"],
  "disabled": false
}
```

NewValues, any first sighting:

```json
{
  "name": "New Error Message",
  "type": "NewValues",
  "aplQuery": "['logs'] | where level == 'error' | project message",
  "trackedValue": "message",
  "lookbackDays": 30,
  "backfillDays": 7,
  "rangeMinutes": 5,
  "intervalMinutes": 5,
  "notifierIds": ["notifier-id"],
  "disabled": false
}
```

NewValues with an aggregation, a new value that passes a bar. This one checks the last hour every 5 minutes:

```json
{
  "name": "New API Client",
  "type": "NewValues",
  "aplQuery": "['http-logs'] | summarize requests = count() by client | where requests >= 200",
  "trackedValue": "client",
  "lookbackDays": 90,
  "backfillDays": 0,
  "rangeMinutes": 60,
  "intervalMinutes": 5,
  "notifierIds": ["notifier-id"],
  "disabled": false
}
```

AnomalyDetection:

```json
{
  "name": "Request Volume Anomaly",
  "type": "AnomalyDetection",
  "aplQuery": "['http-logs'] | summarize count() by bin(_time, 5m)",
  "operator": "AboveOrBelow",
  "tolerance": 3,
  "rangeMinutes": 120,
  "intervalMinutes": 5,
  "notifierIds": ["notifier-id"],
  "disabled": false
}
```

## Email Notifier Example

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

## Troubleshooting

`401 Unauthorized`:
- Cause: invalid or expired token.
- Fix:
  - Verify token in `~/.axiom.toml`.
  - Re-run `scripts/setup` and retry:
    - `scripts/notifier-list <deployment>`

`403 Forbidden`:
- Cause: token lacks required permissions.
- Fix:
  - Create/assign token scopes for monitor/notifier management and dataset query access.
  - Retry:
    - `scripts/monitor-list <deployment>`

`404 Not Found` on get/update/delete:
- Cause: wrong monitor/notifier ID or wrong deployment/org.
- Fix:
  - Confirm deployment in `.axiom.toml`.
  - Re-list objects and use exact IDs:
    - `scripts/monitor-list <deployment> --json`
    - `scripts/notifier-list <deployment>`

`400 Bad Request` on email notifier create/update:
- Cause: invalid notifier payload shape.
- Fix:
  - Use one notifier channel inside `properties`.
  - For email, use `emails` (not `recipients`).
  - Check the email example above and retry the same operation.

`400 Bad Request` on monitor create/update:
- Cause: invalid monitor schema, operator/type mismatch, or invalid query fields.
- Fix:
  - Validate required fields: `name`, `type`, query field, schedule, and `notifierIds`.
  - Confirm `operator` matches monitor type and threshold logic.
  - `must set Tolerance`: an `AnomalyDetection` monitor needs `tolerance`.
  - `must set NewValuesLookbackDays`: a `NewValues` monitor needs `lookbackDays`.
  - `RangeMinutes must not be less than IntervalMinutes`: raise `rangeMinutes` on the `NewValues` monitor.
  - `cannot set [Operator Tolerance CompareDays]`: remove those fields from the `NewValues` monitor.
  - Retry:
    - `scripts/monitor-create <deployment> <json-file>`
    - `scripts/monitor-update <deployment> <id> <json-file>`

Monitor created but never alerts:
- Cause: threshold too strict, wrong query window, or not enough positive runs.
- Fix:
  - Inspect history over a known active period:
    - `scripts/monitor-history <deployment> <id> <startTime> <endTime>`
  - Reduce threshold or widen `rangeMinutes`.
  - Tune `triggerAfterNPositiveResults`/`triggerFromNRuns`.

Too many alerts (noisy monitor):
- Cause: threshold too low or interval too short.
- Fix:
  - Increase threshold.
  - Increase `triggerAfterNPositiveResults` and/or `triggerFromNRuns`.
  - Increase `intervalMinutes` or narrow match conditions.

`NewValues` monitor sends too many notifications or its runs fail:
- Cause: the watched column holds too many distinct values, such as messages that contain IDs, timestamps, or numbers.
- Fix:
  - Watch a column with fewer distinct values, or strip the variable parts in the query before `trackedValue` reads it.
  - Filter the query, or aggregate and keep only the values that pass a bar.
  - Shorten `lookbackDays` if the column holds 50,000 or more distinct values within it.

`NewValues` monitor misses a value:
- Cause: the event arrived after every run that covers its `_time`, or the monitor had already recorded the value within `lookbackDays`.
- Fix:
  - For late data, set `secondDelay`, or set `rangeMinutes` longer than `intervalMinutes`.
  - Remember that a value alerts once, then not again until `lookbackDays` pass without it.

Notifier exists but no delivery:
- Cause: destination config invalid (URL/key/channel/email list), or destination-side rejection.
- Fix:
  - For email, check the addresses and use `updateNotifier` to correct them.
  - For other channels, use `updateNotifier` with the saved ID and an empty channel config to open the Console. Without MCP, edit the notifier under **Notifiers** in the user's Console.
  - Confirm monitor references correct notifier IDs.
