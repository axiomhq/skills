# Configure Axiom

Read this during Phase 3, before selecting datasets or configuring exporters. Follow the organization and credential rules in [SKILL.md](../SKILL.md#phase-3-configure-axiom).

## Sources of truth

Read the current Axiom pages relevant to the setup:

- [Axiom OpenTelemetry ingestion](https://axiom.co/docs/send-data/opentelemetry.md)
- [Axiom sending methods and runtime guides](https://axiom.co/docs/send-data/methods.md)
- [Axiom datasets](https://axiom.co/docs/reference/datasets.md)
- [Axiom edge deployments](https://axiom.co/docs/reference/edge-deployments.md)
- [Axiom tokens](https://axiom.co/docs/reference/tokens.md)
- [Axiom ingestion limits](https://axiom.co/docs/reference/limits.md)
- [Create dataset API](https://axiom.co/docs/restapi/endpoints/createDataset.md)
- [MPL introduction](https://axiom.co/docs/mpl/introduction.md)

## Select the deployment

Choose the deployment with the decision table in `axiom-ingest`. Do not use `axiom-ingest` to create these datasets or send telemetry: its create call omits `kind` and therefore creates an events dataset.

## Signal datasets

For each environment, residency, and tenant-access boundary, create three datasets on the same edge. Names are 1–128 characters and contain only ASCII letters, digits, and `-`.

| Signal | `kind` | OTLP path | Dataset header |
|---|---|---|---|
| Logs | `otel:logs:v1` | `/v1/logs` | `x-axiom-dataset` |
| Traces | `otel:traces:v1` | `/v1/traces` | `x-axiom-dataset` |
| Metrics | `otel:metrics:v1` | `/v1/metrics` | `x-axiom-metrics-dataset` |

List existing datasets before creating any. Reuse one only when its `kind` already matches. A 409 means the name exists; check its kind instead of creating another name blindly.

```bash
skills/axiom-building-dashboards/scripts/metrics/datasets <deployment>
```

Load the deployment the way `axiom-ingest` does, without printing the token. Create each missing dataset with `POST /v2/datasets`:

```bash
curl "${H[@]}" -H 'Content-Type: application/json' -X POST "$url/v2/datasets" \
  -d '{"name":"<prefix>-logs","kind":"otel:logs:v1","description":"<why>","edgeDeployment":"<edge>"}'
```

`<edge>` is the deployment chosen for this environment, such as `US East 1 (AWS)` or `EU Central 1 (AWS)`. Read [edge deployments](https://axiom.co/docs/reference/edge-deployments.md) when the name is not one of those. Repeat with `otel:traces:v1` and `otel:metrics:v1`. Each response's `edgeDeployment` and `edgeDeploymentUrl` must match that choice. A 400 for an unsupported edge means the name is wrong or the organization does not have that edge. The edge cannot be changed after creation. `dataset license limit exceeded` means stop and ask which existing datasets to reuse. A temporary organization has very little dataset capacity, so create only these three.

There is no documented correlation-group API. After the datasets exist, tell the user to open **Datasets → Correlations → New correlation group** and select them. Each log event needs top-level `trace_id` and `span_id`. Keep the spans in the traces dataset. If the logs dataset also has trace fields such as `parent_span_id`, the console searches the logs dataset for the trace and reports that it cannot find it.

Keep every span of one distributed trace in the one traces dataset. Distinguish services with `service.name`.

## Exporter configuration

Every signal request also sends `Authorization: Bearer <API_TOKEN>` from the deployment secret mechanism. Configure the three signals separately. A shared `OTEL_EXPORTER_OTLP_HEADERS` value sends metrics to the wrong header.

In `OTEL_EXPORTER_OTLP_*_HEADERS`, separate headers with commas and use `=`, not HTTP colon syntax:

```bash
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=https://EDGE/v1/logs
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://EDGE/v1/traces
export OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://EDGE/v1/metrics
export OTEL_EXPORTER_OTLP_LOGS_HEADERS="Authorization=Bearer ${AXIOM_TOKEN},x-axiom-dataset=${LOGS_DATASET}"
export OTEL_EXPORTER_OTLP_TRACES_HEADERS="Authorization=Bearer ${AXIOM_TOKEN},x-axiom-dataset=${TRACES_DATASET}"
export OTEL_EXPORTER_OTLP_METRICS_HEADERS="Authorization=Bearer ${AXIOM_TOKEN},x-axiom-metrics-dataset=${METRICS_DATASET}"
```

Export and quote these assignments. Without `export`, a process started from that shell does not receive them. An unquoted `Bearer` value splits at the space, and the shell prints the token while trying to run it as a command.

In SDK or Collector code, use normal header names and values: `Authorization: Bearer <token>` and `x-axiom-dataset: <name>`. Collector `otlphttp` takes the edge base URL and appends the signal path. SDK exporters usually take the full signal URL. Read the installed exporter and make `/v1/{signal}` appear exactly once.

`EDGE` is the dataset's `edgeDeploymentUrl` without a trailing slash. Do not use `api.axiom.co` for OTLP, and do not accept an SDK's default region.

Some platforms accept only a base URL and then append `/v1/metrics`. Set that base to `https://EDGE/v1/ingest/<metrics-dataset>`. Axiom accepts the resulting `https://EDGE/v1/ingest/<metrics-dataset>/v1/metrics`. Do not also put `/v1/metrics` in the base. SDKs and Collectors that can set each signal URL keep the three endpoints above.
