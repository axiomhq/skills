# controlling-costs

Analyzes Axiom query patterns to find unused data, then builds dashboards and monitors for cost optimization.

## What It Does

- **Query Coverage Analysis** - Parses APL query ASTs to find columns and field values that are ingested but never queried
- **Volume Estimation** - Uses strided sampling to estimate event volume by field value
- **Dashboard** - Deploys cost control dashboard with ingest tracking, waste candidates, and query cost breakdowns
- **Monitors** - Creates hybrid alerting (budget guardrails + anomaly detection + reduction glidepath)

## Installation

```bash
npx skills add axiomhq/skills
```

## Prerequisites

- `axiom-sre` skill (for API access)
- `building-dashboards` skill (for dashboard deployment)
- Access to `axiom-audit` and `axiom-history` datasets
- Tools: `jq`, `bc`

The install command above includes all skill dependencies.

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
# Analyze query coverage for a dataset
scripts/analyze-query-coverage <deployment> <dataset>

# Find unqueried values for a specific field
scripts/analyze-query-coverage <deployment> <dataset> <field>

# Deploy cost control dashboard
scripts/deploy-dashboard <deployment>

# Create monitors (notifier optional)
scripts/create-monitors <deployment> [notifier_id] [contract_tb]
```

## Scripts

| Script | Purpose |
|--------|---------|
| `analyze-query-coverage` | Find unused columns and field values |
| `deploy-dashboard` | Deploy cost control dashboard |
| `create-monitors` | Create 5 hybrid monitors |
| `baseline-stats` | Get 30-day usage statistics |
| `update-glidepath` | Update weekly reduction target |
