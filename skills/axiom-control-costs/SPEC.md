# Axiom cost-control specification

## Scope and responsibilities

This is the maintenance contract, not required reading during ordinary use. [SKILL.md](SKILL.md) contains the runtime workflow.

Cost control covers usage baselines, query-coverage analysis, reports, cost dashboards, and cost monitors. Analysis alone does not authorize changing ingestion or deleting data.

- MCP owns all Axiom discovery, reads, queries, writes, and cleanup.
- Skills and references own methodology and interpretation.
- Local helpers prepare query/payload JSON and analyze exported results; no credentials or network clients.
- Dashboard and alerting skills own their respective resource workflows.

## Connection and operations

Missing MCP or failed authentication asks the user to connect/sign in and stops. Missing tools and denied permissions are distinguished from missing connections. Verify access with a relevant read and keep every phase in one selected organization. No direct HTTP, SRE wrapper, or CLI fallback.

Do not require write access for analysis. Query history is needed only for coverage analysis. A contract allowance is needed for the total-ingest guard; missing history or allowance does not block unrelated supported phases.

Use exact resource IDs. Reuse matching resources, preserve unrelated settings and routing, and inspect state before retrying ambiguous writes. No prefix-wide monitor deletion/recreation. Dashboard edits use current versions and `overwrite: false`.

Sources: [MCP setup](https://axiom.co/docs/console/intelligence/mcp-server) and [tool reference](https://axiom.co/docs/console/intelligence/mcp-server/tools). Connected tool schemas govern current arguments; recheck payload and result handling when those schemas change.

## Analysis contract

Preserve the existing queue priorities, AST extraction, column-reference scoring, and strided sampling. Use explicit observation windows and complete MCP exports. Read CSV with a CSV parser; retain embedded JSON and newlines. Cross-check history rows/execution counts against independent totals, and require every planned sample.

Treat unreferenced data and zero observed query cost as candidates, not proof of disuse. Do not infer byte savings from event shares or monetary savings without pricing. Expose parser, attribution, retention, and sampling limitations.

## Monitor contract

Local `build-monitors` produces definitions only. Preserve the three detection formulas and thresholds, then validate through MCP before saving.

The migration aligns the per-dataset evaluation range to its 15-day query and makes excess bytes/GB·ms the single grouped alert measurement. The total guard explicitly uses two positive results in three runs: the current MCP contract states that `triggerFromNRuns: 2` behaves as one and that both repeat-breach fields must be set. Ingest spike availability of two current buckets is not proof of two breaching hours. See [monitor strategy](reference/monitor-strategy.md).

## Validation

Run the offline AST, analysis, monitor-builder, and dashboard-builder tests after helper changes. Validate skill structure and referenced local paths. Use [manual scenarios](tests/manual-tests.md) to check connection handling, read-only scope, resource preservation, and partial failures.

Offline fixtures validate local calculations and payload preparation. They do not establish live query acceptance, MCP resource creation, notification delivery, or agent adherence. These live and behavioral scenarios remain unverified until explicitly exercised.
