# Metrics/MPL Chart Contract

This reference documents the chart query contract for *metrics-backed* dashboard charts.

Metrics charts require **two** fields:

- `query.apl` — the MPL pipeline string (same field name used for APL queries).
- `query.metricsDataset` — the dataset name (e.g. `"otel-metrics"`). This field is what tells the backend to interpret `apl` as MPL. Without it, the chart will not behave correctly even if the pipeline string is well-formed.

Do not send `query.mpl` in create payloads — the create API rejects it even though GET responses for existing metrics dashboards may include it.

> **CRITICAL:** Run `scripts/metrics/metrics-spec <deployment> <dataset>` before composing your first MPL query in a session. NEVER guess MPL syntax.

## Canonical JSON Shape

```json
{
  "type": "TimeSeries",
  "query": {
    "apl": "`otel-metrics`:`http.server.duration`\n| where `service.name` == \"api\"\n| align to $__interval using avg\n| group by `service.name` using avg",
    "metricsDataset": "otel-metrics"
  }
}
```

### Required and Optional Fields

| Field | Required? | Description |
|-------|-----------|-------------|
| `apl` | ✅ Yes | The MPL pipeline string. Use this field even for MPL content. |
| `metricsDataset` | ✅ Yes (for metrics charts) | Dataset name (e.g. `"otel-metrics"`). Denotes the chart as MPL — without it the backend treats `apl` as APL. |
| `mpl` | ❌ No (rejected) | GET may return it for existing metrics charts, but create rejects it. Put the MPL string in `apl` instead. |
| `metricsMetric` | ❌ No | UI/editor metadata; not needed for hand-authored create payloads |
| `metricsFilter` | ❌ No | UI/editor metadata; not needed for hand-authored create payloads |
| `metricsTransformations` | ❌ No | UI/editor metadata; not needed for hand-authored create payloads |

> **Why both `apl` and `metricsDataset`?** The dashboard create API uses `apl` as the query text field for both APL and MPL queries. `metricsDataset` is the discriminator that flags the chart as MPL. The dataset/metric selector is also embedded in the MPL string itself (e.g. `` `otel-metrics`:`http.server.duration` ``), but `metricsDataset` must still be set explicitly.

## Authoring Checklist

When generating metrics chart JSON:

1. Confirm dataset kind is `otel:metrics:v1` via `scripts/metrics/datasets <deploy>`.
2. Run `scripts/metrics/metrics-spec` to learn the full MPL syntax — **mandatory, never guess**.
3. Discover available metrics and tags with `scripts/metrics/metrics-info`. If results are empty, retry with `--start` set to 7 days ago (sparse metrics may not have data in the default 24h window).
4. Put the full MPL pipeline in `query.apl` AND set `query.metricsDataset` to the dataset name. Do not set `query.mpl` — the create API rejects it.
5. **Use `align to $__interval`, not a fixed window.** The dashboard runtime injects `$__interval` based on the time picker and panel width; a fixed `align to 1m` produces broken granularity outside its design range. Do not add `param $__interval: Duration;` to the chart string — the runtime injects it. Pre-validation via `scripts/metrics/metrics-query` requires substituting a concrete duration for that call only.
6. Validate your query with `scripts/metrics/metrics-query` before embedding in the dashboard.

> **Note:** `find-metrics <value>` searches tag values, not metric names. Use `metrics-info <deploy> <dataset> metrics` to list metric names.

## Metrics Discovery & Query Scripts

| Script | Usage |
|--------|-------|
| `scripts/metrics/datasets <deploy> [--kind <kind>]` | List datasets (with edge deployment info) |
| `scripts/metrics/metrics-spec <deploy> <dataset>` | Fetch MPL query specification |
| `scripts/metrics/metrics-info <deploy> <dataset> ...` | Discover metrics, tags, and values |
| `scripts/metrics/metrics-query <deploy> <mpl> <start> <end>` | Execute a metrics query |

> These scripts are vendored from `query-metrics`. Keep in sync if upstream behavior changes.
