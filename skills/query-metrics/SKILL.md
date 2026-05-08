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
3. **Discover and classify metrics**: List available metrics via `scripts/metrics-info <deployment> <dataset> metrics`. The response carries each metric's `type`, `temporality`, and `unit` — read these before composing a query (see [Choosing a query shape from metric metadata](#choosing-a-query-shape-from-metric-metadata) below).
4. **Explore tags**: List tags and tag values to understand filtering options. If metrics listing fails, use tags and tag values to identify relevant entities, then use those to list metrics for specific tags.
5. **Write and execute query**: Compose a metrics query and run it via `scripts/metrics-query`
6. **Iterate**: Refine filters, aggregations, and groupings based on results

If the user provides a specific service, host, or entity name to search for, use `find-metrics` to locate matching metrics:
```bash
scripts/metrics-info <deployment> <dataset> find-metrics "frontend"
```
Do NOT use `find-metrics` as a general discovery step — it requires a known search value. After `find-metrics` returns candidates, fetch each one's metadata with `metrics-info … metrics <metric> info` before writing a query against it.

---

## Choosing a query shape from metric metadata

The `metrics` listing returns a v2 payload where each metric carries three fields that should drive how you write the MPL query. **Always read this metadata before composing a query — never assume a metric is a simple scalar.**

| Field | Values | What it tells you |
|-------|--------|-------------------|
| `type` | `Gauge`, `CounterMonotonic`, `CounterNonMonotonic`, `Histogram` | The kind of instrument; determines required pre-aggregation operators |
| `temporality` | `Cumulative`, `Delta`, or `null` | Whether counter values are running totals or per-interval deltas. `null` is normal for Gauges. |
| `unit` | UCUM-style string (`Cel`, `kW.h`, `s`, `%`, `[ppm]`, …) or `null` | Display unit; preserve when reporting results to the user |

**Rules of thumb (consult `metrics-spec` for the exact operator names — they may evolve):**

- **Gauge** — instantaneous value. Align directly with `avg`/`min`/`max`/`sum`. Do **not** apply a rate operator; you'd be averaging meaningless deltas of an instantaneous value.
- **CounterMonotonic + Cumulative** — running total that only goes up (resets aside). The raw values are almost never what the user wants. Convert to a per-second rate first, **then** align/aggregate. Look up the rate operator in the spec's standard library.
- **CounterMonotonic + Delta** — already per-interval; can be summed/aligned without a rate step.
- **CounterNonMonotonic** — can go up or down (e.g. queue depth, balance). Intent is ambiguous: rate, delta, or current value all make sense for different questions. **Ask the user what they want to see** before picking one.
- **Histogram** — not a scalar. Direct `align using avg` will not give you what you expect. Consult the histogram section of `metrics-spec` for quantile/bucket operators.
- **`temporality: null`** means "not applicable for this instrument type" (the norm for Gauges), not "missing data".

**Reporting results.** When surfacing numbers to the user, attach the metric's `unit` (treat `null` as unitless). If you combine metrics with mismatched units in a single arithmetic expression, surface a warning rather than silently producing a meaningless number.

**Cheap views over the listing.** For datasets with many metrics, the raw object is noisy. Two opt-in views are available:

```bash
# Group the listing by metric type
scripts/metrics-info <deploy> <dataset> metrics --by-type

# Filter to one or more types (repeatable; OR semantics; composes with --by-type)
scripts/metrics-info <deploy> <dataset> metrics --type Histogram
scripts/metrics-info <deploy> <dataset> metrics --type Gauge --type Histogram --by-type

# Single-metric metadata block ({type, temporality, unit})
scripts/metrics-info <deploy> <dataset> metrics <metric> info
```

All three are pure client-side reshapes of the same listing payload — no extra server calls.

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

### Passing parameter values

MPL queries can declare parameters (e.g. `param $svc: string;`). To run such a query, supply a value for each declared parameter alongside the query.

**API contract.** `POST /v1/query/_mpl` accepts a `params` object on the JSON body, sibling to `apl` / `startTime` / `endTime`. Each entry's key is the parameter's variable name with the leading `$` stripped and a `param__` prefix added (`$foo` → `param__foo`); each entry's value is the MPL literal for that parameter. The server parses the literal according to the variable's declared type, so callers are responsible for formatting it as a valid MPL literal (per `metrics-spec`) and for any JSON-string escaping the literal requires.

MPL parameters can be declared optional (see `metrics-spec` for the declaration syntax). Optional parameters may be omitted from `params`; required parameters must be supplied or the server returns HTTP 400 with a message like `The following params were declared but not provided: <name>`. Omit the `params` object entirely when the query declares no parameters or when every declared parameter is optional and you are not supplying any.

Resulting request body shape:

```json
{
  "apl": "param $svc: string; param $window: Duration; `otel-metrics`:`http.server.duration` | where `service.name` == $svc | align to $window using avg",
  "startTime": "now-1h",
  "endTime": "now",
  "params": {
    "param__svc": "\"frontend\"",
    "param__window": "5m"
  }
}
```

Note that `param__svc` carries the MPL string literal `"frontend"` (the quotes are part of the literal), JSON-escaped as `"\"frontend\""`. `param__window` carries the duration literal `5m` verbatim.

**Script invocation.** Pass each parameter with `-p name=value` (repeatable). The name is the bare variable name without the leading `$`; the script applies the `param__` prefix and forwards the value verbatim:

```bash
scripts/metrics-query \
  -p svc='"frontend"' \
  -p window='5m' \
  prod \
  'param $svc: string; param $window: Duration; `otel-metrics`:`http.server.duration` | where `service.name` == $svc | align to $window using avg' \
  now-1h now
```

For literal syntax per type (strings, durations, numbers, etc.), consult `metrics-spec`.

---

## Discovery (Info Endpoints)

Use `scripts/metrics-info` to explore what metrics, tags, and values exist in a dataset before writing queries. Time range defaults to the last 24 hours; override with `--start` and `--end`.

### List metrics in a dataset

```bash
scripts/metrics-info <deployment> <dataset> metrics
```

Returns a JSON object keyed by metric name; each value is `{type, temporality, unit}`. See [Choosing a query shape from metric metadata](#choosing-a-query-shape-from-metric-metadata) for how to use those fields.

Opt-in views:

```bash
scripts/metrics-info <deployment> <dataset> metrics --by-type            # grouped by type
scripts/metrics-info <deployment> <dataset> metrics --type Gauge         # filter (repeatable)
scripts/metrics-info <deployment> <dataset> metrics --type Counter --type Histogram --by-type
```

### Get a single metric's metadata

```bash
scripts/metrics-info <deployment> <dataset> metrics <metric> info
```

Returns just `{type, temporality, unit}` for the named metric. Exits non-zero if the metric is not present in the listing for the given time range.

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
