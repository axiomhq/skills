# Route enabled signals to Axiom

Read this when configuring exporters, whether destinations were supplied or provisioned. Resource creation is separate: read [provision.md](provision.md) only for missing resources.

## Use the supplied destinations

Keep the selected config path, deployment, environment, datasets, edge, and secret variable names from the launch brief. Do not replace them with a default organization or infer a region from an SDK default. Supplied destinations do not require dataset listing or management credentials before instrumentation; if read access is available, inspect compatibility without mutating resources. On an actual mismatch or rejection, report the specific gap rather than silently selecting another destination.

Use a dedicated dataset per enabled signal and preserve existing correlation groups:

| Signal | OTLP path | Dataset header |
|---|---|---|
| Logs | `/v1/logs` | `x-axiom-dataset` |
| Traces | `/v1/traces` | `x-axiom-dataset` |
| Metrics | `/v1/metrics` | `x-axiom-metrics-dataset` |

The dataset's full HTTPS `edgeDeploymentUrl` is the ingest origin. It is distinct from an API identifier such as `cloud.us-east-1.aws` and a display label such as `US East 1 (AWS)`. Validate the destination before attaching credentials. See [Axiom OTLP ingestion](https://axiom.co/docs/send-data/opentelemetry) for the current routing contract.

For correlated logs, preserve top-level `trace_id` and `span_id`; keep spans in the traces dataset. Keep all spans of a distributed trace together and distinguish services with `service.name`.

## Exporter configuration

Every enabled signal request also sends `Authorization: Bearer <API_TOKEN>` from the deployment secret mechanism. Configure only enabled signals, separately. A shared dataset header in `OTEL_EXPORTER_OTLP_HEADERS` cannot route logs/traces and metrics correctly; use signal-specific dataset headers. Shared authorization alone is not a routing error.

In `OTEL_EXPORTER_OTLP_*_HEADERS`, separate headers with commas and use `=`, not HTTP colon syntax. Follow the installed exporter's [OTLP environment header format](https://opentelemetry.io/docs/specs/otel/protocol/exporter/#specifying-headers-via-environment-variables), including percent-encoding spaces in values. The example uses `Bearer%20` for the authorization separator; SDK/Collector header maps instead use the literal `Bearer ` value.

Set `AXIOM_EDGE_URL` to the dataset's verified full HTTPS `edgeDeploymentUrl`, including its scheme. The example assumes `AXIOM_TOKEN` is already supplied privately by the secret mechanism. Disable shell tracing before handling it; never paste its value into a command or tracked file. Keep only the enabled signal assignments.

```bash
set +x
: "${AXIOM_EDGE_URL:?Set the verified full HTTPS edgeDeploymentUrl first}"
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_LOGS_ENDPOINT="${AXIOM_EDGE_URL%/}/v1/logs"
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="${AXIOM_EDGE_URL%/}/v1/traces"
export OTEL_EXPORTER_OTLP_METRICS_ENDPOINT="${AXIOM_EDGE_URL%/}/v1/metrics"
export OTEL_EXPORTER_OTLP_LOGS_HEADERS="Authorization=Bearer%20${AXIOM_TOKEN},x-axiom-dataset=${LOGS_DATASET}"
export OTEL_EXPORTER_OTLP_TRACES_HEADERS="Authorization=Bearer%20${AXIOM_TOKEN},x-axiom-dataset=${TRACES_DATASET}"
export OTEL_EXPORTER_OTLP_METRICS_HEADERS="Authorization=Bearer%20${AXIOM_TOKEN},x-axiom-metrics-dataset=${METRICS_DATASET}"
```

Export and quote assignments so the child process receives them intact. Without `export`, a process started from that shell does not receive them.

In SDK or Collector code, use normal header names and values: `Authorization: Bearer <token>` and `x-axiom-dataset: <name>`. Collector `otlphttp` takes the edge base URL and appends the signal path. SDK exporters usually take the full signal URL. Read the installed exporter and make `/v1/{signal}` appear exactly once.

Do not prepend another scheme to `AXIOM_EDGE_URL`. Do not use `api.axiom.co` for OTLP, and do not accept an SDK's default region.

If a platform supports only a shared base URL or cannot set the metrics dataset header, use a Collector or the platform's currently documented Axiom integration. Do not invent alternative ingestion URL paths.
