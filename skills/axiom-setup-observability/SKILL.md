---
name: axiom-setup-observability
description: Instrument applications with OpenTelemetry and send the requested logs, traces, or metrics to Axiom. Use when asked to add Axiom observability, onboard an application to Axiom, configure OTLP export, or instrument a repository with OpenTelemetry.
---

# Axiom setup observability

Instrument the requested application with portable OpenTelemetry, send its enabled signals to Axiom, and confirm fresh data from a real operation. Preserve working instrumentation and keep changes focused on onboarding.

**Done when** fresh telemetry from this run has been queried back from Axiom for every enabled signal and shown to the user, and the observability context is saved. Otherwise, save the partial result and name the blocker.

## Choose the mode

| Mode | Use when | What it does |
|---|---|---|
| **Quick start** (default) | No mode is given, or the launch brief says `Mode: quick start` | The selected app; requested signals, otherwise server-side traces and logs plus runtime metrics the chosen agent or framework provides without extra code; key context on the 1–3 main operations (step 3); the Axiom delivery check from [reference/verify.md](reference/verify.md); sensitive fields disabled by configuration |
| **Add an item** | The request names specific items, such as browser traces, another service, a signal, a privacy check, a failure check, or production | Quick start plus only the named items from the table below |
| **Full setup** | The user or brief explicitly asks for full setup or "everything" | Quick start plus every item below except production sign-off, which still needs its own request |

| Item | Turned on by | Does |
|---|---|---|
| More services | "whole repo", "all services", or naming the services | Instruments those processes ([full-setup.md](reference/full-setup.md#scope)) |
| Browser | "browser", "frontend", or "full-app"/"full-stack" for one web app | Browser telemetry and propagation for that app only, through a gateway ([full-setup.md](reference/full-setup.md#scope)) |
| Privacy sentinel | "privacy check", or the Production item | [full-setup.md](reference/full-setup.md#privacy-sentinel-check) |
| Failure check | "error check", "failure check" | [full-setup.md](reference/full-setup.md#safe-failure-check) |
| More custom instrumentation | "add custom metrics", "instrument more operations" | Extends key context to more operations and adds custom metrics ([full-setup.md](reference/full-setup.md#business-instrumentation)) |
| Metric correctness | a new/custom metric, or a suspected wrong value | [full-setup.md](reference/full-setup.md#metric-correctness) |
| Production | "production", "prod", or deploy targets | The data-boundary gate, production configuration, and the privacy sentinel, because production carries real user data ([deployment.md](reference/deployment.md)); sign-off checks only when sign-off is asked for |

Apart from Production turning on the privacy sentinel, one item never turns on another: "add browser traces to the web app" does not instrument other services or add a failure check, and "set this up for production" does not add a temporary error path. Offer the items you did not do as next steps. Honor explicitly named apps and signals in every mode: a traces-only request does not require logs or metrics.

## 1. Inspect the app

Read manifests, start/build/test commands, deployment files, existing SDKs, loggers, Collectors, and vendor agents. Record existing changes without requiring a clean tree. Identify actual process boundaries, not library directories or examples without deployment evidence. If the target is ambiguous, clarify it. Keep changes inside the selected app; inspect shared configuration but ask before changing it.

If telemetry already exists, handle it before planning new instrumentation:

- **Sent to another platform:** ask whether to add Axiom alongside it or switch to Axiom; do not assume either. Adding alongside keeps the current route and also sends to Axiom (a second exporter, or Collector fan-out; see [reference/deployment.md](reference/deployment.md)). Switching changes the destination and keeps the existing instrumentation.
- **Broken or misconfigured** (for example a wrong endpoint, an exporter set to `none`, two SDKs in one process, or logs without trace context): tell the user what is wrong. Fix only what is needed to deliver the requested signals to Axiom, keep everything else, and list each change in the report.

Identify where the app runs. When the platform could already send the chosen signals (for example Vercel, AWS Lambda, or Cloudflare), read [reference/integrations.md](reference/integrations.md) and add only missing coverage.

Before the first edit, send the user a short plan as a message: services and signals, export route and Axiom target, verification steps, and known blockers. Always show the plan; you do not need to wait for a reply unless an unresolved choice would materially change the work.

## 2. Use or prepare the destinations

- **Destinations supplied:** use the provided datasets, full HTTPS edge URL, selected config/deployment, enabled signals, and secret bindings. Preserve an existing correlation group. Reuse a working ingest credential; management access is not a prerequisite for instrumentation.
- **Destinations missing:** read [reference/provision.md](reference/provision.md) and prepare only the missing resources for enabled signals. Do not create another organization to bypass missing permissions or query access.

Read [reference/axiom-setup.md](reference/axiom-setup.md) for per-signal endpoints, headers, and credential injection. Use the dataset's edge URL for export, not the management API.

Never request or paste secret values in chat, source, tracked files, logs, or command arguments. For a local quick start, put the token in a `.env` file that git ignores ([local development](reference/axiom-setup.md#local-development)). For production, use the platform or CI secret store. If permissions or private storage are unavailable, continue with placeholders and report the blocker.

## 3. Instrument the enabled signals

Use the matching recipe in `reference/recipes/` ([Node.js](reference/recipes/node.md), [Next.js](reference/recipes/nextjs.md), [Python](reference/recipes/python.md), [Go](reference/recipes/go.md), [Java](reference/recipes/java.md)). For other runtimes, and for ownership, resource identity, and shutdown rules, read [reference/runtime-guides.md](reference/runtime-guides.md). Check package names and versions with the ecosystem's tools rather than writing them from memory.

- Preserve one SDK bootstrap per process, initialized before instrumented libraries load. Extend existing SDKs and loggers, and preserve existing vendors unless replacement was requested.
- Prefer existing instrumentation, then the runtime's zero-code agent or framework integration. Add custom SDK code only for a concrete gap that configuration cannot cover, and explain the gap.
- Use native OTel APIs in application code, and do not add Axiom-specific wrappers. Read [reference/spans.md](reference/spans.md) before adding a span, log attribute, or metric dimension.
- Keep log/trace correlation when both signals are enabled.
- Keep URL query strings, authorization/cookie headers, and bodies out of auto-instrumented telemetry. Read [reference/privacy.md](reference/privacy.md) when a default captures them.
- For new server-side setups, export directly over OTLP/HTTP to Axiom. Add a Collector only for a concrete requirement, and read [reference/deployment.md](reference/deployment.md) for that, for production or sensitive data, and for public clients. Never embed Axiom credentials in browser or mobile code.

**Add key context.** Auto-instrumentation shows that a request happened; key context shows what it meant. When tracing is enabled, add it to the app's 1–3 main operations (for example creating an order or validating input), following [reference/spans.md](reference/spans.md):

1. First add attributes to spans that auto-instrumentation already creates: the outcome, a reason for failure or rejection, a bounded type or category, and non-sensitive IDs.
2. Add a new span only for a step with its own duration that no existing span covers.
3. Do not add custom metrics in quick start; offer them as a next step.

Use the native OpenTelemetry API and keep the change small. Never record personal data, request bodies, or secrets ([reference/privacy.md](reference/privacy.md)). List the planned attributes and spans in the plan. Skip this step when the user asked for no application code changes.

## 4. Verify in Axiom

Before a build, image pull, or download likely to take more than about 2 minutes (for example a first Docker build of a JVM service), tell the user roughly how long it will take and offer three options: run it now, let the user run it, or verify locally first. While it runs, show progress or run it in the background with updates; never hide its output until it ends.

Follow the script in [reference/verify.md](reference/verify.md): run the repository's relevant existing checks, start the app or ask the user to, exercise a real operation, query each enabled signal in Axiom within the polling deadline, show the user what arrived, and run the quick quality checks. Quality failures are warnings, not blockers. Repeat checks only after relevant changes or failures.

An ingest-only token cannot query. Use existing separate query access, or report backend unverified along with the local or pipeline evidence actually observed. Startup, a 2xx response, or configuration alone do not prove this run reached Axiom.

Remove temporary verification code afterward, and repeat the affected check if cleanup changes startup or export code. Comprehensive reviews, new test harnesses, and production sign-off are follow-ups unless requested.

## 5. Save context and report the result

Update the existing observability documentation, or create `docs/observability.md`, using the plain-language template in [reference/observability-doc.md](reference/observability-doc.md): what's set up, where to see the data, how it works, settings, how to turn it off or undo it, and what's not done yet. Preserve unrelated content and never save tokens, sensitive payloads, or temporary-organization claim URLs there.

Lead the result with what changed, which signals were confirmed, and what remains unverified. Put quality warnings after that, under a heading such as "Optional improvements", so they do not read as a failed setup. Show the confirmed records or a verified Axiom link, plus a reproducible query for this run. Include required deployment steps. Point to the doc in one line that says what it is for, for example: "I saved a summary in `docs/observability.md`: what's set up, where to see your data, and how to turn it off."

End with a "Want more? Just say:" list of the items that were not done, each with a phrase the user can reply with and what it adds. Do not run them. Leave out items that do not apply, such as browser traces for an app without a frontend. For example:

> **Want more? Just say:**
> - "add browser traces": tracking for `web/`, through a gateway
> - "add the other services": set up `worker/` the same way
> - "set it up for production": production configuration and a privacy check
> - "add an error check": test that failures show up correctly in Axiom
> - "add custom metrics": counters and timings for key operations, such as todos created or rejected
> - "instrument more operations": key context for the rest of the app's operations
> - "full setup": all of the above

If a temporary organization was created, follow its provisioning workflow for the private claim-link/expiry handoff, never its token.

Keep application edits within the project; private temporary files and credential storage may use their normal locations subject to host permissions. Do not commit, push, open PRs, create dashboards/monitors, deploy, or make unrelated changes unless requested.
