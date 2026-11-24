# Collection boundaries and deployment choices

Read the relevant section for production or real user data, public clients, Collector selection, or a requested production sign-off. A local development run with synthetic or developer-generated data skips the data-boundary gate and uses direct OTLP/HTTP with the normal verification workflow.


## Data boundary

This gate applies only before telemetry containing real user or production data is sent. Determine:

- environment and data residency;
- regulated or sensitive data constraints;
- consent, data minimization, retention, deletion, and tenant boundaries;
- which fields may contain PII, credentials, source code, prompts, bodies, or query parameters.

If these decisions are unresolved, continue with configuration and local verification, but stop before exporting production or user data and report the gate. See [privacy.md](privacy.md) for how to exclude sensitive fields.

For browser and mobile telemetry, review fields emitted by third-party auto-instrumentation and require the application's consent and collection controls before enabling export.

## Select the architecture

Preserve an existing working Collector or export route. For new server-side setups, default to direct OTLP/HTTP export to Axiom with private runtime credential injection. Multiple services, production deployment, and routine SDK batching/retries alone do not require adding a Collector. A shared configuration file is not a reason when each service can already export OTLP and reach Axiom.

Add SDK → OpenTelemetry Collector → Axiom only for an identified requirement such as:

- scraping Prometheus endpoints or collecting infrastructure/file logs;
- centralized filtering/redaction, fan-out to multiple backends, or tail sampling;
- shared durable queues or delivery controls beyond the SDK's supported capabilities;
- keeping backend credentials out of application processes;
- an egress boundary where the application must not reach Axiom and only a gateway may;
- one policy change for every service: rotate the token, change sampling or redaction, or add a backend without redeploying each service.

State the requirement before adding the extra service. A temporary local Collector used to inspect telemetry does not require a permanent Collector deployment.

Use an upstream Collector distribution with the required stable components. Do not require an Axiom-specific Collector. When a Collector is added, include `memory_limiter` and `batch`, and test the queue limit so an Axiom outage does not exhaust the Collector. Tail sampling needs every span of a trace on the same instance. Metrics need one writer per stream so gateway replicas do not overwrite each other.

Browser and mobile apps must export through a controlled first-party gateway or Collector endpoint, never directly to Axiom. Require TLS, authentication or attestation where available, origin restrictions, rate and payload limits, sampling, and server-side redaction. CORS alone is not an access control.


## Production sign-off

Run this only when sign-off is explicitly requested, even in full setup; local backend arrival does not prove production delivery. Check cross-service propagation where applicable, final pre-shutdown telemetry arrival, restart behavior, the actual production secret/export route, and rollback. Use bounded lifecycle handling from [runtime-guides.md](runtime-guides.md). Record which environment was exercised and any remaining gaps. Do not deploy, change retention, or modify unrelated infrastructure merely to finish a local onboarding task.
