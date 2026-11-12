# axiom-setup-observability

Adds OpenTelemetry observability to the requested applications or repository and verifies that supported and enabled logs, traces, and metrics reach Axiom. Named applications and traces-only requests keep that scope; whole-repository onboarding covers every discovered deployable process boundary.

## What This Skill Covers

- Repository-wide discovery of deployable services, workers, jobs, CLIs, and functions
- Compatibility checks for existing OpenTelemetry SDKs and vendor agents
- Explicit service/signal selection, without creating datasets for disabled signals
- Signal-specific OTLP/HTTP routing to correlated Axiom datasets
- Stable service identity, context propagation, and trace-correlated logs
- Optional business spans and metrics derived from application code, when requested after baseline verification
- Local, pipeline, backend-ingestion, correlation, restart, and shutdown verification
- Per-service evidence, blockers, rollback instructions, and temporary-org handoff
- Saved observability context for future agents and instrumentation reviews

Setup is complete when useful baseline telemetry is queried back from Axiom for every enabled signal and the repository's observability context is saved. Custom business instrumentation is an optional follow-up. The context goes in existing observability documentation or `docs/observability.md` and records setup, conventions, verification evidence, and operational steps without secrets.

## Setup Paths

- **Destinations already supplied:** instrument and verify using those datasets, edge, secret variables, and selected deployment. Resource management permissions are not required.
- **Destinations missing:** load `reference/provision.md` and prepare only missing resources. Preserve any supplied destinations and custom config path.

The main workflow stays focused on discovery, instrumentation, verification, and concise handoff. Runtime details live in `reference/runtime-guides.md`; sensitive-data/Collector decisions and production sign-off live in `reference/deployment.md`; detailed evidence levels and troubleshooting live in `reference/verify.md`.

## Safety Model

- Credentials stay in the deployment's secret mechanism and never enter source or browser bundles.
- Browser and mobile telemetry uses a controlled first-party gateway with abuse and privacy controls, never direct Axiom credentials.
- Existing telemetry vendors and user configuration are preserved by default.
- Sensitive content is excluded unless the user approves specific fields and a redaction strategy.
- The skill does not claim success until telemetry is queried back from Axiom.
- Missing query access is reported separately from the highest verification level actually demonstrated.

## Axiom Routing

Use separate correlated datasets for each enabled signal:

- Logs: Events dataset, `/v1/logs`, `x-axiom-dataset`
- Traces: Events dataset, `/v1/traces`, `x-axiom-dataset`
- Metrics: Metrics dataset, `/v1/metrics`, `x-axiom-metrics-dataset`

## Requirements

- An Axiom organization, or the `axiom-agent-created-orgs` skill for a temporary one
- A least-privilege API token with ingest access to the destination datasets
- Query access through Axiom MCP or configured API credentials for end-to-end verification
- The target repository's normal package manager and build/test tools

## Evaluation

Twelve fixture-based cases in `.meta/` cover auto-instrumentation privacy, supplied/partial destinations, custom config preservation, API edge identifiers, scoped changes, existing SDK/vendor ownership, missing query access, public-client credentials, installed paths, safe repository URLs, and metric evidence. The existing changed-skill CI discovers `axiom-setup-observability.eval.ts`.

From `eval-tooling`, run `pnpm exec axiom eval ../skills/axiom-setup-observability/.meta/axiom-setup-observability.eval.ts` with the repository's evaluation credentials. The shared harness proposes changes from fixture text; it does not edit/run customer applications or send telemetry. Its two semantic rubric scorers are exploratory and require human review/calibration before scores are trusted as a release gate. Runtime bootstrap/flush behavior and backend delivery still need representative application integration tests.

## Sources

- [Send OpenTelemetry data to Axiom](https://axiom.co/docs/send-data/opentelemetry)
- [Methods for sending data](https://axiom.co/docs/send-data/methods)
- [Manage datasets](https://axiom.co/docs/reference/datasets)
- [OpenTelemetry documentation](https://opentelemetry.io/docs/)
- [OpenTelemetry library instrumentation](https://opentelemetry.io/docs/concepts/instrumentation/libraries/)
