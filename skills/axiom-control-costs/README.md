# axiom-control-costs

Analyzes Axiom query patterns to find unused data, then builds dashboards and monitors for cost optimization.

## What It Does

- **Query Coverage Analysis** - Parses APL query ASTs to find columns and field values that are ingested but never queried
- **Volume Estimation** - Uses strided sampling to estimate event volume by field value
- **Dashboard** - Deploys cost control dashboard with ingest tracking, waste candidates, and query cost breakdowns
- **Monitors** - Creates 3 cost control monitors (ingest guard + per-dataset spike detection)

## Installation

```bash
npx skills add axiomhq/skills
```

## Prerequisites

- `axiom-sre` skill (for API access)
- `axiom-build-dashboard` skill and authenticated Axiom MCP (for dashboard operations)
- Access to `axiom-audit` and `axiom-history` datasets
- Tools: `jq`, `bc`

The install command above includes both skills. Scripts find them automatically.

## Configuration

Configure SRE for query/API access using its [setup instructions](../axiom-sre/README.md#setup). SRE uses `~/.config/axiom-sre/config.toml`.

The cost-control setup check still uses `~/.axiom.toml`; add the same deployment name there. Dashboard operations use Axiom MCP, so select the same organization in that connection:

```toml
[deployments.prod]
url = "https://api.axiom.co"
token = "xaat-your-api-token"
org_id = "your-org-id"
```

- **`org_id`** - The organization ID. Get it from Settings → Organization.
- **`token`** - Use an advanced API token with minimal privileges.

To import an existing `~/.axiom.toml` during SRE's first initialization, run `scripts/init --migrate` from the SRE skill directory. Keep `~/.axiom.toml` for the cost-control setup check. It does not configure MCP; see [dashboard connection setup](../axiom-build-dashboard/README.md#prerequisite-axiom-mcp).

## Usage

```bash
# Analyze query coverage for a dataset
scripts/analyze-query-coverage <deployment> <dataset>

# Find unqueried values for a specific field
scripts/analyze-query-coverage <deployment> <dataset> <field>

# Prepare dashboard JSON locally, then validate and save through Axiom MCP
scripts/build-dashboard -a <audit-dataset> > dashboard.json

# List available notifiers
scripts/list-notifiers -d <deployment>

# Create monitors (with optional notifier)
scripts/create-monitors -d <deployment> -a <audit-dataset> -c <contract> [-n <notifier_id>]
```

## Scripts

| Script | Purpose |
|--------|---------|
| `analyze-query-coverage` | Find unused columns and field values |
| `build-dashboard` | Prepare cost dashboard JSON for the MCP workflow |
| `list-notifiers` | List available notifiers for alerts |
| `create-monitors` | Create 3 cost control monitors |
| `baseline-stats` | Get 30-day usage statistics |
