# axiom-onboarding

Adds production-grade OpenTelemetry observability to every discovered deployable process boundary and verifies that supported and enabled logs, traces, and metrics reach Axiom.

## What This Skill Covers

- Repository-wide discovery of deployable services, workers, jobs, CLIs, and functions
- Safe integration with existing OpenTelemetry and observability vendors
- Signal-specific OTLP/HTTP routing to correlated Axiom datasets
- Stable service identity, context propagation, and trace-correlated logs
- Low-cardinality business spans and metrics derived from application code
- Local, pipeline, backend-ingestion, correlation, restart, and shutdown verification
- Per-service evidence, blockers, rollback instructions, and temporary-org handoff

## Safety Model

- Credentials stay in the deployment's secret mechanism and never enter source or browser bundles.
- Browser and mobile telemetry uses a controlled first-party gateway with abuse and privacy controls, never direct Axiom credentials.
- Existing telemetry vendors and user configuration are preserved by default.
- Sensitive content is excluded unless the user approves specific fields and a redaction strategy.
- The skill does not claim success until telemetry is queried back from Axiom.

## Axiom Routing

Use separate correlated datasets for each enabled signal:

- Logs: Events dataset, `/v1/logs`, `x-axiom-dataset`
- Traces: Events dataset, `/v1/traces`, `x-axiom-dataset`
- Metrics: Metrics dataset, `/v1/metrics`, `x-axiom-metrics-dataset`

## Requirements

- An Axiom organization, or the `axiom-agent-created-orgs` skill for a temporary one
- A least-privilege API token with ingest access to the destination datasets
- Query access through Axiom MCP or configured API credentials for end-to-end verification
- The target repository's normal package manager and build/test tools

## Sources

- [Send OpenTelemetry data to Axiom](https://axiom.co/docs/send-data/opentelemetry)
- [Methods for sending data](https://axiom.co/docs/send-data/methods)
- [Manage datasets](https://axiom.co/docs/reference/datasets)
- [OpenTelemetry documentation](https://opentelemetry.io/docs/)
- [OpenTelemetry library instrumentation](https://opentelemetry.io/docs/concepts/instrumentation/libraries/)
