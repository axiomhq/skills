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
5. Use `align to $__interval using …`, never a fixed window. The runtime injects `param $__interval: Duration;`; don't add it to the chart string.
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

`chart-add --unit` takes the metric's own unit and maps it via `scripts/metrics/unit-for`. [`chart-config.md` § Units](./chart-config.md#units) lists the unit fields each chart kind accepts and shows. This section covers the metrics-specific path.

### Workflow

Configure metric units with these steps:

1. Read the metric's unit from `listMetrics`, e.g. `{"type":"Gauge","temporality":null,"unit":"Cel"}`.
2. If the metric unit is `%`, omit `--unit`. For a 0–1 ratio, multiply by 100 and pass `--unit "%"`.
3. Otherwise, pass the unit to `chart-add --unit` unchanged. Never translate it to a symbol (`USD`, not `$`). `unit-for` decides whether the Statistic needs a suffix:
   ```bash
   scripts/metrics/unit-for "Cel"   # -> {"customUnits":"Cel"}
   scripts/metrics/unit-for "ms"    # -> {}  (the Console formats ms itself)
   scripts/metrics/unit-for "USD"   # -> {}  (the Console adds the $ prefix)
   scripts/metrics/unit-for "%"     # -> {"customUnits":"%"}
   ```
4. For other chart types, `chart-add` writes `customUnits`, which the Console does not show. Encode the unit in `--name` (`"P95 Latency (ms)"`).

### Mapping reference

The Console formats these units from the metric's own unit. The following units need no suffix:

| Kind | Units |
|---|---|
| Currency (prefix) | `USD`, `GBP`, `EUR`, `BTC` |
| Time | `ns`, `us`, `ms`, `s`, `min`, `h`, `d` |
| Frequency | `Hz` |
| Bytes (IEC) | `By`, `KiBy`, `MiBy`, `GiBy`, `TiBy`, `PiBy` |
| Bytes (SI) | `kBy`, `MBy`, `GBy`, `TBy`, `PBy` |
| Byte rates | `By/s`, `kBy/s`, `MBy/s`, `GBy/s`, `TBy/s`, `PBy/s` |
| Bit rates | `bit/s`, `kbit/s`, `Mbit/s`, `Gbit/s`, `Tbit/s`, `Pbit/s` |
| Count rates | `{packets}/s`, `{requests}/s`, `{operations}/s` |

The Console also tries an unmapped unit lowercased as a formatter ID. `unit-for` suppresses the suffix for those registered formatters too, for example `bytes`, `BYTES`, `µs`, and `reqps`. This does not make UCUM codes case-insensitive: `kBy` is mapped, but `KBy` is not. The `none` and `short` formatters add no unit label, so they do not trigger suppression.

`unit-for` also writes no suffix for an empty unit or `1` (OTel "dimensionless"). Other units become `customUnits` as written. This includes the ambiguous `m` (metres or minutes), `B` (Bel, bytes are `By`), and named counts such as `{requests}`: the Console abbreviates their numbers but does not add the count label. `%` remains an intentional exception for converted ratios, described below.

### Why these suffixes are suppressed

Verified against Console commit `80a95cb572548b4aec58185c26bbf4e1f79335ce` on 2026-10-19:

- [`ElementsDatasetStore.ts`](https://github.com/axiomhq/ctrl/blob/80a95cb572548b4aec58185c26bbf4e1f79335ce/apps/console/src/hubs/dash/stores/ElementsDatasetStore.ts#L205) maps metric units to formatter IDs and falls back to the lowercased unit. [`units.ts`](https://github.com/axiomhq/ctrl/blob/80a95cb572548b4aec58185c26bbf4e1f79335ce/apps/console/src/hubs/dash/util/elements/units/units.ts) registers the actual formatters.
- [`StatisticChart.tsx`](https://github.com/axiomhq/ctrl/blob/80a95cb572548b4aec58185c26bbf4e1f79335ce/apps/console/src/hubs/dash/components/charts/StatisticChart.tsx#L123) appends `customUnits` after formatting. It does not replace the formatter's unit.

Executing the pinned Console formatters and appending the helper's actual `customUnits` reproduced these results. This checks the formatting composition, not a live dashboard rendering:

| Metric unit | Value | Before correction | After correction |
|---|---:|---|---|
| `MBy` | 1 | `1MBMBy` | `1MB` |
| `By/s` | 1000 | `1kB/sBy/s` | `1kB/s` |
| `bit/s` | 1000 | `1kbpsbit/s` | `1kbps` |
| `{requests}/s` | 1000 | `1K reqps{requests}/s` | `1K reqps` |
| `bytes` | 1024 | `1KiBbytes` | `1KiB` |

An omitted suffix leaves both magnitude scaling and the displayed unit to the Console. Do not compensate by rescaling the query. This mapping assumes the result retains the supplied unit; MPL `custom_unit` and `ignore_unit` can change which formatter the result receives.

`tests/unit-for.sh` covers the mapped families, formatter-ID fallback, and units that must retain labels. `tests/test-script-output.sh` exercises the same regression through `chart-add --mpl`, including preservation of custom units and the `%` ratio suffix. The corrected expectations fail against the original helper; rerun both when changing unit handling. When the Console changes, compare both its mapping and formatter registry rather than deriving expected test values from `unit-for` itself.

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

Then pass `chart-add --unit "%"`. If the metric's own unit is already `%`, omit `--unit`: the Console adds the sign itself.
