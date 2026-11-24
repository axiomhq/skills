# Node.js recipe

For Node services (Express, Fastify, Hono, NestJS, workers). For Next.js use [nextjs.md](nextjs.md). If the app already has an OTel SDK, extend it instead.

## 1. Check and install packages

```bash
npm view @opentelemetry/auto-instrumentations-node version engines deprecated
npm install @opentelemetry/api @opentelemetry/auto-instrumentations-node
```

Use the repository's package manager. Confirm `engines` matches the project's Node version. Do not pin versions from memory.

## 2. Activate without changing the start command's shape

Add the register hook to the existing start script, Dockerfile, or process manager:

```bash
# CommonJS
NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register" node server.js
# ESM: also load the instrumentation hook, or ESM imports are not patched
NODE_OPTIONS="--experimental-loader=@opentelemetry/instrumentation/hook.mjs --import @opentelemetry/auto-instrumentations-node/register" node server.js
```

Check `"type"` in `package.json` and the build output to choose; never assume the module system. TypeScript run through `tsx` needs the ESM form. See the upstream [ESM support guide](https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/esm-support.md). In a Dockerfile, use `ENV NODE_OPTIONS="..."` (key=value form) after dependencies are installed.

## 3. Configure with environment variables

Endpoints and per-signal headers come from [axiom-setup.md](../axiom-setup.md); put the secret-bearing header values in the git-ignored `.env` for local runs, or the platform secret store in production.

```bash
OTEL_SERVICE_NAME=checkout-api
OTEL_RESOURCE_ATTRIBUTES=deployment.environment.name=development,service.version=<commit-or-release>
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
# Each signal: otlp if enabled for this run, none if not. Never leave one unset.
OTEL_TRACES_EXPORTER=<otlp|none>
OTEL_LOGS_EXPORTER=<otlp|none>
OTEL_METRICS_EXPORTER=<otlp|none>
# Endpoint and header only for signals set to otlp:
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=<edge-url>/v1/traces
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=<edge-url>/v1/logs
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=<edge-url>/v1/metrics
# OTEL_EXPORTER_OTLP_{TRACES,LOGS,METRICS}_HEADERS: from the git-ignored .env locally, or the secret store in production
```

The Node SDK defaults every unset exporter to `otlp` and the protocol to `http/protobuf`, so set every disabled signal to `none` explicitly. Optionally limit instrumentations with `OTEL_NODE_ENABLED_INSTRUMENTATIONS=http,express,pg` (names without the `@opentelemetry/instrumentation-` prefix).

The register hook runs the `serviceinstance` resource detector by default, which sets a random `service.instance.id` per process. If you set `OTEL_NODE_RESOURCE_DETECTORS`, keep `serviceinstance` in the list.

The register hook cannot take instrumentation options (such as request hooks for redaction) from environment variables. When [privacy.md](../privacy.md) needs a hook, use the manual setup in step 5 instead.

## 4. Logs and runtime metrics

- **Pino, Bunyan:** current instrumentations add `trace_id`/`span_id` and forward records to the OTel logs SDK. Keep the existing logger.
- **Winston:** forwarding also needs `@opentelemetry/winston-transport`.
- **console.log:** not captured. Do not replace it wholesale; report it or bridge a structured logger the app already uses.
- **Runtime metrics:** current versions include runtime instrumentation (event loop, heap, GC). Confirm the metric names in the dataset.

## 5. Shutdown

The register hook shuts the SDK down on `SIGTERM` and when the process exits normally (`beforeExit`), so servers and CLIs that finish on their own flush their telemetry. `process.exit()`, uncaught exceptions, and `SIGINT` (Ctrl+C) skip it. For an app that exits that way, or that needs instrumentation options, use a manual setup: build a `NodeSDK` from `@opentelemetry/sdk-node` with `getNodeAutoInstrumentations()`, start it before other imports, and `await sdk.shutdown()` once before exit.

## Pitfalls

- **dotenv loads too late.** OTEL variables in `.env` loaded by application code are not seen by the register hook. Use the platform environment or `node --env-file=.env` (Node 20.6+).
- **Bundled output** (esbuild, webpack, ncc) hides modules from auto-instrumentation. Mark instrumented packages as external or instrument before bundling.
- **The app stops exiting on `SIGTERM`.** The register hook listens for `SIGTERM` to flush telemetry, and in Node any `SIGTERM` listener replaces the default exit. An app with no `SIGTERM` handler of its own then keeps running on `docker compose stop` or a Kubernetes rollout until it is force-killed. If the app has no handler, add one that closes the server, and any database pools or other open handles, so the process exits once the SDK has flushed:

  ```js
  process.on('SIGTERM', () => server.close());
  ```

  Do not call `process.exit()` there; it would cut off the flush. After adding the handler, check that the process exits on `SIGTERM`.
- **Second SDK.** Do not add the register hook when the app already starts a `NodeSDK` or vendor agent.
- **Exporter `none`.** A missing `OTEL_*_EXPORTER` or a typo silently disables a signal. Check the local output.

## Local check

Set each enabled signal's exporter to `console` and leave disabled signals at `none`, run one request, inspect the output, then set each exporter back to its previous value: `otlp` for enabled signals, `none` for disabled ones. See [verify.md](../verify.md#local-check).
