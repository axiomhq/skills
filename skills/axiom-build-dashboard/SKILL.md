---
name: axiom-build-dashboard
description: Design and migrate Axiom dashboards. Use when selecting measurements, charts, filters, or investigation paths, or adapting dashboards from Grafana or Splunk.
---

# Axiom dashboards

Build dashboards that help readers answer questions and decide what to do next.

Use connected Axiom MCP tools for data access and dashboard changes.
Follow current Axiom docs and tool schemas for supported features and configuration.

## Workflow

1. Define the reader, questions, and scope. Reuse an existing dashboard when it already serves that purpose.

2. For migrations, follow the relevant guide in References to establish what the source dashboard measures and what must carry over.

3. Define each measurement against available telemetry. Check its filters, grouping, aggregation, units, and time behavior. Report missing data instead of substituting another measurement.

4. Choose charts that make the answer clear. Lead with the overview, group supporting detail, and provide a path into investigation. Use clear titles and units. Preserve relevant filters and time context between views.

5. Test measurements against representative data. Report unsupported behavior, missing data, and anything you could not establish.

For requested creation or edits, preserve unrelated dashboard content and configuration.
Read back the saved result and return its link with any remaining limitations.

## References

| Read when | Source |
| --- | --- |
| Selecting measurements, charts, layout, or investigation paths | [Design](references/design.md) |
| Adapting an existing dashboard to Axiom | [Grafana](reference/grafana-migration.md) and [Splunk](reference/splunk-migration.md) |
| Building charts from metrics | [MPL](https://axiom.co/docs/mpl/introduction) and [histograms and summaries](https://axiom.co/docs/mpl/histograms-summaries) |
| Applying Axiom features or managing dashboard resources | [Dashboard docs](https://axiom.co/docs/dashboards/create) and [MCP dashboard tools](https://axiom.co/docs/console/intelligence/mcp-server/tools#dashboards) |

## Example

Acme is moving its checkout dashboard from Grafana to Axiom.
On-call engineers use it to find failing or slow checkout routes.

| Step | Checkout example |
| --- | --- |
| 1. Define | Focus on checkout health and the routes that need investigation. |
| 2. Migrate | Follow the Grafana guide. Capture the failure-rate formula, p95 calculation, filters, units, and variables. |
| 3. Measure | Match the checkout request data. Keep failed requests and total requests within the same scope. |
| 4. Design | Show failure rate and latency first, followed by route breakdowns and access to matching requests. |
| 5. Test | Compare source and Axiom results for the same period and filters. Record any chart that cannot be matched. |
