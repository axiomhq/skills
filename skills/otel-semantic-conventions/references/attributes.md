# Attribute selection

1. Start with the [official attribute registry](https://opentelemetry.io/docs/specs/semconv/registry/attributes/). If the registry defines the concept, use its exact attribute name and type. Do not create a custom synonym.

2. Read the [conventions for the operation](https://opentelemetry.io/docs/specs/semconv/). Preserve the defined types, placement, and allowed values. Follow each attribute’s conditions for recording. Record opt-in attributes only when explicitly enabled. Use the [log model’s dedicated fields](https://opentelemetry.io/docs/specs/otel/logs/data-model/) for severity, body, and trace context.

3. Use definitions from the convention version emitted by the instrumentation. Prefer stable attributes. Before choosing or changing versions, read [Axiom’s supported versions](https://axiom.co/docs/reference/system-requirements#opentelemetry).

4. Preserve bounds required by the metric’s conventions. Select additional attributes for the intended filters and comparisons. Account for SDK memory, export volume and [cardinality limits](https://opentelemetry.io/docs/specs/otel/metrics/sdk/#cardinality-limits).

5. Create a custom attribute only when no standard definition matches the concept. State the missing concept and the question it answers. Use a fixed company or application prefix under [OTel naming guidance](https://opentelemetry.io/docs/specs/semconv/general/naming/#recommendations-for-application-developers). Follow [Axiom’s attribute handling](https://axiom.co/docs/reference/semantic-conventions#trace-attributes-in-axiom).

## Examples

Acme’s checkout service handles `POST /checkout` in three steps:

1. Reserve stock.
2. Charge the payment.
3. Create the order.

One HTTP server span covers the request. Any step can time out and return HTTP `503`. The status alone cannot identify which step failed.

`com.acme.checkout.failed_step` is a string with three allowed values: `reserve_stock`, `charge_payment`, and `create_order`.

| Directive | What to do |
| --- | --- |
| 1. Standard attribute | Record `http.request.method="POST"`. Do not invent `acme.request_verb`. |
| 2. Type, placement, conditions | Put `service.name="checkout"` on the resource. Put integer `http.response.status_code=503` on the HTTP span when the service sends that response. |
| 2. Allowed values | Checkout receives `BREW /checkout`. If the instrumentation does not recognize `BREW`, record `http.request.method="_OTHER"`. |
| 2. Opt-in capture | Record `http.request.header.accept=["application/json"]` only when capture of the `Accept` header is explicitly enabled. |
| 2. Log fields | For a reservation timeout, put `ERROR` in `SeverityText` and `Stock reservation timed out` in `Body`. Put `com.acme.checkout.failed_step="reserve_stock"` in log attributes. |
| 3. Version support | Acme’s proposed HTTP upgrade declares a convention version Axiom lists as unsupported. Report the support gap before changing telemetry. |
| 4. Metric attributes | Use `http.route="/checkout"` for route comparisons. Exclude order IDs because this aggregate query does not use them. |
| 5. Custom attribute | To group failures by checkout step, first search for a standard attribute with that meaning. If none exists, add `com.acme.checkout.failed_step="reserve_stock"` to the existing span when stock reservation fails. |

The custom attribute identifies the failed business step. It complements the standard HTTP status.

Emit the custom name through the SDK. [Axiom stores custom trace attributes](https://axiom.co/docs/reference/semantic-conventions#trace-attributes-in-axiom) in the `attributes.custom` map.
