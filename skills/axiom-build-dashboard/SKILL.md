---
name: axiom-build-dashboard
description: Design, create, and edit Axiom dashboards using Axiom MCP. Use for dashboard requests, chart changes, and migrations from Grafana or Splunk, including APL and metrics/MPL charts, SmartFilters, and layout.
---

# Axiom dashboards

Turn the user's questions into useful panels: overview, trends, breakdowns, then evidence. Use Axiom MCP for discovery, query execution, and dashboard changes. Local helpers only compose and validate JSON.

## Prerequisite: connect Axiom MCP

Before starting, discover the Axiom tools available in the session. Look for the tools the request needs: `listDashboards` and `getDashboard` for existing dashboards, `createDashboard` for creation, or `updateDashboardChart` for a chart edit. These are logical names; clients may add a server prefix. Read the connected tool's schema for current arguments and supported behavior.

- **No Axiom MCP tools:** ask the user to connect and authenticate [Axiom MCP](https://axiom.co/docs/console/intelligence/mcp-server), then stop until the tools are available. Do not install a server or change client configuration without a request.
- **Tools available:** make the first relevant read-only call, such as `listDashboards` or `listDatasets`. A tool being listed does not prove authentication works.
- **Authentication fails:** ask the user to sign in or reconnect, then stop until authentication works.
- **A required tool is missing or access is denied:** identify the missing capability or permission and ask the user to enable it. Stop the blocked operation; do not describe a working connection as absent.

For a missing connection, say: "This skill requires Axiom MCP. Please connect and sign in to Axiom using the setup guide, then I can continue with your dashboard."

Use MCP for all Axiom operations in this skill. Do not fall back to shell scripts, direct HTTP requests, or a separate token configuration when MCP is missing or fails.

Keep discovery, query validation, and dashboard writes in the same organization. Use `listOrganizations` when the target is unclear; otherwise use the established organization. A proposal or review makes no changes; a creation or editing request authorizes its stated scope. Ask only for material unresolved choices or actions beyond that authorization.

## 1. Establish the goal and target

Reuse the request and existing context to identify the audience, decisions, service/environment, time window, and useful drilldown dimensions. One question per panel; prefer rates and percentiles where they answer the question better than counts or averages.

Use `listDashboards` to find the target or check for an existing match before creating another. Read existing dashboards with `getDashboard`, including their UID, type, owner, version, charts, layout, and sections. If multiple targets fit, resolve the ambiguity before writing. Integration/dynamic dashboards are read-only; do not try to replace them or automatically create a copy without the user's request.

For a listing, review, or deletion, read the relevant resources and go directly to that operation. For a chart edit, investigate only what that change needs.

Migration guidance:

- [Grafana migration](reference/grafana-migration.md): preserve each panel's expression, legend, unit, title, and description together; [PromQL translation](reference/promql-to-mpl.md) covers metrics queries.
- [Splunk migration](reference/splunk-migration.md): translate searches and map visualizations; use `axiom-spl-to-apl` when available.
- Templates in `reference/templates/` are starting points with assumed field names. Discover the real schema before adapting them.

## 2. Discover and validate the data

Use `listDatasets` and inspect the dataset kind before querying.

- **Events/traces:** get real field names with `getDatasetFields`, discover relevant values, then run APL with `queryDataset` over a bounded representative interval.
- **Metrics** (`otel:metrics:v1` / `otel-metrics-v1`): use `listMetrics` or `searchMetrics`, inspect type, temporality, and unit, and discover dimensions with `listMetricTags` and `getMetricTagValues`. Run MPL with `queryMetrics`. Never use `getschema` or `queryDataset` for metrics. Follow the [metrics/MPL contract](reference/metrics-mpl.md).

Validate every new or changed query, including each pipeline in a multi-query chart and dynamic SmartFilter queries. Check values, units, cardinality, and the requested aggregation, not only whether the query parses. Use explicit `startTime`/`endTime` for validation; saved chart queries inherit the dashboard picker and should omit fixed time filters/inline ranges. Use `bin_auto(_time)` for APL and `$__interval` for MPL. Document justified fixed bins for sparse metrics or upstream batch intervals.

For unfamiliar syntax or product behavior, use `getMetricsSpec`, `searchAxiomDocs`, or `readAxiomDoc`. A query preview is not query execution.

### Compute or defer

Each panel must compute the requested quantity. If data or query support is missing, replace that panel with a `Note` stating the original measurement, blocker, and how to unblock it. Do not substitute a different measurement, even with a disclaimer. An empty result is not proof of zero errors or healthy service behavior.

## 3. Compose the dashboard

Use the connected MCP contract for the document shape. Events queries go in `query.apl`; metrics queries go in `query.mpl`, with `metricsDataset`. Apply the same language distinction to `queries[]` and keep `query` equal to its first entry for multi-query charts.

Useful constraints:

- Every chart has a unique ID and exactly one matching layout entry (`i`) in a 12-column grid.
- Statistic queries should yield a single value. Bound breakdowns and series counts with filters or top-N selection.
- LogStream queries must retain `_time` and cannot limit, aggregate, or join rows; the Console adds its own sort and limit. Use Table for top-N evidence.
- SmartFilters need matching query parameters in consuming queries. See [SmartFilters](reference/smartfilter.md).
- Sections are an ordered array of UUID IDs and titles; `chart.sectionId` references one. Keep SmartFilters ungrouped.
- Units must describe the query result. For a 0–1 ratio, multiply by 100 before labelling it `%`. On MPL Statistics, use `set custom_unit="<UCUM unit>";`; avoid duplicate unit suffixes. Put units in TimeSeries titles. See [chart configuration](reference/chart-config.md).
- Preserve an existing dashboard's owner unless a visibility change is requested. For new dashboards use the intended visibility: `X-AXIOM-EVERYONE` for shared or `me` for the signed-in user's private dashboard. Org API tokens cannot own private dashboards; do not silently make a requested private dashboard shared.

Local helpers are optional: `chart-add`, `layout-pack`, `dashboard-assemble`, `dashboard-from-template`, `dashboard-new`, and `dashboard-validate` require Bash and `jq`, not Axiom credentials. See [local composition](reference/local-composition.md) for usage, refresh settings, and layout normalization. Validate composed JSON with `dashboard-validate --strict` when available; local checks do not replace MCP query validation or server validation.

Read [chart recipes](reference/chart-cookbook.md) for APL patterns, [layout recipes](reference/layout-recipes.md) for panel placement, and the [design playbook](reference/design-playbook.md) for dashboard design choices.

## 4. Apply the requested change

Summarize the intended panels or edits, scope, and visibility before applying the authorized change. Resolve material ambiguity first.

| Operation | MCP tool and approach |
|---|---|
| Create | `createDashboard` with the complete document serialized as `dashboardJson`. |
| Edit an existing chart | `updateDashboardChart` with the chart ID and only changed fields in `chartPatchJson`. For a few chart edits, call once per chart. |
| Add/remove charts, change layout/sections/settings | `replaceDashboard` with the full document from `getDashboard` plus the intended edits. Omitted fields are removed: preserve unrelated charts, settings, owner, and metadata. |
| Copy | Read the source, remove server-managed identity/version fields, set the requested name/visibility, then `createDashboard`. Do this only when a copy is requested. |
| Delete | `deleteDashboard` for the exact saved dashboard UID the user authorized. |

For `updateDashboardChart` and `replaceDashboard`, explicitly set **`overwrite: false` and the current `version` from `getDashboard`**. These tools default to overwriting if the flag is omitted. Use the latest version after each write, including successive chart edits. On a conflict, read again and reconcile only the intended changes; do not bypass the conflict with overwrite.

Chart patches merge nested objects; `null` removes a field, arrays replace the entire array, and an included `id` must match the target chart. When switching query language, clear the obsolete query field and associated metadata. A patch cannot add/remove charts or change the dashboard layout.

After an ambiguous write failure, read the current resources before retrying; the first call may have succeeded. Do not create a duplicate as a retry strategy. If a requested feature is unavailable through the connected tools, explain that limitation and the manual Console step instead of inventing fields or calling a shell API wrapper.

## 5. Verify and report

Read the saved dashboard with `getDashboard`. Check the intended queries, chart IDs, layout, sections, filters, owner, and settings, and ensure unrelated configuration survived edits. For deletion, verify absence with `listDashboards`.

Return the **Open in Axiom** link supplied by MCP, the changes made, and any deferred panels or remaining limitation. Do not construct URLs. Distinguish query execution, saved configuration readback, and visual rendering: saving a dashboard does not prove every panel renders correctly. Claim visual verification only when actually observed.
