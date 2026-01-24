# controlling-costs

Analyzes Axiom query patterns to find unused data, then builds dashboards and monitors for cost optimization.

## What It Does

- **Query Coverage Analysis** - Parses APL query ASTs to find columns and field values that are ingested but never queried
- **Volume Estimation** - Uses strided sampling to estimate event volume by field value
- **Dashboard** - Deploys cost control dashboard with ingest tracking, waste candidates, and query cost breakdowns
- **Monitors** - Creates hybrid alerting (budget guardrails + anomaly detection + reduction glidepath)

## Installation

```bash
# Amp
amp skill add axiomhq/skills/controlling-costs

# npx (Claude Code, Cursor, Codex, and more)
npx skills add axiomhq/skills -s controlling-costs
```

## Prerequisites

- `axiom-sre` skill (for API access)
- `building-dashboards` skill (for dashboard deployment)
- Access to `axiom-audit` and `axiom-history` datasets
- Tools: `jq`, `bc`

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
