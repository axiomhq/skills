# Spans, log attributes, and metric dimensions

Read this before adding or changing a span, span event, log attribute, or metric dimension. Quick start adds key context to the app's 1–3 main operations: attributes first, new spans only when needed, and no custom metrics. Custom metrics and more operations are follow-ups; see [full-setup.md](full-setup.md#business-instrumentation).

Follow the current [semantic conventions](https://opentelemetry.io/docs/specs/semconv/) before inventing attribute names. Give app-specific attributes a short app prefix and a dot-separated name, such as `app.todo.rejection_reason`. Obtain each tracer, meter, and logger with an instrumentation-scope name and version, such as the library's name or an application module like `CheckoutService`. Do not use `service.name` as the scope name.

## Add context to existing spans first

Auto-instrumentation records how the app communicates (method, route, status, query). It cannot know what the operation meant. Add that as attributes on the span that already exists, before creating any new span. Get the current span and set attributes:

| Language | Code |
|---|---|
| Node.js | `trace.getActiveSpan()?.setAttribute('app.todo.validation_result', 'rejected')` |
| Python | `trace.get_current_span().set_attribute("app.todo.validation_result", "rejected")` |
| Java | `Span.current().setAttribute("app.todo.validation_result", "rejected");` |
| Go | `trace.SpanFromContext(ctx).SetAttributes(attribute.String("app.todo.validation_result", "rejected"))` |

Ask: "when investigating this request during an incident, what would I need to know?" Good context:

| Kind | Examples | Rule |
|---|---|---|
| Outcome and reason | `app.todo.validation_result = rejected`, `app.payment.decline_reason = insufficient_funds` | Bounded values, set on every path |
| Type or category | `app.order.type = subscription`, `app.job.kind = export` | A small, known set of values |
| Who is affected | `user.id`, `app.tenant.id`, `app.tenant.plan = enterprise` | Opaque internal IDs only. Never emails, names, phone numbers, or anything a person could be identified by on its own |
| Which entity | `app.order.id`, `app.todo.id` | Non-sensitive internal IDs; fine on spans, never on metrics |
| What was switched on | `feature_flag.key`, `feature_flag.result.variant` | Use the feature flag conventions |
| Where time went | `app.auth.duration_ms` | A sub-step's duration recorded on the parent span, instead of a child span |

To record a sub-step's duration without a child span, measure it and set it on the current span, for example `app.auth.duration_ms`. It is cheaper than a span and easy to filter and compare in Axiom.

## When to create a new span

Create a span only when both answers are yes:

1. **Is it interesting?** It meaningfully affects the request's latency or can fail.
2. **Is it aggregable?** Grouping it by name and attributes would show useful trends.

| Operation | New span? |
|---|---|
| A business transaction that changes state (place order, process payment) | Yes, if no existing span covers it |
| A call to a cache, queue, or external service that is not auto-instrumented | Yes |
| A sub-step inside one request whose duration matters | Prefer a timing attribute; a span only if it has its own failures or children |
| Input validation, getters, private helpers | No |
| Each iteration of a loop | No; record a count or total as an attribute |
| A function that only calls other instrumented code | No |

Do not duplicate network or framework spans, and remove any span created only to test that tracing works.

For each custom span:

- Set one span kind: `SERVER`, `CLIENT`, `PRODUCER`, `CONSUMER`, or `INTERNAL`.
- Name it `{action} {target}`, such as `GET /orders/{id}` or `process payment`. Keep the name low-cardinality.
- Make it current for its duration so child spans and logs inherit its context, and end it on every exit path.
- Put attributes a sampler needs on the span at creation. Compute expensive attributes only when the span is recording.

## Errors and exceptions

- Leave span status unset on success; set `Ok` only when the code explicitly confirms success.
- On a failure that ends the operation, set status to `Error` with a short, non-sensitive description, and set `error.type`.
- Record the exception as a **log record**, not a span event: when logs are enabled, log it at error level through the app's logger (passing the exception object) while the span is active, so the logs bridge attaches the trace context and `exception.*` fields. Recording exceptions as span events is deprecated in the [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-logs/). When only traces are enabled, setting the status and `error.type` is enough; existing `recordException` calls can stay.
- Do not record errors that were retried or handled inside the operation, and do not treat every HTTP 4xx as a server error.

Keep the SDK's parent-based sampler so upstream decisions propagate; use parent-based always-on while proving a new integration. For high-volume production, choose a parent-based ratio or gateway tail sampling rather than sampling each service independently.

## Bounded dimensions

Good metric dimensions are bounded values such as `outcome`, `payment_provider`, or `job_type`. Never use raw URLs, user/session/request/trace IDs, emails, timestamps, free text, arbitrary headers, or entity IDs as metric attributes or span names; use route templates and bounded enums. Put necessary, non-sensitive entity identifiers only in traces or structured logs, and use trace/log correlation instead of trace IDs as metric labels.

Inspect auto-instrumented metric streams too. Remove unsafe attributes with Views where supported, keep the SDK cardinality limit, and check that `otel.metric.overflow=true` is absent or understood.

For sensitive values, see [privacy.md](privacy.md).
