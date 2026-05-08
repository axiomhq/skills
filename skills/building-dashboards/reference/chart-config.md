# Chart Configuration Options

Charts support JSON configuration options beyond the query. These are set at the chart level.

## Common Options (All Charts)

```json
{
  "overrideDashboardTimeRange": false,
  "overrideDashboardCompareAgainst": false,
  "hideHeader": false
}
```

## Metrics/MPL Query (MetricsDB Charts)

Metrics charts require both `query.apl` (the MPL pipeline string) and `query.metricsDataset` (the dataset name, e.g. `"otel-metrics"`). The `metricsDataset` field is what flags the chart as MPL; without it the backend treats `apl` as APL and the chart misbehaves. Do not send `query.mpl` — the create API rejects it. Run `scripts/metrics/metrics-spec` to learn the full syntax before composing queries.

### Minimal Metrics Query

```json
{
  "type": "TimeSeries",
  "query": {
    "apl": "`otel-metrics`:`system.cpu.utilization`",
    "metricsDataset": "otel-metrics"
  }
}
```

### Metrics Query with Filters and Transformations

```json
{
  "type": "TimeSeries",
  "query": {
    "apl": "`otel-metrics`:`http.server.duration`\n| where `service.name` == \"api\"\n| where `deployment.environment` == \"prod\"\n| align to $__interval using avg\n| group by `service.name` using avg",
    "metricsDataset": "otel-metrics"
  }
}
```

For full contract details, see `reference/metrics-mpl.md`.

## Unit Configuration (Cross-Chart)

Unit-related fields by chart type:

| Chart type | `unit` (enum) | `customUnits` (suffix) | Notes |
|---|:---:|:---:|---|
| `Statistic` | ✅ accepted | ✅ accepted | **Both fields are required to render a suffix.** `unit` controls value scaling/formatting (e.g. `Percent100` scales 0–100, `Byte` abbreviates to GB/MB). `customUnits` is what actually paints the suffix string (`%`, `ms`, `req/s`, …). Setting `unit` alone does not append the suffix. |
| `TimeSeries` | ❌ rejected on create (`Unrecognized key: "unit"`) | ✅ accepted by API, round-trips | **Always also encode the unit in the chart `name`** (e.g. `"P95 Latency (ms)"`) so the header is self-describing. |
| `Heatmap` | ❌ rejected | ✅ accepted | Same guidance as TimeSeries — encode the unit in `name`. |
| `Pie` | ❌ rejected | ✅ accepted | Same guidance — encode the unit in `name`. |
| `Table` | ❌ rejected | ✅ accepted | Same guidance — encode the unit in `name`. |
| `LogStream` | ❌ rejected | ✅ accepted | Same guidance — encode the unit in `name`. |
| `Note` | n/a | n/a | n/a (Markdown panel, no values). |

### Statistic: the `unit` + `customUnits` pairing

> **⚠️** A Statistic chart with `unit: "Percent100"` and **no `customUnits`** renders the value as bare `99.5` — the `%` sign is missing. To get `99.5%` you must set **both** `unit: "Percent100"` and `customUnits: "%"`.

The two fields play different roles and you generally want both:

- **`unit` (enum)** — picks a value formatter. `Percent100` interprets the input as already-scaled 0–100. `Byte` abbreviates `1234567` to `1.2 MB`. `TimeMS` abbreviates `90123` to `1.5 min`. With no `unit` set, values render as raw numbers.
- **`customUnits` (string)** — the literal suffix appended to the formatted value. With `unit: "Byte"` the formatter already says `1.2 MB`, so leave `customUnits` empty unless you want a trailing label like `1.2 MB / pod`. With `unit: "Percent100"`, set `customUnits: "%"` to get the percent sign.

Canonical pattern for an availability/error-rate Statistic backed by an OTel ratio metric:

```mpl
( … success_rate, … total_rate )
| compute availability using /
| map * 100                          // 0–1 fraction → 0–100
| align to $__interval using avg
```

```json
{
  "type": "Statistic",
  "unit": "Percent100",
  "customUnits": "%",
  "query": { "…": "…" }
}
```

### TimeSeries / Heatmap / Pie / Table / LogStream: only `customUnits`

These chart types reject the `unit` enum on the create/update API (`Unrecognized key: "unit"`). They accept `customUnits` and the field round-trips through GET. Recommended approach:

- Set `customUnits` if you want a suffix — it does no harm and persists through the API.
- **Always also include the unit in the chart `name`**, e.g. `"Memory (MB)"`, `"P95 Latency (s)"`. The header label is the most reliable mechanism for non-Statistic charts.
- For magnitude conversion, scale in the MPL pipeline (`| map / 1048576` for bytes → MB, `| map * 100` for 0–1 ratio → percent) since `customUnits` is purely a label, not a formatter.

## Statistic Options

```json
{
  "type": "Statistic",
  "colorScheme": "Blue",
  "customUnits": "req/s",
  "unit": "Auto",
  "showChart": true,
  "hideValue": false,
  "errorThreshold": "Above",
  "errorThresholdValue": "100",
  "warningThreshold": "Above",
  "warningThresholdValue": "50",
  "invertTheme": false
}
```

> **API gotcha:** `decimals` is returned by GET and may appear in existing dashboards, but the create API rejects it. Omit `decimals` from create payloads.

| Option | Values | Description |
|--------|--------|-------------|
| `colorScheme` | Blue, Orange, Red, Purple, Teal, Yellow, Green, Pink, Grey, Brown | Color theme |
| `customUnits` | string | Free-form unit suffix (e.g., "ms", "req/s"). Used verbatim — no smart abbreviation. |
| `unit` | Auto, Abbreviated, Byte, KB, MB, GB, TimeMS, TimeSec, Percent, etc. | Value formatting (Statistic only — rejected on other chart types) |
| `decimals` | number | Decimal places in readback/GET payloads; omit on create because the API rejects it |
| `showChart` | boolean | Show sparkline |
| `hideValue` | boolean | Hide the main value |
| `errorThreshold` | Above, AboveOrEqual, Below, BelowOrEqual, AboveOrBelow | Error condition |
| `errorThresholdValue` | string | Error threshold value |
| `warningThreshold` | same as error | Warning condition |
| `warningThresholdValue` | string | Warning threshold value |
| `invertTheme` | boolean | Invert colors |

### Available Units

- **Numbers**: `Auto`, `Abbreviated`
- **Data**: `Byte`, `Kilobyte`, `Megabyte`, `Gigabyte`
- **Data rates**: `BitsSec`, `BytesSec`, `KilobitsSec`, `KilobytesSec`, `MegabitsSec`, `MegabytesSec`, `GigabitsSec`, `GigabytesSec`
- **Time**: `TimeNS`, `TimeUS`, `TimeMS`, `TimeSec`, `TimeMin`, `TimeHour`, `TimeDay`
- **Percent**: `Percent100` (input is a percentage, 0–100). **Use this for percentage stats and pair with `customUnits: "%"` to actually display the percent sign — see the warning below.**

> **⚠️ Percent vs Percent100, and the `customUnits` pairing requirement.**
>
> 1. OTel and Prometheus emit ratios as fractions in `0.0–1.0` (e.g. availability of `1.0` = 100%). The Axiom `Percent` enum does **not** auto-multiply by 100 — `1.0` renders as bare `1`, not `100%`. Always convert to 0–100 in MPL and use `Percent100`:
>
>    ```mpl
>    ( … success_rate, … total_rate ) | compute availability using /
>    | map * 100
>    | align to $__interval using avg
>    ```
>
> 2. **`Percent100` alone does not render the `%` suffix.** A Statistic with `unit: "Percent100"` and no `customUnits` shows `99.5`, not `99.5%`. To get the percent sign you must also set `customUnits: "%"`:
>
>    ```json
>    { "type": "Statistic", "unit": "Percent100", "customUnits": "%", "query": {"…":"…"} }
>    ```
>
>    The same pairing logic applies to other `unit` enums when you want a custom suffix appended to the formatted value (e.g. `unit: "Byte", customUnits: "/ pod"` → `1.2 MB / pod`).
- **Currency**: `CurrencyUSD`, `CurrencyEUR`, `CurrencyGBP`, `CurrencyCAD`, `CurrencyAUD`, `CurrencyJPY`, `CurrencyINR`, `CurrencyCZK`, `CurrencyPLN`
- **Date**: `DateDateTime`, `DateFromNow`, `DateYYYYMMDDHHmmss`

> **For metrics-backed Statistic charts:** prefer running `scripts/metrics/unit-for <unit>` to map the metric's UCUM/OTel unit (from `metrics-info … metrics <m> info`) to the right enum, falling back to `customUnits` automatically when the unit isn't representable as an enum. See [metrics-mpl.md § Unit Handling](./metrics-mpl.md#unit-handling).

## TimeSeries Options

TimeSeries supports `customUnits` (free-form suffix) at the chart top level — see the [Unit Configuration](#unit-configuration-cross-chart) table above. The `unit` enum is **not** accepted (`Unrecognized key: "unit"`).

```json
{
  "type": "TimeSeries",
  "customUnits": "req/s",
  "query": { "apl": "…" }
}
```

Other TimeSeries chart options are stored in `query.queryOptions.aggChartOpts` as a JSON string.

### Key Formats

**Important:** The `"*"` wildcard is unreliable. Always use the specific key format derived from your query.

#### Deriving the Key

The key format depends on how the column is computed:

| Query Pattern | Key Format |
|---------------|------------|
| `summarize count()` | `{"alias":"count_","op":"count"}` |
| `summarize sum(field)` | `{"alias":"sum_field","op":"sum"}` |
| `summarize ['Name'] = sum(field) / 1000` | `{"alias":"Name","field":"field","op":"computed"}` |
| `summarize ['Name'] = round(sum(field), 1)` | `{"alias":"Name","field":"field","op":"computed"}` |

**Rule:** If the column uses any expression (math, `round()`, etc.), use `"op":"computed"` and include the source `"field"`.

#### Simple Aggregation Example

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

#### Computed Column Example

For `['Ingest GB'] = round(sum(['properties.hourly_ingest_bytes']) / 1e9, 1)`:

```json
{
  "aggChartOpts": "{\"{\\\"alias\\\":\\\"Ingest GB\\\",\\\"field\\\":\\\"properties.hourly_ingest_bytes\\\",\\\"op\\\":\\\"computed\\\"}\":{\"variant\":\"bars\",\"displayNull\":\"auto\"}}"
}
```

**Note:** The `field` value is the source field name without brackets or the `properties.` prefix path as written in the query.

### View Mode (timeSeriesView)

Controls what the TimeSeries panel displays. Set in `query.queryOptions.timeSeriesView`.

| Value | Description |
|-------|-------------|
| `charts` | Chart only (default) |
| `resultsTable` | Summary totals table only |
| `charts\|resultsTable` | Chart with totals table below — shows both the time series and an aggregated summary |

```json
{
  "type": "TimeSeries",
  "query": {
    "apl": "['logs'] | summarize count() by bin_auto(_time), service",
    "queryOptions": {
      "timeSeriesView": "charts|resultsTable"
    }
  }
}
```

### Per-Series Options (inside aggChartOpts)

| Option | Values | Description |
|--------|--------|-------------|
| `variant` | `line`, `area`, `bars` | Chart display mode |
| `scaleDistr` | `linear`, `log` | Y-axis scale |
| `displayNull` | `auto`, `null`, `span`, `zero` | Missing data handling |

### displayNull Values

- `auto`: Best representation based on chart type
- `null`: Skip/ignore missing values (gaps in chart)
- `span`: Join adjacent values across gaps
- `zero`: Fill missing with zeros

## LogStream / Table Options

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

| Option | Type | Description |
|--------|------|-------------|
| `columns` | array | Column order and widths (objects with `name` and `width`) |
| `fontSize` | string | Font size (e.g., "12px") |
| `highlightSeverity` | boolean | Color-code by log level |
| `showRaw` | boolean | Show raw JSON |
| `showEvent` | boolean | Show event column |
| `showTimestamp` | boolean | Show timestamp column |
| `wrapLines` | boolean | Wrap long lines |
| `hideNulls` | boolean | Hide null values |

## Pie Options

```json
{
  "type": "Pie",
  "customUnits": "evt",
  "hideHeader": false
}
```

Pie accepts `customUnits` (suffix, no abbreviation). The `unit` enum is rejected — see the [Unit Configuration](#unit-configuration-cross-chart) table.

## Note Options

```json
{
  "type": "Note",
  "text": "## Section Header\n\nMarkdown content here.",
  "variant": "default"
}
```

Note content supports GitHub Flavored Markdown.

## Heatmap Options

Heatmap charts use the default options. Color scheme is fixed to blue gradient. Heatmap accepts `customUnits` (the `unit` enum is rejected — see the [Unit Configuration](#unit-configuration-cross-chart) table).

```json
{
  "type": "Heatmap",
  "customUnits": "ms",
  "query": {
    "apl": "['logs'] | summarize histogram(duration_ms, 15) by bin_auto(_time)"
  }
}
```

## Annotations

Display deployment markers, incidents, or custom events on charts.

Annotations are managed via the Axiom API `/v2/annotations` endpoint:

```bash
curl -X 'POST' 'https://api.axiom.co/v2/annotations' \
  -H 'Authorization: Bearer $AXIOM_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "time": "2024-03-18T08:39:28.382Z",
    "type": "deploy",
    "datasets": ["http-logs"],
    "title": "Production deployment",
    "description": "Deploy v2.1.0",
    "url": "https://github.com/org/repo/releases/tag/v2.1.0"
  }'
```

Or use GitHub Actions:
```yaml
- name: Add annotation
  uses: axiomhq/annotation-action@v0.1.0
  with:
    axiomToken: ${{ secrets.AXIOM_TOKEN }}
    datasets: http-logs
    type: "deploy"
    title: "Production deployment"
```

## Comparison Period (Against)

Compare current time range against a historical period:
- `-1D`: Same time yesterday
- `-1W`: Same time last week
- Custom offset

Use in dashboard URL: `?t_qr=24h&t_against=-1d`

## Custom Time Range per Panel

Individual panels can override the dashboard time range:
- Set `overrideDashboardTimeRange: true` in chart config
- Via UI: Edit panel → Time range → Custom
