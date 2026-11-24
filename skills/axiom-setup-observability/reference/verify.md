# Verify signals in Axiom

Read this to verify telemetry or diagnose missing signals. Verify only the enabled signals.

Query logs and traces with APL through `queryDataset`. Query metrics with MPL through `queryMetrics`. Never send MPL or a metrics dataset to `queryDataset`. An ingest-only token cannot query: use existing CLI/MCP query access to the same organization or separate query credentials. If neither is available, report backend unverified; do not provision another organization or broaden the application token.

## Status

Report the highest status actually observed, per service and signal:

- **Configured:** bootstrap, resources, endpoints, headers, and secrets are in place and repository checks pass. Not evidence of delivery.
- **Local verified:** a local exporter or receiver shows the expected spans, logs, metrics, resource attributes, and bounded dimensions.
- **Pipeline verified:** exporter or Collector diagnostics show accepted, sent data with no unexplained rejection, drop, or permanent failure, including OTLP `partial_success` responses.
- **Axiom verified:** queries find fresh telemetry from this run in each enabled dataset. This proves baseline delivery, not every metric's calculation or complete coverage.

Production sign-off is separate; see [deployment.md](deployment.md#production-sign-off).

## Verification script

For each in-scope service:

1. **Record** the start time, service name, environment, and the tested instance's `service.instance.id`.
2. **Check:** run the relevant existing build/test commands. Reuse passing results when their inputs have not changed.
3. **Start the app.** If its normal start command is clear, offer to run it yourself. Otherwise ask the user to start it or tell you how. Run it through its real startup so the bootstrap being verified actually loads. If starting it needs a slow build or download (more than about 2 minutes), first give a rough time and offer: run it now, let the user run it, or verify locally first. Run long commands in the background or with visible progress; do not pipe their output through `tail` or otherwise hide it until they finish.
4. **Exercise** one normal request, job, or CLI operation. To make it easy to find, send a W3C `traceparent` header with a trace ID you generate when the operation accepts one; otherwise use instance identity and a narrow time window. Add a temporary log or span attribute only if the run still cannot be identified. Do not add a business span for verification.
5. **Flush:** keep the process alive through its export interval, or trigger its graceful flush.
6. **Inspect** exporter/Collector diagnostics and `partial_success` responses.
7. **Poll Axiom** with the queries below. Data usually appears within seconds of export. Set one deadline of roughly the export interval plus two minutes; do not restart it on each empty result. Check resource identity, signal shape, no unexplained metric overflow, and matching trace/span IDs when logs and traces are both enabled. If key context was added, confirm its attributes and spans appear on this run's traces.
8. **Show the user** what arrived: quote a few fields from the actual records (service, operation name, trace ID, timestamp, metric name and value) together with the query or an Axiom link. Do not just hand over a link.
9. **Run the quality checks** in [Quality checks](#quality-checks) on this run's data and report any failures as warnings.
10. **Clean up** temporary verification code and local receivers. Repeat the affected check only if cleanup changes startup or export code.

Also run the [full-setup.md](full-setup.md) checks for any items that are turned on (all of them in full setup).

If nothing arrives by the deadline, follow [Missing results](#missing-results) and fix a diagnosed problem. Do not rebuild or re-poll without new evidence. If the cause remains unknown, report the observed status and blocker. Do not change application responses, timeouts, or retries just to make verification easier.

## Logs and traces

OTLP data in Axiom uses these fields in both logs and traces datasets, whether the dataset kind is `axiom:events:v1` or `otel:traces:v1`/`otel:logs:v1`: `trace_id`, `span_id`, top-level `service.name` and `service.instance.id`, and `resource.deployment.environment.name` for the environment. Traces also have `parent_span_id` (empty on root spans), lowercase `kind` (`server`, `client`, `internal`, `producer`, `consumer`), `name`, `duration`, and `status.code`. Logs also have `severity_number`, `severity_text`, and `body`. If a field is missing, check the dataset's field list rather than guessing.

```apl
['<logs-or-traces>']
| where _time > ago(15m)
| where ['service.name'] == '<service>' and trace_id == '<trace-id>'
| take 5
```

Add `['resource.deployment.environment.name'] == '<environment>'` and `['service.instance.id'] == '<instance>'` when other environments or replicas send to the same dataset.

For logs-only setups or operations without a known trace ID, use existing correlation fields with instance and time filters. A service name and a broad recent window alone do not identify this run.

## Metrics

Pick a representative runtime or framework metric from the dataset's metric list and confirm fresh points from this run. Filter by the `service.name` and `service.instance.id` tags, and by the environment tag (usually `deployment.environment.name`) when the app sets one. Confirm tag names with the dataset's tag list (`listMetricTags`); resource attributes appear as tags without a `resource.` prefix. A flat gauge or unchanged counter still proves delivery when its samples are from this run; old samples or another replica's points do not. If `service.instance.id` is not unique per process, also confirm the samples start after the recorded start time. Do not add a custom metric or put verification IDs in metric dimensions.

Set the time range with the query tool's start and end time, starting at the recorded start time. Do not put a time range such as `[5m..]` after the metric name: the query API rejects it when the range is passed separately. To find the tested instance's `service.instance.id`, group by it (`` | align using last | group by `service.name`, `service.instance.id` using max ``); tag-value lookups can return nothing for this tag even when it is present.

Scalar counters or gauges (not histograms or summaries):

```mpl
`<metrics-dataset>`:`<metric.name>`
| where `service.name` == "<service>" and `service.instance.id` == "<instance>" and `deployment.environment.name` == "<environment>"
| align to 1m using last
```

Use `sum` instead of `last` only for a delta counter. Fresh runtime metrics alone do not verify an unexercised request metric.

Delta histogram:

```mpl
`<metrics-dataset>`:`<duration-histogram>`
| where `service.name` == "<service>" and `service.instance.id` == "<instance>" and `deployment.environment.name` == "<environment>"
| bucket by `service.name` to 1m using interpolate_delta_histogram(0.90, 0.99)
```

For cumulative temporality use `interpolate_cumulative_histogram(rate, 0.90, 0.99)`. Do not run ordinary `align` or `group` over histogram components. See [histograms and summaries](https://axiom.co/docs/mpl/histograms-summaries) and [sample queries](https://axiom.co/docs/mpl/sample-queries).

## Quality checks

Arrival proves delivery; these checks show whether the data is usable. Run them once data has arrived, only for enabled signals, filtered to this service, environment, and run window. They are warnings, not blockers: setup is still done when they fail. Many findings on a first run come from libraries, proxies, or other services rather than the setup, so separate the two: report only findings the setup can fix as warnings, and mention the rest in one line as context. Report each warning with its [Instrumentation Score](https://github.com/instrumentation-score/spec/tree/main/rules) rule ID, the likely cause, and a suggested fix, and offer to fix it rather than fixing it automatically.

The field names below are the standard OTLP fields described in [Logs and traces](#logs-and-traces).

**Broken traces (SPA-002).** Count roots across the whole trace, not just this service: a downstream service's spans always have a parent in another service, so filtering by service before counting would flag every healthy downstream trace.

```apl
['<traces>']
| where _time between (datetime(<run-start>) .. now())
| where trace_id != '<verification-trace-id>'
| summarize roots = countif(isempty(parent_span_id)), service_spans = countif(['service.name'] == '<service>') by trace_id
| where service_spans > 0
| summarize traces = count(), traces_without_root = countif(roots == 0)
```

Exclude the verification trace: its first span points at the synthetic parent in the `traceparent` you sent, so it never has a local root. A caller that is not instrumented sends no trace context, so this service's span becomes the root and the trace passes. A trace has no root here only when the caller did send context but its spans are missing: it exports to another dataset or vendor, a proxy or gateway added the `traceparent`, the parent was sampled out, or the trace started before `<run-start>`. Report a non-zero count with those possibilities rather than as a defect; it points to a setup problem only when the caller is known to be instrumented and exporting to this dataset.

**Root CLIENT spans (SPA-004).** A trace that starts with an outgoing call usually means the incoming request or job was not instrumented:

```apl
['<traces>']
| where _time between (datetime(<run-start>) .. now())
| where ['service.name'] == '<service>' and isempty(parent_span_id)
| summarize count() by kind, name
```

Expect `client` roots from browser code (fetch and XHR spans), background jobs, and startup calls without an enclosing operation; report them with that context. A `client` root from a server's request path means the server framework is not instrumented.

**Logs without severity (LOG-002).** Check `severity_number`, not only `severity_text`: some loggers set the text (for example `INFO`) but leave the number empty.

```apl
['<logs>']
| where _time between (datetime(<run-start>) .. now())
| where ['service.name'] == '<service>'
| summarize total = count(), missing_number = countif(isnull(severity_number) or severity_number == 0), missing_text = countif(isempty(severity_text))
```

A non-zero `missing_number` usually means the logger bridge is not mapping levels. Check the bridge configuration in the recipe.

**Metrics without units (MET-002, MET-005).** Check only the metrics the application's own code defines. List the dataset's metrics (`listMetrics`, or the metric list in the console) and check their `unit` column: an empty unit fails MET-002, and a unit repeated in the name (for example `checkout_duration_ms`) fails MET-005. Quick start adds no custom metrics, so this check usually has nothing to evaluate there. Metrics from runtime instrumentation, libraries, the Collector, or Prometheus scrapes often fail these rules (for example `scrape_duration_seconds`, or `kafka.*` and `db.sql.*` metrics without units). They are not setup issues: at most mention them in one line, and never as a warning.

Sensitive data (SPA-006, LOG-003, MET-008, RES-010) and resource identity (RES-001, RES-002, RES-005, RES-007) are already covered by the main checks and [privacy.md](privacy.md).

## Local check

Use this when backend access is unavailable or SDK output needs inspection. Use synthetic data only.

**Console exporter (first choice).** In a temporary process environment, set the exporter of each enabled signal (`OTEL_TRACES_EXPORTER`, `OTEL_LOGS_EXPORTER`, `OTEL_METRICS_EXPORTER`) to `console` and leave disabled signals at `none`. Run one operation and inspect resource attributes, span names, context, and attribute keys. Language recipes note runtime-specific differences. Afterward, set each exporter back to its previous value: `otlp` for enabled signals, `none` for disabled ones.

**Local Collector (when installed, or to test OTLP export itself).** Run an upstream Collector with this private temporary configuration:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 127.0.0.1:14318
exporters:
  debug:
    verbosity: detailed
service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [debug]
    logs:
      receivers: [otlp]
      exporters: [debug]
    metrics:
      receivers: [otlp]
      exporters: [debug]
```

Run `otelcol --config /absolute/path/to/collector.yaml` (use the installed distribution's executable) and keep only enabled pipelines. Point the app's enabled signal endpoints at `http://127.0.0.1:14318/v1/{signal}` in a temporary process environment and clear authorization headers. Check for explicit SDK configuration that overrides these variables. Containerized apps need a reachable private receiver address. Restore the Axiom endpoints and headers and remove temporary files afterward.

Local output is local evidence only, never backend verification.

## Missing results

If a query names the wrong metric, tag, or aggregation, consult the dataset's metric list and the relevant [MPL guidance](https://axiom.co/docs/mpl/introduction.md).

When the filtered query is empty, list the service names that did arrive in the same window before changing code:

```apl
['<logs-or-traces>']
| where _time > ago(15m)
| summarize count() by ['service.name']
| take 20
```

For scalar metrics (not histograms or summaries):

```mpl
`<metrics-dataset>`:`<scalar-metric.name>`
| align to 1m using count
| group by `service.name` using sum
```

A service name in these results proves only that some data with that name arrived, not that this run, instance, or deployment exported successfully. Check environment, instance, timestamps, sampling, correlation fields, and export diagnostics before changing code. No rows means the export, dataset, filter, or time window needs investigation; it is not by itself a reason to rebuild.

## When export fails

| Evidence | Fix |
|---|---|
| Logs or traces arrive, metrics do not | The metrics request names a dataset that is not `otel:metrics:v1` (a 400 about the dataset kind), often because a shared `x-axiom-dataset` points at the logs or traces dataset. Send `x-axiom-metrics-dataset` with a metrics dataset. |
| 415 on metrics | OTLP JSON metrics are not enabled for the organization. Send `application/x-protobuf` (`OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`). |
| 404 saying "that is the api.axiom.co ingest path" | The exporter used an `api.axiom.co`-style path such as `/v1/datasets/<dataset>/traces` on the edge host. Use the path the error names, or `/v1/traces`, `/v1/logs`, `/v1/metrics` with dataset headers. |
| 401 or 403 | The token, organization, dataset scope, or edge does not match. A token from another region or organization is not valid here. |
| 430 | The organization is over its ingest limit. Wait for `Retry-After` and the `X-IngestLimit-*` headers. Do not resend the same batch immediately. |
| HTTP 200 with `partial_success` | Read the rejected-point reasons. A 200 does not mean every metric point was stored. |
| 413 or a batch drop | The metrics batch exceeds the documented uncompressed limit. Lower the Collector or SDK batch size. |
| 400 and a record-size error | A single log or span is too large. Remove the oversized attribute or body. |
| Exit code 0 but nothing exported | The process exited before flushing, or the exporter is unset (`none`). Check the recipe's shutdown and exporter settings. |
| Nothing appears, but export succeeded | Compare `_time` and `_sysTime`, then retry the query until the deadline. |
