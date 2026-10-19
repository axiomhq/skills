# Chart Configuration — Advanced Options

`scripts/chart-add` covers the common fields per chart kind (id, name, query, dataset, unit, sparkline, Note text). It also enforces the type-aware unit rules and never emits the deny-listed fields below — so when authoring through `chart-add` none of this reference is needed.

This file documents the options `chart-add` does **not** expose. Reach for it when you need to merge advanced fields with `jq` after `chart-add` emits the base chart, or when extending `chart-add` itself.

## TimeSeries — `query.queryOptions`

`chart-add` doesn't write `query.queryOptions`. Merge it in with `jq` for non-default rendering.

### `aggChartOpts` (per-series rendering)

JSON-encoded string keyed by query column. Per-series options:

| Option | Values | Effect |
|--------|--------|--------|
| `variant` | `line` (default), `area`, `bars` | Render mode |
| `scaleDistr` | `linear` (default), `log` | Y-axis scale |
| `displayNull` | `auto`, `null` (gaps), `span` (join), `zero` (fill) | Missing-data handling |

**Deriving the column key** — `aggChartOpts` is keyed by a JSON-stringified column descriptor:

| Query pattern | Key |
|---|---|
| `summarize count()` | `{"alias":"count_","op":"count"}` |
| `summarize sum(field)` | `{"alias":"sum_field","op":"sum"}` |
| `summarize ['Name'] = sum(field) / 1000` | `{"alias":"Name","field":"field","op":"computed"}` |

Any expression on the right-hand side (math, `round()`, etc.) makes it `op:"computed"` with the source `field`. Wildcard `"*"` is unreliable — always use the specific key. The `field` value is the bare source name (no brackets, no `properties.` prefix).

Simple example:

```json
{
  "type": "TimeSeries",
  "query": {
    "apl": "['logs'] | summarize count() by bin_auto(_time)",
    "queryOptions": {
      "aggChartOpts": "{\"{\\\"alias\\\":\\\"count_\\\",\\\"op\\\":\\\"count\\\"}\":{\"variant\":\"bars\"}}"
    }
  }
}
```

### `timeSeriesView`

Set in `query.queryOptions.timeSeriesView`:

| Value | Effect |
|---|---|
| `charts` (default) | Chart only |
| `resultsTable` | Summary totals only |
| `charts\|resultsTable` | Chart + totals below |

## LogStream / Table — `tableSettings`

```json
{
  "type": "LogStream",
  "tableSettings": {
    "columns": [
      {"name": "_time", "width": 150},
      {"name": "message", "width": 400}
    ],
    "settings": {
      "fontSize": "12px",
      "highlightSeverity": true,
      "showRaw": true,
      "showEvent": true,
      "showTimestamp": true,
      "wrapLines": true,
      "hideNulls": true
    }
  }
}
```

| Field | Effect |
|---|---|
| `columns` | Column order and widths (`{name, width}` objects). |
| `fontSize` | CSS string (e.g. `"12px"`). |
| `highlightSeverity` | Color rows by log level. |
| `showRaw` / `showEvent` / `showTimestamp` | Toggle built-in columns. |
| `wrapLines` | Wrap long lines. |
| `hideNulls` | Hide null cells. |

## Statistic — extra cosmetic options

`chart-add` exposes `--unit` and `--show-chart`. The other Statistic fields:

| Field | Values | Effect |
|---|---|---|
| `colorScheme` | Blue, Orange, Red, Purple, Teal, Yellow, Green, Pink, Grey, Brown | Color theme. |
| `hideValue` | bool | Hide the main value (e.g. show only the sparkline). |
| `invertTheme` | bool | Invert colors. |
| `errorThreshold` / `warningThreshold` | `Above`, `AboveOrEqual`, `Below`, `BelowOrEqual`, `AboveOrBelow` | Comparison direction. The companion *value* field is not reachable through the create API on probed deployments — see `chart-add` header for the gap; set thresholds via the UI for now. |

## Units

A `Statistic` gets its unit from two places:

- **The metric's own unit.** The Console formats currency, time, and byte units from the metric's own unit. It adds a currency prefix, or it scales the value and adds a suffix. See [metrics-mpl.md § Unit Handling](./metrics-mpl.md#unit-handling) for the list.
- **`customUnits`.** The Console appends this suffix to the formatted value as written, with no space and no scaling.

For MPL Statistics, `chart-add --unit` goes through `scripts/metrics/unit-for`. It writes no suffix for the units that the Console formats itself. For APL Statistics, `chart-add` writes `customUnits` as given. A suffix on a formatted metric shows the unit twice: `--unit "$"` on a `USD` metric shows `$1.031K$`.

The Console ignores the `unit` enum (`TimeSec`, `Percent100`, `CurrencyUSD`, …).

On `TimeSeries`, `Heatmap`, `Pie`, `Table`, and `LogStream`, the Console does not show `customUnits`. Encode the unit in `name` instead.

## Annotations

Annotations (deployment markers, incidents) are managed via `/v2/annotations`, not via chart JSON:

```bash
scripts/axiom-api prod POST /annotations '{
    "time": "2024-03-18T08:39:28.382Z",
    "type": "deploy",
    "datasets": ["http-logs"],
    "title": "Production deployment",
    "description": "Deploy v2.1.0",
    "url": "https://github.com/org/repo/releases/tag/v2.1.0"
  }'
```

Or via GitHub Actions: `axiomhq/annotation-action@v0.1.0`.

## Comparison Period

Compare current time range against a historical offset via URL params, not chart JSON: `?t_qr=24h&t_against=-1d` (or `-1W`). No equivalent chart-level field today.

## Per-Panel Time-Range Override

UI-only. `overrideDashboardTimeRange` has no API representation — silently dropped on data charts, rejected on `Note`/`SmartFilter`. Edit per-panel time in the UI (Edit panel → Time range → Custom).

## Fields Rejected on Create

The create API has a closed field list per chart kind. Sending an unknown field returns:

```
dashboard validation failed at [charts <index>]: Unrecognized key: "<field>"
```

`chart-add` never emits these, so authoring through it can't trigger the error. Useful when debugging a hand-written or migrated payload, or when extending `chart-add`.

**Universally rejected** (every chart kind):

| Field | Notes |
|---|---|
| `decimals` | GET returns it on UI-created charts; create rejects it. |
| `description` (chart-level) | Rejected on every chart kind. The dashboard-level `description` (top-level, sibling of `name`) **is** accepted. |
| `aggChartOpts` (chart-level) | Belongs at `query.queryOptions.aggChartOpts`, not at chart top level. Only `TimeSeries` consumes it. |
| `options` | Rejected on every chart kind. Common contamination from Grafana text panels (`options.content`). Note `text` is top-level, not `options.text`. |
| `overrideDashboardTimeRange`, `overrideDashboardCompareAgainst` | No API representation. Silently dropped on data charts, rejected on `Note` and `SmartFilter`, rejected at dashboard top level. |

**Per-chart rejections.** The API applies these rules to unit fields:

- `unit`: The API accepts `unit` only on `Statistic`. The Console ignores it.
- `customUnits`: The API rejects `customUnits` on `Note`. Other chart kinds accept it. Only `Statistic` shows it.
