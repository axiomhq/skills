# Next.js recipe

Server-side traces for the Next.js App or Pages Router. Browser telemetry is a separate item, done only when requested (see [full-setup.md](../full-setup.md#scope)). If the app is deployed on Vercel, check existing Vercel integration coverage first ([integrations.md](../integrations.md)).

## 1. Check and install packages

```bash
npm view @vercel/otel version peerDependencies deprecated
npm install @vercel/otel @opentelemetry/api @opentelemetry/api-logs
```

Use the repository's package manager. Confirm the peer dependency ranges against the installed Next.js version.

## 2. Add the instrumentation hook

Create `instrumentation.ts` in the project root, or in `src/` when the app uses a `src` directory:

```ts
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({ serviceName: 'storefront-web' });
}
```

Next.js 15 and later load this file automatically. In Next.js 13.2 to 14 the hook is experimental and also needs `experimental: { instrumentationHook: true }` in `next.config.*`. Check the installed version.

## 3. Configure with environment variables

`@vercel/otel` reads `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, `OTEL_EXPORTER_OTLP_TRACES_HEADERS`, and the protocol variables, and defaults to `http/protobuf`. On Vercel, a configured Vercel tracing integration takes precedence over these variables. Endpoints and headers come from [axiom-setup.md](../axiom-setup.md):

```bash
OTEL_SERVICE_NAME=storefront-web
OTEL_RESOURCE_ATTRIBUTES=deployment.environment.name=development,service.version=<commit-or-release>
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=<edge-url>/v1/traces
# OTEL_EXPORTER_OTLP_TRACES_HEADERS: from the git-ignored .env locally, or the secret store in production
```

Set these in the deployment's environment (for example Vercel project settings), not in client-exposed `NEXT_PUBLIC_*` variables.

## 4. Logs and metrics

`@vercel/otel` covers traces. For logs, keep the existing server logger and add its OTel bridge only if the user requested logs; otherwise offer logs as a next step using the current [Axiom Next.js guide](https://axiom.co/docs/guides/opentelemetry-nextjs.md). Report metrics as not covered by this recipe.

## Pitfalls

- **Edge and Node runtimes.** `register()` runs in both; `@vercel/otel` handles both. A hand-written SDK must check `process.env.NEXT_RUNTIME` and load Node-only packages only for `nodejs`.
- **Secrets in client bundles.** Never reference the token from code that can reach the browser.
- **Built-in spans.** Next.js already emits route and `fetch` spans. Do not add duplicates.

## Local check

Run `next dev`, request one page or route handler, and point the traces endpoint at the local receiver in [verify.md](../verify.md#local-check) to inspect span names and resource attributes.
