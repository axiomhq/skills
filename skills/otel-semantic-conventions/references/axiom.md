# Axiom

1. For each requested feature, read [current Axiom docs](https://axiom.co/docs). Identify required signals, source fields, and platform configuration. If requirements are unclear, report the missing evidence.

2. Use [current field mappings](https://axiom.co/docs/reference/semantic-conventions) and observed dataset metadata to locate data. Keep emitted OTel names and native fields separate from Axiom’s query paths.

3. For relationships between signals, read [current correlation guidance](https://axiom.co/docs/query-data/correlations). Resolve datasets and links from platform metadata. Distinguish missing trace context from missing dataset links. Report unknown when metadata does not establish the relationship.

4. For metrics, read the [current data model](https://axiom.co/docs/query-data/metrics) and [attribute constraints](https://axiom.co/docs/reference/limits#limits-on-ingested-metrics). Choose supported representations and preserve standard types and units. Keep platform-generated query fields out of emitted attributes.

## Examples

Acme’s checkout service emits failure logs, request spans, and duration metrics. The team wants to investigate failed and slow checkouts.

| Directive | What to do |
| --- | --- |
| 1. Feature requirements | The goal is to open a failed checkout’s trace from its log. Identify the documented source data and configuration required. |
| 2. Stored representation | Checkout emits `com.acme.checkout.failed_step="reserve_stock"`. Discover its stored path before querying failures by step. |
| 3. Signal relationships | In this test case, logs and spans share trace context, but their datasets are not linked. Report the missing dataset link. |
| 4. Metric compatibility | Checkout needs latency percentiles. Its SDK offers explicit and exponential histograms. Select a type listed in Axiom’s current support. |
