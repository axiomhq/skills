---
name: axiom-control-costs
description: Analyze Axiom usage and query history to find potential waste, and build cost dashboards and monitors using Axiom MCP. Use for reducing Axiom costs, reviewing rarely queried data, tracking ingest usage, or setting up cost controls.
---

# Axiom cost control

Use Axiom MCP to collect evidence and manage resources. Keep cost methodology in this skill and deterministic analysis in local helpers.

## Prerequisite: connect Axiom MCP

Discover the tools needed for the requested work. Names below are logical names; clients may add server prefixes. Read the connected schemas for current arguments and capabilities.

- **No Axiom MCP tools:** ask the user to connect and authenticate [Axiom MCP](https://axiom.co/docs/console/intelligence/mcp-server), then stop until the tools are available. Do not install or configure a connection unless requested.
- **Tools listed:** use the first relevant read, such as `listDatasets` or `checkMonitors`, to verify access.
- **Authentication fails:** ask the user to sign in or reconnect, then stop until authentication works.
- **A capability is missing or access is denied:** identify that specific tool or permission and stop the blocked operation. A working connection with limited permissions is not a missing connection.

Suggested message: "This skill requires Axiom MCP. Please connect and sign in to Axiom using the setup guide, then I can continue with your cost analysis."

Use MCP for **all Axiom operations**, including discovery, queries, dashboards, monitors, notifiers, and cleanup. Do not fall back to shell HTTP calls, SRE wrappers, CLI access, or separate API-token configuration.

Keep all calls and exported results in the selected organization. Use `listOrganizations` if the target is unclear. An analysis or proposal request makes no resource changes; creating or updating cost controls is limited to the user's requested scope.

## 1. Select the work and discover data

| Request | Workflow |
|---|---|
| Reduce costs / find waste | Discover → baseline → query coverage → report |
| Set up cost control | Discover → baseline → dashboard → monitors |
| Build a dashboard | Discover → dashboard |
| Create or tune cost alerts | Discover → monitors |
| Review existing setup | Read matching resources and compare; no writes |

Use `listDatasets` and `getDatasetFields` to discover real names, kinds, and fields. These queries use **APL on event datasets**, not MPL on metrics datasets.

Find an audit dataset with `usageCalculated` events and ingestion/query-cost fields. `axiom-audit` is a candidate, not a guarantee. Probe a narrow recent interval before widening to the analysis window. An empty interval may mean delayed or missing usage data; it does not prove zero usage or the wrong dataset.

Query-history access (typically `axiom-history`) is required only for coverage analysis. Verify `kind`, `dataset`, and `query.apl` fields. If unavailable, report usage and continue supported phases without claiming unused data.

Reuse known inputs. Resolve only missing material choices: organization, ambiguous dataset, analysis interval, requested daily contract allowance, and alert destination. A contract is required for the total-ingest guard, not for read-only usage analysis.

## 2. Establish the baseline

Read [analysis workflow](reference/analysis-workflow.md) for query preparation, exact input formats, and local analysis commands.

Use `queryDataset` with explicit `startTime`/`endTime` to collect daily usage statistics and per-dataset ingestion/query cost, normally over 30 days when available. Preserve the actual observation window and inspect completeness warnings.

Run `scripts/baseline-stats` on the exported results. It prioritizes datasets above 10 GB of ingest:

- **P0:** top three by ingestion or more than 10% of total ingestion.
- **P1:** no observed query cost in the inspected interval.
- **P2:** low query cost per ingested GB (Work/GB below 100).
- **P3:** other top-ten ingest contributors.

Analyze all P0 and P1 candidates and the top five by ingestion for a full optimization request; report any blocked or unfinished candidates. Work/GB is an activity proxy, not a value judgment. A rounded zero does not establish no query activity.

## 3. Build or update the dashboard

Follow [axiom-build-dashboard](../axiom-build-dashboard/SKILL.md) for query validation, composition, writes, and verification. Use `listDashboards`/`getDashboard` to find an existing target before creating another.

```bash
scripts/build-dashboard -a <audit-dataset> > dashboard.json
```

This helper only prepares JSON. See [dashboard panels](reference/dashboard-panels.md) for the intended measurements. Validate the queries against the real audit schema, then save through `createDashboard` or update through the dashboard skill's MCP workflow. Preserve unrelated configuration and ownership; use the current version with `overwrite: false`. Read back and return the link supplied by MCP.

The dashboard's contract input is GB/month; monitor input is a daily byte allowance. Resolve the user's actual billing period before converting between them. Do not present a rough 30-day conversion as their contract.

## 4. Create or tune cost monitors

Follow [axiom-alerting](../axiom-alerting/SKILL.md). Use `checkMonitors` and `getMonitor` to identify existing targets, and `listNotifiers` to resolve the requested destination. Reuse established routing; ask when the intended destination is unclear.

Read [monitor strategy](reference/monitor-strategy.md). The local builder preserves the three cost-detection formulas and prepares their MCP payloads:

```bash
scripts/build-monitors -a <audit-dataset> -c 167TB -n <notifier-id> > monitors.json
```

Replace the example allowance with the user's **daily** allowance. Bare numbers are bytes; use explicit units such as `167TB`. Omit `-n` only when no destination is intended for new monitors.

The definitions are Total Ingest Guard, Per-Dataset Spike, and Query Cost Spike. Validate each APL query and its first aggregated measurement through `queryDataset` over the complete evaluation window before saving. Distinguish insufficient history from a healthy baseline. Check the current tool's schedule, grouping, and repeat-breach semantics.

- Create only missing, requested monitors with `createMonitor`.
- For updates, start from the full `getMonitor` definition and merge only intended changes before `updateMonitor`. Preserve unrelated settings and notifier IDs; do not copy a builder's empty `notifierIds` over existing routing.
- A shared name prefix is only a discovery hint. Resolve ambiguous matches; never delete/recreate every matching monitor.
- After an ambiguous write failure, read current state before retrying to avoid duplicates.

Read back each saved definition and report the MCP resource link. Saved configuration, observed monitor execution, and confirmed notification delivery are separate verification levels.

## 5. Analyze coverage and report opportunities

Use MCP to fetch deduplicated query history and its parsed APL, observed schema, and bounded samples for a chosen field. `scripts/analyze-query-coverage` reads those exports locally and retains the bundled APL AST parser. See [analysis workflow](reference/analysis-workflow.md) for sampling and completeness checks.

Start with column references, then inspect suggested fields such as `app`, `service`, or `kubernetes.labels.app`. For sampled empty field values above 5%, drill down using another meaningful dimension before recommending action.

Treat findings as **candidates for review**. Missing history, wildcard queries, broad predicates, joins, parser limits, and use outside the observed interval can hide genuine dependencies. No observed queries is not permission to drop a dataset. Sampling estimates event volume; byte or currency savings need additional evidence and the user's pricing terms.

Use the [report template](reference/analysis-report-template.md). Include windows, coverage gaps, ranking, candidate actions, and evidence links returned by MCP. Do not change ingestion, delete fields, or remove datasets as part of an analysis request.

## Requested cleanup

Resolve exact resource IDs with MCP. Use `deleteMonitor` or `deleteDashboard` only for the resources the user requested, and verify absence with `checkMonitors` or `listDashboards`. Do not delete shared notifiers as part of cost-control cleanup.
