# axiom-platform

Axiom platform skill focused on Axiom-native observability and metrics workflows.

## What It Does

- Runs and iterates APL queries against Axiom datasets
- Discovers datasets and validates schema before querying
- Generates shareable Axiom query links
- Queries Axiom MetricsDB (datasets, metric specs, tags, values, MPL queries)

## Scope

This skill intentionally excludes generic SRE methodology, memory workflows,
and non-Axiom integrations (Grafana, Pyroscope, Sentry, Slack, Kubernetes).

Use `sre` if you want the full bundled workflow. Use `axiom-platform` when you
only need Axiom platform capabilities.

## Installation

```bash
# Amp
amp skill add axiomhq/skills/axiom-platform

# npx (Claude Code, Cursor, Codex, and more)
npx skills add axiomhq/skills -s axiom-platform
```

## Prerequisites

- Access to Axiom deployment(s)
- Tools: `jq`, `curl`
- `~/.axiom.toml` configured with deployment credentials

## Configuration

Create `~/.axiom.toml` with at least one deployment:

```toml
[deployments.prod]
url = "https://api.axiom.co"
token = "xaat-your-api-token"
org_id = "your-org-id"
```

Get `org_id` from Settings → Organization. Use a scoped API token.

## Key Scripts

| Script | Purpose |
|--------|---------|
| `scripts/discover-axiom` | Discover available datasets per deployment |
| `scripts/axiom-query` | Run APL queries |
| `scripts/axiom-link` | Generate shareable Axiom links |
| `scripts/axiom-api` | Make raw Axiom API calls |
| `scripts/datasets` | List datasets (including metrics kind) |
| `scripts/metrics-spec` | Fetch metrics query specification |
| `scripts/metrics-info` | Discover metrics/tags/values |
| `scripts/metrics-query` | Execute MPL metrics queries |
