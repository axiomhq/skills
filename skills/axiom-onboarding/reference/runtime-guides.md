# Runtime guides

Read this during Phase 4, before editing the bootstrap or installing instrumentation for each detected runtime.

## Sources of truth

Use current official language and framework documentation alongside these OpenTelemetry references:

- [OpenTelemetry documentation](https://opentelemetry.io/docs/)
- [OpenTelemetry library instrumentation](https://opentelemetry.io/docs/concepts/instrumentation/libraries/)
- [OpenTelemetry recording errors](https://opentelemetry.io/docs/specs/semconv/general/recording-errors/)
- [OpenTelemetry instrumentation scope](https://opentelemetry.io/docs/concepts/instrumentation-scope/)

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

For a runtime not listed, start at [methods for sending data](https://axiom.co/docs/send-data/methods.md), then the matching OpenTelemetry language page. Replace every `AXIOM_DOMAIN`, `API_TOKEN`, and `DATASET_NAME` in those guides with the edge URL, secret variable, and signal dataset from Phase 3. Their examples often show only traces and put the token in source; keep all enabled signals and the credential rules in this skill.
