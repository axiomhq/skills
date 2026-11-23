# Export

Use this reference to send telemetry to Axiom. Follow current Axiom docs for delivery requirements.

1. Identify the active route and destination dataset for each requested signal. Include platform integrations, collectors and signal-specific configuration.

2. Read the matching guides below. Match each connection’s protocol, endpoint and authentication to its sender and receiver. If no route exists, select a method for the deployment.

3. Configure the selected route for the requested signals. Reuse existing routing and credential references. Apply documented batching, buffering and retry behavior for the expected load.

## References

| Read when | Source |
| --- | --- |
| Selecting or changing a delivery route | [Reference architectures](https://axiom.co/docs/send-data/reference-architectures) and the matching guide from [Axiom integrations](https://axiom.co/docs/send-data/methods) |
| Configuring Axiom OTLP delivery or dataset routing | [Send OpenTelemetry data to Axiom](https://axiom.co/docs/send-data/opentelemetry) |
| Configuring Collector components, pipelines or extensions | [Collector configuration](https://opentelemetry.io/docs/collector/configuration/), followed by the installed distribution’s component documentation |
| Resolving exporter protocols, endpoint paths or configuration overrides | [OTLP exporter configuration](https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/), followed by the selected exporter’s version-specific documentation |
| Selecting the ingest domain | [Edge deployments](https://axiom.co/docs/reference/edge-deployments) |
| Configuring ingestion access | [API tokens](https://axiom.co/docs/reference/tokens#api-tokens) |
| Configuring batches and compression | [Event ingest limits](https://axiom.co/docs/reference/limits#limits-on-ingested-data) and [metrics ingest limits](https://axiom.co/docs/reference/limits#limits-on-ingested-metrics) |
| Configuring queues, retries or persistence | The selected exporter’s documentation. For an OTel Collector, read [Collector resiliency](https://opentelemetry.io/docs/collector/resiliency/). |
| Managing SDK startup, shutdown or invocation completion | [Runtime](runtime.md) |

## Example

Acme’s checkout service sends traces through an OTel Collector. The team wants to send metrics to an existing Metrics dataset.

| Step | Checkout example |
| --- | --- |
| 1. Identify | Locate checkout’s active Collector route, trace destination and intended metrics dataset. Inspect signal-specific configuration overrides. |
| 2. Read | Follow the [Collector guide](https://axiom.co/docs/send-data/opentelemetry#opentelemetry-collector) and the selected exporter’s documentation. Read the metrics ingest limits before choosing batch configuration. |
| 3. Adapt | Extend the Collector’s metrics pipeline and configure its destination and ingestion access. Preserve trace delivery. Review batching, buffering and retry behavior for the expected load. |
