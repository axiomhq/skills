---
name: axiom-onboarding
description: Instruments every runnable app and service in a repository with OpenTelemetry and sends correlated logs, traces, and metrics to Axiom. Use when asked to add Axiom observability, onboard an application to Axiom, configure OTLP export, or instrument a repository with OpenTelemetry.
---

# Axiom Onboarding

Add useful, portable OpenTelemetry instrumentation to every runnable service, route it to Axiom safely, and prove the data is queryable. Onboarding is incomplete until every discovered service is instrumented, explicitly deferred, or reported as blocked.

## Sources of truth

Before changing code, read the current pages relevant to the detected stack:

- [Axiom OpenTelemetry ingestion](https://axiom.co/docs/send-data/opentelemetry.md)
- [Axiom sending methods and runtime guides](https://axiom.co/docs/send-data/methods.md)
- [Axiom datasets](https://axiom.co/docs/reference/datasets.md)
- [Axiom edge deployments](https://axiom.co/docs/reference/edge-deployments.md)
- [Axiom tokens](https://axiom.co/docs/reference/tokens.md)
- [Axiom ingestion limits](https://axiom.co/docs/reference/limits.md)
- [OpenTelemetry documentation](https://opentelemetry.io/docs/)
- [OpenTelemetry library instrumentation](https://opentelemetry.io/docs/concepts/instrumentation/libraries/)
- [OpenTelemetry recording errors](https://opentelemetry.io/docs/specs/semconv/general/recording-errors/)
- [OpenTelemetry instrumentation scope](https://opentelemetry.io/docs/concepts/instrumentation-scope/)

Use current official Axiom, OpenTelemetry, language, and framework documentation for package names, compatible versions, bootstrap hooks, worker/fork behavior, logging bridges, and shutdown APIs. Do not guess or copy a stale setup recipe.

## Completion contract

For each runnable service:

1. Discover and name the process boundary.
2. Preserve or establish exactly one OpenTelemetry SDK bootstrap.
3. Configure stable resource identity and context propagation.
4. Export each enabled signal to the correct Axiom dataset.
5. Add a small number of code-derived business signals.
6. Run the service's own checks and exercise a real operation.
7. Query Axiom for fresh signal-specific evidence and verify correlation.

Do not claim “Axiom ingestion verified” from successful startup, valid configuration, a 2xx response, or exporter diagnostics alone.

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

### Signal datasets

For each environment, residency, and tenant-access boundary, use a compatible organization and edge deployment with one correlation group and a dedicated dataset for each enabled signal:

| Signal | Dataset kind | OTLP path | Routing header |
|---|---|---|---|
| Logs | Events | `/v1/logs` | `x-axiom-dataset` |
| Traces | Events | `/v1/traces` | `x-axiom-dataset` |
| Metrics | Metrics | `/v1/metrics` | `x-axiom-metrics-dataset` |

Every request also requires `Authorization: Bearer <API_TOKEN>`, sourced from the deployment secret mechanism.

Keep every span of a distributed trace within one compatible traces dataset. Distinguish services with `service.name`; do not create a traces dataset per microservice.

Use the actual edge assigned to the datasets. Do not infer it from the developer's location or rely on an SDK's default region.

Configure each signal independently. A shared `OTEL_EXPORTER_OTLP_HEADERS` value is insufficient because metrics use a different dataset header.

Prefer OTLP over HTTP/protobuf. SDK exporters commonly take full signal URLs; Collector `otlphttp` exporters commonly take a base endpoint and append the signal path. Check the installed exporter's current semantics and ensure `/v1/{signal}` appears exactly once.

Current product documentation is authoritative if examples disagree. In particular, use `x-axiom-metrics-dataset` for metrics and separate logs, traces, and metrics datasets.

## Phase 4: Instrument each service

### SDK ownership and startup

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
- `deployment.environment.name`: such as `production`, `staging`, or `development`.

Detect or generate `service.instance.id` per running instance; never copy one value across replicas.

Use W3C `tracecontext,baggage` propagation. Do not put secrets, broad user data, or high-cardinality values in baggage.

### Signals

Use framework auto-instrumentation as the baseline, then add only what the application needs:

- Traces: HTTP/RPC, database, messaging, and critical business operations. Record exceptions and set error status when an operation fails.
- Logs: keep the existing logger and add the current OTel bridge/appender so active `trace_id` and `span_id` are carried. Preserve standard severity fields.
- Metrics: counters for state transitions, histograms for latency or sizes, and gauges only for point-in-time values.

Do not create wrapper APIs such as `sendAxiomSpan` or `recordAxiomMetric`. Application code uses native OpenTelemetry APIs so instrumentation stays portable.

### Span and event design

Follow the current [semantic conventions](https://opentelemetry.io/docs/specs/semconv/) before inventing attribute names. Obtain each tracer, meter, and logger with an instrumentation-scope name and version: a library's fully qualified name, or the application module such as `CheckoutService`. Do not use `service.name` as the scope name.

Create a span only for an operation that has duration and diagnostic value, especially public operations, handlers, and calls that cross a process or can fail. Use a span event for a point-in-time checkpoint, state change, or exception. Use a span attribute for a property of the whole operation. Use a normal log for unstructured diagnostics.

For each custom span:

- Set one span kind: `SERVER`, `CLIENT`, `PRODUCER`, `CONSUMER`, or `INTERNAL`.
- Name it `{action} {target}`, such as `GET /orders/{id}` or `send orders_queue`. Keep the name low-cardinality, include only values also stored as attributes, and use a documented fallback or truncation when a value is missing or too long.
- Cover the logical operation. Leave physical network retries and serialization to the library that performs them, recording extra detail as events rather than nested spans.
- Make the span current for its duration so child spans and logs inherit its context, then end it on every exit path.
- Put attributes needed by a sampler on the span at creation. Compute expensive or verbose attributes only when the span is recording.
- Leave span status unset when the operation succeeds. On an unhandled failure, set status to `Error`, set `error.type`, record the exception, and use a non-sensitive status description. Do not record an error that was retried or handled inside the operation. Do not treat every protocol status, such as HTTP 404, as an error without operation context.

Keep the SDK's parent-based sampler so an upstream sampling decision propagates. Use parent-based, always-on while proving a new integration. For high-volume production, choose a documented parent-based ratio or gateway tail sampling; do not sample each service independently. Attributes added after span creation cannot affect the sampling decision.

### Shutdown

Install bounded lifecycle handling appropriate to the runtime. Short-lived CLIs, jobs, and tests must flush before normal exit and shut providers down once at process termination. For reusable serverless processes, force-flush at invocation boundaries only when the runtime requires it; do not shut down a provider after every invocation. Do not claim delivery guarantees for crashes, `SIGKILL`, or platform freezes.

## Phase 5: Add business telemetry

Read the code and select one to three critical workflows per service. Instrument only operations whose outcome answers an operational or product question.

For each proposed metric, establish:

- name, unit, and instrument type;
- exact recording point;
- question it answers;
- allowed attributes and finite value sets;
- plausible series count;
- sensitive or unbounded values explicitly excluded.

Good dimensions are bounded values such as `outcome`, `payment_provider`, or `job_type`. Do not use raw URLs, user/session/request/trace IDs, emails, timestamps, free text, arbitrary headers, or entity IDs as metric attributes or span names. Use route templates and bounded enums.

Inspect auto-instrumented as well as custom metric streams. Remove unsafe attributes with Views where supported, configure an appropriate SDK cardinality limit, and verify that `otel.metric.overflow=true` is absent or its impact is explicitly understood.

Put entity identifiers only in traces or structured logs when they are necessary, non-sensitive, and approved. Use trace/log correlation rather than trace IDs as metric labels.

Do not capture raw bodies, prompts, tool content, SQL parameters, authorization or cookie headers, URL query strings, file contents, stack locals, source code, payment/health data, or arbitrary serialized objects by default.

Avoid duplicate network/framework spans already emitted by auto-instrumentation. Use span events or structured logs for additional detail.

## Phase 6: Verify

Verify in increasing levels of evidence and report the highest level reached for each service:

1. **Configured**: one bootstrap, correct resources, secrets externalized, correct signal endpoints/headers, valid Collector pipelines, and repository checks pass.
2. **Shape verified**: an in-memory exporter or local OTLP receiver sees expected spans, logs, metrics, resource attributes, and bounded dimensions.
3. **Pipeline verified**: exporter or Collector diagnostics show accepted and sent data with no unexplained rejection, drop, queue-full, or permanent failure. Inspect OTLP partial-success responses.
4. **Axiom verified**: bounded queries find a fresh unique marker in enabled logs/traces datasets and a fresh expected value change for each enabled metric, all with the expected `service.name`.
5. **Production handoff verified**: log and trace IDs correlate, cross-service propagation works where applicable, final pre-shutdown telemetry arrives, restart behavior is sane, and rollback is documented.

### Canary procedure

For every service:

1. Generate a fresh random, non-sensitive marker.
2. Run the normal build/test command.
3. Start or invoke the real service through its documented command.
4. Exercise one instrumented request, job, or CLI operation carrying the marker as a safe span/log attribute.
5. Keep the process alive through its export interval or invoke graceful flush.
6. Inspect exporter/Collector diagnostics and partial-success responses.
7. Query logs and traces with APL for the marker. Query metrics with MPL for a known bounded metric, expected dimensions, and a fresh timestamp or value change; never add the random marker as a metric attribute.
8. Confirm resource identity, expected signal shape, no unexplained metric overflow, and log-to-trace correlation.
9. Exercise graceful shutdown and verify telemetry emitted immediately before exit.

Use actual discovered field, span, and metric names. If recent event data appears absent, compare `_time` and `_sysTime` to detect clock skew. Retry backend queries for a short bounded interval; never loop indefinitely.

If query credentials are unavailable, report “pipeline verified, backend unverified.” If any enabled signal is missing, onboarding remains incomplete for that service.

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
