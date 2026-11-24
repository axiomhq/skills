# Observability doc template

Read this when writing or updating the repository's observability doc in step 5. The doc is for developers first and future agents second: write plain sentences, explain each term the first time it appears, and keep it to one screen where possible.

If the repository already has observability documentation, add or update these sections there instead of creating a new file. Preserve unrelated content. Never write tokens, sensitive payloads, or temporary-organization claim URLs in the doc.

Use this structure and these headings. Replace every example value; leave out a section only when it has nothing to say, and leave out rows that do not apply.

````markdown
# Observability

## What's set up

Traces and logs from `api` are sent to Axiom with OpenTelemetry. Last checked: 2026-11-24, by sending a request and finding it in Axiom.

## Where to see your data

| Data | Axiom dataset |
|---|---|
| Traces | `api-traces` |
| Logs | `api-logs` |

[Open the last check in Axiom](<link from the verification query>)

To find recent traces from this app, run this query in Axiom:

```apl
['api-traces']
| where ['service.name'] == 'api'
| take 10
```

## How it works

- Telemetry starts with the app: the `start` script in `package.json` loads OpenTelemetry through `NODE_OPTIONS`.
- Data goes straight from the app to Axiom (`https://us-east-1.aws.edge.axiom.co`). There is no Collector.
- Key context: creating a todo adds `app.todo.validation_result` and `app.todo.rejection_reason` to the request span (`TodoController.java`). Filter on these in Axiom to see why todos are rejected.
- The Axiom token is in `.env`, which git ignores, so it is never committed. `.env.example` lists the variable names. (In production, say which secret store provides it instead.)

## Settings

| Variable | What it does |
|---|---|
| `OTEL_SERVICE_NAME` | The name this app has in Axiom (`api`) |
| `OTEL_RESOURCE_ATTRIBUTES` | Environment and version, used to filter data in Axiom |
| `OTEL_TRACES_EXPORTER`, `OTEL_LOGS_EXPORTER`, `OTEL_METRICS_EXPORTER` | `otlp` sends that kind of data to Axiom; `none` turns it off |
| `OTEL_EXPORTER_OTLP_*_ENDPOINT` | Where each kind of data is sent |
| `OTEL_EXPORTER_OTLP_*_HEADERS` (secret) | The Axiom token and dataset name for each kind of data |

## Turn it off or undo it

- **Turn off temporarily:** set `OTEL_TRACES_EXPORTER`, `OTEL_LOGS_EXPORTER`, and `OTEL_METRICS_EXPORTER` to `none` and restart the app.
- **Remove completely:** revert the start script change, remove the packages added during setup (`@opentelemetry/api`, `@opentelemetry/auto-instrumentations-node`), and delete the variables above.

## Not done yet

- Browser tracing for `web/`. Ask your agent to "add browser traces".
- Production configuration. Ask your agent to "set it up for production".
````

Write the "How it works" and "Turn it off or undo it" sections from what this setup actually changed, not from the example. List known blockers and unverified signals under "Not done yet", in plain words, with what is needed to finish them. For platform integrations found during setup, say in "What's set up" which data they already send and where.
