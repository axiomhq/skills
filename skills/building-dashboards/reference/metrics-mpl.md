# Metrics/MPL Chart Contract

This reference documents the chart query contract for *metrics-backed* dashboard charts.

Metrics charts place the MPL pipeline string in the `query.apl` field (the same field used for APL queries) and add a required `metricsDataset` field that tells the frontend to route the query to the metrics backend.

> **CRITICAL:** Run `scripts/metrics/metrics-spec <deployment> <dataset>` before composing your first MPL query in a session. NEVER guess MPL syntax.

## Canonical JSON Shape

```json
{
  "type": "TimeSeries",
  "query": {
    "apl": "`otel-metrics`:`http.server.duration`\n| where `service.name` == \"api\"\n| align to 1m using avg\n| group by `service.name` using avg",
    "metricsDataset": "otel-metrics"
  }
}
```

### Required and Optional Fields

| Field | Required? | Description |
|-------|-----------|-------------|
| `apl` | ✅ Yes | The MPL pipeline string |
| `metricsDataset` | ✅ Yes | Dataset name — triggers the metrics query path |
| `metricsMetric` | ❌ No | Metric name (used by the UI form editor) |
| `metricsFilter` | ❌ No | Structured filter tree (used by the UI form editor) |
| `metricsTransformations` | ❌ No | Structured transformations (used by the UI form editor) |

> **Why `apl`?** The dashboard schema uses `apl` as the query text field for both APL and MPL queries. The presence of `metricsDataset` is what distinguishes a metrics chart from an APL chart.

## Authoring Checklist

When generating metrics chart JSON:

1. Confirm dataset kind is `otel:metrics:v1` via `scripts/metrics/datasets <deploy>`.
2. Run `scripts/metrics/metrics-spec` to learn the full MPL syntax — **mandatory, never guess**.
3. Discover available metrics and tags with `scripts/metrics/metrics-info`. If results are empty, retry with `--start` set to 7 days ago (sparse metrics may not have data in the default 24h window).
4. Put the full MPL pipeline in `query.apl` and set `query.metricsDataset` to the dataset name.
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
