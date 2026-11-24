# Runtime guides

Read this for runtimes without a recipe, and for the ownership, identity, signal, and shutdown rules that apply to every runtime.

## Choose the guide

Detect the runtime from the project files. For the language or framework, use the most specific matching row (for example Hono or Next.js over plain Node.js). Library and platform rows (OpenAI Agents SDK, Temporal, Modal, AWS Lambda, Collector, Kubernetes) add to that row instead of replacing it: follow both.

| Runtime | Detect from | Use |
|---|---|---|
| Next.js | `next` in `package.json` | [Next.js recipe](recipes/nextjs.md) |
| Nuxt | `nuxt` in `package.json` | [Axiom Nuxt.js guide](https://axiom.co/docs/guides/opentelemetry-nuxtjs.md) |
| Hono | `hono` in `package.json` | [Axiom Hono guide](https://axiom.co/docs/guides/hono.md) (traces, metrics, and logs on Node.js, Bun, or Workers) |
| Astro | `astro` in `package.json` | [Axiom Astro guide](https://axiom.co/docs/send-data/astro.md). Use its OpenTelemetry sections; its `@axiomhq/logging` route is an Axiom-specific alternative only when the user asks for it |
| Node.js | `package.json` without a more specific framework above | [Node.js recipe](recipes/node.md) |
| Cloudflare Workers | `wrangler.toml`, `wrangler.json`, `wrangler.jsonc` | [Axiom Workers guide](https://axiom.co/docs/guides/opentelemetry-cloudflare-workers.md) |
| Python (Flask, Django, FastAPI, workers) | `requirements.txt`, `pyproject.toml`, `Pipfile`, `uv.lock` | [Python recipe](recipes/python.md) |
| Go | `go.mod` | [Go recipe](recipes/go.md) |
| Java / JVM | `pom.xml`, `build.gradle`, `build.gradle.kts` | [Java recipe](recipes/java.md) |
| .NET | `*.csproj`, `*.fsproj`, `*.sln` | [Axiom .NET guide](https://axiom.co/docs/guides/opentelemetry-dotnet.md) |
| Ruby / Rails | `Gemfile` | [Axiom Ruby on Rails guide](https://axiom.co/docs/guides/opentelemetry-ruby.md) |
| PHP / Laravel / Symfony | `composer.json` | [OpenTelemetry PHP](https://opentelemetry.io/docs/languages/php/) (no Axiom OpenTelemetry guide yet) |
| Rust | `Cargo.toml` | Apps already using the `tracing` crate: [Axiom Rust tracing guide](https://axiom.co/docs/guides/rust-tracing.md) (traces only, with the `tracing-axiom` layer). Otherwise, or for logs and metrics: [OpenTelemetry Rust](https://opentelemetry.io/docs/languages/rust/) |
| AWS Lambda functions | `serverless.yml`, SAM/CDK/Terraform Lambda resources | [Axiom Lambda with AWS Distro for OpenTelemetry](https://axiom.co/docs/send-data/aws-lambda-dot.md) for traces; the [Axiom Lambda extension](https://axiom.co/docs/send-data/aws-lambda.md) for function logs and platform events |
| OpenAI Agents SDK | `openai-agents` (Python) or `@openai/agents` (TypeScript) | [Axiom OpenAI Agents SDK guide](https://axiom.co/docs/use-cases/llm-observability/openai-agents-sdk.md) alongside the language recipe. Ask whether to keep sending traces to OpenAI as well, and keep prompt and response capture off unless the user asks for it |
| Temporal | `temporalio` (Python), `@temporalio/*` (TypeScript), `go.temporal.io/sdk`, `io.temporal` | [Axiom Temporal guide](https://axiom.co/docs/send-data/temporal.md) for workflow traces through the SDK interceptors. Temporal Cloud or server metrics are a separate, Collector-based step |
| Modal | `modal` in Python dependencies, `modal.App` in code | [Axiom Modal guide](https://axiom.co/docs/send-data/modal.md). Logs and container metrics require its Collector; traces come from Modal Functions |
| OpenTelemetry Collector | Collector config, or a Collector requirement from [deployment.md](deployment.md) | [Axiom OpenTelemetry guide](https://axiom.co/docs/send-data/opentelemetry) (Collector configuration with logs, traces, and metrics pipelines) |
| Kubernetes cluster logs | Helm charts, Kubernetes manifests | [Axiom Kubernetes guide](https://axiom.co/docs/send-data/kubernetes.md) (container logs through Filebeat, Vector, or Fluent Bit; app telemetry still uses the language row) |

For example, a Python worker using Temporal follows the Python recipe for the SDK setup and the Temporal guide for its interceptors; a Node app on Lambda follows the Node recipe for the app and the Lambda guide for lifecycle and collection. For anything not listed, search the [Axiom docs index](https://axiom.co/docs/llms.txt) for the framework, then start at [methods for sending data](https://axiom.co/docs/send-data/methods.md), then the matching [OpenTelemetry language page](https://opentelemetry.io/docs/languages/). Replace every `AXIOM_DOMAIN`, `API_TOKEN`, and `DATASET_NAME` in those guides with the edge URL, secret variable, and signal dataset from the selected destinations. Their examples often show only traces and put the token in source; keep all enabled signals and the credential rules in this skill.

Prefer the runtime's zero-code agent or framework integration over assembling SDKs and per-library instrumentation by hand. Check new packages with the ecosystem's tools (`npm view`, `pip index versions`, `go list -m -versions`, Maven Central or the BOM); never write a package name or version from memory, and avoid unrelated upgrades. Disclose experimental signals or packages in the plan.

## SDK ownership and startup

- Runnable services own SDK initialization; shared libraries depend on OpenTelemetry APIs only.
- Use one provider/bootstrap path per process, initialized before instrumented libraries load, through the framework's documented hook. Wire it into the existing start command or deployment configuration rather than a separate launcher.
- **Existing vendors.** Identify which SDK or vendor agent (Sentry, Datadog, New Relic, and others) owns the instrumentation hooks. One OTel provider does not stop a proprietary agent from patching the same libraries. Check that vendor's current OTel compatibility guidance (for example [Datadog](https://docs.datadoghq.com/opentelemetry/compatibility/) or [New Relic](https://docs.newrelic.com/docs/opentelemetry/get-started/apm-monitoring/opentelemetry-apm-intro/)). Prefer a supported bridge or export path; if coexistence is unsupported, report the conflict rather than stacking agents or removing a vendor. When one OTel pipeline must feed several backends, prefer Collector fan-out.
- Handle pre-fork, worker, serverless, and edge lifecycles according to the runtime's documentation.

## Resource and propagation

Set:

- `service.name`: stable logical name shared by replicas;
- `service.namespace`: common system or product name when useful;
- `service.version`: release, build, or commit identifier;
- `deployment.environment.name`: such as `production`, `staging`, or `development`;
- `service.instance.id`: unique per running process; never copy one value across replicas;
- `vcs.repository.url.full` on server processes: a canonical browser-accessible HTTP(S) repository URL. Read the remote privately, normalize SSH/SCP forms, strip user information, query strings, fragments, and the trailing `.git`, and never print or export the raw remote. For example, `git@github.com:org/repo.git` becomes `https://github.com/org/repo`. Omit it if a safe canonical URL cannot be established.

Use W3C `tracecontext,baggage` propagation. Do not put secrets, broad user data, or high-cardinality values in baggage.

## Signals

- **Traces:** HTTP/RPC, database, and messaging auto-instrumentation. On failure, set error status and `error.type`, and record the exception as a log record ([spans.md](spans.md#errors-and-exceptions)); distinguish expected validation rejections from internal or downstream failures.
- **Logs:** keep the existing logger and add its OTel bridge so `trace_id` and `span_id` are top-level fields. Preserve severity and safe error details. Do not add a custom telemetry wrapper or duplicate exception records.
- **Metrics:** include the runtime metrics the agent or framework provides (JVM memory/GC, Node event loop) alongside framework metrics. Avoid duplicate streams.

Application code uses native OpenTelemetry APIs. Do not create wrappers such as `sendAxiomSpan` or `recordAxiomMetric`. Read [spans.md](spans.md) before adding a span, log attribute, or metric dimension, and [privacy.md](privacy.md) when defaults capture sensitive data.

## Shutdown

Reuse the agent or framework's lifecycle handling; add bounded custom hooks only when it does not cover the runtime. Short-lived CLIs, jobs, and tests must flush before exit and shut providers down once. For reusable serverless processes, force-flush at invocation boundaries only when the runtime requires it; do not shut down a provider after every invocation. Do not claim delivery for crashes, `SIGKILL`, or platform freezes.
