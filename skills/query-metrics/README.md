# query-metrics

Runs metrics queries against Axiom MetricsDB and discovers available metrics, tags, and tag values.

## What It Does

- **Metrics Queries** - Execute queries against OpenTelemetry metrics stored in Axiom MetricsDB
- **Discovery** - List metrics, tags, and tag values in a dataset before writing queries
- **Search** - Find metrics matching a known tag value (e.g., a service name)
- **Spec** - Fetch the self-describing query specification with syntax and examples

## Installation

```bash
# Amp
amp skill add axiomhq/skills/query-metrics

# npx (Claude Code, Cursor, Codex, and more)
npx skills add axiomhq/skills -s query-metrics
```

## Prerequisites

- Target dataset must be of kind `otel-metrics-v1`
- Tools: `jq`, `curl`

## Configuration

Create `~/.axiom.toml` with your Axiom deployment(s):

```toml
active_deployment = "prod"

[deployments.prod]
url = "https://api.axiom.co"
edge_url = "https://<region>.aws.edge.axiom.co"
token = "xaat-your-api-token"
org_id = "your-org-id"
```

> **Note:** `edge_url` is required for metrics queries. Replace `<region>` with your deployment region (e.g., `us-east-1`, `eu-west-1`).

Get your org_id from Settings → Organization. For the token, use a **Personal Access Token** (Settings → Profile → Personal Access Tokens) for full query access.

**Tip:** Run `scripts/setup` from the `axiom-sre` skill for interactive configuration.

## Usage

```bash
# Setup and check requirements (shows your active deployment name)
scripts/setup

# Fetch the metrics query spec
scripts/metrics-spec <deployment>

# List available metrics in a dataset
scripts/metrics-info <deployment> my-dataset metrics

# List tags and tag values
scripts/metrics-info <deployment> my-dataset tags
scripts/metrics-info <deployment> my-dataset tags service.name values

# Find metrics matching a value
scripts/metrics-info <deployment> my-dataset find-metrics "frontend"

# Run a metrics query
scripts/metrics-query <deployment> \
  '`my-dataset`:`http.server.duration` | align to 5m using avg | group by `endpoint` using sum' \
  '2025-06-01T00:00:00Z' '2025-06-02T00:00:00Z'
```

## Scripts

| Script | Purpose |
|--------|---------|
| `setup` | Check requirements and config |
| `metrics-spec` | Fetch metrics query specification |
| `metrics-query` | Execute a metrics query |
| `metrics-info` | Discover metrics, tags, and values |
| `axiom-api` | Low-level authenticated API calls |

## Related Skills

- `axiom-sre` - For running APL log queries and schema discovery
- `building-dashboards` - For creating dashboards that include metrics panels
