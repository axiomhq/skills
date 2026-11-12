# Provision missing Axiom resources

Read this only when the requested signals lack destination datasets or an Axiom organization. Honor any supplied config path, deployment, datasets, edge, and environment; provision only missing pieces. An ingest-only onboarding token does not need management permissions. If creation requires unavailable privileges, report that gap rather than creating another organization or broadening the application token.

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

## Organization and deployment

Select the organization within the configuration chosen for this task:

1. A config path and deployment supplied by the user or launch brief are authoritative. Resolve a relative config path before changing working directory. Read deployment names and credentials only from that file, and pass the same `--config` and `--deployment` to CLI commands. For the Python example below, explicitly set `AXIOM_CONFIG_PATH` to that selected absolute path and `AXIOM_DEPLOYMENT` to the selected alias.
2. Use `~/.axiom.toml` only when no alternative config path was supplied. Within the selected file, use a named deployment exactly; otherwise use the sole deployment or clarify when several are plausible. Do not select an alias from another config file, even if its name matches.
3. If the selected file is missing/unreadable, its named deployment is absent, or its credentials lack permissions, report the specific blocker. Do not fall back to the default config, another organization, or temporary provisioning. A connected management tool is usable only after confirming it targets the same selected organization and API.

Provision at most one temporary organization via `axiom-agent-created-orgs` only when no organization/deployment was specified and the selected configuration has no deployment to use. A failed lookup or permission check is not evidence that the user has no organization. Resolve sibling skills from their installed location, not from the customer repository's working directory. If the skill is unavailable, use the linked official API documentation or report the missing capability; do not invent a relative executable path.

Do not delegate deployment selection to another skill's default-config workflow. An Events dataset is appropriate for logs/traces; metrics require a Metrics dataset.

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
# If --config was supplied, first export AXIOM_CONFIG_PATH with that exact absolute path.
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

config_path = Path(os.environ.get('AXIOM_CONFIG_PATH', str(Path.home() / '.axiom.toml')))
with config_path.open('rb') as source:
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

Preserve an existing correlation group. If the datasets are not yet linked, there is no documented correlation-group API; when both logs and traces are enabled, tell the user to open **Datasets → Correlations → New correlation group** and select the enabled datasets. This console configuration is a handoff step, separate from proving matching IDs in ingested records. Each log event needs top-level `trace_id` and `span_id`. Keep the spans in the traces dataset. If the logs dataset also has trace fields such as `parent_span_id`, the console searches the logs dataset for the trace and reports that it cannot find it.

Keep every span of one distributed trace in the one traces dataset. Distinguish services with `service.name`.
