# axiom-setup-observability

Adds OpenTelemetry observability to the requested applications or repository and verifies that supported and enabled logs, traces, and metrics reach Axiom. Named applications and traces-only requests keep that scope.

## Modes

- **Quick start (default):** the selected app, server-side traces and logs (plus runtime metrics the zero-code agent provides), a delivery check in Axiom, and a short report with next steps.
- **Add an item (on request):** quick start plus only the named items: more services, browser telemetry, a privacy sentinel check, a safe failure check, metric correctness, or production. One item does not turn on the others (except production, which adds the privacy check).
- **Full setup (explicit request):** every item at once. Production sign-off still needs its own request. See `reference/full-setup.md`.

## What This Skill Covers

- Repository-wide discovery of deployable services, workers, jobs, CLIs, and functions (full setup)
- Per-language recipes for Node.js, Next.js, Python, Go, and Java using zero-code agents where available
- Compatibility checks for existing OpenTelemetry SDKs and vendor agents
- Explicit service/signal selection, without creating datasets for disabled signals
- Signal-specific OTLP/HTTP routing to correlated Axiom datasets
- Stable service identity, context propagation, and trace-correlated logs
- Key context on the app's 1–3 main operations in quick start (attributes on existing spans first, new spans only when needed); custom metrics and more operations on request
- Scripted verification: start the app, exercise a real operation, poll Axiom to a bounded deadline, and show the user the records that arrived
- Quick quality checks on arrived data (broken traces, root client spans, logs without severity, metrics without units), reported as warnings with Instrumentation Score rule IDs
- Per-service evidence, blockers, rollback instructions, and temporary-org handoff
- A plain-language `docs/observability.md` for developers and future agents: what's set up, where to see the data, settings, and how to turn it off

Setup is complete when fresh telemetry from this run is queried back from Axiom for every enabled signal, shown to the user, and the repository's observability context is saved. Custom business instrumentation is an optional follow-up. The context goes in existing observability documentation or `docs/observability.md` and records setup, conventions, verification evidence, and operational steps without secrets.

## Setup Paths

- **Destinations already supplied:** instrument and verify using those datasets, edge, secret variables, and selected deployment. Resource management permissions are not required.
- **Destinations missing:** load `reference/provision.md` and prepare only missing resources. Preserve any supplied destinations and custom config path.

The main workflow stays focused on discovery, instrumentation, verification, and concise handoff. Setup steps live in `reference/recipes/`; shared runtime rules in `reference/runtime-guides.md`; sensitive-data handling in `reference/privacy.md`; Collector decisions and production sign-off in `reference/deployment.md`; the verification script, statuses, and troubleshooting in `reference/verify.md`; full-setup checks in `reference/full-setup.md`.

## Safety Model

- Locally, the ingest token goes in a `.env` that git ignores (checked before writing); in production, it stays in the platform's secret store. It never enters source, committed files, or browser bundles.
- Secret-bearing OTLP headers are injected into the intended runtime, not exported in the agent's general shell; tracing, environment dumps, and unrelated child processes must not expose them.
- Browser and mobile telemetry uses a controlled first-party gateway with abuse and privacy controls, never direct Axiom credentials.
- Existing telemetry vendors and user configuration are preserved by default.
- Sensitive content is excluded unless the user approves specific fields and a redaction strategy.
- The skill does not claim success until telemetry is queried back from Axiom.
- Missing query access is reported separately from the highest verification level actually demonstrated.

## Axiom Routing

Use separate correlated datasets for each enabled signal:

- Logs: `otel:logs:v1` or Events dataset, `/v1/logs`, `x-axiom-dataset`
- Traces: `otel:traces:v1` or Events dataset, `/v1/traces`, `x-axiom-dataset`
- Metrics: Metrics dataset, `/v1/metrics`, `x-axiom-metrics-dataset`

## Requirements

- An Axiom organization, or the `axiom-agent-created-orgs` skill for a temporary one
- A least-privilege API token with ingest access to the destination datasets
- Query access through Axiom MCP or configured API credentials for end-to-end verification
- The target repository's normal package manager and build/test tools

## Evaluation

There is currently no automated eval runner. The previous runner used the deprecated `axiom/ai` evals package and only graded written plans, so it was removed.

`.meta/cases.ts` keeps 32 scenario ideas (scope, modes, credentials, routing, verification, and honest status) for the next eval system. That system should run a real agent on fixture applications and decide pass or fail from the telemetry that reaches Axiom, comparing the skill with the previous version.

## Sources

- [Send OpenTelemetry data to Axiom](https://axiom.co/docs/send-data/opentelemetry)
- [Methods for sending data](https://axiom.co/docs/send-data/methods)
- [Manage datasets](https://axiom.co/docs/reference/datasets)
- [OpenTelemetry documentation](https://opentelemetry.io/docs/)
- [OpenTelemetry library instrumentation](https://opentelemetry.io/docs/concepts/instrumentation/libraries/)
