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
4. **Read the metric's metadata** with `scripts/metrics/metrics-info <deploy> <dataset> metrics <metric> info`. The returned `{type, temporality, unit}` block drives both the query shape (see [Choosing a Query Shape](#choosing-a-query-shape) below) and the chart unit configuration (see [Unit Handling](#unit-handling) below).
5. Put the full MPL pipeline in `query.apl` AND set `query.metricsDataset` to the dataset name. Do not set `query.mpl` — the create API rejects it.
6. **Use `align to $__interval`, not a fixed window.** The dashboard runtime injects `$__interval` based on the time picker and panel width; a fixed `align to 1m` produces broken granularity outside its design range. Do not add `param $__interval: Duration;` to the chart string — the runtime injects it. Pre-validation via `scripts/metrics/metrics-query` requires substituting a concrete duration for that call only.
7. Validate your query with `scripts/metrics/metrics-query` before embedding in the dashboard.

> **Note:** `find-metrics <value>` searches tag values, not metric names. Use `metrics-info <deploy> <dataset> metrics` to list metric names.

> **Parameter values:** for manual API calls or pre-validation of a parameterized query, supply values via `scripts/metrics/metrics-query`'s `-p name=value` flag. See the **Passing parameter values** subsection in the `query-metrics` skill for the API contract and request-body shape.

## Metrics Discovery & Query Scripts

| Script | Usage |
|--------|-------|
| `scripts/metrics/datasets <deploy> [--kind <kind>]` | List datasets (with edge deployment info) |
| `scripts/metrics/metrics-spec <deploy> <dataset>` | Fetch MPL query specification |
| `scripts/metrics/metrics-info <deploy> <dataset> ...` | Discover metrics, tags, and values |
| `scripts/metrics/metrics-query <deploy> <mpl> <start> <end>` | Execute a metrics query |
| `scripts/metrics/unit-for <unit-string>` | Map a UCUM/OTel unit to an Axiom chart unit config |

> The `datasets`, `metrics-spec`, `metrics-info`, and `metrics-query` scripts are vendored from `query-metrics`. Keep in sync if upstream behavior changes. `unit-for` is dashboard-specific and lives only here.

---

## Choosing a Query Shape

The `metrics-info ... metrics <metric> info` payload returns three fields that should drive how you write the MPL pipeline. **Always read this metadata before composing a query — never assume a metric is a simple scalar.**

| Field | Values | What it tells you |
|-------|--------|-------------------|
| `type` | `Gauge`, `CounterMonotonic`, `CounterNonMonotonic`, `Histogram` | The kind of instrument; determines required pre-aggregation operators |
| `temporality` | `Cumulative`, `Delta`, or `null` | Whether counter values are running totals or per-interval deltas. `null` is normal for Gauges. |
| `unit` | UCUM-style string (`Cel`, `kW.h`, `s`, `%`, `[ppm]`, …) or `null` | Display unit; preserve when reporting results to the user |

Rules of thumb (consult `metrics-spec` for the exact operator names — they may evolve):

- **Gauge** — instantaneous value. Align directly with `avg`/`min`/`max`/`sum`. Do **not** apply a rate operator; you'd be averaging meaningless deltas of an instantaneous value.
- **CounterMonotonic + Cumulative** — running total that only goes up (resets aside). The raw values are almost never what the user wants. Convert to a per-second rate first, **then** align/aggregate.
- **CounterMonotonic + Delta** — already per-interval; can be summed/aligned without a rate step.
- **CounterNonMonotonic** — can go up or down (e.g. queue depth, balance). Intent is ambiguous: rate, delta, or current value all make sense for different questions. **Ask the user what they want to see** before picking one.
- **Histogram** — not a scalar. Direct `align using avg` will not give you what you expect. Consult the histogram section of `metrics-spec` for quantile/bucket operators.
- **`temporality: null`** means "not applicable for this instrument type" (the norm for Gauges), not "missing data".

If a chart combines metrics with mismatched units in a single arithmetic expression, surface a warning in the chart description rather than silently producing a meaningless number.

---

## Unit Handling

Metrics-backed charts should surface the metric's unit in the chart configuration so the dashboard formats values correctly. The chart-level rendering rules (which fields are accepted by which chart type, the Statistic `unit`+`customUnits` pairing, the `Percent` vs `Percent100` trap) are documented once in [chart-config.md § Unit Configuration](./chart-config.md#unit-configuration-cross-chart). This section covers the metrics-specific workflow that translates a metric's UCUM/OTel `unit` metadata into that chart-level configuration.

### Workflow

1. Fetch the metric's metadata:
   ```bash
   scripts/metrics/metrics-info <deploy> <dataset> metrics <metric> info
   # -> {"type":"Gauge","temporality":null,"unit":"Cel"}
   ```
2. Map the `unit` to a chart unit config:
   ```bash
   scripts/metrics/unit-for "Cel"
   # -> {"unit":"Auto","customUnits":"Cel"}

   scripts/metrics/unit-for "ms"
   # -> {"unit":"TimeMS"}

   scripts/metrics/unit-for "%"
   # -> {"unit":"Percent100","customUnits":"%"}
   ```
3. Splice the result into the chart object alongside `name`, `type`, and `query`. For **Statistic** the spliced fields render directly. For **TimeSeries / Heatmap / Pie / Table / LogStream** only `customUnits` is API-accepted, so also encode the unit in the chart `name` (e.g. `"P95 Latency (ms)"`) per [chart-config.md § Unit Configuration](./chart-config.md#unit-configuration-cross-chart).

### Mapping Reference

`unit-for` recognizes these UCUM/OTel codes and emits an Axiom enum value; everything else falls through to `{"unit":"Auto","customUnits":"<verbatim>"}`:

| Incoming unit | Axiom enum |
|---|---|
| `s`, `seconds`, `sec` | `TimeSec` |
| `ms`, `milliseconds` | `TimeMS` |
| `us`, `µs`, `microseconds` | `TimeUS` |
| `ns`, `nanoseconds` | `TimeNS` |
| `min` | `TimeMin` |
| `h`, `hour`, `hours` | `TimeHour` |
| `d`, `day`, `days` | `TimeDay` |
| `By`, `bytes` | `Byte` |
| `KBy`, `KiBy` | `Kilobyte` |
| `MBy`, `MiBy` | `Megabyte` |
| `GBy`, `GiBy` | `Gigabyte` |
| `By/s`, `bytes/s` | `BytesSec` |
| `bit/s` | `BitsSec` |
| `%` | `Percent100` |
| `USD`, `EUR`, `GBP`, `JPY`, `INR`, `CAD`, `AUD`, `CZK`, `PLN` | `Currency<XXX>` |

### Deliberately Not Auto-Mapped

The following inputs fall through to `customUnits` rather than guessing an enum, because the UCUM code is ambiguous or context-dependent. The chart author can override manually if they know the intent.

| Input | Why not auto-mapped |
|---|---|
| `m`   | Could mean metres or minutes (UCUM uses `min` for the latter, but `m` is loose in the wild). |
| `B`   | UCUM `B` is Bel; bytes are `By`. Avoids silently treating decibels as bytes. |
| `1`   | OTel "dimensionless" sentinel. Could be a 0–1 ratio or a unitless count. Defaults to `Auto` with no suffix. **If it's a 0–1 ratio, do NOT use the `Percent` enum** — see the percentage handling note below. |
| `""` (empty) / null | No unit information; defaults to `Auto`. |

### Percentages and ratios (OTel 0–1 fractions)

OTel and Prometheus emit ratios in `0.0–1.0` (availability, error rate, saturation, cache hit ratio, …). For Axiom charts you must convert to the 0–100 range that `Percent100` expects, in the **MPL pipeline**:

```mpl
(
  `<dataset>`:requests_total | where code != #/5../ | map rate | group using sum,
  `<dataset>`:requests_total                          | map rate | group using sum
)
| compute availability using /
| map * 100                       // <-- mandatory: convert fraction → percentage
| align to $__interval using avg
```

This applies whether the ratio comes from `compute … using /`, from a single metric whose unit metadata is `1`, or from any other 0–1 source. The chart-level rendering (which fields to set, why `Percent100` alone is insufficient, why the `Percent` enum is wrong here) is documented in [chart-config.md § Unit Configuration](./chart-config.md#unit-configuration-cross-chart).

### Mismatched Units Across Metrics

If a chart combines multiple metrics in arithmetic (e.g. `metric_a / metric_b`) and their `unit` values differ, the result's unit is the chart author's responsibility. `unit-for` does not attempt to infer derived units. Surface the source units in the chart description so reviewers can sanity-check the math.
