---
name: axiom-metrics
description: "Queries Axiom MetricsDB using MPL via curl. Discovers available metrics, tags, and tag values. Use when asked to query metrics, explore metric datasets, check metric values, or investigate OTel metrics data."
---

# Querying Axiom Metrics (MPL)

Query OpenTelemetry metrics stored in Axiom's MetricsDB using MPL, a purpose-built query language.

## Prerequisites

- `$AXIOM_URL` should be set (or default to `https://us-east-1.aws.edge.axiom.co`)
- `$AXIOM_TOKEN` must be set (API token or personal token with query permissions)
- The target dataset must be of kind `otel-metrics-v1`

## Learning MPL Syntax

The query endpoint is self-describing. Before writing any query, fetch the full MPL specification:

```bash
curl -s -X OPTIONS "$AXIOM_URL/v1/query/_metrics"
```

This returns the complete MPL language specification with syntax, operators, and examples. Read it to understand query structure before composing queries.


## Endpoints

All endpoints use `$AXIOM_URL` as the base URL. All authenticated endpoints require `Authorization: Bearer $AXIOM_TOKEN`.

### Query (MPL)

Execute an MPL query against a metrics dataset.

```bash
curl -s -X POST "$AXIOM_URL/v1/query/_metrics?format=metrics-v1" \
  -H "Authorization: Bearer $AXIOM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apl": "DATASET_NAME:METRIC_NAME | align to 5m using avg",
    "startTime": "2025-01-01T00:00:00Z",
    "endTime": "2025-01-02T00:00:00Z"
  }'
```

The request body is JSON with the following fields:

| Field | Required | Description |
|-------|----------|-------------|
| `apl` | Yes | MPL query string. Dataset is extracted from the query itself. |
| `startTime` | Yes | RFC3339 timestamp only (e.g., `2025-01-01T00:00:00Z`). Relative expressions like `now-1h` are **not** supported. |
| `endTime` | Yes | RFC3339 timestamp only (e.g., `2025-01-02T00:00:00Z`). Relative expressions like `now` are **not** supported. |

### Info Endpoints (Discovery)

Use these to explore what metrics, tags, and values exist in a dataset before writing queries.

All info endpoints **require** `start` and `end` query parameters in RFC3339 format (e.g., `?start=2025-01-01T00:00:00Z&end=2025-01-02T00:00:00Z`). Relative time expressions are not supported.

#### List metrics in a dataset

```bash
curl -s "$AXIOM_URL/v1/query/metrics/info/datasets/DATASET_NAME/metrics" \
  -H "Authorization: Bearer $AXIOM_TOKEN"
```

#### List tags in a dataset

```bash
curl -s "$AXIOM_URL/v1/query/metrics/info/datasets/DATASET_NAME/tags" \
  -H "Authorization: Bearer $AXIOM_TOKEN"
```

#### List values for a specific tag

```bash
curl -s "$AXIOM_URL/v1/query/metrics/info/datasets/DATASET_NAME/tags/TAG_NAME/values" \
  -H "Authorization: Bearer $AXIOM_TOKEN"
```

#### List tags for a specific metric

```bash
curl -s "$AXIOM_URL/v1/query/metrics/info/datasets/DATASET_NAME/metrics/METRIC_NAME/tags" \
  -H "Authorization: Bearer $AXIOM_TOKEN"
```

#### List tag values for a specific metric and tag

```bash
curl -s "$AXIOM_URL/v1/query/metrics/info/datasets/DATASET_NAME/metrics/METRIC_NAME/tags/TAG_NAME/values" \
  -H "Authorization: Bearer $AXIOM_TOKEN"
```

#### Find metrics matching a tag value

```bash
curl -s -X POST "$AXIOM_URL/v1/query/metrics/info/datasets/DATASET_NAME/metrics" \
  -H "Authorization: Bearer $AXIOM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "SEARCH_VALUE"}'
```

## Workflow

1. **Learn the language**: Call `OPTIONS /v1/query/_metrics` to read the MPL spec
2. **Discover metrics**: If possible use the 'find metrics' endpoint otherwise list available metrics in the target dataset via the info endpoints
3. **Explore tags**: List tags and tag values to understand filtering options
4. **Write and execute query**: Compose an MPL query and POST it to the query endpoint
5. **Iterate**: Refine filters, aggregations, and groupings based on results

If you are unsure what to query, start by searching for metrics that match a relevant tag value using `POST /v1/query/metrics/info/datasets/DATASET_NAME/metrics` with `{"value": "SEARCH_VALUE"}`. This finds metrics associated with a known value (e.g., a service name or host), giving you a starting point for building queries.

## Error Handling

HTTP errors return JSON with `message` and `error` fields:
```json
{"message": "description", "error": "detail"}
```

Common status codes:
- 400 — Invalid query syntax or bad dataset name
- 401 — Missing or invalid authentication
- 403 — No permission to query/ingest this dataset
- 404 — Dataset not found
- 429 — Rate limited
- 500 — Internal server error

On a **500 error**, always use `-v` or `-i` with curl to capture response headers, then report the `traceparent` or `x-axiom-trace-id` header value to the user. This trace ID is essential for debugging the failure with the backend team.
