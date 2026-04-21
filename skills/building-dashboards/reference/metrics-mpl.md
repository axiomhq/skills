# Metrics/MPL Chart Contract

This reference documents the chart query contract for *metrics-backed* dashboard charts.

Metrics charts place the MPL pipeline string in the `query.apl` field (the same field used for APL queries) and **must** also include `query.metricsDataset` — this is what tags the chart as a metrics chart so the renderer routes it to the MPL parser instead of the APL parser. Do not send `query.mpl` — the API rejects it.

> **Critical:** if you omit `query.metricsDataset`, the API accepts the payload (it falls through to the non-metrics APL variant of the schema) but the chart renders as `Error: line: 1, col: 1: invalid input text` because the frontend sends the MPL string to the APL parser. `metricsDataset` is the only signal that distinguishes a metrics chart from an APL chart — it is not optional.
>
> **When updating an existing dashboard:** the legacy UI-written shape uses a `query.mpl` field. Rename `mpl` → `apl` to pass validation, but **keep** `metricsDataset`, `metricsMetric`, `metricsFilter`, and `metricsTransformations`. Do not strip them.

> **CRITICAL:** Run `scripts/metrics/metrics-spec <deployment> <dataset>` before composing your first MPL query in a session. NEVER guess MPL syntax.

## Canonical JSON Shape

```json
{
  "type": "TimeSeries",
  "datasetId": "otel-metrics",
  "query": {
    "apl": "`otel-metrics`:`http.server.duration`\n| where `service.name` == \"api\"\n| align to 1m using avg\n| group by `service.name` using avg",
    "metricsDataset": "otel-metrics",
    "metricsMetric": "http.server.duration"
  }
}
```

### Required and Optional Fields

| Field | Required? | Description |
|-------|-----------|-------------|
| `apl` | ✅ Yes | The MPL pipeline string. Use this field even for MPL content. |
| `metricsDataset` | ✅ Yes | Tags the chart as a metrics chart. Without this, the renderer sends the string to the APL parser and the chart fails with `invalid input text`. |
| `metricsMetric` | ☑️ Recommended | The metric name (same identifier that appears after the `:` in the MPL source). Optional in the schema but the UI always writes it. |
| `metricsFilter` | ☑️ Recommended | Structured filter tree — defaults to `{op: "and", children: []}` when absent. Preserve if present on an existing chart. |
| `metricsTransformations` | ☑️ Recommended | Align/group/bucket transformations. Preserve if present on an existing chart. |
| `mpl` | ❌ No | Rejected by the API. If an existing dashboard has this field, rename it to `apl` and preserve `metricsDataset`. |

> **Why `apl`?** The v2 dashboard API uses `apl` as the query text field for both APL and MPL queries. The dataset/metric selector is embedded in the MPL string itself (for example, `` `otel-metrics`:`http.server.duration` ``). The `metricsDataset` sibling field is what distinguishes an MPL chart from an APL chart at render time.

## Authoring Checklist

When generating metrics chart JSON:

1. Confirm dataset kind is `otel:metrics:v1` via `scripts/metrics/datasets <deploy>`.
2. Run `scripts/metrics/metrics-spec` to learn the full MPL syntax — **mandatory, never guess**.
3. Discover available metrics and tags with `scripts/metrics/metrics-info`. If results are empty, retry with `--start` set to 7 days ago (sparse metrics may not have data in the default 24h window).
4. Put the full MPL pipeline in `query.apl`, and always set `query.metricsDataset` (required) and `query.metricsMetric` (recommended). Do not set `query.mpl` — the API rejects it. When **updating** an existing chart that already has `metricsFilter` or `metricsTransformations`, preserve them.
5. Validate your query with `scripts/metrics/metrics-query` before embedding in the dashboard.

> **Note:** `find-metrics <value>` searches tag values, not metric names. Use `metrics-info <deploy> <dataset> metrics` to list metric names.

## Metrics Discovery & Query Scripts

| Script | Usage |
|--------|-------|
| `scripts/metrics/datasets <deploy> [--kind <kind>]` | List datasets (with edge deployment info) |
| `scripts/metrics/metrics-spec <deploy> <dataset>` | Fetch MPL query specification |
| `scripts/metrics/metrics-info <deploy> <dataset> ...` | Discover metrics, tags, and values |
| `scripts/metrics/metrics-query <deploy> <mpl> <start> <end>` | Execute a metrics query |

> These scripts are vendored from `query-metrics`. Keep in sync if upstream behavior changes.
