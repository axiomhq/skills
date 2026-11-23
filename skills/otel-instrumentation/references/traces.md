# Traces

Use traces to understand operation flow, timing and failures. Follow current Axiom docs for implementation details.

1. Identify the runtime, instrumentation versions, sampling configuration and scope of available traces.

2. Read the matching integration guide below. For missing details, use linked library and OTel documentation. Match that guidance to the versions in use.

3. Choose whether the missing detail needs an attribute, event or span. Reuse existing instrumentation and preserve trace context.

## References

| Read when | Source |
| --- | --- |
| Configuring automatic instrumentation or creating spans | Select the matching runtime guide from [Axiom integrations](https://axiom.co/docs/send-data/methods). |
| Choosing between attributes, events and spans | [When to define events](https://opentelemetry.io/docs/specs/semconv/general/events/#when-to-define-events) |
| Selecting span names and kinds | Relevant [OTel trace conventions](https://opentelemetry.io/docs/specs/semconv/general/trace/) and [Span API](https://opentelemetry.io/docs/specs/otel/trace/api/#span) |
| Handling failures and retries | [Recording errors](https://opentelemetry.io/docs/specs/semconv/general/recording-errors/), using the selected convention version |
| Preserving context across calls or asynchronous work | The runtime’s instrumentation guide and [context propagation](https://opentelemetry.io/docs/concepts/context-propagation/) |
| Connecting related operations through span links | [Span links in Axiom](https://axiom.co/docs/query-data/traces#span-links) |
| Inspecting existing trace relationships and timing | [Waterfall view](https://axiom.co/docs/query-data/traces#waterfall-view-of-traces) |
| Interpreting stored trace attributes | [Trace attributes in Axiom](https://axiom.co/docs/reference/semantic-conventions#trace-attributes-in-axiom) |
| Selecting attributes and convention versions | [otel-semantic-conventions](../../otel-semantic-conventions/SKILL.md) |
| Changing sampling | [OTel sampling](https://opentelemetry.io/docs/concepts/sampling/) and the runtime’s SDK documentation |
| Configuring trace delivery | [Export](export.md) |
| Connecting traces with logs or metrics datasets | [Telemetry](telemetry.md) |

## Example

Acme’s checkout service runs on Node.js and retries inventory reservations. Incoming requests and individual inventory calls are already traced. The team needs to understand reservation timing and failures.

| Step | Checkout example |
| --- | --- |
| 1. Identify | Locate the request span and inventory-call spans. Identify their instrumentation versions and sampling configuration. |
| 1. Missing span | If an expected inventory span is absent, inspect sampling, propagation and capture scope before adding instrumentation. |
| 2. Read | Follow the [Node.js instrumentation guide](https://axiom.co/docs/guides/opentelemetry-nodejs#send-data-from-an-existing-node-project) and its linked OTel documentation. |
| 3. Attribute | To identify which checkout step failed, enrich an existing span. |
| 3. Event | To record when a reservation retry occurred, follow the event guidance. |
| 3. Span | If total reservation time is not represented, add an operation span that preserves the request and inventory-call relationships. |
