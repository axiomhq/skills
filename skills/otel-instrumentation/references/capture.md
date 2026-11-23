# Capture

Use this reference to select the content recorded in telemetry.

1. Identify what manual and automatic instrumentation captures. Include attributes, messages, exceptions, URLs, headers and payloads.

2. Read the matching guides below. Check defaults, overrides and which fields each control affects in the installed version.

3. Select individual fields that explain the requested behavior. Exclude credentials and unnecessary personal data at capture. Reuse existing controls before adding custom processing.

Opaque or hashed user identifiers can still identify people. If the delivery route includes a Collector, use its filtering as an additional layer.

## References

| Read when | Source |
| --- | --- |
| Configuring logger, HTTP or database capture | The matching guide from [Axiom integrations](https://axiom.co/docs/send-data/methods) and its linked instrumentation documentation |
| Selecting or transforming sensitive content | [Handling sensitive data](https://opentelemetry.io/docs/security/handling-sensitive-data/) and the selected SDK or Collector component’s documentation |
| Filtering metric attributes or exemplar data | [Metrics](metrics.md) and [metric stream configuration](https://opentelemetry.io/docs/specs/otel/metrics/sdk/#stream-configuration) |
| Configuring prompts, responses or tool payloads | [Instrument Vercel AI SDK apps](https://axiom.co/docs/use-cases/llm-observability/axiom-ai-sdk-instrumentation) and [redaction policies](https://axiom.co/docs/use-cases/llm-observability/redaction-policies) |

## Example

Acme’s checkout service logs failed payment requests. The team needs to distinguish payment declines from provider failures.

| Step | Checkout example |
| --- | --- |
| 1. Identify | Inspect the payment log, exception message and HTTP instrumentation for captured headers and payloads. |
| 2. Read | Follow the logger and HTTP instrumentation documentation for the installed versions. |
| 3. Adapt | Record only the failure category, provider and trace context. Exclude authorization headers, payment payloads and exception text that echoes customer data. |
