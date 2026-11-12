# Provision missing Axiom resources

Read this only for missing organizations or datasets. Supplied destinations skip provisioning. Preserve the selected environment and residency; an ingest-only token does not require management permissions unless resources actually need creating.

## Select the target

Use the config path, deployment, organization, and credential source supplied by the user or launch brief. Resolve relative config paths before changing directory and retain the same `--config` and `--deployment` on CLI commands. Honor the CLI's effective `AXIOM_URL`, `AXIOM_TOKEN`, and `AXIOM_ORG_ID` overrides; reading raw TOML alone can select different credentials or an organization. Verify connected tools use the same target before writing. If no target was supplied, use the sole usable existing target or clarify when several are available.

Handle missing configuration according to intent:

- **An existing target was explicitly selected:** if its required config is missing/unreadable, its deployment cannot be resolved, or its credentials fail, report the blocker. Do not switch to a personal/default organization or provision around the failure. Valid selected environment credentials can resolve a deployment without an implicit default file; an explicitly required config file still must exist.
- **A custom config is valid but empty:** ask whether to configure an existing organization or create a temporary one in that file. Do not use another file. If the user already requested temporary provisioning, follow that request.
- **No target or existing credential source is available:** an absent or empty implicit `~/.axiom.toml` is normal first-time setup. Follow `axiom-agent-created-orgs` to provision at most one temporary organization. An existing unreadable/malformed file is a configuration failure, not evidence of a new user.

An explicit request for a new temporary organization is separate from resolving an existing target. Preserve the chosen credential-storage path, existing content, and private permissions; check storage is usable before provisioning a one-time token. Adapt the temporary-org workflow rather than copying its default-file append into a custom-config task. Resolve that skill from its installed location, or use the [official provisioning documentation](https://axiom.co/docs/console/intelligence/agent-created-orgs) if unavailable. Never expose the returned token; provide its claim/expiry handoff as instructed.

## Prepare only missing datasets

Read the current [dataset API](https://axiom.co/docs/restapi/endpoints/createDataset.md) and [OTLP ingestion guidance](https://axiom.co/docs/send-data/opentelemetry) before creating resources. List datasets in the selected organization and reuse compatible ones. Create one dedicated dataset per enabled signal and environment/access boundary, not a mandatory set of three.

| Signal | Supported kind |
|---|---|
| Logs | `otel:logs:v1`, or compatible Events `axiom:events:v1` |
| Traces | `otel:traces:v1`, or compatible Events `axiom:events:v1` |
| Metrics | `otel:metrics:v1` |

All four kinds are documented API values. Preserve working signal-specific datasets and compatible Events datasets. Names use 1–128 ASCII letters, digits, and hyphens. Verify unfamiliar kinds or constraints against the current API.

Use existing CLI/MCP capabilities where supported. For an unsupported operation, follow the official API with the same effective credential source and organization; do not invent CLI flags or maintain a second config-resolution workflow. Validate the final HTTPS management destination before attaching credentials, refuse credentialed redirects, and use private credential transport. Keep secret values out of chat, tracked files, command arguments, and logs; see [credential injection](axiom-setup.md#credential-injection). If management access is unavailable, report it rather than broadening the application's ingest token or silently using another credential.

Keep API edge identifiers separate from display labels and ingest URLs:

| Display label | API `edgeDeployment` | Ingest/query origin |
|---|---|---|
| US East 1 (AWS) | `cloud.us-east-1.aws` | `https://us-east-1.aws.edge.axiom.co` |
| EU Central 1 (AWS) | `cloud.eu-central-1.aws` | `https://eu-central-1.aws.edge.axiom.co` |

Prefer an existing dataset's `edgeDeployment` or the organization's `defaultEdgeDeployment` when it meets the requested residency; discover other IDs through the API. Pass the ID to creation, then verify the returned ID and `edgeDeploymentUrl`. The edge cannot be changed after creation. Use the returned full edge URL for export, following [signal routing](axiom-setup.md).

Report the HTTP status and a safe actionable reason without dumping raw responses or headers: inspect an existing dataset on 409, verify the edge/kind/name for the corresponding 400 error, select a compatible existing dataset when capacity is exhausted, and report missing permissions on 403. Do not create another organization or retry unchanged requests to bypass these failures.

## Link enabled signals

Preserve existing correlation groups. When logs and traces are enabled but not linked, use the documented console correlation-group workflow and report any manual handoff; do not invent a group-creation API. Keep spans of one distributed trace in the same traces dataset and distinguish services with `service.name`. Matching ingested trace/span IDs are still required for verification; a console handoff alone is not proof of correlation.
