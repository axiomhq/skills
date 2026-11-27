# Dashboard MCP behavior checks

These scenarios exercise the acceptance expectations in [SPEC.md](../SPEC.md).

Use these scenarios to evaluate agent behavior with the skill loaded. Simulate connection and write failures with tool fixtures where possible. Live creation, edits, and deletion require an authorized test organization and resources; do not run them merely to review the skill.

## Connection and scope

| Scenario | Expected behavior |
|---|---|
| No Axiom tools; user asks for a dashboard | Ask the user to connect and authenticate using the MCP setup link, then stop. No credential-file request, shell API client, or invented tool call. |
| Tools are listed but the first relevant read reports authentication failure | Ask the user to sign in/reconnect; stop until authentication works. |
| Reads work but a required write tool is missing or denied | Name the missing capability/permission. Do not call the connection absent or fall back to HTTP. |
| Multiple organizations, user names one | Use the selected organization consistently for discovery, query tests, and writes. |
| User asks only to review a dashboard | Read and report; no creation or update. |
| User requests a private dashboard while authenticated by an org token | Explain the need for user authentication; do not silently create a shared dashboard. |

## Creation and data validation

Prompt: “Build an API health dashboard for production.”

Check that the agent uses supplied context, finds any existing match, discovers dataset kind and real fields, and tests each new query over a bounded interval. Events use `queryDataset` and `query.apl`; metrics use `queryMetrics` and `query.mpl`. Missing measurements become explanatory Notes, not unrelated replacements.

Check the saved document has chart/layout ID correspondence, valid sections, correct units, intentional ownership and time settings, and no fixed chart-query time range. SmartFilters remain ungrouped and their query parameters are tested. The agent calls `createDashboard`, reads back the saved result, and returns the supplied Open in Axiom link.

For metrics, include a cumulative counter, histogram, and dimensionless ratio. Check metric metadata drives aggregation and unit conversion, `$__interval` is preserved, and a 0–1 ratio is scaled before displaying `%`. For a multi-query TimeSeries, validate every pipeline and ensure `query` matches `queries[0]`.

## Editing and failures

| Scenario | Expected behavior |
|---|---|
| Change one panel to p99 | Read the dashboard, validate the new query, then call `updateDashboardChart` with only changed fields, `overwrite: false`, and the current version. Preserve other panels and settings. |
| Change two chart titles | Use sequential chart patches with the latest version, not a whole-dashboard replacement. |
| Add a chart and a section | Read the full document, edit charts/layout/sections, and use `replaceDashboard` with current version and `overwrite: false`. Preserve owner and unrelated fields. |
| Concurrent edit causes version conflict | Read again, reconcile intended changes, and do not force overwrite. |
| Create/update returns an ambiguous timeout | Read current resources to determine whether it succeeded before retrying. Do not duplicate a dashboard. |
| Target is an integration/dynamic dashboard | Explain that it is read-only. No write attempt or unsolicited copy. |
| User requests an exact saved dashboard deletion | Resolve that UID, delete it, and verify absence. Do not delete other similarly named resources. |
| Queries pass and saved configuration reads back; UI was not inspected | Report those checks without claiming visual rendering was verified. |

## Migration and dependent workflows

- Grafana: preserve selectors, groupings, transformations, legend, units, title, and description. Missing labels must not widen a panel's scope. Defer unsupported measurements. Use MCP discovery and writes throughout.
- Splunk: validate translated APL against discovered fields, map chart types, and retain filter behavior.
- Cost dashboard: `axiom-control-costs/scripts/build-dashboard` only emits JSON. Validate and save through this skill's MCP workflow in the same organization as cost analysis. Reuse an existing target and preserve its owner when updating.

## Local checks

Run each `tests/*.sh` script for structural validation, layout, sections, unit formatting, and the MCP payload helpers. Run `../axiom-control-costs/scripts/test-build-dashboard` for the dependent JSON builder. These are offline checks; they do not prove live MCP authentication, server acceptance, or visual rendering.
