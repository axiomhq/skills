# Runtime

Use this reference to configure SDK startup, service identity and lifecycle. Follow current Axiom docs for implementation details.

1. Identify the runtime, framework, deployment model and installed versions. Trace how the deployed application starts and which integration initializes each signal. Resolve the configuration that takes effect.

2. Read the matching runtime and deployment guides below. Match library and framework documentation to the versions in use.

3. Extend the existing setup for the requested signals. Reuse configuration from the application, build and deployment. Preserve service identity and lifecycle hooks. Before adding setup, check framework and deployment integrations for existing initialization. If a requested signal has no setup, follow the selected guide to add it.

## References

| Read when | Source |
| --- | --- |
| Configuring SDK startup or framework hooks | Select the matching runtime and framework guide from [Axiom integrations](https://axiom.co/docs/send-data/methods). |
| Adding or upgrading SDK dependencies | Use [OTel language documentation](https://opentelemetry.io/docs/languages/) and package registry metadata. Verify published releases, deprecation status and compatibility with the project’s runtime, framework and SDK. |
| Resolving configuration values and precedence | Inspect application and deployment configuration. Use the selected SDK’s documentation for supported settings and precedence. Start with [SDK configuration guidance](https://opentelemetry.io/docs/languages/sdk-configuration/general/). |
| Configuring service identity and resource metadata | [OTel resources](https://opentelemetry.io/docs/concepts/resources/) and [otel-semantic-conventions](../../otel-semantic-conventions/SKILL.md) |
| Configuring propagation or context management | The selected runtime’s SDK documentation and [context propagation](https://opentelemetry.io/docs/concepts/context-propagation/) |
| Managing SDK shutdown and flushing | The selected SDK’s lifecycle documentation and the application’s existing shutdown hooks |
| Completing requests or short-lived invocations | The selected framework or platform’s lifecycle documentation and its instrumentation guide |

## Example

Acme’s Node.js checkout service already starts an SDK for traces. The team wants to add metrics.

| Step | Checkout example |
| --- | --- |
| 1. Identify | Trace checkout’s deployed startup to its active SDK bootstrap. Identify where service identity comes from and who handles SDK shutdown. |
| 2. Read | Follow the [Node.js guide](https://axiom.co/docs/guides/opentelemetry-nodejs) and the installed SDK version’s metrics and lifecycle documentation. |
| 3. Adapt | Add metric support through the existing setup. Reuse checkout’s service identity and include the new support in its lifecycle handling. |
