---
name: query-metrics
description: Runs metrics queries against Axiom MetricsDB via scripts. Discovers available metrics, tags, and tag values. Use when asked to query metrics, explore metric datasets, check metric values, or investigate OTel metrics data.
---

> **CRITICAL:** ALL script paths are relative to this skill's folder. Run them with full path (e.g., `scripts/metrics-query`).

# Querying Axiom Metrics

Query OpenTelemetry metrics stored in Axiom's MetricsDB.

## Setup

Run `scripts/setup` to check requirements (curl, jq, ~/.axiom.toml).

Config in `~/.axiom.toml` (shared with axiom-sre):
```toml
[deployments.prod]
url = "https://api.axiom.co"
token = "xaat-your-token"
org_id = "your-org-id"
```

The target dataset must be of kind `otel:metrics:v1`.

---

## Discovering Datasets

List all datasets in a deployment:

```bash
scripts/datasets <deployment>
```

Filter to only metrics datasets:

```bash
scripts/datasets <deployment> --kind otel:metrics:v1
```

This returns each dataset's `name`, `edgeDeployment`, and `kind`. Use the dataset name in subsequent `metrics-info` and `metrics-query` calls.

---

## Edge Deployment Resolution

Datasets can live in different edge deployments (e.g., `us-east-1` vs `eu-central-1`). The scripts **automatically resolve** the correct regional edge URL before querying. No manual configuration is needed — `metrics-info` and `metrics-query` detect the dataset's edge deployment and route requests to the right endpoint.

| Edge Deployment | Edge Endpoint |
|---|---|
| `cloud.us-east-1.aws` | `https://us-east-1.aws.edge.axiom.co` |
| `cloud.eu-central-1.aws` | `https://eu-central-1.aws.edge.axiom.co` |

If resolution fails or the edge deployment is unknown, requests fall back to the deployment URL in `~/.axiom.toml`.

---

## Learning the Metrics Query Syntax

> **CRITICAL:** You MUST run `metrics-spec` before composing your first query in a session. NEVER guess MPL syntax — it changes over time and the spec is the only source of truth.

```bash
scripts/metrics-spec <deployment> <dataset>
```

Re-consult the spec when using an unfamiliar operator, when a query returns a syntax error, or when constructing histogram/multi-metric queries.

---

## Workflow

1. **List datasets**: Run `scripts/datasets <deployment>` to see available datasets and their edge deployments
2. **Fetch the spec**: Run `scripts/metrics-spec <deployment> <dataset>` — **this step is mandatory before writing any query**
3. **Discover metrics**: List available metrics via `scripts/metrics-info <deployment> <dataset> metrics`
4. **Explore tags**: List tags and tag values to understand filtering options. If metrics listing fails, use tags and tag values to identify relevant entities, then use those to list metrics for specific tags.
5. **Write and execute query**: Compose a metrics query and run it via `scripts/metrics-query`
6. **Iterate**: Refine filters, aggregations, and groupings based on results

If the user provides a specific service, host, or entity name to search for, use `find-metrics` to locate matching metrics:
```bash
scripts/metrics-info <deployment> <dataset> find-metrics "frontend"
```
Do NOT use `find-metrics` as a general discovery step — it requires a known search value.

---

## Query Metrics

Execute a metrics query against a dataset:

```bash
scripts/metrics-query <deployment> '<mpl>' '<startTime>' '<endTime>'
```

**Examples:**
```bash
# Simple query
scripts/metrics-query prod \
  '`my-dataset`:`http.server.duration` | align to 5m using avg' \
  '2025-06-01T00:00:00Z' \
  '2025-06-02T00:00:00Z'

# Query with filtering (note backticks on dotted tag names)
scripts/metrics-query prod \
  '`my-dataset`:`http.server.duration` | where `service.name` == "frontend" and method == "GET" | align to 5m using avg | group by status_code using sum' \
  'now-1d' \
  'now'
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `deployment` | Yes | Name from `~/.axiom.toml` (e.g., `prod`) |
| `mpl` | Yes | Metrics query string. Dataset is extracted from the query itself. |
| `startTime` | Yes | RFC3339 (e.g., `2025-01-01T00:00:00Z`) or relative expression (e.g., `now-1h`, `now-1d`) |
| `endTime` | Yes | RFC3339 (e.g., `2025-01-02T00:00:00Z`) or relative expression (e.g., `now`) |

---

## Discovery (Info Endpoints)

Use `scripts/metrics-info` to explore what metrics, tags, and values exist in a dataset before writing queries. Time range defaults to the last 24 hours; override with `--start` and `--end`.

### List metrics in a dataset

```bash
scripts/metrics-info <deployment> <dataset> metrics
```

### List tags in a dataset

```bash
scripts/metrics-info <deployment> <dataset> tags
```

### List values for a specific tag

```bash
scripts/metrics-info <deployment> <dataset> tags <tag> values
```

### List tags for a specific metric

```bash
scripts/metrics-info <deployment> <dataset> metrics <metric> tags
```

### List tag values for a specific metric and tag

```bash
scripts/metrics-info <deployment> <dataset> metrics <metric> tags <tag> values
```

### Find metrics matching a tag value

```bash
scripts/metrics-info <deployment> <dataset> find-metrics "<search-value>"
```

### Custom time range

All info commands accept `--start` and `--end` for custom time ranges:

```bash
scripts/metrics-info prod my-dataset metrics \
  --start 2025-06-01T00:00:00Z \
  --end 2025-06-02T00:00:00Z
```

---

## Error Handling

HTTP errors return JSON with `message`, `code`, and optional `detail` fields:
```json
{"message": "description", "code": 400, "detail": {"errorType": 1, "message": "raw error"}}
```

Common status codes:
- 400 — Invalid query syntax or bad dataset name
- 401 — Missing or invalid authentication
- 403 — No permission to query/ingest this dataset
- 404 — Dataset not found
- 429 — Rate limited
- 500 — Internal server error

On a **500 error**, re-run the failing script call with `curl -v` flags to capture response headers, then report the `traceparent` or `x-axiom-trace-id` header value to the user. This trace ID is essential for debugging the failure with the backend team.

---

## Scripts

| Script | Usage |
|--------|-------|
| `scripts/setup` | Check requirements and config |
| `scripts/datasets <deploy> [--kind <kind>]` | List datasets (with edge deployment info) |
| `scripts/metrics-spec <deploy> <dataset>` | Fetch metrics query specification |
| `scripts/metrics-query <deploy> <mpl> <start> <end>` | Execute a metrics query |
| `scripts/metrics-info <deploy> <dataset> ...` | Discover metrics, tags, and values |
| `scripts/axiom-api <deploy> <method> <path> [body]` | Low-level API calls |
| `scripts/resolve-url <deploy> <dataset>` | Resolve dataset to edge deployment URL |

Run any script without arguments to see full usage.
