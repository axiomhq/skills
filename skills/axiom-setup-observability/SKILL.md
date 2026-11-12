---
name: axiom-setup-observability
description: Instrument applications with OpenTelemetry and send the requested logs, traces, or metrics to Axiom. Use when asked to add Axiom observability, onboard an application to Axiom, configure OTLP export, or instrument a repository with OpenTelemetry.
---

# Axiom setup observability

Add useful, portable OpenTelemetry instrumentation within the requested scope, route it to Axiom safely, and prove the data is queryable. Onboarding is incomplete until every in-scope service is instrumented, explicitly deferred, or reported as blocked.

## Select the scope

Honor named applications and signals. For whole-repository onboarding, include every deployable service; for a named app or an added signal, inspect shared startup and deployment configuration but modify only what that request needs. If the request does not name an app, use the current app or the repository's sole runnable service; clarify only when multiple plausible targets would materially change the work.

Record enabled, preserved, unsupported, and deferred signals per service before creating datasets. For general observability setup, enable useful baseline signals supported by the runtime and existing architecture; explicitly report unsupported signals. A traces-only request does not require adding logs or metrics. Do not silently reduce the requested scope to make verification pass.

## Sources of truth

Before changing code, read the current official pages relevant to the detected stack, linked in the phase-specific references below.

Use current official Axiom, OpenTelemetry, language, and framework documentation for package names, compatible versions, bootstrap hooks, worker/fork behavior, logging bridges, and shutdown APIs. Do not guess or copy a stale setup recipe.

## Completion contract

For each in-scope runnable service:

1. Discover and name the process boundary.
2. Preserve or establish exactly one OpenTelemetry SDK bootstrap.
3. Configure stable resource identity and context propagation.
4. Export each enabled signal to the correct Axiom dataset.
5. Run the service's own checks and exercise a real operation.
6. Query Axiom and reach verification level 4 for every enabled signal.
7. Save reusable observability context for future agents and instrumentation reviews.

Setup is complete when useful baseline telemetry reaches level 4 for every enabled signal and the observability context is saved. Adding custom business telemetry is an optional follow-up, not a setup requirement. Preserve working instrumentation and keep changes focused on gaps needed for setup and verification.

Do not claim “Axiom ingestion verified” from successful startup, valid configuration, a 2xx response, or exporter diagnostics alone. Level 5 is a production sign-off, not the requirement for finishing onboarding.

## Phase 1: Preflight

### Inspect the repository

Find the repository root and record existing changes without requiring a clean tree. Inspect:

- workspace and language manifests;
- `apps/`, `services/`, `cmd/`, workers, jobs, CLIs, and serverless handlers;
- Docker, Compose, Kubernetes, Procfile, task-runner, process-manager, and deployment files;
- package scripts, documented start commands, and CI jobs;
- existing OpenTelemetry SDKs, agents, collectors, logging integrations, and observability vendors.

Keep application edits inside the project root. Private temporary files and the selected Axiom skill's credential store (such as `~/.axiom.toml`) may live outside it, subject to host permissions; preserve existing configuration and keep credentials private. Never commit, push, or open a pull request unless the user separately asks.

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

## Phase 2: Map runnable services

Enumerate deployable process boundaries within the selected scope, not merely package directories. Include web servers, APIs, workers, schedulers, background jobs, CLIs, mobile or browser apps, serverless functions, and edge functions. Exclude libraries, generated code, fixtures, and examples without runtime/deployment evidence. Identify related out-of-scope services when relevant to propagation, without expanding the implementation.

For each candidate, record:

- path and runtime;
- framework and process model;
- startup and test/build commands;
- deployment evidence;
- existing telemetry and logger;
- requested and enabled signals, plus unsupported/deferred signals and reasons;
- proposed bootstrap location;
- status: `instrument`, `preserve-and-extend`, `needs-confirmation`, or `blocked`.

Show the inventory and selected scope to the user, then continue without waiting unless an ambiguity materially changes or could break the implementation. Never silently skip an in-scope candidate.

Start implementation with one representative service. Prove its telemetry shape and export path, then apply the established pattern to the rest of the inventory.

## Phase 3: Configure Axiom

Read [reference/axiom-setup.md](reference/axiom-setup.md) before creating or reusing datasets and configuring exporters. It covers deployment selection, signal routing, credentials in exporter configuration, and correlations.

### Organization and credentials

Prefer an existing Axiom organization and deployment. If none is configured or available, load `axiom-agent-created-orgs` and provision at most one temporary organization for the task. Resolve sibling skills from their installed location, not from the customer repository's working directory. If a required skill is unavailable, use the linked official API documentation or report the missing capability; do not invent a relative executable path.

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
- Identify which SDK or vendor agent owns instrumentation hooks. Check current vendor/runtime compatibility before adding auto-instrumentation: one OTel provider does not prevent competing proprietary agents from patching the same libraries. Prefer a supported bridge or export path; if coexistence is unsupported, report the conflict rather than installing competing agents or removing a vendor silently.
- Prefer Collector fan-out when one OTel pipeline must feed multiple backends.

### Resource and propagation contract

Set:

- `service.name`: stable logical name shared by replicas;
- `service.namespace`: common system or product name when useful;
- `service.version`: release, build, or commit identifier;
- `deployment.environment.name`: such as `production`, `staging`, or `development`;
- `vcs.repository.url.full` on server processes: a canonical browser-accessible HTTP(S) repository URL. Read the remote privately, normalize known SSH/SCP forms, strip user information, query strings, fragments, and the trailing `.git`, and never print or export the raw remote. For example, `git@github.com:org/repo.git` becomes `https://github.com/org/repo`. Omit the attribute if a safe canonical URL cannot be established.

Detect or generate `service.instance.id` per running instance; never copy one value across replicas.

Use W3C `tracecontext,baggage` propagation. Do not put secrets, broad user data, or high-cardinality values in baggage.

### Signals

Use framework auto-instrumentation as the baseline, then add only what the application needs:

- Traces: HTTP/RPC, database, and messaging instrumentation. Add custom business-operation spans only in optional Phase 6. Record exceptions and set error status when an operation fails.
- Logs: keep the existing logger and add the current OTel bridge/appender so active `trace_id` and `span_id` are top-level fields. Preserve standard severity fields.
- Metrics: counters for state transitions, histograms for latency or sizes, and gauges only for point-in-time values.

Do not create wrapper APIs such as `sendAxiomSpan` or `recordAxiomMetric`. Application code uses native OpenTelemetry APIs so instrumentation stays portable.

Read `reference/spans.md` before adding or changing a span, span event, log attribute, or metric.

### Shutdown

Install bounded lifecycle handling appropriate to the runtime. Short-lived CLIs, jobs, and tests must flush before normal exit and shut providers down once at process termination. For reusable serverless processes, force-flush at invocation boundaries only when the runtime requires it; do not shut down a provider after every invocation. Do not claim delivery guarantees for crashes, `SIGKILL`, or platform freezes.

## Phase 5: Verify the enabled signals

Prove every enabled signal is queryable before adding custom business telemetry.

Verify in increasing levels of evidence and report the highest level reached for each service:

1. **Configured**: one bootstrap, correct resources, secrets externalized, correct signal endpoints/headers, valid Collector pipelines, and repository checks pass.
2. **Shape verified**: an in-memory exporter or local OTLP receiver sees expected spans, logs, metrics, resource attributes, and bounded dimensions.
3. **Pipeline verified**: exporter or Collector diagnostics show accepted and sent data with no unexplained rejection, drop, queue-full, or permanent failure. Inspect OTLP partial-success responses.
4. **Axiom verified**: bounded queries find a fresh unique marker in each enabled logs/traces dataset. If both are enabled, the canary log and span share trace/span IDs. For metrics, a deterministic representative metric changes as expected for this service instance and environment, and other enabled streams have valid shape and fresh samples where their recording behavior permits. This proves each enabled export path without requiring unrelated counters or gauges to change. Unless business instrumentation was requested, proceed to Phase 7.
5. **Production sign-off**: cross-service propagation works where applicable, final pre-shutdown telemetry arrives, restart behavior is sane, and rollback is documented. Do this when the user asks for a production sign-off.

Read `reference/verify.md` and run that canary. Query logs and traces with APL through `queryDataset`. Query metrics with MPL through `queryMetrics`. Never send MPL or a metrics dataset to `queryDataset`. When a query is empty or export fails, use the queries and failure table there.

If query credentials are unavailable, report the highest level actually demonstrated and “backend unverified.” Say “pipeline verified” only with level 3 evidence. If any enabled signal is missing, onboarding remains incomplete for that service. Do not add custom business metrics while that is true.

## Phase 6: Optional business telemetry

Run this phase only when the user requests business instrumentation or accepts it as a follow-up. Otherwise, skip to Phase 7 and offer an instrumentation review as a next step. For each service, start only after that service reaches level 4 for every enabled baseline signal.

Read the code and select one to three critical workflows per service. Instrument only operations whose outcome answers an operational or product question. Follow `reference/spans.md` for attributes, cardinality, and what must stay out of telemetry.

Repeat the canary in `reference/verify.md` for each new signal and confirm it is queryable before moving to the next service.

## Phase 7: Hand off

### Save observability context

Update the repository's existing observability documentation, or create `docs/observability.md` if there is no established location. Keep it concise and useful to future agents reviewing instrumentation; preserve unrelated existing content. Record:

- service inventory, runtime, SDK bootstrap locations, and existing vendors;
- service identity and environment/version sources;
- enabled signals, export route or Collector configuration, Axiom deployment and datasets;
- span naming and attribute conventions, propagation and log correlation, and metric cardinality rules used by the application;
- required secret variable names, never their values;
- commands to exercise a real operation and query its telemetry, with the verification date, environment, highest level reached per signal, and any blockers;
- deployment/restart and rollback steps.

Distinguish observed behavior from recommendations and keep local verification separate from production sign-off. Do not save tokens, authorization headers, sensitive payloads, or temporary-organization claim URLs in this file. Save partial results and blockers when setup cannot be completed.

### Report results

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
- exact rollback steps;
- path to the saved observability context.

If a temporary organization was provisioned, follow `axiom-agent-created-orgs` for the claim URL, expiry, security warning, and deletion behavior. Never include its token.

Do not create dashboards, monitors, alerts, or unrelated refactors during onboarding unless the user asks. Recommend the relevant Axiom skill as a separate next step after telemetry is verified.

## Reference

- [reference/axiom-setup.md](reference/axiom-setup.md) — datasets, regions, credentials in exporter configuration, endpoints, and correlations. Read at Phase 3.
- [reference/runtime-guides.md](reference/runtime-guides.md) — runtime documentation and setup guidance. Read before editing each runtime at Phase 4.
- `reference/spans.md` — span, event, and metric-attribute rules. Read before editing instrumentation.
- `reference/verify.md` — canary, queries, and export failures. Read at Phase 5 and after each business signal.
