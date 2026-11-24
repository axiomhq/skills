# Java recipe

For JVM services (Spring Boot, Quarkus in JVM mode, Micronaut, plain Java). Prefer the OpenTelemetry Java agent when it is compatible. Do not replace a working Spring Boot starter or vendor agent just to use it.

## 1. Choose the agent or the starter

| Use | When |
|---|---|
| [OpenTelemetry Java agent](https://opentelemetry.io/docs/zero-code/java/agent/) | Default. No code changes; instruments common frameworks, clients, loggers, and JVM runtime metrics. |
| [Spring Boot starter](https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/) | GraalVM native images, or deployments that cannot add `-javaagent`. Add it with the `opentelemetry-instrumentation-bom` so versions stay aligned. |

Another `-javaagent` from an APM vendor (Datadog, New Relic, and others) competes for the same hooks. Check compatibility first; see [runtime-guides.md](../runtime-guides.md#sdk-ownership-and-startup).

## 2. Get a pinned agent version

Look up the current release, for example `gh release view --repo open-telemetry/opentelemetry-java-instrumentation`, or Maven Central `io.opentelemetry.javaagent:opentelemetry-javaagent`. Download that exact version in the Dockerfile or build, rather than committing the jar or using a `latest` URL:

Verify the download with the release asset's SHA-256 checksum. Get it from the release, for example `gh api repos/open-telemetry/opentelemetry-java-instrumentation/releases/tags/v<version> --jq '.assets[] | select(.name == "opentelemetry-javaagent.jar") | .digest'`:

```dockerfile
# When changing the version, update the checksum from the release asset too.
ARG OTEL_AGENT_VERSION=<checked-version>
ADD --checksum=sha256:<release-asset-sha256> https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v${OTEL_AGENT_VERSION}/opentelemetry-javaagent.jar /otel/opentelemetry-javaagent.jar
```

`ADD --checksum` needs a recent Docker with BuildKit. Where it is not supported, download in a `RUN` step and check the file with `sha256sum -c`. Follow the repository's existing convention for build-time downloads if it has one.

## 3. Attach without changing the start command

```bash
JAVA_TOOL_OPTIONS="-javaagent:/otel/opentelemetry-javaagent.jar"
```

`JAVA_TOOL_OPTIONS` keeps the existing `java -jar` or framework launcher unchanged. For Gradle `bootRun` or Maven during local runs, add the agent to the run task's JVM arguments.

## 4. Configure with environment variables

Endpoints and headers come from [axiom-setup.md](../axiom-setup.md).

```bash
OTEL_SERVICE_NAME=orders-api
OTEL_RESOURCE_ATTRIBUTES=deployment.environment.name=development,service.version=<commit-or-release>
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
# Each signal: otlp if enabled for this run, none if not. Never leave one unset.
OTEL_TRACES_EXPORTER=<otlp|none>
OTEL_METRICS_EXPORTER=<otlp|none>
OTEL_LOGS_EXPORTER=<otlp|none>
# Endpoint and header only for signals set to otlp:
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=<edge-url>/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=<edge-url>/v1/metrics
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=<edge-url>/v1/logs
# OTEL_EXPORTER_OTLP_{TRACES,METRICS,LOGS}_HEADERS: from the git-ignored .env locally, or the secret store in production
```

The Java agent exports all three signals over OTLP when a variable is unset, so set every disabled signal to `none` explicitly. When enabled, the agent captures Logback and Log4j records with trace context, and emits JVM memory, GC, and thread metrics. Read the [agent configuration](https://opentelemetry.io/docs/zero-code/java/agent/configuration/) for supported settings before adding SDK code. Confirm `service.instance.id` appears in the output, and set it per process if not.

## Pitfalls

- **Two agents.** Check the JVM arguments, `JAVA_TOOL_OPTIONS`, and the Dockerfile for an existing `-javaagent`.
- **Header capture.** Leave request/response header capture unset unless specific non-sensitive headers are needed; see [privacy.md](../privacy.md).
- **Startup time.** The agent adds startup overhead; mention it when the app has tight health-check timeouts.

## Local check

Set each enabled signal's exporter to `console` and leave disabled signals at `none`, run one request, then set each exporter back to its previous value: `otlp` for enabled signals, `none` for disabled ones. See [verify.md](../verify.md#local-check).
