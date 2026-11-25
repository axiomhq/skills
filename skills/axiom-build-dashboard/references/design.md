# Dashboard design

Use these recommendations for new dashboards and requested redesigns.
Follow current Axiom docs for supported configuration.

## Service overview

For a request-serving service, start with request rate, failure percentage,
and latency.

Use the established latency objective to select the percentile.
Otherwise, start with p95 when the data supports it.

Summarize the selected period with Statistic charts.
Include time series to show changes within that period.

Rank route breakdowns by the question:
failed request count for failure volume, or latency for slow routes.
Include request volume and state any limit on the displayed routes.

For availability reporting, use the established service-level objective.
For capacity planning, start with resource utilization and saturation.

## Define the request population

1. Define the operation that counts as one request and the criteria that make
   it a failure.

2. Select telemetry that represents that operation once.
   For checkout traffic, exclude child operations and downstream calls
   from the checkout request count.

3. Establish whether sampling, filtering, or collection gaps affect the data.
   Use complete request measurements for totals.
   If completeness is unknown, label counts as observed requests.

4. Before calculating failure percentage from sampled traces, establish
   whether the sampling policy preserves the proportion of failures.
   If error traces receive preferential treatment, report the observed
   proportion without presenting it as the service failure percentage.

Read [OTel sampling](https://opentelemetry.io/docs/concepts/sampling/) when assessing trace-based measurements.

## Define the measurements

Calculate the overall failure proportion as failed requests divided by total requests.
Combine counts across instances before dividing.
Use matching service, environment, and time scopes.
If the total is zero, leave the proportion undefined.

For complete request observations, calculate average requests per second over the full selected period, including quiet intervals.
Keep collection gaps distinct from quiet intervals.

Calculate combined percentiles from request observations or compatible histogram data.
Averaging instance p95 values does not produce the service p95.
The same applies to percentiles calculated separately for time buckets.

For MetricsDB calculations, inspect the metric type and temporality before selecting its calculation.
Follow [MPL](https://axiom.co/docs/mpl/introduction) and
[histogram and summary guidance](https://axiom.co/docs/mpl/histograms-summaries)
for component selection, aggregation, and percentile support.

## Choose supporting charts

Use Table for ranked contributors and LogStream for individual events.
Include request volume beside failure percentages, so one failure from one request remains distinguishable from widespread failures.

Use a Heatmap to inspect a distribution that percentile lines hide.
Give aggregations and query series meaningful names, such as `Failed requests` and `p95 duration`.
Include the measurement and unit in chart titles or labels.

Read [Dashboard elements](https://axiom.co/docs/dashboard-elements/create) and
[Heatmap](https://axiom.co/docs/dashboard-elements/heatmap) for supported visualizations.

## Stack parts of one total

Use stacked area or bar charts for separate parts of the same total.
Each series must use the same unit and time interval.
Each observation must contribute to only one part.

For checkout requests in one minute, stack 90 successful requests and
10 failed requests to show 100 requests.
Keep a separate total-request series outside that stack.

Use separate lines for latency percentiles.

## Choose the axis

Start with a linear axis.

If positive values span several orders of magnitude, consider a log axis.
Equal distances then represent equal ratios, such as 1, 10, 100, and 1000.

If zero or negative values must remain visible, use a linear axis.
State when a chart uses a log axis.

Follow [Axis configuration](https://axiom.co/docs/dashboard-elements/configure#y-axis).

## Match values to units

Set the display unit to match the query result.
A formatter can change the displayed magnitude without changing the query.

| Query result | Formatter | Display |
| --- | --- | --- |
| 1,000,000 nanoseconds | Nanoseconds | 1 ms |
| 0.023 | Percentage from a 0–1 ratio | 2.3% |
| 2.3 | Percentage from a 0–100 value | 2.3% |

If the query converts nanoseconds to milliseconds, select milliseconds
as the result unit.

For MPL, follow [Unit directives](https://axiom.co/docs/mpl/introduction#directives)
to declare the result unit.
Read [Statistic configuration](https://axiom.co/docs/dashboard-elements/statistic#settings)
for custom labels and decimal precision.

## Choose time behavior and thresholds

Choose the time range to cover the behavior under investigation.
Set refresh frequency according to data arrival and how quickly the reader needs updates.

Use `bin_auto(_time)` for APL trends whose bucket size can vary with the selected range.
For a fixed count or sum threshold, use a fixed interval.
A threshold of 100 errors per minute requires one-minute counts.

Use established objectives or limits for threshold lines.
Axiom compares a stacked chart's total with its threshold.
Dashboard thresholds are visual and do not send notifications.

Follow [TimeSeries thresholds](https://axiom.co/docs/dashboard-elements/time-series#thresholds) and
[dashboard time and refresh configuration](https://axiom.co/docs/dashboards/configure).
For requested notifications, use [axiom-alerting](../../axiom-alerting/SKILL.md).

## Connect dashboard filters

Use shared service and environment filters for views that differ only by those values.
Make filter defaults explicit.

For APL charts, declare each consumed filter through `declare query_parameters`.
Use distinct filter IDs, such as `_service_filter`, to avoid collisions with dataset fields.
Make sure that changing a filter changes every chart intended to consume it.

Follow [Dashboard filters](https://axiom.co/docs/query-data/filters) for declarations,
defaults, dependencies, and MPL filter syntax.

## Scope supporting queries

Provide supporting queries for the service, environment, route, and
time range shown by the chart.

For checkout failures in production from 14:00–15:00, inspect checkout
failures in production during that period.
Apply those restrictions explicitly when the destination does not retain them.

## Unavailable measurements

If the data cannot produce the requested measurement, state the missing data or unsupported operation.
Identify what is needed to produce it.
Keep unavailable measurements distinguishable from measured zeros.
