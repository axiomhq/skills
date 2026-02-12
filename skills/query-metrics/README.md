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
[deployments.prod]
url = "https://api.axiom.co"
metrics_url = "https://us-east-1.aws.edge.axiom.co"
token = "xaat-your-api-token"
org_id = "your-org-id"
```

- **`metrics_url`** - The metrics query API is served from the edge URL, not `api.axiom.co`. Set this to your Axiom edge endpoint. If omitted, scripts fall back to `url`.
- **`org_id`** - The organization ID. Get it from Settings → Organization.
- **`token`** - Use an advanced API token with minimal privileges.

**Tip:** Run `scripts/setup` from the `axiom-sre` skill for interactive configuration.

## Usage

```bash
# Setup and check requirements
scripts/setup

# Fetch the metrics query spec
scripts/metrics-spec prod

# List available metrics in a dataset
scripts/metrics-info prod my-dataset metrics

# List tags and tag values
scripts/metrics-info prod my-dataset tags
scripts/metrics-info prod my-dataset tags service.name values

# Find metrics matching a value
scripts/metrics-info prod my-dataset find-metrics "frontend"

# Run a metrics query
scripts/metrics-query prod \
  'my-dataset:http.server.duration | align to 5m using avg' \
  '2025-06-01T00:00:00Z' '2025-06-02T00:00:00Z'
```

## Scripts

| Script | Purpose |
|--------|---------|
| `setup` | Check requirements and config |
| `metrics-spec` | Fetch metrics query specification |
| `metrics-query` | Execute a metrics query |
| `metrics-info` | Discover metrics, tags, and values |
| `axiom-api` | Low-level authenticated API calls (uses `url`) |
| `config` | Sourceable config reader (internal) |

## Related Skills

- `axiom-sre` - For running APL log queries and schema discovery
- `building-dashboards` - For creating dashboards that include metrics panels
