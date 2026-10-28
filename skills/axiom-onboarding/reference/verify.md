# Verify signals in Axiom

Read this during Phase 5, and again after each business signal added in Phase 6.

Query logs and traces with APL through `queryDataset`. Query metrics with MPL through `queryMetrics`. Never send MPL or a metrics dataset to `queryDataset`.

## Canary

For every service:

1. Generate a fresh random, non-sensitive marker.
2. Run the normal build/test command.
3. Start or invoke the real service through its documented command.
4. Exercise one instrumented request, job, or CLI operation carrying the marker as a safe span/log attribute.
5. Keep the process alive through its export interval or invoke graceful flush.
6. Inspect exporter/Collector diagnostics and partial-success responses.
7. Run the queries below. For a metric, run its query once before step 4 and once after the export.
8. Confirm resource identity, expected signal shape, no unexplained metric overflow, and log-to-trace correlation.

Logs and traces, after substituting the real dataset, service, marker field, and marker:

```apl
['<logs-or-traces>']
| where _time > ago(15m)
| where ['service.name'] == '<service>' and ['<marker-field>'] == '<marker>'
| take 5
```

Metrics cannot carry the random marker. Query once before exercising the operation and record the result. After the export interval, query again over a window that starts at that exercise. The second result must show the change that operation should produce. A count of samples over 15 minutes is not that proof: any other instance with the same `service.name` can add samples.

Read the metric's type and temporality from the dataset metric list. For a cumulative counter, compare the latest value with the baseline. Summing cumulative samples `10, 10, 11` yields `31` when the increase was `1`. For a delta counter, sum the samples in the window. For a histogram, use `interpolate_cumulative_histogram` or `interpolate_delta_histogram` to match its temporality. For a gauge, compare `last`. Resource attributes arrive as tags.

```mpl
`<metrics-dataset>`:`<metric.name>`[5m..]
| where `service.name` == "<service>"
| align to 1m using last
```

Use `sum` instead of `last` only for a delta counter.

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

A name in that result with no marker means the export works and the canary or filter missed. No rows means the export, dataset, or time window is still wrong.

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
