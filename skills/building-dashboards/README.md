# building-dashboards

Designs and builds Axiom dashboards via API. Covers chart types, APL patterns, SmartFilters, layout, and configuration options.

## What It Does

- **Dashboard Design** - Blueprint structure: at-a-glance stats, trends, breakdowns, evidence
- **Chart Types** - Statistic, TimeSeries, Table, Pie, LogStream, Heatmap, SmartFilter, Note
- **APL + Metrics/MPL Patterns** - Golden signals, percentiles, error rates, and metrics chart queries via `query.apl`
- **Layout Composition** - Grid-based layouts with section templates
- **Deployment** - Scripts to validate, create, update, and manage dashboards

## Installation

```bash
npx skills add axiomhq/skills
```

## Prerequisites

- `axiom-sre` skill (for API access and schema discovery)
- `query-metrics` skill (for metrics dataset/metric/tag discovery; also vendored locally in `scripts/metrics/`)
- Tools: `jq`, `curl`

The install command above includes all skill dependencies.

## Configuration

Create `~/.axiom.toml` with your Axiom deployment(s):

```toml
[deployments.prod]
url = "https://api.axiom.co"
token = "xaat-your-api-token"
org_id = "your-org-id"
```

- **`org_id`** - The organization ID. Get it from Settings → Organization.
- **`token`** - Use an advanced API token with minimal privileges.

**Tip:** Run `scripts/setup` from the `axiom-sre` skill for interactive configuration.

## Usage

```bash
# Setup and check requirements
scripts/setup

# Create dashboard from template
scripts/dashboard-from-template service-overview "my-service" "my-dataset" ./dashboard.json

# Validate dashboard JSON
scripts/dashboard-validate ./dashboard.json

# Deploy dashboard
scripts/dashboard-create <deployment> ./dashboard.json

# List, update, delete
scripts/dashboard-list <deployment>
scripts/dashboard-update <deployment> <id> <file>
scripts/dashboard-chart-patch <deployment> <id> <chart-id> <patch-file> --version <version>
scripts/dashboard-delete <deployment> <id>
```

## Scripts

| Script | Purpose |
|--------|---------|
| `dashboard-create` | Deploy new dashboard |
| `dashboard-validate` | Validate JSON structure |
| `dashboard-list` | List all dashboards |
| `dashboard-get` | Fetch dashboard JSON |
| `dashboard-update` | Update existing dashboard |
| `dashboard-chart-patch` | Patch one chart in an existing dashboard |
| `dashboard-copy` | Clone a dashboard |
| `dashboard-delete` | Delete with confirmation |
| `dashboard-from-template` | Generate from template |

## Chart Patches

Use `dashboard-chart-patch` when only one existing chart needs to change. The patch file is a JSON Merge Patch applied to that chart: include only fields to change, and set a field to `null` to remove it.

```bash
cat > chart.patch.json <<'JSON'
{
  "name": "Error Rate (5m)",
  "query": { "apl": "['logs'] | summarize errors=countif(status >= 500)" },
  "config": { "stale": null }
}
JSON

scripts/dashboard-chart-patch prod dashboard-uid error-rate chart.patch.json --version 12
```

Use `--version` for optimistic concurrency. Use `--overwrite` only when last-write-wins is intended. If the patch includes `id`, it must match the chart ID in the command.

## Templates

Pre-built templates in `reference/templates/`:
- `service-overview.json` - Single service oncall dashboard
- `service-overview-with-filters.json` - With SmartFilter dropdowns
- `api-health.json` - HTTP API health dashboard
- `blank.json` - Minimal skeleton

## Related Skills

- `axiom-sre` - Schema discovery and query exploration
- `query-metrics` - Discover metric names, tags, and tag values for MPL queries
- `spl-to-apl` - Translate Splunk dashboards to Axiom
