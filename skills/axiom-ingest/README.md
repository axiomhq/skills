# axiom-ingest

Sends JSON, NDJSON, or CSV events to a new or existing Axiom Events dataset.

For OpenTelemetry instrumentation or OTLP ingestion, use the `otel-instrumentation` skill when available and the [Axiom OpenTelemetry guide](https://axiom.co/docs/send-data/opentelemetry).

## What This Skill Covers

- Picking an org from `~/.axiom.toml`, or provisioning a temporary one with `axiom-create-org` when none is configured
- Creating the dataset and ingesting JSON, NDJSON, or CSV through the dataset's edge endpoint
- Confirming the event count with an APL query

## Requirements

- `curl`
- `jq`

See [Send data to Axiom](https://axiom.co/docs/restapi/ingest).
