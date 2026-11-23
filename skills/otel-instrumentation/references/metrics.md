# Metrics

Use metrics for rates, distributions and current values.

For metric names and units, read the [OTel metric conventions](https://opentelemetry.io/docs/specs/semconv/general/metrics/).
For convention versions and attributes, use [otel-semantic-conventions](../../otel-semantic-conventions/SKILL.md).

1. Inspect enabled instrumentation and its output before adding a metric. Reuse an existing metric when it measures the required behavior.

2. Choose an [OTel instrument](https://opentelemetry.io/docs/specs/otel/metrics/supplementary-guidelines/#instrument-selection) using the table below. Record events where they occur. Use observable callbacks to report existing absolute values during collection.

3. Define the boundary of each measurement. For operation durations, include failures and measure elapsed time with a monotonic clock. For synchronous UpDownCounters, pair increments and decrements with identical attributes, including failure paths. Derive rates and percentiles in [MPL](https://axiom.co/docs/mpl/sample-queries). For histograms, follow [Axiom’s query guidance](https://axiom.co/docs/mpl/histograms-summaries) to select components and calculate distributions.

4. Select an aggregation compatible with [Axiom’s current metric support](https://axiom.co/docs/query-data/metrics#supported-data-types). For histograms, reuse suitable bucket boundaries or select boundaries that resolve the required thresholds.

5. Keep attributes that support the intended filters and comparisons. Account for SDK memory and [cardinality limits](https://opentelemetry.io/docs/specs/otel/metrics/sdk/#cardinality-limits). Inspect existing matching [SDK Views](https://opentelemetry.io/docs/specs/otel/metrics/sdk/#measurement-processing) before changing aggregation or retained attributes. Preserve the intended metric streams when configuring Views. Where supported, select attributes before aggregation. Keep output within [Axiom’s current ingestion limits](https://axiom.co/docs/reference/limits#limits-on-ingested-metrics).

## Instrument selection

| Instrument | Use for | Example |
| --- | --- | --- |
| Counter | Non-negative increments to a total | Orders created |
| UpDownCounter | Positive and negative changes to a total | Active checkouts |
| Histogram | Distributions of individual measurements | Checkout duration |
| Gauge | Current values that do not meaningfully sum across instances | CPU utilization |

## Examples

Acme’s checkout service handles `POST /checkout`. The team wants to compare successful and failed requests and investigate slow checkouts.
The service already uses a View to configure its request histogram.

| Directive | Checkout example |
| --- | --- |
| 1. Reuse | Existing HTTP instrumentation emits `http.server.request.duration`. Use it for request latency. |
| 2. Choose | If checkout completion is not already measured, increment an order counter after the order is created. |
| 2. Observe | If checkout already tracks its active count, report that total through an observable UpDownCounter during collection. |
| 3. Record | A failed request takes `250 ms`. Include its `0.25 s` duration in the request histogram. |
| 3. Balance | For a synchronous UpDownCounter, record `+1` when checkout starts. Record `-1` with identical attributes after success or failure. |
| 4. Aggregate | Checkout’s existing histogram has a `0.5 s` boundary and a supported aggregation. Reuse it. |
| 5. Select attributes | Update checkout’s existing View to retain `http.route` and integer `http.response.status_code` for failure comparisons. Exclude order IDs because these aggregate queries do not use them. |
