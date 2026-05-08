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
4. **Read the metric's metadata** with `scripts/metrics/metrics-info <deploy> <dataset> metrics <metric> info`. The returned `{type, temporality, unit}` block drives both the query shape (see the `query-metrics` skill's "Choosing a query shape from metric metadata" section) and the chart unit configuration (see [Unit Handling](#unit-handling) below).
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

## Unit Handling

When a metrics chart represents a single metric (typical for **Statistic** panels), surface the metric's unit in the chart configuration so the dashboard formats values correctly. Statistic charts have two slots for this:

- `unit` — an Axiom enum (`TimeSec`, `TimeMS`, `Byte`, `Percent100`, `CurrencyEUR`, …; full list in [chart-config.md](./chart-config.md#available-units)).
- `customUnits` — a free-form string suffix used when the metric's unit doesn't map to the enum.

**API-level support:** TimeSeries (and Heatmap, Pie, Table, LogStream) accept `customUnits` (free-form suffix string) at the chart top level and round-trip it through GET, but reject the `unit` enum (`Unrecognized key: "unit"` from the create API).

**Statistic charts require both fields to render a suffix.** A Statistic with `unit: "Percent100"` alone renders bare `99.5`; adding `customUnits: "%"` produces `99.5%`. The two fields play different roles — `unit` scales/formats the value, `customUnits` paints the suffix.

Guidance:

- **Statistic with a percentage:** set BOTH `unit: "Percent100"` AND `customUnits: "%"`. The `unit` controls scaling/formatting; `customUnits` is what paints the suffix.
- **Statistic with bytes/seconds/etc.:** the `unit` enum (e.g. `Byte`, `TimeMS`) abbreviates *and* labels (`1.2 MB`, `350 ms`) on its own. Add `customUnits` only if you want extra trailing text.
- **TimeSeries / Heatmap / Pie / Table / LogStream:** set `customUnits` if you want — it persists through the API — but **always also encode the unit in the chart `name`** (e.g. `"P95 Latency (ms)"`, `"Memory (MB)"`). The header label is the most reliable unit-labeling mechanism for these chart types. For magnitude conversion, scale in MPL (`| map / 1048576` for bytes → MB, `| map * 100` for ratio → percent).

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
   # -> {"unit":"Percent100"}
   ```
3. Splice the result into the chart object alongside `name`, `type`, and `query`.
   - For **Statistic** showing a percentage: set both `unit: "Percent100"` AND `customUnits: "%"` — the enum scales the value, the suffix paints the `%` sign. Without `customUnits` the chart shows bare `99.5`.
   - For **Statistic** showing bytes/seconds/etc.: set just `unit` (e.g. `Byte`, `TimeMS`); the formatter abbreviates and labels in one step (`1.2 MB`, `350 ms`).
   - For **TimeSeries / Heatmap / Pie / Table / LogStream**: only `customUnits` is API-accepted (the `unit` enum is rejected). **Always also encode the unit in the chart `name`** (`"P95 Latency (ms)"`, `"Memory (MB)"`) so the header is self-describing. For magnitude conversion, scale in MPL.

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

> **⚠️** The Axiom `Percent` enum does **not** auto-multiply 0–1 fractions by 100. A Statistic chart with `"unit": "Percent"` and a metric value of `1.0` (= 100%) renders as the bare string `1`, not `100%`.

OTel and Prometheus emit ratios in `0.0–1.0` (availability, error rate, saturation, cache hit ratio, …). For Axiom Statistic panels you must convert to the 0–100 range that `Percent100` expects, in the **MPL pipeline**:

```mpl
(
  `<dataset>`:requests_total | where code != #/5../ | map rate | group using sum,
  `<dataset>`:requests_total                          | map rate | group using sum
)
| compute availability using /
| map * 100                       // <-- mandatory: convert fraction → percentage
| align to $__interval using avg
```

Then on the chart:

```json
{ "type": "Statistic", "unit": "Percent100", "customUnits": "%", … }
```

**Both fields are required to render `99.5%`.** `unit: "Percent100"` alone renders bare `99.5` — the percent enum scales the value but does not paint the `%` suffix. Adding `customUnits: "%"` paints the suffix.

This applies whether the ratio comes from `compute … using /`, from a single metric whose unit metadata is `1`, or from any other 0–1 source. **Never** rely on the `Percent` enum to do the conversion for you, and never rely on `Percent100` alone for the suffix.

For TimeSeries panels, apply the same `| map * 100` to get to the 0–100 scale, and put `"(%)"` in the chart name as the primary unit label. You may also set `customUnits: "%"` for completeness, but treat the chart name as the source of truth for unit labeling on non-Statistic charts.

### When to Use What

| Chart type | What to set | How |
|---|---|---|
| Statistic, single metric (bytes/time/currency) | `unit` (enum) | Run `unit-for` on the metric's `unit`; splice into the chart object. The enum abbreviates and labels in one step. |
| Statistic, computed percentage | `unit: "Percent100"` AND `customUnits: "%"` | Multiply the ratio by 100 in MPL (`| map * 100`), set both fields together. `Percent100` alone does NOT paint the `%` suffix. |
| Statistic, derived unit not in the enum | `customUnits` only | Set manually — `unit-for` cannot reason about derived units. |
| TimeSeries | `name` + optional `customUnits` | Encode the unit in the chart name (`"Memory (MB)"`); the `unit` enum is rejected on create. |
| Heatmap / Pie / Table / LogStream | Same as TimeSeries | Same caveats. |

### Mismatched Units Across Metrics

If a chart combines multiple metrics in arithmetic (e.g. `metric_a / metric_b`) and their `unit` values differ, the result's unit is the chart author's responsibility. `unit-for` does not attempt to infer derived units. Surface the source units in the chart description so reviewers can sanity-check the math.
