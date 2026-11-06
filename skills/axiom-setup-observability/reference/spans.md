# Spans, events, and metric attributes

Read this before adding or changing a span, span event, log attribute, or metric.

Follow the current [semantic conventions](https://opentelemetry.io/docs/specs/semconv/) before inventing attribute names. Obtain each tracer, meter, and logger with an instrumentation-scope name and version: a library's fully qualified name, or the application module such as `CheckoutService`. Do not use `service.name` as the scope name.

Add missing diagnostic attributes to a span that auto-instrumentation already created before creating a child span. Create a new span only for an operation that has its own duration and diagnostic value, especially a public operation, handler, or call that crosses a process or can fail, and only when the existing span cannot represent it. Record a sub-step's timing as an attribute or span event on the current span when a child span would only duplicate a library span. Use a span event for a point-in-time checkpoint, state change, or exception. Use a span attribute for a property of the whole operation. Use a normal log for unstructured diagnostics.

For each custom span:

- Set one span kind: `SERVER`, `CLIENT`, `PRODUCER`, `CONSUMER`, or `INTERNAL`.
- Name it `{action} {target}`, such as `GET /orders/{id}` or `send orders_queue`. Keep the name low-cardinality, include only values also stored as attributes, and use a documented fallback or truncation when a value is missing or too long.
- Cover the logical operation. Leave physical network retries and serialization to the library that performs them, recording extra detail as events rather than nested spans.
- Make the span current for its duration so child spans and logs inherit its context, then end it on every exit path.
- Put attributes needed by a sampler on the span at creation. Compute expensive or verbose attributes only when the span is recording.
- Leave span status unset when the operation succeeds. On an unhandled failure, set status to `Error`, set `error.type`, record the exception, and use a non-sensitive status description. Do not record an error that was retried or handled inside the operation. Do not treat every protocol status, such as HTTP 404, as an error without operation context.

Keep the SDK's parent-based sampler so an upstream sampling decision propagates. Use parent-based, always-on while proving a new integration. For high-volume production, choose a documented parent-based ratio or gateway tail sampling; do not sample each service independently. Attributes added after span creation cannot affect the sampling decision.

## Business metrics

For each proposed metric, establish:

- name, unit, and instrument type;
- exact recording point;
- question it answers;
- allowed attributes and finite value sets;
- plausible series count;
- sensitive or unbounded values explicitly excluded.

Good dimensions are bounded values such as `outcome`, `payment_provider`, or `job_type`. Do not use raw URLs, user/session/request/trace IDs, emails, timestamps, free text, arbitrary headers, or entity IDs as metric attributes or span names. Use route templates and bounded enums.

Inspect auto-instrumented as well as custom metric streams. Remove unsafe attributes with Views where supported, configure an appropriate SDK cardinality limit, and verify that `otel.metric.overflow=true` is absent or its impact is explicitly understood.

Put entity identifiers only in traces or structured logs when they are necessary, non-sensitive, and approved. Use trace/log correlation rather than trace IDs as metric labels.

Do not capture raw bodies, prompts, tool content, SQL parameters, authorization or cookie headers, URL query strings, file contents, stack locals, source code, payment/health data, or arbitrary serialized objects by default.

Avoid duplicate network/framework spans already emitted by auto-instrumentation. Use span events or structured logs for additional detail.
