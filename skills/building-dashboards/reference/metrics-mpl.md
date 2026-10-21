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

Use Axiom MCP for discovery and queries. For separately configured deployments, the bundled `scripts/metrics/` helpers provide discovery and `mpl-validate-chart`; keep discovery, validation, and dashboard creation in the same organization.

1. Confirm the metrics dataset with `listDatasets` (`otel:metrics:v1` or `otel-metrics-v1`).
2. Use `getMetricsSpec` for unfamiliar MPL syntax.
3. Discover metrics and filters with `listMetrics`, `listMetricTags`, and `getMetricTagValues`.
4. Use each metric's `{type, temporality, unit}` from `listMetrics` to choose the query shape and units below.
5. Use `align to $__interval using …`, never a fixed window. The server declares and fills `$__interval`. Do not declare it in the chart string.
6. Validate with `queryMetrics`, supplying `startTime` and `endTime` instead of an inline time range.
7. Pass to `chart-add --mpl '<query>' --dataset <name>`.

## Choosing a Query Shape

The metric's `{type, temporality, unit}` drives the pipeline:

| `type` | `temporality` | Pipeline |
|---|---|---|
| `Gauge` | `null` | Align directly; the function follows the panel's intent. No rate. |
| `CounterMonotonic` | `Cumulative` | Convert to per-second rate (`align using prom::rate`), then aggregate. |
| `CounterMonotonic` | `Delta` | Already per-interval. Sum/align directly. |
| `CounterNonMonotonic` | either | Ambiguous (rate? delta? current value?). Ask the user. |
| `Histogram` | either | Use `bucket … using interpolate_cumulative_histogram` (cumulative) or `interpolate_delta_histogram` (delta). Plain `align using avg` produces nonsense. |

`temporality: null` means "not applicable" (the norm for Gauges), not "missing data".

If a chart combines metrics with mismatched units in arithmetic, surface the units in the chart description; `unit-for` doesn't infer derived units.

## Unit Handling

`chart-add --unit` takes the unit of the query result. On a Statistic, `chart-add` writes it into the query as `set custom_unit="<unit>";` and maps it via `scripts/metrics/unit-for`. [`chart-config.md` § Units](./chart-config.md#units) lists the unit fields each chart kind accepts and shows. This section covers the metrics-specific path.

### Workflow

Configure metric units with these steps:

1. Read the metric's unit from `listMetrics`, e.g. `{"type":"Gauge","temporality":null,"unit":"Cel"}`.
2. Pass the unit of the result to `chart-add --unit`: the metric's unit, or the new unit after a `map` or a rate that changes it. `map / 3600` on `s` gives `h`. A rate is per second: `prom::rate` on `By` gives `By/s`, on `{requests}` gives `{requests}/s`, and on `USD` gives `USD/s`. A ratio of two rates has no unit. For a 0–1 ratio, multiply by 100 and pass `--unit "%"`.
3. Pass the UCUM code, never a symbol (`USD`, not `$`). `chart-add` rejects `$`, `€`, and `£`. `unit-for` decides whether the Statistic needs a suffix:
   ```bash
   scripts/metrics/unit-for "Cel"   # -> {"customUnits":"Cel"}
   scripts/metrics/unit-for "ms"    # -> {}  (the Console formats ms itself)
   scripts/metrics/unit-for "USD"   # -> {}  (the Console adds the $ prefix)
   scripts/metrics/unit-for "%"     # -> {}  (the Console adds the % sign)
   ```
4. For other chart types, `chart-add` writes `customUnits`, which the Console does not show. Encode the unit in `--name` (`"P95 Latency (ms)"`).

### Mapping reference

The Console formats these units, so they need no suffix:

| Kind | Units |
|---|---|
| Currency (prefix) | `USD`, `GBP`, `EUR`, `BTC` |
| Percent (0–100) | `%` |
| Time | `ns`, `us`, `ms`, `s`, `min`, `h`, `d` |
| Frequency | `Hz` |
| Bytes (IEC) | `By`, `KiBy`, `MiBy`, `GiBy`, `TiBy`, `PiBy` |
| Bytes (SI) | `kBy`, `MBy`, `GBy`, `TBy`, `PBy` |
| Byte rates | `By/s`, `kBy/s`, `MBy/s`, `GBy/s`, `TBy/s`, `PBy/s` |
| Bit rates | `bit/s`, `kbit/s`, `Mbit/s`, `Gbit/s`, `Tbit/s`, `Pbit/s` |
| Count rates | `{packets}/s`, `{requests}/s`, `{operations}/s` |

The Console also tries an unmapped unit lowercased as a formatter ID. `unit-for` suppresses the suffix for those registered formatters too, for example `bytes`, `BYTES`, `µs`, and `reqps`. This does not make UCUM codes case-insensitive: `kBy` is mapped, but `KBy` is not. The `none` and `short` formatters add no unit label, so they do not trigger suppression.

`unit-for` also writes no suffix for an empty unit or `1` (OTel "dimensionless"). Other units become `customUnits` as written. This includes the ambiguous `m` (metres or minutes), `B` (Bel, bytes are `By`), and named counts such as `{requests}`: the Console abbreviates their numbers but does not add the count label.

### Why chart-add sets custom_unit

The Console picks a Statistic's formatter from the unit in the query response, then appends `customUnits` after the formatted value. A suffix on a unit the Console formats repeats the unit (`$1.03K$`, `1MBMBy`).

After `map` or a rate, the response marks the metric's unit as changed, and the Console formats the value only with a `custom_unit` that the query sets. Without it, `map / 3600` on a metric in `s` shows a bare number. So `chart-add` writes `set custom_unit="<unit>";` as the first line of an MPL Statistic query, unless the query already sets one. A `set` line must come before any `param` line.

An omitted suffix leaves both magnitude scaling and the displayed unit to the Console. Do not compensate by rescaling the query.

`tests/unit-for.sh` covers the mapped families, the formatter-ID fallback, and units that keep their label. When the Console changes its unit map or formatter registry, take the new expectations from the Console, not from `unit-for`.

### Percentages and ratios (OTel 0–1 fractions)

OTel metrics represent dimensionless ratios as 0–1 fractions with unit `1`. Examples are availability, error rate, saturation, and hit ratio. The Console does not scale them. Convert in MPL:

```mpl
(
  `<dataset>`:requests_total | where code != #/5../ | map rate | group using sum,
  `<dataset>`:requests_total                          | map rate | group using sum
)
| compute availability using /
| map * 100
| align to $__interval using avg
```

Then pass `chart-add --unit "%"`. The Console adds the sign.
