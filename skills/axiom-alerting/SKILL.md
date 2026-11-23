---
name: axiom-alerting
description: Design, create, tune, and troubleshoot Axiom monitors and notification routing using Axiom MCP. Use for alert setup, noisy or silent alerts, and requested changes to monitors or notifiers.
---

# Axiom alerting

Turn the user's detection goal into an actionable monitor with appropriate notification routing. Use Axiom MCP for discovery, queries, and resource changes.

## Prerequisite: connect Axiom MCP

Before starting the workflow, discover the Axiom tools available in the session. Look for the tools the request needs: for example, `checkMonitors` and `getMonitor` for an existing monitor, `createMonitor` for creation, or `listNotifiers` for routing. Tool names below are logical names; clients may add a server prefix. Read the connected tool's schema for current arguments and supported behavior.

- **No Axiom MCP tools:** ask the user to connect and authenticate [Axiom MCP](https://axiom.co/docs/console/intelligence/mcp-server), then stop until the tools are available. Do not install a server or change client configuration without a request to do so.
- **Tools available:** make the first relevant read-only call, such as `checkMonitors` or `listNotifiers`. A tool being listed does not prove authentication works.
- **Authentication fails:** ask the user to sign in or reconnect Axiom MCP, then stop until authentication works.
- **A required tool is missing or access is denied:** identify the missing capability or permission and ask the user to enable it. Stop the blocked operation; do not describe a working connection as absent.

For a missing connection, say: "This skill requires Axiom MCP. Please connect and sign in to Axiom using the setup guide, then I can continue with your alert."

Use MCP for all Axiom operations in this skill. Do not fall back to shell scripts, direct HTTP requests, or a separate token configuration when MCP is missing or fails.

Keep all calls in the user's selected organization. Use `listOrganizations` when the target is unclear; otherwise use the established organization. Follow the requested mode: a proposal or review makes no changes; a creation or editing request authorizes its stated scope. Ask only for material unresolved choices or actions beyond that authorization.

Choose the steps that fit the request. For listing or reviewing existing resources, read those resources and report. For notifier-only work, start at notification routing without creating a monitor. For a requested pause, resume, or deletion, inspect the target and apply that change without redesigning its query or thresholds.

## 1. Understand the detection goal

Identify the service/environment, condition worth acting on, notification destination, and any supplied threshold or response-time requirement. Reuse information already available in the request and existing monitor.

For error rates, distinguish failed requests from error log volume. Check the denominator and traffic volume so a single failure during quiet traffic does not accidentally page the team. Keep ratios and percentages consistent with the threshold.

Use `checkMonitors` to find existing monitors before creating another. Read a relevant monitor with `getMonitor`; the overview may truncate its query. Update a matching monitor when that fits the request, and clarify if multiple resources are plausible targets.

## 2. Find and validate the signal

Use `listDatasets` to identify the dataset and its kind.

- Events or traces: inspect `getDatasetFields`, discover relevant values, then use `queryDataset` with APL.
- Metrics: use `listMetrics` or `searchMetrics`, inspect the metric's type, temporality, and unit, and discover filtering dimensions with `listMetricTags` and `getMetricTagValues`, then use `queryMetrics` with MPL.

Run the candidate query over a bounded, representative interval. Inspect normal behavior and a known failure interval when available. Derive proposed settings from the user's target and this evidence; state when no failure example or sufficient baseline is available. Use `getMetricsSpec`, `searchAxiomDocs`, or `readAxiomDoc` for unfamiliar semantics.

## 3. Choose the monitor behavior

| Detection goal | Monitor type |
|---|---|
| A measured value crosses a known limit | Threshold |
| Each matching event deserves attention | MatchEvent |
| A value appears that has not been seen recently | NewValues, when supported by the connected tool |
| A time series deviates from its recent behavior | AnomalyDetection |

Use the connected `createMonitor` or `updateMonitor` contract for supported fields and query constraints.

- For APL threshold monitors, make the intended measurement the first aggregated column; verify that the threshold applies to that measurement, not a helper count. Use explicit time bins when needed, not `bin_auto`.
- MatchEvent monitors evaluate every minute over the previous minute. Set both schedule values to 1 and use the tool's permitted non-aggregating APL operators.
- Decide how quickly detection is needed, how much history each evaluation needs, and whether late data requires a delay. Explain the latency/noise tradeoff.
- Use repeated breaches when supported and justified by transient noise. Decide whether missing data is itself a failure; a quiet service and a broken telemetry pipeline are different cases.
- Group alerts only where the groups have distinct actions or owners. Consider notification volume before choosing per-event alerts or notifications on every run.
- For NewValues or anomaly detection, check the tool's learning/history requirements. Explain any insufficient history or relearning caused by an edit.

## 4. Resolve notification routing

Use `listNotifiers` and reuse a suitable destination. Do not modify a shared notifier just to reroute one monitor; attach a different notifier when that fits the request.

If a notifier must be created or edited, use `createNotifier` or `updateNotifier` according to the connected tool's contract. When the tool requires manual channel setup in Axiom, explain that handoff before calling it, wait for the user to finish and identify the saved notifier, then use `listNotifiers` to verify it and obtain its ID. Opening a setup page is not evidence that a notifier exists. Never request channel credentials in chat or pass them in tool arguments.

## 5. Apply the requested change

Summarize the condition, dataset/service scope, evaluation timing, missing-data behavior, and destination before applying the authorized change. Resolve any material ambiguity first.

- Create with `createMonitor` using the validated query and verified notifier IDs.
- Update from the full `getMonitor` definition: `updateMonitor` replaces configuration. Preserve unrelated settings. Omit `notifierIds` to preserve routing, or send `[]` only when removing routing is intended.
- Pause or resume through `updateMonitor`, preserving the rest of the configuration and any requested pause deadline.
- Delete with `deleteMonitor` or `deleteNotifier` only for the exact resource the user authorized. Before changing or deleting a shared notifier, inspect affected monitors and establish the intended scope.

After an ambiguous write failure, read the current resources before retrying; the first call may have succeeded. Do not create a duplicate as a retry strategy.

## 6. Verify and report

For a created or updated monitor, read the saved definition with `getMonitor` and check that the query, timing, enabled state, and routing match the intended change. Use `getMonitorHistory` for a relevant interval when evaluating behavior. For notifier-only changes, verify the saved destination with `listNotifiers`. For deletion, verify that the resource is absent from `checkMonitors` or `listNotifiers`.

Distinguish these outcomes:

- Configuration saved and read back.
- Query validated against observed data.
- Monitor execution observed in history.
- Notification delivery verified independently, if evidence is available.

An empty or stale history does not prove that the monitor is healthy, and a successful create does not prove a notification was delivered. Do not deliberately trigger production alerts just to manufacture verification. If the next evaluation is still pending, say so instead of repeatedly polling or claiming success beyond the evidence.

Return the resource link supplied by MCP when available, the condition and destination or notifier change, the verification observed, and any remaining blocker. When available and useful, `showMonitor` can display the saved monitor and recorded checks; it does not run or verify a new evaluation.
