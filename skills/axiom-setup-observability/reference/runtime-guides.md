# Runtime guides

Read this before editing the bootstrap or installing instrumentation for the detected runtime. Follow only its relevant runtime and lifecycle guidance.

## Sources of truth

Use current official language and framework documentation alongside these OpenTelemetry references:

- [OpenTelemetry documentation](https://opentelemetry.io/docs/)
- [OpenTelemetry library instrumentation](https://opentelemetry.io/docs/concepts/instrumentation/libraries/)
- [OpenTelemetry recording errors](https://opentelemetry.io/docs/specs/semconv/general/recording-errors/)
- [OpenTelemetry instrumentation scope](https://opentelemetry.io/docs/concepts/instrumentation-scope/)
- [Datadog OpenTelemetry compatibility](https://docs.datadoghq.com/opentelemetry/compatibility/)
- [New Relic OpenTelemetry APM compatibility](https://docs.newrelic.com/docs/opentelemetry/get-started/apm-monitoring/opentelemetry-apm-intro/)

When a vendor agent is already installed, read its current runtime compatibility guidance before adding auto-instrumentation. Preserve the existing instrumentation owner unless a supported coexistence/export path is documented or a migration is requested. A Collector can fan out an existing OTel pipeline, but it does not resolve competing in-process runtime hooks.

## Choose the runtime guide

Read the current guide for the detected runtime and follow its packages, bootstrap file, and startup hook. Do not copy an example from memory.

| Runtime | Read before editing |
|---|---|
| Node.js | [OpenTelemetry Node.js](https://axiom.co/docs/guides/opentelemetry-nodejs.md) |
| Next.js | [OpenTelemetry Next.js](https://axiom.co/docs/guides/opentelemetry-nextjs.md) |
| Nuxt | [OpenTelemetry Nuxt.js](https://axiom.co/docs/guides/opentelemetry-nuxtjs.md) |
| Python | [OpenTelemetry Python](https://axiom.co/docs/guides/opentelemetry-python.md) |
| Django | [OpenTelemetry Django](https://axiom.co/docs/guides/opentelemetry-django.md) |
| Go | [OpenTelemetry Go](https://axiom.co/docs/guides/opentelemetry-go.md) |
| Java | [OpenTelemetry Java](https://axiom.co/docs/guides/opentelemetry-java.md) |
| .NET | [OpenTelemetry .NET](https://axiom.co/docs/guides/opentelemetry-dotnet.md) |
| Ruby | [OpenTelemetry Ruby](https://axiom.co/docs/guides/opentelemetry-ruby.md) |
| Cloudflare Workers | [Workers OpenTelemetry](https://axiom.co/docs/guides/opentelemetry-cloudflare-workers.md) |
| AWS Lambda | [AWS Lambda](https://axiom.co/docs/send-data/aws-lambda.md) |
| Kubernetes or a Collector | [Kubernetes](https://axiom.co/docs/send-data/kubernetes.md) |

For a runtime not listed, start at [methods for sending data](https://axiom.co/docs/send-data/methods.md), then the matching OpenTelemetry language page. Replace every `AXIOM_DOMAIN`, `API_TOKEN`, and `DATASET_NAME` in those guides with the edge URL, secret variable, and signal dataset from the selected destinations. Their examples often show only traces and put the token in source; keep all enabled signals and the credential rules in this skill.


## SDK ownership and startup

- Runnable services own SDK initialization; shared libraries depend on OpenTelemetry APIs only.
- Establish one provider/bootstrap path per process. Do not add a second global SDK over an existing one.
- Initialize before instrumented libraries load, using the framework's documented hook.
- Handle pre-fork/post-fork, worker, serverless, and edge lifecycles according to current runtime documentation.
- Preserve existing Sentry, Datadog, New Relic, logging transports, and other vendors unless the user asks to replace them.
- Identify which SDK or vendor agent owns instrumentation hooks. Check current vendor/runtime compatibility before adding auto-instrumentation: one OTel provider does not prevent competing proprietary agents from patching the same libraries. Prefer a supported bridge or export path; if coexistence is unsupported, report the conflict rather than installing competing agents or removing a vendor silently.
- Prefer Collector fan-out when one OTel pipeline must feed multiple backends.

## Resource and propagation contract

Set:

- `service.name`: stable logical name shared by replicas;
- `service.namespace`: common system or product name when useful;
- `service.version`: release, build, or commit identifier;
- `deployment.environment.name`: such as `production`, `staging`, or `development`;
- `vcs.repository.url.full` on server processes: a canonical browser-accessible HTTP(S) repository URL. Read the remote privately, normalize known SSH/SCP forms, strip user information, query strings, fragments, and the trailing `.git`, and never print or export the raw remote. For example, `git@github.com:org/repo.git` becomes `https://github.com/org/repo`. Omit the attribute if a safe canonical URL cannot be established.

Detect or generate `service.instance.id` per running instance; never copy one value across replicas.

Use W3C `tracecontext,baggage` propagation. Do not put secrets, broad user data, or high-cardinality values in baggage.

## Signals

Use framework auto-instrumentation as the baseline, then add only what the application needs:

- Traces: HTTP/RPC, database, and messaging instrumentation. Add custom business-operation spans only when requested, after baseline verification. Record exceptions and set error status when an operation fails.
- Logs: keep the existing logger and add the current OTel bridge/appender so active `trace_id` and `span_id` are top-level fields. Preserve standard severity fields.
- Metrics: counters for state transitions, histograms for latency or sizes, and gauges only for point-in-time values.

Do not create wrapper APIs such as `sendAxiomSpan` or `recordAxiomMetric`. Application code uses native OpenTelemetry APIs so instrumentation stays portable.

Read [spans.md](spans.md) before adding or changing a span, span event, log attribute, or metric.

## Shutdown

Install bounded lifecycle handling appropriate to the runtime. Short-lived CLIs, jobs, and tests must flush before normal exit and shut providers down once at process termination. For reusable serverless processes, force-flush at invocation boundaries only when the runtime requires it; do not shut down a provider after every invocation. Do not claim delivery guarantees for crashes, `SIGKILL`, or platform freezes.
