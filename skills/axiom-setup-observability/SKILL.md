---
name: axiom-setup-observability
description: Instrument applications with OpenTelemetry and send the requested logs, traces, or metrics to Axiom. Use when asked to add Axiom observability, onboard an application to Axiom, configure OTLP export, or instrument a repository with OpenTelemetry.
---

# Axiom setup observability

Instrument the requested application with portable OpenTelemetry, send its enabled signals to Axiom, and verify fresh data from a real operation. Preserve working instrumentation and keep changes focused on onboarding.

## 1. Inspect the app and scope

Honor the user's named apps, signals, environment, and launch brief. A traces-only request does not require logs or metrics. For general setup, choose useful baseline signals supported by the runtime and report unsupported ones. For whole-repository onboarding, discover every deployable process; for a named app, inspect shared startup/configuration without modifying unrelated services. If multiple plausible targets remain, clarify the scope.

For full-app or full-stack setup of a web app, include browser telemetry for the enabled signals; when tracing is enabled, verify browser-to-backend propagation. Backend-only requests leave browser code unchanged. If scope is unclear, clarify whether browser coverage is wanted. Use a controlled gateway and collection controls; if these cannot be established, report browser setup as blocked and the full-app result as partial, rather than silently deferring it.

Inspect manifests, start/build/test commands, deployment files, existing SDKs, loggers, Collectors, and vendor agents. Record existing changes without requiring a clean tree. Identify actual process boundaries, not library directories or examples without deployment evidence. For multiple services, show a compact inventory with enabled, preserved, unsupported, and deferred signals and reasons; never silently skip an in-scope service. Prove one representative service before extending the pattern.

Before changing code, show a short plan covering the services/signals, export route and selected Axiom target, verification steps, and known blockers or deferred scope. Proceed within the requested scope without a routine confirmation step; ask only when an unresolved choice would materially change the work. Surface lengthy builds or downloads before starting them.

## 2. Use or prepare the destinations

Choose the path from the available context:

- **Destinations supplied:** use the provided datasets, full HTTPS edge URL, selected config/deployment, enabled signals, and secret bindings. Preserve an existing correlation group. Skip creation of supplied resources and reuse a working ingest credential; management access is not a prerequisite for instrumentation.
- **Destinations missing:** read [reference/provision.md](reference/provision.md) and prepare only missing resources for enabled signals. Reuse compatible resources and preserve any supplied selections. Do not create another organization to bypass missing permissions or query access.

Read [reference/axiom-setup.md](reference/axiom-setup.md) for per-signal endpoints and headers. Use the selected dataset edge, not the management API, for export.

If an ingest credential or private binding is missing, follow [private ingest setup](reference/provision.md#configure-private-ingest-access) to create and configure it when permitted. Inject credentials through the platform/CI secret store or a protected local credential file, scoped to the application/Collector process. Never request or paste secret values in chat, source, tracked env files, logs, snapshots, shell history, or command arguments. Environment variables remain sensitive: avoid shell/CI dumps and unnecessary child-process inheritance; see [routing credential guidance](reference/axiom-setup.md#credential-injection). Validate the final HTTPS destination before attaching credentials. Keep scoped application ingest credentials separate from management/query access. If permissions or private storage are unavailable, continue with placeholders and report the blocker.

## 3. Instrument the enabled signals

Read [reference/runtime-guides.md](reference/runtime-guides.md) for the detected runtime's current official packages, bootstrap hook, resource identity, propagation, and shutdown guidance. Check installed versions rather than copying a stale recipe.

Preserve one SDK bootstrap per process and initialize before instrumented libraries load. Extend existing SDKs and loggers. Check vendor/runtime compatibility before adding auto-instrumentation; a Collector cannot fix competing in-process hooks. Preserve existing vendors unless replacement was requested.

Use framework instrumentation for the baseline and native OTel APIs in application code. Avoid Axiom-specific span/metric wrappers and unrequested business spans or metrics. Keep log/trace correlation when both signals are enabled. Read [reference/spans.md](reference/spans.md) when adding or changing spans, events, log attributes, or metric dimensions; keep names/dimensions bounded and exclude sensitive payloads.

Check auto-instrumented output too: disable or redact raw URL query strings, authorization/cookie headers, and bodies before export. Preserve safe error details, span events, and trace links; redact sensitive fields rather than dropping all events or links. Include a synthetic query/header sentinel in the local check to verify exclusion; remove temporary verification plumbing afterward.

Preserve the existing working export architecture. For new server-side setups, default to direct OTLP/HTTP export to Axiom; multiple services alone do not require a Collector. Add a Collector only for a concrete collection, security, or operational requirement and explain why; see [reference/deployment.md](reference/deployment.md). Read that reference for production/sensitive data and public clients too. Never embed Axiom credentials in browser/mobile code; public clients need a controlled gateway and appropriate collection/consent controls. Continue safe local configuration while reporting any unresolved live-export boundary.

## 4. Run and verify

Run repository checks, start the app through its normal command, and exercise a real request, job, or CLI operation. Read [reference/verify.md](reference/verify.md) for the canary and relevant signal queries; use its local receiver or failure guidance only when needed.

When tracing is enabled, exercise a representative failure safely in the test environment and verify error status and useful redacted diagnostics, including a matching error log when logs are enabled. Use existing error paths or temporary test stubs; do not disrupt production or leave verification plumbing in the app. Report a blocker if the failure cannot be exercised safely.

Verify fresh data for the expected service/environment from this run in each enabled signal. If logs and traces are enabled, confirm matching trace/span IDs. For metrics, prove a representative expected change for the tested instance; unrelated gauges/counters need not change. Do not put random verification IDs in metric dimensions. Remove temporary verification routes/marker plumbing afterward and check that normal export still works.

Use APL for logs/traces and MPL for metrics, through tools or APIs connected to the selected organization. An ingest-only token cannot query: use existing separate query access, or report backend unverified with the local/pipeline evidence actually observed. Startup, a 2xx response, configuration, or sample counts alone do not prove this run reached Axiom. Retry missing results only for a bounded interval.

Setup is complete when baseline telemetry is verified in Axiom for every enabled signal and observability context is saved. Otherwise save the partial result and name the blocker. Local verification does not imply production sign-off; run the additional deployment checks only when requested.

## 5. Save context and report the result

Update the existing observability documentation, or create `docs/observability.md`. Keep it concise: services and bootstrap locations; enabled signals, identity, destinations and export route; secret variable names; conventions needed for future instrumentation; commands and dated verification evidence; remaining blockers; restart and rollback steps. Preserve unrelated content and never save tokens, sensitive payloads, or temporary-organization claim URLs there.

Lead the customer result with what changed, which signals were confirmed, and what remains unverified. Include a verified Axiom result link when available, or a reproducible query identifying this run, so the user can inspect confirmed telemetry. Include required deployment steps and the context-document path; provide detailed evidence or per-service status when useful. If a temporary organization was created, follow its provisioning workflow for the private claim-link/expiry handoff, never its token.

Keep application edits within the project; private temporary files and credential storage may use their normal locations subject to host permissions. Do not commit, push, open PRs, create dashboards/monitors, deploy, or make unrelated changes unless requested. Business instrumentation and production sign-off are separate follow-ups, not onboarding requirements.
