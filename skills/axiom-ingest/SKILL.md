---
name: axiom-ingest
description: Send logs and events to Axiom through APIs, SDKs, or integrations. Use when importing event files or configuring ongoing event delivery.
---

# Axiom ingest

Use this skill to send logs and events to Axiom through its APIs, SDKs, or integrations.
Follow current Axiom docs for the selected source and delivery method.

When connected, use Axiom MCP tools for discovery, dataset setup, and queries.

1. Identify the source, event format, existing sender, and requested destination. Establish whether this is a file import or ongoing delivery.

2. Read the matching source guide from Methods below. Reuse an existing sender when it supports the requested delivery.

3. Resolve the organization and dataset. Compare existing dataset kind, schema, retention, and edge deployment with the source. Reuse a suitable Events dataset, or create one within the requested scope.

4. Configure the sender using its guide. Preserve event boundaries and field meanings. Reuse configured credential references. Follow the token guide when ingestion access is missing. Apply documented timestamp mapping, batching, buffering, retry, and flush behavior.

5. Test delivery with a bounded batch or one application action. Inspect failures and warnings. Query those records by event time and identifiers. Compare their timestamps and expected fields with the source. Report the destination, observed result, and any remaining gaps.

## References

| Reference | Read when |
| --- | --- |
| [Methods](https://axiom.co/docs/send-data/methods) | Selecting a delivery method or finding the matching source guide. |
| [Datasets](https://axiom.co/docs/reference/datasets) | Selecting a destination, setting retention, or inspecting schema restrictions. |
| [Edge deployments](https://axiom.co/docs/reference/edge-deployments) | Selecting the sender’s ingest destination. |
| [API tokens](https://axiom.co/docs/reference/tokens#api-tokens) | Configuring ingestion access. |
| [Ingest guide](https://axiom.co/docs/restapi/ingest) and [API reference](https://axiom.co/docs/restapi/endpoints/ingestToDataset) | Selecting event formats, mapping timestamps, or interpreting ingest responses. |
| [Limits](https://axiom.co/docs/reference/limits) | Applying batch and field limits, timestamp requirements, reserved names, or log level support. |
| [Map fields](https://axiom.co/docs/apl/data-types/map-fields) | Handling objects with many or changing keys. |
| [Performance](https://axiom.co/docs/reference/performance) | Planning historical imports or organizing data for efficient queries. |
| [MCP tools](https://axiom.co/docs/console/intelligence/mcp-server/tools) | Discovering data, managing datasets, or querying results. |

## Example

Acme’s checkout service exports order events to `orders.ndjson`.
The team wants to import them into its existing `orders` dataset.

| Step | Checkout example |
| --- | --- |
| 1. Identify | Find events with `created_at`, `order_id`, and a numeric `amount`. |
| 2. Read | Select the NDJSON API guide for this file import. |
| 3. Resolve | Inspect the `orders` dataset’s fields, schema restrictions, retention, and edge deployment. |
| 4. Configure | Map `created_at` to event time using the documented timestamp options. Use the configured ingestion credential. |
| 5. Verify | Send a bounded batch and inspect counts and warnings. Query the imported order IDs in their original time window. Compare `_time` and `amount` with the source. |

## Related

For OpenTelemetry instrumentation or OTLP delivery, use [otel-instrumentation](../otel-instrumentation/SKILL.md).

If a new organization is needed, use [axiom-create-org](../axiom-create-org/SKILL.md).
