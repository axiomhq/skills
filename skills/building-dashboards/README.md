# building-dashboards

Designs and builds Axiom dashboards via API. Covers chart types, APL patterns, SmartFilters, layout, and configuration options.

## What It Does

- **Dashboard Design** - Blueprint structure: at-a-glance stats, trends, breakdowns, evidence
- **Chart Types** - Statistic, TimeSeries, Table, Pie, LogStream, Heatmap, SmartFilter, Note
- **APL Patterns** - Golden signals, percentiles, error rates, cardinality guardrails
- **Layout Composition** - Grid-based layouts with section templates
- **Deployment** - Scripts to validate, create, update, and manage dashboards

## Installation

```bash
# Amp
amp skill add axiomhq/skills/building-dashboards

# npx (Claude Code, Cursor, Codex, and more)
npx skills add axiomhq/skills -s building-dashboards
```

## Prerequisites

- `axiom-sre` skill (for API access and schema discovery)
- Tools: `jq`, `curl`

## Configuration

Create `~/.axiom.toml` with your Axiom deployment(s):

```toml
[deployments.prod]
url = "https://api.axiom.co"
token = "xaat-your-api-token"
org_id = "your-org-id"
```

Get your org_id from Settings → Organization. For the token, use a **Personal Access Token** (Settings → Profile → Personal Access Tokens) for full query access.

**Tip:** Run `scripts/setup` from the `axiom-sre` skill for interactive configuration.

## Usage

```bash
# Setup and check requirements
scripts/setup

# Get your user ID for dashboard ownership
scripts/get-user-id <deployment>

# Create dashboard from template
scripts/dashboard-from-template service-overview "my-service" "$USER_ID" "my-dataset" ./dashboard.json

# Validate dashboard JSON
scripts/dashboard-validate ./dashboard.json

# Deploy dashboard
scripts/dashboard-create <deployment> ./dashboard.json

# List, update, delete
scripts/dashboard-list <deployment>
scripts/dashboard-update <deployment> <id> <file>
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
| `dashboard-copy` | Clone a dashboard |
| `dashboard-delete` | Delete with confirmation |
| `dashboard-from-template` | Generate from template |
| `get-user-id` | Get your UUID for ownership |

## Templates

Pre-built templates in `reference/templates/`:
- `service-overview.json` - Single service oncall dashboard
- `service-overview-with-filters.json` - With SmartFilter dropdowns
- `api-health.json` - HTTP API health dashboard
- `blank.json` - Minimal skeleton

## Related Skills

- `axiom-sre` - Schema discovery and query exploration
- `spl-to-apl` - Translate Splunk dashboards to Axiom
