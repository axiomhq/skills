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

Prefer direct OTLP/HTTP export for a small deployment, local proof, or platform where a Collector cannot run.

Prefer SDK → OpenTelemetry Collector → Axiom when any of these apply:

- multiple services share routing or credentials;
- production needs batching, buffering, retries, sampling, filtering, redaction, or fan-out;
- Prometheus endpoints must be scraped;
- backend credentials should stay out of application processes.

Use an upstream Collector distribution with the required stable components. Do not require an Axiom-specific Collector.

Browser and mobile apps must export through a controlled first-party gateway or Collector endpoint, never directly to Axiom. Require TLS, authentication or attestation where available, origin restrictions, rate and payload limits, sampling, and server-side redaction. CORS alone is not an access control.


## Production sign-off

Run this only when requested; local backend arrival does not prove production delivery. Check cross-service propagation where applicable, final pre-shutdown telemetry arrival, restart behavior, the actual production secret/export route, and rollback. Use bounded lifecycle handling from [runtime-guides.md](runtime-guides.md). Record which environment was exercised and any remaining gaps. Do not deploy, change retention, or modify unrelated infrastructure merely to finish a local onboarding task.
