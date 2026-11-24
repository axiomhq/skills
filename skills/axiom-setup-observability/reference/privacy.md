# Keep sensitive data out of telemetry

Read this when auto-instrumentation or a logger may capture URL query strings, authorization/cookie headers, bodies, SQL parameters, prompts, or other sensitive values.

Never put these in span names, attributes, log fields, or metric dimensions by default: request/response bodies, authorization or cookie headers, URL query strings, SQL parameters, prompts and tool content, file contents, credentials, payment or health data, emails, or arbitrary serialized objects. Never pass user-controlled objects (bodies, form data, header maps) directly to logging or span attribute calls.

## Fix in this order

1. **Don't capture it.** Use the instrumentation's own options. Most HTTP instrumentations capture no request/response headers unless configured; do not enable header capture for sensitive headers. Disable body, statement-parameter, or prompt capture where the library offers a switch. Check the installed version's options; do not assume a default.
2. **Rewrite it at the source.** Use the instrumentation's documented hook (request/response hooks, attribute callbacks) to overwrite a sensitive attribute with a sanitized value. Keep useful bounded fields such as the route template, method, and status.
3. **Remove it in a Collector.** When source options cannot meet the requirement, or one policy must cover many services, add Collector processing (see [deployment.md](deployment.md)):

   ```yaml
   processors:
     attributes/strip-sensitive:
       actions:
         - key: url.query
           action: delete
         - key: http.request.header.authorization
           action: delete
         - key: http.request.header.cookie
           action: delete
   ```

   Add the processor to each affected pipeline. Delete or hash only the specific keys; do not drop all events or links.
4. **Disable that instrumentation** as a last resort, and report the lost coverage.

Prefer redacting a field over dropping a whole span, event, or exception. Keep safe error types, messages, and stack details. Pattern-based redaction (regex for tokens, card numbers, emails) is not exhaustive; use it only as defense in depth.

## Verify

Default sanitization is not proof. Inspect the emitted output in a local exporter: by default, check the attribute keys on one real request; when the privacy sentinel item is on, run the synthetic sentinel check in [full-setup.md](full-setup.md#privacy-sentinel-check).

See the [OpenTelemetry sensitive-data guidance](https://opentelemetry.io/docs/security/handling-sensitive-data/).
