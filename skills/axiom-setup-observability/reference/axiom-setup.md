# Configure Axiom

Read this during Phase 3, before selecting datasets or configuring exporters. Follow the organization and credential rules in [SKILL.md](../SKILL.md#phase-3-configure-axiom).

## Sources of truth

Read the current Axiom pages relevant to the setup:

- [Axiom OpenTelemetry ingestion](https://axiom.co/docs/send-data/opentelemetry.md)
- [Axiom sending methods and runtime guides](https://axiom.co/docs/send-data/methods.md)
- [Axiom datasets](https://axiom.co/docs/reference/datasets.md)
- [Axiom edge deployments](https://axiom.co/docs/reference/edge-deployments.md)
- [Axiom tokens](https://axiom.co/docs/reference/tokens.md)
- [Axiom ingestion limits](https://axiom.co/docs/reference/limits.md)
- [Create dataset API](https://axiom.co/docs/restapi/endpoints/createDataset.md)
- [MPL introduction](https://axiom.co/docs/mpl/introduction.md)

## Select the deployment

Choose the deployment with the decision table in `axiom-ingest` when available. Otherwise inspect configured deployment names without printing credentials, prefer the user's named deployment, and clarify only when several plausible organizations exist. Do not copy its authenticated curl examples: header arguments conflict with this skill's credential rules. An Events dataset is appropriate for logs/traces; metrics require a Metrics dataset.

## Signal datasets

For each environment, residency, and tenant-access boundary, use one dedicated dataset per enabled signal on the same edge. Create only missing datasets for the selected signals. Use simple names of 1–128 ASCII letters, digits, and `-`.

| Signal | `kind` | OTLP path | Dataset header |
|---|---|---|---|
| Logs | Events (`axiom:events:v1`) | `/v1/logs` | `x-axiom-dataset` |
| Traces | Events (`axiom:events:v1`) | `/v1/traces` | `x-axiom-dataset` |
| Metrics | `otel:metrics:v1` | `/v1/metrics` | `x-axiom-metrics-dataset` |

List existing datasets before creating any. Reuse a compatible dataset only when its intended signal, edge, and access boundary match. Public documentation specifies Events for logs/traces and Metrics for metrics; do not require undocumented `otel:logs:v1` or `otel:traces:v1` kinds or reject an Events dataset solely for lacking them. Verify unfamiliar kind values against the current API or console. A 409 means the name exists; inspect it instead of creating another name blindly.

Prefer a connected dataset-management tool if it provides the necessary operation. Otherwise, the following Python 3.11+ example reads the selected deployment privately and keeps tokens out of command arguments. It lists datasets by default; to create one, set non-secret `AXIOM_DATASET_NAME`, `AXIOM_DATASET_KIND`, and `AXIOM_EDGE_DEPLOYMENT` variables first. `AXIOM_EDGE_DEPLOYMENT` must contain an API identifier such as `cloud.us-east-1.aws`, never the display label `US East 1 (AWS)` or an HTTPS ingest URL. Use only the management URL verified for the selected Axiom deployment. Do not disable certificate verification or follow redirects with credentials.

Create each missing dataset with `POST /v2/datasets`. The API documents `axiom:events:v1` for Events; confirm the current Metrics kind before creation (`otel:metrics:v1`). If Python 3.11+ is unavailable, use an installed TOML parser or a connected tool rather than exposing secrets through shell arguments.

```bash
export AXIOM_DEPLOYMENT='<deployment-name>'
python3 - <<'PY'
import json
import os
from pathlib import Path
import tomllib
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

with (Path.home() / '.axiom.toml').open('rb') as source:
    deployment = tomllib.load(source)['deployments'][os.environ['AXIOM_DEPLOYMENT']]
base = deployment['url'].rstrip('/')
parsed = urlsplit(base)
# Add another official management host only after verifying the deployment.
if (parsed.scheme != 'https' or parsed.hostname != 'api.axiom.co'
        or parsed.port not in (None, 443) or parsed.username is not None
        or parsed.password is not None or parsed.path not in ('', '/')
        or parsed.query or parsed.fragment):
    raise SystemExit('Verify the management URL before attaching credentials')
headers = {'Authorization': 'Bearer ' + deployment['token']}
if deployment.get('org_id'):
    headers['X-Axiom-Org-Id'] = deployment['org_id']
body = None
if os.environ.get('AXIOM_DATASET_NAME'):
    body = json.dumps({
        'name': os.environ['AXIOM_DATASET_NAME'],
        'kind': os.environ['AXIOM_DATASET_KIND'],
        'edgeDeployment': os.environ['AXIOM_EDGE_DEPLOYMENT'],
    }).encode()
    headers['Content-Type'] = 'application/json'
request = Request(base + '/v2/datasets', data=body, headers=headers)
try:
    with build_opener(NoRedirect()).open(request, timeout=30) as response:
        result = json.load(response)
except HTTPError as error:
    raise SystemExit(f'Dataset request failed: HTTP {error.code}') from None
except URLError:
    raise SystemExit('Dataset request failed: network or TLS error') from None
# Print only dataset identity/routing, never request headers or raw responses.
datasets = result if isinstance(result, list) else [result]
for dataset in datasets:
    print(json.dumps({key: dataset.get(key) for key in
        ('name', 'kind', 'edgeDeployment', 'edgeDeploymentUrl')}))
PY
```

Keep the API identifier, console display label, and ingest URL distinct:

| Display label | API `edgeDeployment` identifier | Ingest/query base URL |
|---|---|---|
| US East 1 (AWS) | `cloud.us-east-1.aws` | `https://us-east-1.aws.edge.axiom.co` |
| EU Central 1 (AWS) | `cloud.eu-central-1.aws` | `https://eu-central-1.aws.edge.axiom.co` |

Prefer the exact `edgeDeployment` returned by a compatible dataset or the organization's `defaultEdgeDeployment` (also returned by [organization provisioning](https://axiom.co/docs/console/intelligence/agent-created-orgs)). Confirm that it satisfies the requested residency. For another edge, discover its identifier from the API; do not invent one from a display label. Use the dataset response's `edgeDeploymentUrl` for OTLP export. Repeat creation only for the other enabled signals, then unset the creation variables before listing again. Each response's `edgeDeployment` must match the selected identifier and its `edgeDeploymentUrl` must route to that edge. A 400 for an unsupported edge means the identifier is wrong or the organization does not have that edge. The edge cannot be changed after creation. On a 403, report missing management permissions; do not broaden the application's ingest token. `dataset license limit exceeded` means stop and ask which compatible datasets to reuse. Temporary organizations have limited dataset capacity; reuse appropriate datasets and do not create unused signals.

There is no documented correlation-group API. When both logs and traces are enabled, tell the user to open **Datasets → Correlations → New correlation group** and select the enabled datasets. This console configuration is a handoff step, separate from proving matching IDs in ingested records. Each log event needs top-level `trace_id` and `span_id`. Keep the spans in the traces dataset. If the logs dataset also has trace fields such as `parent_span_id`, the console searches the logs dataset for the trace and reports that it cannot find it.

Keep every span of one distributed trace in the one traces dataset. Distinguish services with `service.name`.

## Exporter configuration

Every enabled signal request also sends `Authorization: Bearer <API_TOKEN>` from the deployment secret mechanism. Configure only enabled signals, separately. A shared dataset header in `OTEL_EXPORTER_OTLP_HEADERS` cannot route logs/traces and metrics correctly; use signal-specific dataset headers. Shared authorization alone is not a routing error.

In `OTEL_EXPORTER_OTLP_*_HEADERS`, separate headers with commas and use `=`, not HTTP colon syntax. Follow the installed exporter's [OTLP environment header format](https://opentelemetry.io/docs/specs/otel/protocol/exporter/#specifying-headers-via-environment-variables), including percent-encoding spaces in values. The example uses `Bearer%20` for the authorization separator; SDK/Collector header maps instead use the literal `Bearer ` value.

Set `AXIOM_EDGE_URL` to the dataset's verified full HTTPS `edgeDeploymentUrl`, including its scheme. The example assumes `AXIOM_TOKEN` is already supplied privately by the secret mechanism. Disable shell tracing before handling it; never paste its value into a command or tracked file. Keep only the enabled signal assignments.

```bash
set +x
: "${AXIOM_EDGE_URL:?Set the verified full HTTPS edgeDeploymentUrl first}"
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_LOGS_ENDPOINT="${AXIOM_EDGE_URL%/}/v1/logs"
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="${AXIOM_EDGE_URL%/}/v1/traces"
export OTEL_EXPORTER_OTLP_METRICS_ENDPOINT="${AXIOM_EDGE_URL%/}/v1/metrics"
export OTEL_EXPORTER_OTLP_LOGS_HEADERS="Authorization=Bearer%20${AXIOM_TOKEN},x-axiom-dataset=${LOGS_DATASET}"
export OTEL_EXPORTER_OTLP_TRACES_HEADERS="Authorization=Bearer%20${AXIOM_TOKEN},x-axiom-dataset=${TRACES_DATASET}"
export OTEL_EXPORTER_OTLP_METRICS_HEADERS="Authorization=Bearer%20${AXIOM_TOKEN},x-axiom-metrics-dataset=${METRICS_DATASET}"
```

Export and quote assignments so the child process receives them intact. Without `export`, a process started from that shell does not receive them.

In SDK or Collector code, use normal header names and values: `Authorization: Bearer <token>` and `x-axiom-dataset: <name>`. Collector `otlphttp` takes the edge base URL and appends the signal path. SDK exporters usually take the full signal URL. Read the installed exporter and make `/v1/{signal}` appear exactly once.

Do not prepend another scheme to `AXIOM_EDGE_URL`. Do not use `api.axiom.co` for OTLP, and do not accept an SDK's default region.

If a platform supports only a shared base URL or cannot set the metrics dataset header, use a Collector or the platform's currently documented Axiom integration. Do not invent alternative ingestion URL paths.
