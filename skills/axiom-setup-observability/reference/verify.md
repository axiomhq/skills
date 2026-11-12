# Verify signals in Axiom

Read this during Phase 5, and again after each business signal added in optional Phase 6 when requested.

Query logs and traces with APL through `queryDataset`. Query metrics with MPL through `queryMetrics`. Never send MPL or a metrics dataset to `queryDataset`.

## Local shape check (level 2)

When backend access is unavailable or SDK output needs inspection, run an installed upstream Collector with this private local configuration, using synthetic data only:

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

Save as a private temporary `collector.yaml` and run `otelcol --config /absolute/path/to/collector.yaml` (use the installed distribution's actual executable). Retain only enabled pipelines. Point the application's enabled OTLP/HTTP signal endpoints at `http://127.0.0.1:14318/v1/{signal}` in a temporary process environment and clear shared and signal-specific authorization headers. Check for explicit SDK configuration that overrides these variables. Containerized applications need a reachable private receiver address; keep it inaccessible from public networks. Inspect resource attributes, context, and signal shape, then restore Axiom endpoints/headers and remove temporary files. Debug output is local evidence only, never backend verification.

## Canary

For every in-scope service, verify only its enabled signals:

1. Generate a fresh random, non-sensitive marker.
2. Run the normal build/test command.
3. Start or invoke the real service through its documented command.
4. Exercise one instrumented request, job, or CLI operation carrying the marker as a safe attribute on enabled spans/logs. Prefer adding an attribute to an existing span or emitting a structured log over adding a debug route or business span.
5. Keep the process alive through its export interval or invoke graceful flush.
6. Inspect exporter/Collector diagnostics and partial-success responses.
7. Run the queries below for each enabled signal. For metrics, select a deterministic representative metric and run its query once before step 4 and once after the export.
8. Confirm resource identity, expected signal shape, no unexplained metric overflow, and, when both signals are enabled, matching trace/span IDs between the canary log and its span.
9. Remove verification-only routes, debug spans, temporary marker plumbing, and local receivers after recording evidence. Preserve useful baseline instrumentation. If cleanup changes startup/export code, repeat a normal operation and confirm export still works.

Do not claim a level without its evidence. Missing query access means backend unverified, not automatically pipeline verified. Console correlation-group setup can remain a documented handoff even after matching IDs are proven in ingested records.

Logs and traces, after substituting the real dataset, service, marker field, and marker:

```apl
['<logs-or-traces>']
| where _time > ago(15m)
| where ['service.name'] == '<service>' and ['<marker-field>'] == '<marker>'
| take 5
```

Do not put the random marker in metric attributes. Select a representative metric whose expected change follows from the exercised operation. Query once before exercising it and record the result. Filter to the verified environment and instance (`service.instance.id` or equivalent bounded test isolation) as well as `service.name`. After the export interval, query again over a window that starts at that exercise. The second result must show the expected change. A count of samples over 15 minutes alone is not that proof: another instance can add samples. Inspect other enabled streams for shape, freshness, and unsafe dimensions; unrelated counters/gauges need not change. For on-demand metrics that emit only under specific conditions, exercise that condition or document why a stream has no samples. If no baseline metric can be triggered deterministically, report the verification gap rather than adding an unrequested business metric.

Read the metric's type and temporality from the dataset metric list. For a cumulative counter, compare the latest value with the baseline. Summing cumulative samples `10, 10, 11` yields `31` when the increase was `1`. For a delta counter, sum the samples in the window. For a histogram, use `interpolate_cumulative_histogram` or `interpolate_delta_histogram` to match its temporality. For a gauge, compare `last`. Resource attributes arrive as tags.

For scalar counters or gauges only (not histograms/summaries):

```mpl
`<metrics-dataset>`:`<metric.name>`[5m..]
| where `service.name` == "<service>"
| align to 1m using last
```

Add the real environment/instance filters. Use `sum` instead of `last` only for a delta counter. For a delta histogram, after substituting the actual tags and metric:

```mpl
`<metrics-dataset>`:`<duration-histogram>`[5m..]
| where `service.name` == "<service>" and `service.instance.id` == "<instance>"
| bucket by `service.name` to 1m using interpolate_delta_histogram(0.90, 0.99)
```

For cumulative temporality use `interpolate_cumulative_histogram(rate, 0.90, 0.99)`. A percentile alone is not a deterministic count-change canary; use the representative counter or appropriate histogram count/rate evidence. See [histograms and summaries](https://axiom.co/docs/mpl/histograms-summaries) and [sample queries](https://axiom.co/docs/mpl/sample-queries). Do not run ordinary `align` or `group` over histogram components to infer a count or value.

If the metrics query names the wrong metric, tag, or aggregation, read [MPL](https://axiom.co/docs/mpl/introduction.md) and the dataset's metric list. Do not add the random marker as a metric attribute.

When the filtered query is empty, list the `service.name` values that did arrive in the same window before changing code:

```apl
['<logs-or-traces>']
| where _time > ago(15m)
| summarize count() by ['service.name']
| take 20
```

```mpl
`<metrics-dataset>`:`<metric.name>`[15m..]
| align to 1m using count
| group by `service.name` using sum
```

A name in that result proves only that some data for that service name arrived. It does not prove the current run, instance, or deployment exported successfully. Check environment/instance, timestamps, sampling, and marker propagation before changing code. No rows means the export, dataset, filter, or time window still needs investigation.

Use the actual field, span, and metric names. Retry a missing backend result for a short bounded interval; never loop indefinitely. For a production sign-off, also exercise graceful shutdown and verify telemetry emitted immediately before exit.

## When export fails

| Evidence | Fix |
|---|---|
| Logs or traces arrive, metrics do not | The metrics request used `x-axiom-dataset` or an events dataset. Use `x-axiom-metrics-dataset` and `otel:metrics:v1`. |
| 401 or 403 | The token, organization, dataset scope, or edge does not match. A token from another region or organization is not valid here. |
| 430 | The organization is over its ingest limit. Wait for `Retry-After` and the `X-IngestLimit-*` headers. Do not resend the same batch immediately. |
| HTTP 200 with `partial_success` | Read the rejected-point reasons. A 200 does not mean every metric point was stored. |
| 413 or a batch drop | The metrics batch exceeds the documented uncompressed limit. Lower the Collector or SDK batch size. |
| 400 and a record-size error | A single log or span is too large. Remove the oversized attribute or body. |
| Nothing appears, but export succeeded | Compare `_time` and `_sysTime`, then retry the query for a short bounded interval. |
