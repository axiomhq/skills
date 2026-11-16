# Collection boundaries and deployment choices

Read the relevant section for sensitive/production data, public clients, Collector selection, or a requested production sign-off. For a synthetic local server with known destinations, use direct OTLP/HTTP and the normal verification workflow.


## Data boundary

Before telemetry containing user or production data is sent, determine:

- environment and data residency;
- regulated or sensitive data constraints;
- consent, data minimization, retention, deletion, and tenant boundaries;
- which fields may contain PII, credentials, source code, prompts, bodies, or query parameters.

If these decisions are unresolved, continue with dependency/configuration work that cannot export sensitive data, but stop before live ingestion and report the gate.

For browser and mobile telemetry, review fields emitted by third-party auto-instrumentation and require the application's consent and collection controls before enabling export.

## Select the architecture

Preserve an existing working Collector or export route. For new server-side setups, default to direct OTLP/HTTP export to Axiom with private runtime credential injection. Multiple services, production deployment, and routine SDK batching/retries alone do not require adding a Collector.

Add SDK → OpenTelemetry Collector → Axiom only for an identified requirement such as:

- scraping Prometheus endpoints or collecting infrastructure/file logs;
- centralized filtering/redaction, fan-out to multiple backends, or tail sampling;
- shared durable queues or delivery controls beyond the SDK's supported capabilities;
- keeping backend credentials out of application processes.

State the requirement before adding the extra service. A temporary local Collector used to inspect telemetry does not require a permanent Collector deployment.

Use an upstream Collector distribution with the required stable components. Do not require an Axiom-specific Collector.

Browser and mobile apps must export through a controlled first-party gateway or Collector endpoint, never directly to Axiom. Require TLS, authentication or attestation where available, origin restrictions, rate and payload limits, sampling, and server-side redaction. CORS alone is not an access control.


## Production sign-off

Run this only when requested; local backend arrival does not prove production delivery. Check cross-service propagation where applicable, final pre-shutdown telemetry arrival, restart behavior, the actual production secret/export route, and rollback. Use bounded lifecycle handling from [runtime-guides.md](runtime-guides.md). Record which environment was exercised and any remaining gaps. Do not deploy, change retention, or modify unrelated infrastructure merely to finish a local onboarding task.
