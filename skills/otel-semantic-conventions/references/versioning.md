# Versioning

A [schema URL](https://opentelemetry.io/docs/specs/otel/schemas/) identifies the convention version used by telemetry.

1. Identify the convention version for each affected instrumentation library. Read its emitted schema URL or versioned documentation. SDK and convention versions are independent. If the convention version is unknown, report it.

2. Read [Axiom’s supported versions](https://axiom.co/docs/reference/system-requirements#opentelemetry) before selecting a target. Prefer stable definitions from that version. If a development definition is necessary, record its convention version and the reason for using it.

3. Before migrating, read the [OTel changelog](https://github.com/open-telemetry/semantic-conventions/blob/main/CHANGELOG.md) and migration guidance for the source and target versions. Include changes to names, types, units, allowed values, and placement.

4. Include a matching schema URL through the SDK where supported. Changing the declared version does not migrate names or values.

5. Compare old and new field paths, types, and units using [current Axiom guidance](https://axiom.co/docs/reference/semantic-conventions) and observed telemetry. Specify how affected queries, monitors, and dashboards will read both formats for the required history window.

## Examples

Acme’s checkout service handles `POST /checkout` and stores orders in PostgreSQL. The team plans an instrumentation upgrade.

| Directive | What to do |
| --- | --- |
| 1. Identify the version | Checkout’s HTTP package is version `2.0.0`. Its schema URL ends in `/1.20.0`, so record convention version `1.20.0`. |
| 2. Select a target | After confirming that Axiom lists target version `1.23.1`, select its stable HTTP definitions. |
| 3. Migrate definitions | The [HTTP migration](https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/) changes `http.server.duration` in `ms` to `http.server.request.duration` in `s`. Convert a `500 ms` alert threshold to `0.5 s`. |
| 4. Declare the actual version | Checkout still emits `http.method="POST"`. Updating only its schema URL leaves that old attribute unchanged. |
| 5. Preserve historical queries | Checkout’s test data has 10 `POST` requests in each of two releases, with different field paths. The query must count all 20. |
