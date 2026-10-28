---
name: axiom-onboarding
description: Instruments every runnable app and service in a repository with OpenTelemetry and sends correlated logs, traces, and metrics to Axiom. Use when asked to add Axiom observability, onboard an application to Axiom, configure OTLP export, or instrument a repository with OpenTelemetry.
---

# Axiom Onboarding

Add useful, portable OpenTelemetry instrumentation to every runnable service, route it to Axiom safely, and prove the data is queryable. Onboarding is incomplete until every discovered service is instrumented, explicitly deferred, or reported as blocked.

## Sources of truth

Before changing code, read the current official pages relevant to the detected stack, linked in the phase-specific references below.

Use current official Axiom, OpenTelemetry, language, and framework documentation for package names, compatible versions, bootstrap hooks, worker/fork behavior, logging bridges, and shutdown APIs. Do not guess or copy a stale setup recipe.

## Completion contract

For each runnable service:

1. Discover and name the process boundary.
2. Preserve or establish exactly one OpenTelemetry SDK bootstrap.
3. Configure stable resource identity and context propagation.
4. Export each enabled signal to the correct Axiom dataset.
5. Run the service's own checks and exercise a real operation.
6. Query Axiom and reach verification level 4 for every enabled signal.
7. Add a small number of code-derived business signals, then confirm those signals are queryable.

Do not claim “Axiom ingestion verified” from successful startup, valid configuration, a 2xx response, or exporter diagnostics alone. Level 5 is a production sign-off, not the requirement for finishing onboarding.

## Phase 1: Preflight

### Inspect the repository

Find the repository root and record existing changes without requiring a clean tree. Inspect:

- workspace and language manifests;
- `apps/`, `services/`, `cmd/`, workers, jobs, CLIs, and serverless handlers;
- Docker, Compose, Kubernetes, Procfile, task-runner, process-manager, and deployment files;
- package scripts, documented start commands, and CI jobs;
- existing OpenTelemetry SDKs, agents, collectors, logging integrations, and observability vendors.

Never modify files outside the project root. Never commit, push, or open a pull request unless the user separately asks.

### Establish the data boundary

Before telemetry containing user or production data is sent, determine:

- environment and data residency;
- regulated or sensitive data constraints;
- consent, data minimization, retention, deletion, and tenant boundaries;
- which fields may contain PII, credentials, source code, prompts, bodies, or query parameters.

If these decisions are unresolved, continue with dependency/configuration work that cannot export sensitive data, but stop before live ingestion and report the gate.

For browser and mobile telemetry, review fields emitted by third-party auto-instrumentation and require the application's consent and collection controls before enabling export.

### Select the architecture

Prefer direct OTLP/HTTP export for a small deployment, local proof, or platform where a Collector cannot run.

Prefer SDK → OpenTelemetry Collector → Axiom when any of these apply:

- multiple services share routing or credentials;
- production needs batching, buffering, retries, sampling, filtering, redaction, or fan-out;
- Prometheus endpoints must be scraped;
- backend credentials should stay out of application processes.

Use an upstream Collector distribution with the required stable components. Do not require an Axiom-specific Collector.

Browser and mobile apps must export through a controlled first-party gateway or Collector endpoint, never directly to Axiom. Require TLS, authentication or attestation where available, origin restrictions, rate and payload limits, sampling, and server-side redaction. CORS alone is not an access control.

## Phase 2: Map every runnable service

Enumerate deployable process boundaries, not merely package directories. Include web servers, APIs, workers, schedulers, background jobs, CLIs, mobile or browser apps, serverless functions, and edge functions. Exclude libraries, generated code, fixtures, and examples without runtime/deployment evidence.

For each candidate, record:

- path and runtime;
- framework and process model;
- startup and test/build commands;
- deployment evidence;
- existing telemetry and logger;
- proposed bootstrap location;
- status: `instrument`, `preserve-and-extend`, `needs-confirmation`, or `blocked`.

Show the inventory to the user, then continue without waiting unless an ambiguity materially changes or could break the implementation. Never silently skip a candidate.

Start implementation with one representative service. Prove its telemetry shape and export path, then apply the established pattern to the rest of the inventory.

## Phase 3: Configure Axiom

Read [reference/axiom-setup.md](reference/axiom-setup.md) before creating or reusing datasets and configuring exporters. It covers deployment selection, signal routing, credentials in exporter configuration, and correlations.

### Organization and credentials

Prefer an existing Axiom organization and deployment. If none is configured or available, load `axiom-agent-created-orgs` and provision at most one temporary organization for the task.

Use a least-privilege API token scoped to ingest only into the intended datasets. Prefer an expiring API token over a personal access token.

Never:

- commit or print a token or authorization header;
- place a token in source, a tracked `.env` file, test snapshots, logs, shell history, or command arguments;
- put an Axiom token in browser or mobile code;
- attach credentials before validating the final HTTPS destination;
- reuse a broad local development token as a production application credential.

Use the repository's existing deployment secret mechanism. If it has none, add variable names and documented placeholders, not secret values, and tell the user what must be configured.

## Phase 4: Instrument each service

### SDK ownership and startup

Read [reference/runtime-guides.md](reference/runtime-guides.md) before editing each runtime. Follow its current guide for packages, bootstrap hooks, and platform-specific lifecycle behavior.

- Runnable services own SDK initialization; shared libraries depend on OpenTelemetry APIs only.
- Establish one provider/bootstrap path per process. Do not add a second global SDK over an existing one.
- Initialize before instrumented libraries load, using the framework's documented hook.
- Handle pre-fork/post-fork, worker, serverless, and edge lifecycles according to current runtime documentation.
- Preserve existing Sentry, Datadog, New Relic, logging transports, and other vendors unless the user asks to replace them.
- Prefer Collector fan-out when one OTel pipeline must feed multiple backends.

### Resource and propagation contract

Set:

- `service.name`: stable logical name shared by replicas;
- `service.namespace`: common system or product name when useful;
- `service.version`: release, build, or commit identifier;
- `deployment.environment.name`: such as `production`, `staging`, or `development`;
- `vcs.repository.url.full` on server processes: the repository's full remote URL. Read it from the repository remote and omit it when that remote is unknown.

Detect or generate `service.instance.id` per running instance; never copy one value across replicas.

Use W3C `tracecontext,baggage` propagation. Do not put secrets, broad user data, or high-cardinality values in baggage.

### Signals

Use framework auto-instrumentation as the baseline, then add only what the application needs:

- Traces: HTTP/RPC, database, messaging, and critical business operations. Record exceptions and set error status when an operation fails.
- Logs: keep the existing logger and add the current OTel bridge/appender so active `trace_id` and `span_id` are top-level fields. Preserve standard severity fields.
- Metrics: counters for state transitions, histograms for latency or sizes, and gauges only for point-in-time values.

Do not create wrapper APIs such as `sendAxiomSpan` or `recordAxiomMetric`. Application code uses native OpenTelemetry APIs so instrumentation stays portable.

Read `reference/spans.md` before adding or changing a span, span event, log attribute, or metric.

### Shutdown

Install bounded lifecycle handling appropriate to the runtime. Short-lived CLIs, jobs, and tests must flush before normal exit and shut providers down once at process termination. For reusable serverless processes, force-flush at invocation boundaries only when the runtime requires it; do not shut down a provider after every invocation. Do not claim delivery guarantees for crashes, `SIGKILL`, or platform freezes.

## Phase 5: Verify the enabled signals

Prove logs, traces, and metrics are queryable before adding custom business telemetry.

Verify in increasing levels of evidence and report the highest level reached for each service:

1. **Configured**: one bootstrap, correct resources, secrets externalized, correct signal endpoints/headers, valid Collector pipelines, and repository checks pass.
2. **Shape verified**: an in-memory exporter or local OTLP receiver sees expected spans, logs, metrics, resource attributes, and bounded dimensions.
3. **Pipeline verified**: exporter or Collector diagnostics show accepted and sent data with no unexplained rejection, drop, queue-full, or permanent failure. Inspect OTLP partial-success responses.
4. **Axiom verified**: bounded queries find a fresh unique marker in enabled logs and traces datasets and a fresh expected value change for each enabled metric, all with the expected `service.name`. This proves the export path. Finish the service in Phase 6.
5. **Production sign-off**: log and trace IDs correlate, cross-service propagation works where applicable, final pre-shutdown telemetry arrives, restart behavior is sane, and rollback is documented. Do this when the user asks for a production sign-off.

Read `reference/verify.md` and run that canary. Query logs and traces with APL through `queryDataset`. Query metrics with MPL through `queryMetrics`. Never send MPL or a metrics dataset to `queryDataset`. When a query is empty or export fails, use the queries and failure table there.

If query credentials are unavailable, report “pipeline verified, backend unverified.” If any enabled signal is missing, onboarding remains incomplete for that service. Do not add custom business metrics while that is true.

## Phase 6: Add business telemetry

Start this phase only after the representative service reaches level 4 for every enabled signal.

Read the code and select one to three critical workflows per service. Instrument only operations whose outcome answers an operational or product question. Follow `reference/spans.md` for attributes, cardinality, and what must stay out of telemetry.

Repeat the canary in `reference/verify.md` for each new signal and confirm it is queryable before moving to the next service.

## Phase 7: Hand off

Report:

- all discovered services and their final status;
- changed files and added dependencies;
- instrumentation method and bootstrap location per service;
- `service.name`, environment/version source, datasets, and edge;
- business spans, logs, and metrics added, including cardinality decisions;
- verification level and evidence per service;
- existing vendors preserved;
- required secret variable names and deployment/restart steps;
- unresolved privacy, compliance, export, or runtime blockers;
- exact rollback steps.

If a temporary organization was provisioned, follow `axiom-agent-created-orgs` for the claim URL, expiry, security warning, and deletion behavior. Never include its token.

Do not create dashboards, monitors, alerts, or unrelated refactors during onboarding unless the user asks. Recommend the relevant Axiom skill as a separate next step after telemetry is verified.

## Reference

- [reference/axiom-setup.md](reference/axiom-setup.md) — datasets, regions, credentials in exporter configuration, endpoints, and correlations. Read at Phase 3.
- [reference/runtime-guides.md](reference/runtime-guides.md) — runtime documentation and setup guidance. Read before editing each runtime at Phase 4.
- `reference/spans.md` — span, event, and metric-attribute rules. Read before editing instrumentation.
- `reference/verify.md` — canary, queries, and export failures. Read at Phase 5 and after each business signal.
