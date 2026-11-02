# Chart Configuration — Advanced Options

`scripts/chart-add` covers the common fields per chart kind (id, name, query, dataset, unit, sparkline, Note text). It also enforces the type-aware unit rules and never emits the deny-listed fields below — so when authoring through `chart-add` none of this reference is needed. The one structural option `chart-add` does not emit is a chart with several queries; see [TimeSeries — Multiple Queries](#timeseries--multiple-queries).

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

## TimeSeries — Multiple Queries

A `TimeSeries` chart can run several queries and draw all of their series on one chart. Use it when the series come from pipelines that one query cannot produce together: p95 and p99 from two histogram aggregations, available replicas next to the HPA maximum, requests per second next to a failure ratio. When the series are one metric split by a tag, keep a single query with `group by` (MPL) or `summarize … by` (APL) instead.

The Console added this for metrics charts in March 2026 and for structured, APL, and MPL queries in August 2026. `chart-add` emits single-query charts: build each query with `chart-add`, so each one is formatted and checked, then merge them with `jq`.

### Shape

```json
{
  "id": "latency-p95-p99",
  "name": "Latency p95 / p99 (s)",
  "type": "TimeSeries",
  "query": {
    "name": "p95",
    "apl": "set custom_unit = \"s\"; `otel-metrics`:http_request_duration_seconds | where `service.name` == \"api\" | bucket by region to $__interval using interpolate_cumulative_histogram(rate, 0.95)",
    "metricsDataset": "otel-metrics"
  },
  "queries": [
    {
      "name": "p95",
      "apl": "set custom_unit = \"s\"; `otel-metrics`:http_request_duration_seconds | where `service.name` == \"api\" | bucket by region to $__interval using interpolate_cumulative_histogram(rate, 0.95)",
      "metricsDataset": "otel-metrics"
    },
    {
      "name": "p99",
      "apl": "set custom_unit = \"s\"; `otel-metrics`:http_request_duration_seconds | where `service.name` == \"api\" | bucket by region to $__interval using interpolate_cumulative_histogram(rate, 0.99)",
      "metricsDataset": "otel-metrics"
    }
  ]
}
```

| Field | Notes |
|---|---|
| `queries[]` | One entry per query, in display order. Charts read back from the API carry 2–8 entries. |
| `queries[].name` | Legend label for that query's series. Every entry read back has one; the Console names a new query row `A` by default. Give each entry a distinct, meaningful name. |
| `queries[].apl` | The pipeline, APL or MPL, exactly as for a single `query.apl`. The dashboard time picker and `$__interval` apply; no inline time range. Dashboard parameters (`param $region: Option<string>;`) go at the top of each entry, as in a single query. |
| `queries[].metricsDataset` | Present on MPL entries, absent on APL entries, the same discriminator rule as `query.metricsDataset`. |
| `queries[].queryOptions` | Per-entry options. Seen in the wild: `timeSeriesView`. |
| `query` | Present on every chart read back, and always equal to `queries[0]` including `name`. Keep it a copy of the first entry so a reader of `query` alone sees the first series. |
| Chart-level `datasetId`, `query.queryOptions` | Not written on multi-query charts read back from the API. |

### Authoring with `chart-add` and `jq`

```bash
P95='set custom_unit = "s"; `otel-metrics`:http_request_duration_seconds | where `service.name` == "api" | bucket by region to $__interval using interpolate_cumulative_histogram(rate, 0.95)'
P99='set custom_unit = "s"; `otel-metrics`:http_request_duration_seconds | where `service.name` == "api" | bucket by region to $__interval using interpolate_cumulative_histogram(rate, 0.99)'

# One chart-add per query, same id and name. Each run formats the pipeline
# and rejects inline time ranges.
scripts/chart-add --type TimeSeries --id latency-p95-p99 --name "Latency p95 / p99 (s)" \
    --mpl "$P95" --dataset otel-metrics > p95.json
scripts/chart-add --type TimeSeries --id latency-p95-p99 --name "Latency p95 / p99 (s)" \
    --mpl "$P99" --dataset otel-metrics > p99.json

# Merge: the first file is the chart, every file contributes one entry.
jq -s '
  (.[0].query + {name: "p95"}) as $q0
  | (.[1].query + {name: "p99"}) as $q1
  | .[0] | .query = $q0 | .queries = [$q0, $q1]
' p95.json p99.json > latency-p95-p99.json
```

Then feed `latency-p95-p99.json` to `layout-pack` and `dashboard-assemble` like any other chart file. Validate each MPL pipeline on its own with `scripts/metrics/mpl-validate-chart <deployment> '<MPL>'` before the merge; it takes one pipeline string, not a chart file. `dashboard-validate` accepts `queries` and has no entry-level checks.

### Rules

- **One unit per chart.** On MPL, repeat `set custom_unit = "<unit>";` in every entry; the Console formats the axis from the query response. Put the unit in the chart `name` as for any `TimeSeries` (`customUnits` is not shown on this chart kind). Two units on one chart need the secondary Y-axis, below.
- **One language, one dataset.** Every multi-query chart read back from the API uses MPL on every entry and the same `metricsDataset` on every entry. The Console gives each query row its own language, so a mixed chart may be accepted, but that path is unverified here: build it, deploy it, and read it back before relying on it.
- **Name every entry.** The legend shows `queries[].name` plus any group-by dimension. Unnamed entries look identical in the legend.
- **Count the series.** The ≤10 series guideline applies to the whole chart: three queries grouped by a five-value tag is fifteen series.

### Secondary Y-axis

The Console lets each query sit on the primary or secondary Y-axis, so request count and p99 latency can share a chart. None of the multi-query charts read back from the API for this section used it, so its JSON field is not documented here. Do not guess a key: the create API has a closed field list ([Fields Rejected on Create](#fields-rejected-on-create)). To use the secondary axis, deploy the chart, set the axis on the query row in the Console, then `dashboard-get` the dashboard and copy the field the Console wrote. Add it to this section when you find it.

### Migration mapping

- **Grafana:** a panel whose `targets[]` are overlaid becomes one `queries[]` entry per target, with `name` from `legendFormat`. When the targets feed a transform (a ratio of two targets), compute the derived value in one MPL pipeline or defer with a `Note`. See [grafana-migration.md](./grafana-migration.md).
- **Splunk:** a `timechart` with several `eval`-derived series usually fits one APL `summarize` with several columns. Reach for `queries[]` only when the series need different `where` clauses or different base searches.

### Verification status

Verified by reading live dashboards back through `dashboard-get` (November 2026): the shape above, `query` equal to `queries[0]`, `name` on every entry, 2–8 entries per chart, per-entry `queryOptions.timeSeriesView`, dashboard parameters inside entries. Not exercised through the create API: `queries` without `query`, mixed APL and MPL entries, entries on different datasets, `queries` on chart kinds other than `TimeSeries`, the secondary-axis field, and `aggChartOpts` keys on a multi-query chart. Treat those as open until a chart with that feature has been deployed and read back.

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

- **The Console's formatter.** For MPL, the Console picks it from the unit in the query response: the metric's unit, or a `custom_unit` that the query sets. For APL, it picks it from field metadata, a field named `duration`, or a timespan field. It adds a currency prefix, or it scales the value and adds a suffix. See [metrics-mpl.md § Unit Handling](./metrics-mpl.md#unit-handling) for the list.
- **`customUnits`.** The Console appends this suffix to the formatted value as written, with no space and no scaling.

For MPL Statistics, `chart-add --unit` writes `set custom_unit="<unit>";` into the query. For both languages, it goes through `scripts/metrics/unit-for`, which writes no suffix for the units that the Console formats itself. A suffix on a formatted value shows the unit twice (`250msms`). For APL, `%` stays a suffix, because an APL result does not name the unit of a computed percentage.

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

**`roundTo` on `Statistic`.** The Console's editor writes `roundTo` (the "Round to" setting), so GET can return it, but create and update reject it. Removing it drops the tile's rounding, so tell the user when you remove it.
