# Metrics/MPL Chart Contract

Reference for metrics-backed chart queries. Authoring through `chart-add --mpl '<MPL>' --dataset <name>` handles the JSON-shape rules (sets both `query.apl` and `query.metricsDataset`); the rest of this file covers the **MPL pipeline** and **unit handling** that the agent still owns.

## JSON Shape

```json
{
  "type": "TimeSeries",
  "query": {
    "apl": "`otel-metrics`:`http.server.duration`\n| where `service.name` == \"api\"\n| align to $__interval using avg\n| group by `service.name` using avg",
    "metricsDataset": "otel-metrics"
  }
}
```

| Field | Required | Notes |
|---|---|---|
| `query.apl` | Yes | The MPL pipeline. Same field name as APL queries. |
| `query.metricsDataset` | Yes | The discriminator that flags MPL. Without it the backend treats `apl` as APL. |
| `query.mpl` | — | Rejected on create. GET returns it on existing UI-authored charts; ignore. |
| `query.metricsMetric`, `metricsFilter`, `metricsTransformations` | — | UI/editor metadata. Not needed for hand-authored or `chart-add` output. |

## Authoring Checklist

When generating metrics chart JSON:

1. Confirm dataset kind is `otel:metrics:v1` via `scripts/metrics/datasets <deploy>`.
2. Run `scripts/metrics/metrics-spec` to learn the full MPL syntax — **mandatory, never guess**.
3. Discover available metrics and tags with `scripts/metrics/metrics-info`. If results are empty, retry with `--start` set to 7 days ago (sparse metrics may not have data in the default 24h window).
4. Put the full MPL pipeline in `query.apl` AND set `query.metricsDataset` to the dataset name. Do not set `query.mpl` — the create API rejects it.
5. **Use `align to $__interval`, not a fixed window.** The dashboard runtime injects `$__interval` based on the time picker and panel width; a fixed `align to 1m` produces broken granularity outside its design range. Do not add `param $__interval: Duration;` to the chart string — the runtime injects it. Pre-validation via `scripts/metrics/metrics-query` requires substituting a concrete duration for that call only.
6. Validate your query with `scripts/metrics/metrics-query` before embedding in the dashboard.

> **Note:** `find-metrics <value>` searches tag values, not metric names. Use `metrics-info <deploy> <dataset> metrics` to list metric names.

## Filter Bar / SmartFilter Integration

Metrics charts support optional filter bar variables via the `ifdef` operator. When the filter bar is unset (the "All" / no-filter default is active) the `ifdef` block is skipped and all series are returned. When a value is selected, the filter is applied.

### Chart query

Use `ifdef` in the MPL pipeline. **Do not** add `param` declarations to the chart query string — the dashboard runtime injects them automatically from the filter bar metadata.

```mpl
`otel-metrics`:`http.server.duration`
| ifdef($service_filter) { where `service.name` == $service_filter }
| align to $__interval using avg
| group by `service.name` using avg
```

### Filter bar JSON

The "All" default option **must** include `"unset": true`. Without it the variable is sent as an empty string (a required `string` param), which causes the MPL engine to error because `ifdef` expects `Option<string>`.

```json
{
  "id": "service_filter",
  "name": "Service",
  "type": "select",
  "selectType": "apl",
  "active": true,
  "apl": {
    "apl": "['logs'] | distinct ['service.name'] | project key=['service.name'], value=['service.name'] | sort by key asc",
    "queryOptions": {"quickRange": "1h"}
  },
  "options": [
    {"key": "All", "value": "", "default": true, "unset": true}
  ]
}
```

See `reference/smartfilter.md` for the full SmartFilter JSON structure.

## Metrics Discovery & Query Scripts

| Script | Usage |
|--------|-------|
| `scripts/metrics/datasets <deploy> [--kind <kind>]` | List datasets (with edge deployment info) |
| `scripts/metrics/metrics-spec <deploy> <dataset>` | Fetch MPL query specification |
| `scripts/metrics/metrics-info <deploy> <dataset> ...` | Discover metrics, tags, and values |
| `scripts/metrics/metrics-query <deploy> <mpl> <start> <end>` | Execute a metrics query |
1. Confirm dataset kind is `otel:metrics:v1`: `scripts/metrics/datasets <deploy>`.
2. Run `scripts/metrics/metrics-spec <deploy> <dataset>` — required before composing any MPL query.
3. Discover metrics and tags: `scripts/metrics/metrics-info`. Empty results → retry with `--start` 7 days ago.
4. Read each metric's `{type, temporality, unit}` via `metrics-info … metrics <m> info`. Drives query shape (below) and unit configuration.
5. Use `align to $__interval using …`, never a fixed window. The runtime injects `param $__interval: Duration;`; don't add it to the chart string.
6. Validate the pipeline with `scripts/metrics/mpl-validate-chart` (auto-injects the param for the validator only; rejects inline time ranges).
7. Pass to `chart-add --mpl '<query>' --dataset <name>`.

`find-metrics <value>` searches tag *values*, not metric names — only useful with a known entity name.

## Choosing a Query Shape

The `{type, temporality, unit}` block from `metrics-info` drives the pipeline:

| `type` | `temporality` | Pipeline |
|---|---|---|
| `Gauge` | `null` | Align directly with `avg`/`min`/`max`/`sum`. No rate. |
| `CounterMonotonic` | `Cumulative` | Convert to per-second rate (`align using prom::rate`), then aggregate. |
| `CounterMonotonic` | `Delta` | Already per-interval. Sum/align directly. |
| `CounterNonMonotonic` | either | Ambiguous (rate? delta? current value?). Ask the user. |
| `Histogram` | either | Use `bucket … using interpolate_cumulative_histogram` (cumulative) or `interpolate_delta_histogram` (delta). Plain `align using avg` produces nonsense. |

`temporality: null` means "not applicable" (the norm for Gauges), not "missing data".

If a chart combines metrics with mismatched units in arithmetic, surface the units in the chart description; `unit-for` doesn't infer derived units.

## Unit Handling

`chart-add --unit` accepts a friendly string and maps via `scripts/metrics/unit-for` (same script does the OTel → Axiom enum translation on its own). The chart-level rendering rules — which fields each chart kind accepts, the `Percent`/`Percent100` trap — live in [`chart-config.md`](./chart-config.md). This section covers the metrics-specific path.

### Workflow

1. Fetch the metric's metadata:
   ```bash
   scripts/metrics/metrics-info <deploy> <dataset> metrics <metric> info
   # -> {"type":"Gauge","temporality":null,"unit":"Cel"}
   ```
2. Map (or pass through to `chart-add --unit`):
   ```bash
   scripts/metrics/unit-for "Cel"   # -> {"unit":"Auto","customUnits":"Cel"}
   scripts/metrics/unit-for "ms"    # -> {"unit":"TimeMS"}
   scripts/metrics/unit-for "%"     # -> {"unit":"Percent100","customUnits":"%"}
   ```
3. For `Statistic`, `chart-add --unit` writes both fields. For other chart types, only `customUnits` — also encode the unit in `--name` (`"P95 Latency (ms)"`).

### Mapping reference

`unit-for` recognises these UCUM/OTel codes; everything else falls through to `customUnits`:

| Input | Axiom enum |
|---|---|
| `s`, `seconds`, `sec` | `TimeSec` |
| `ms`, `milliseconds` | `TimeMS` |
| `us`, `µs`, `microseconds` | `TimeUS` |
| `ns`, `nanoseconds` | `TimeNS` |
| `min`, `h`, `hour`, `d`, `day` | `TimeMin`/`TimeHour`/`TimeDay` |
| `By`, `bytes`, `KBy`/`MBy`/`GBy` | `Byte`/`Kilobyte`/`Megabyte`/`Gigabyte` |
| `By/s`, `bit/s` | `BytesSec`/`BitsSec` |
| `%` | `Percent100` (+ `customUnits: "%"`) |
| `USD`/`EUR`/`GBP`/`JPY`/`INR`/`CAD`/`AUD`/`CZK`/`PLN` | `Currency<XXX>` |

Deliberately not auto-mapped (ambiguous): `m` (metres or minutes), `B` (Bel — bytes are `By`), `1` (OTel "dimensionless" — could be ratio or count), empty/null. These fall through to `customUnits` verbatim or `Auto`.

### Percentages and ratios (OTel 0–1 fractions)

OTel ratios (availability, error rate, saturation, hit ratio) are emitted as 0–1 fractions. `Percent100` does NOT auto-multiply — convert in MPL:

```mpl
(
  `<dataset>`:requests_total | where code != #/5../ | map rate | group using sum,
  `<dataset>`:requests_total                          | map rate | group using sum
)
| compute availability using /
| map * 100
| align to $__interval using avg
```

Then pass `chart-add --unit "%"`.
