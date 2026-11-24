# Python recipe

For Flask, Django, FastAPI, and Python workers. If the app already configures an OTel SDK, extend it instead.

## 1. Check and install packages

```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp-proto-http
opentelemetry-bootstrap -a requirements
```

`opentelemetry-bootstrap -a requirements` prints the instrumentation packages that match the installed libraries; it is the authoritative list. Add them to the project's dependency file (requirements, Poetry, uv) so deployments are reproducible, then install. A library missing from that output has no current instrumentation; do not hand-pin a retired package. Check other packages with `pip index versions <package>`.

## 2. Activate by wrapping the normal start command

```bash
opentelemetry-instrument python app.py
opentelemetry-instrument gunicorn app:app
opentelemetry-instrument uvicorn app.main:app
```

Change the existing start script, Procfile, or Dockerfile `CMD` rather than adding a separate launcher.

## 3. Configure with environment variables

Endpoints and headers come from [axiom-setup.md](../axiom-setup.md).

```bash
OTEL_SERVICE_NAME=billing-api
OTEL_RESOURCE_ATTRIBUTES=deployment.environment.name=development,service.version=<commit-or-release>
# Required: opentelemetry-distro defaults to grpc, which this recipe does not install
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
# Each signal: otlp if enabled for this run, none if not. Never leave one unset.
OTEL_TRACES_EXPORTER=<otlp|none>
OTEL_METRICS_EXPORTER=<otlp|none>
OTEL_LOGS_EXPORTER=<otlp|none>
# Only when logs are enabled and the SDK is older than 1.40.0:
# OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true
# Endpoint and header only for signals set to otlp:
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=<edge-url>/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=<edge-url>/v1/metrics
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=<edge-url>/v1/logs
# OTEL_EXPORTER_OTLP_{TRACES,METRICS,LOGS}_HEADERS: from the git-ignored .env locally, or the secret store in production
```

`opentelemetry-distro` defaults all three exporters to `otlp` and the protocol to `grpc`, so set the protocol and every disabled signal explicitly. From OpenTelemetry Python 1.40.0, standard `logging` records are forwarded with trace context by default; older versions need `OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true`. From SDK 1.44.0, each process (including forked workers) gets its own `service.instance.id` automatically; on older versions, confirm it appears in the output and set it per process if not.

## Pitfalls

- **Pre-fork servers.** With several workers, plain Gunicorn and Uvicorn export traces and logs but break metrics, because exporter threads do not survive `fork`. For ASGI apps (FastAPI, Starlette), run Gunicorn with `--worker-class uvicorn.workers.UvicornWorker`, which keeps all three signals working. Otherwise initialize OpenTelemetry inside each worker after the fork with programmatic auto-instrumentation. See the [OTel Python troubleshooting guide](https://opentelemetry.io/docs/zero-code/python/troubleshooting/).
- **Reloaders.** The Flask debug reloader breaks instrumentation; run with `use_reloader=False`. Avoid other auto-reloaders (`uvicorn --reload`, Django `runserver` without `--noreload`) while verifying, since they restart the process outside the instrumented one.
- **Django** needs `DJANGO_SETTINGS_MODULE` set in the environment for instrumentation.
- **Shutdown.** `opentelemetry-instrument` flushes at normal interpreter exit. `os._exit()` and killed processes skip it. A programmatic setup must call `provider.shutdown()` once at exit (for example with `atexit`).

## Local check

Set each enabled signal's exporter to `console` and leave disabled signals at `none`, add `OTEL_LOG_LEVEL=debug` if export seems silent, run one request, then set each exporter back to its previous value: `otlp` for enabled signals, `none` for disabled ones. See [verify.md](../verify.md#local-check).
