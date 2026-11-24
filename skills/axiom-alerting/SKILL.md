---
name: axiom-alerting
description: Configure Axiom monitors and notifiers through MCP. Use when creating alerts, changing notification routing, or investigating monitor behavior.
---

# Axiom alerting

Use the connected Axiom MCP tools for all Axiom access. If they are unavailable, ask the user to connect the Axiom MCP server before continuing.

1. Identify the requested alert condition, organization, data, and notification destination. Inspect existing monitors with `checkMonitors` and `getMonitor`, and destinations with `listNotifiers`.

2. Read the relevant guides below with `readAxiomDoc`. Use `searchAxiomDocs` for guidance the table does not cover. Follow the connected tools' descriptions and input schemas for supported operations and request fields.

3. For query or evaluation changes, inspect the dataset's fields or metrics and test the query over an explicit time window with `queryDataset` or `queryMetrics`. If the required data is missing, report the gap.

4. Apply the requested change through MCP. Build monitor updates from the current definition and reuse a suitable notifier. For channels that require Console setup, follow the link or page from the notifier tool. The user enters credentials and saves there. Wait for that confirmation, then use `listNotifiers` to find the saved notifier before attaching it.

5. Verify the resulting configuration with the read tools. Use `getMonitorHistory` over an explicit time range to inspect available runs. Report the saved state, observed behavior, and anything that still needs verification.

## References

| Read when | Source |
| --- | --- |
| Connecting or authorizing MCP | [Axiom MCP Server](https://axiom.co/docs/console/intelligence/mcp-server) |
| Selecting operations for monitors and notifiers | [MCP monitor and notifier tools](https://axiom.co/docs/console/intelligence/mcp-server/tools#monitors-and-notifiers) |
| Discovering data or testing a query | [Dataset tools](https://axiom.co/docs/console/intelligence/mcp-server/tools#datasets), [APL query tools](https://axiom.co/docs/console/intelligence/mcp-server/tools#query), and [metrics tools](https://axiom.co/docs/console/intelligence/mcp-server/tools#metrics) |
| Alerting when a value crosses a fixed threshold | [Threshold monitors](https://axiom.co/docs/monitor-data/threshold-monitors) |
| Sending notifications for matching events | [Match monitors](https://axiom.co/docs/monitor-data/match-monitors) |
| Detecting new values or choosing learning and lookback settings | [New values monitors](https://axiom.co/docs/monitor-data/new-values-monitors) |
| Detecting deviations from recent behavior | [Anomaly monitors](https://axiom.co/docs/monitor-data/anomaly-monitors) |
| Handling delayed data or changing notification settings | [Evaluation delay](https://axiom.co/docs/monitor-data/configure-monitors#data-that-arrives-late) and [notification settings](https://axiom.co/docs/monitor-data/configure-monitors#notification-settings) |
| Configuring a notification channel | Select the matching channel guide from [Notifiers](https://axiom.co/docs/monitor-data/notifiers-overview). |
| Disabling, enabling, or deleting resources | [Configure monitors](https://axiom.co/docs/monitor-data/configure-monitors) and [configure notifiers](https://axiom.co/docs/monitor-data/configure-notifiers) |
| Investigating monitor runs or notification failures | [Monitor status and history](https://axiom.co/docs/monitor-data/view-monitor-status) |

## Example

Acme's checkout service already has an error-count monitor. The team wants it to alert only when failures persist.

| Step | Checkout example |
| --- | --- |
| 1. Identify | Read the current monitor, query, and attached notifier. |
| 2. Read | Consult the threshold guide and the `updateMonitor` schema for evaluation settings. |
| 3. Test | Run the existing query over the requested period to inspect the failures. |
| 4. Apply | Update the existing monitor's evaluation settings using its current definition and notifier. |
| 5. Verify | Read back the saved settings and inspect available runs. If there are no runs since the change, report that behavior is still unverified. |
