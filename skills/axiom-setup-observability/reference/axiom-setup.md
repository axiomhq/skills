# Route enabled signals to Axiom

Read this when configuring exporters, whether destinations were supplied or provisioned. Resource creation is separate: read [provision.md](provision.md) only for missing resources.

## Use the supplied destinations

Keep the selected config path, deployment, environment, datasets, edge, and secret variable names from the launch brief. Do not replace them with a default organization or infer a region from an SDK default. Supplied destinations do not require dataset listing or management credentials before instrumentation; if read access is available, inspect compatibility without mutating resources. On an actual mismatch or rejection, report the specific gap rather than silently selecting another destination.

Use a dedicated dataset per enabled signal and preserve existing correlation groups:

| Signal | OTLP path | Dataset header |
|---|---|---|
| Logs | `/v1/logs` | `x-axiom-dataset` |
| Traces | `/v1/traces` | `x-axiom-dataset` |
| Metrics | `/v1/metrics` | `x-axiom-metrics-dataset` |

The dataset's full HTTPS `edgeDeploymentUrl` is the ingest origin. It is distinct from an API identifier such as `cloud.us-east-1.aws` and a display label such as `US East 1 (AWS)`. Validate the destination before attaching credentials. See [Axiom OTLP ingestion](https://axiom.co/docs/send-data/opentelemetry) for the current routing contract.

For correlated logs, preserve top-level `trace_id` and `span_id`; keep spans in the traces dataset. Keep all spans of a distributed trace together and distinguish services with `service.name`.

## Exporter configuration

Every enabled signal request also sends `Authorization: Bearer <API_TOKEN>` from the deployment secret mechanism. Configure only enabled signals, separately. A shared dataset header in `OTEL_EXPORTER_OTLP_HEADERS` cannot route logs/traces and metrics correctly; use signal-specific dataset headers. Shared authorization alone is not a routing error.

### Credential injection

#### Local development

For a quick start run locally, keep the token in a `.env` file next to the app's start point (the Compose file or the app root). This is the default for local setup; use the stricter production rules below only for the Production item or a deployed environment.

1. **Make sure git ignores it before writing any value.** If `.env` is not in `.gitignore`, add it. Confirm with `git check-ignore -q .env`. If `.env` is already tracked (`git ls-files --error-unmatch .env` succeeds), do not put the token there: tell the user, and use `.env.local` (also added to `.gitignore`) instead.
2. **Put only secret-bearing values in it**, normally the `OTEL_EXPORTER_OTLP_*_HEADERS` variables. Keep non-secret settings (service name, endpoints, exporters) in tracked configuration. Add or update a tracked `.env.example` with the same variable names and placeholder values.
3. **Preserve existing content.** Append to an existing `.env` rather than overwriting it, and keep the file private (mode `0600`).
4. **Write the value without printing it**, straight from the token API response or from an existing private credential file.
5. **Load it the simple way:** Docker Compose `env_file: .env` on the instrumented services, `node --env-file=.env` (Node.js 20.6 and later), or the framework's usual `.env` loading, as long as it runs before the OpenTelemetry SDK starts. Do not add custom entrypoint scripts or Docker secrets for local development.
6. **Only an ingest token goes there:** scoped to the destination datasets, with an expiry. Never put management or query credentials in `.env`.

Before finishing, confirm `git status` does not list `.env`.

#### Production and deployed environments

Prefer platform/CI secret-store bindings, an existing private local credential provider, or a protected mounted secret read by the SDK/Collector at runtime. Tracked examples/configuration contain only variable names or secret references. Never ask the user to paste a token into chat or copy a real token into a script, terminal command, or tracked file. If a credential or private binding is missing, follow [private ingest setup](provision.md#configure-private-ingest-access) to prepare it when permitted; report a pending secret step only when permissions or safe storage/binding are unavailable.

For the Production item and deployed environments, if the runtime uses environment-based OTLP headers, have the platform inject the secret-bearing values directly into the intended service/Collector process. Do not export expanded authorization headers in the agent's general shell. Environment variables are not a security boundary: child processes inherit them by default and environment dumps, shell tracing, CI output, debug exporters, or crash reports can reveal them. Disable tracing before retrieving secrets; do not run `env`, `printenv`, `set`, or header-dumping diagnostics in that scope. Do not rely on CI masking as the only protection. Run builds/unrelated tools outside the secret scope and pass a sanitized environment to children that do not need telemetry credentials, removing both the token variable and shared/per-signal OTLP header variables. Restrict that scope to the app process and children that genuinely need it.

In `OTEL_EXPORTER_OTLP_*_HEADERS`, separate headers with commas and use `=`, not HTTP colon syntax. Follow the installed exporter's [OTLP environment header format](https://opentelemetry.io/docs/specs/otel/protocol/exporter/#specifying-headers-via-environment-variables), including percent-encoding spaces in values. The environment format uses `Bearer%20` for the authorization separator; SDK/Collector header maps instead use the literal `Bearer ` value.

For environment-based SDK configuration, the platform secret store can supply each enabled header value in the form `Authorization=Bearer%20<secret>,x-axiom-dataset=<dataset>` (metrics uses `x-axiom-metrics-dataset`). This describes the format, not a shell command or a literal value to commit. SDK header maps can instead read the injected token/mounted secret at runtime and keep it in memory; do not export a second copy of the authorization header unnecessarily.

The following shell example sets **non-secret routing only**. Set `AXIOM_EDGE_URL` to the verified full HTTPS `edgeDeploymentUrl`, including its scheme, and retain only enabled signals. Credential injection is handled separately as above.

```bash
set +x
: "${AXIOM_EDGE_URL:?Set the verified full HTTPS edgeDeploymentUrl first}"
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_LOGS_ENDPOINT="${AXIOM_EDGE_URL%/}/v1/logs"
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="${AXIOM_EDGE_URL%/}/v1/traces"
export OTEL_EXPORTER_OTLP_METRICS_ENDPOINT="${AXIOM_EDGE_URL%/}/v1/metrics"
```

Export and quote assignments so the child process receives them intact. Without `export`, a process started from that shell does not receive them.

In SDK or Collector code, use normal header names and values: `Authorization: Bearer <token>` and `x-axiom-dataset: <name>`. Collector `otlphttp` takes the edge base URL and appends the signal path. SDK exporters usually take the full signal URL. Read the installed exporter and make `/v1/{signal}` appear exactly once.

Do not prepend another scheme to `AXIOM_EDGE_URL`. Do not use `api.axiom.co` for OTLP, and do not accept an SDK's default region.

If a platform cannot set dataset headers, use the documented dataset-in-path endpoints instead: `<edge-url>/v1/ingest/<dataset>/traces`, `/logs`, and `/metrics`, set as the per-signal endpoints. Only metrics also accepts the base-URL form `<edge-url>/v1/ingest/<dataset>/v1/metrics`; setting `OTEL_EXPORTER_OTLP_ENDPOINT` to `<edge-url>/v1/ingest/<dataset>` makes logs and traces return 404. If the platform supports only one shared base URL for several signals, use a Collector or the platform's documented Axiom integration. Do not invent other ingestion paths.
