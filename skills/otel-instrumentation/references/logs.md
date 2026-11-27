# Logs

Use logs to explain application events and failures. Follow current Axiom docs for implementation details.

1. Identify the runtime, logger, enabled integrations and collection route.

2. Read the matching integration guide below. Follow its current instructions for the runtime and logger. Use linked library documentation for details the guide does not cover.

3. Inspect existing records and exception handlers. Add the context needed to explain the requested behavior. Reuse existing capture and avoid duplicate delivery.

## References

| Read when | Source |
| --- | --- |
| Configuring a logger or exception capture | Select the matching guide from [Axiom integrations](https://axiom.co/docs/send-data/methods). |
| Choosing or changing the collection route | [Export](export.md) |
| Handling severity | [Log-level requirements](https://axiom.co/docs/reference/limits#requirements-for-log-level-fields) |
| Handling timestamps | [Timestamp requirements](https://axiom.co/docs/reference/limits#requirements-for-timestamp-field) |
| Applying ingestion constraints | [Limits on ingested data](https://axiom.co/docs/reference/limits#limits-on-ingested-data) |
| Attaching trace context to log records | Use the matching runtime’s instrumentation guide from [Axiom integrations](https://axiom.co/docs/send-data/methods) and its linked library documentation. |
| Configuring relationships between datasets | [Telemetry](telemetry.md) |
| Selecting OTel definitions and convention versions | [otel-semantic-conventions](../../otel-semantic-conventions/SKILL.md) |

## Example

Acme’s checkout service uses Winston. The team needs more useful logs when stock reservation times out.

| Step | Checkout example |
| --- | --- |
| 1. Identify | Locate checkout’s Winston transport, collection route and existing error handler. |
| 2. Read | Follow the [Winston guide](https://axiom.co/docs/guides/winston) and its linked library documentation for exception handling. |
| 3. Adapt | If the error handler already captures the timeout, enrich that record with the missing checkout context. |
