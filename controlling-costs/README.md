# controlling-costs

Axiom cost control skill that helps find and eliminate data waste. Analyzes actual query patterns to identify unused datasets and field values, then creates dashboards and monitors to track usage.

## What It Does

**Query Coverage Analysis** - The core capability. Parses APL query ASTs from `axiom-history` to find:
- Columns that exist in your schema but are never filtered or grouped
- Field values (like `app=atlas`) that log heavily but never appear in queries
- Estimated volume for each unqueried value using strided sampling

**Dashboard** - Deploys a comprehensive cost control dashboard showing:
- Total ingest, burn rate, 30-day projection
- Week-over-week movers
- Waste candidates (high ingest, low query utilization)
- Top users by query cost

**Monitors** - Creates a 3-layer hybrid alerting strategy:
- Budget guardrails (threshold monitors for contract compliance)
- Spike attribution (anomaly detection per dataset)
- Reduction glidepath (weekly threshold updates to track progress)

## Installation

Copy to your skills directory:
```bash
cp -r controlling-costs ~/.config/agents/skills/
```

## Prerequisites

- `axiom-sre` skill (for API access)
- `building-dashboards` skill (for dashboard deployment)
- Access to `axiom-audit` dataset
- Access to `axiom-history` dataset (for query coverage analysis)
- Tools: `jq`, `bc`

## Quick Start

```bash
# 1. Analyze query coverage for a dataset
scripts/analyze-query-coverage <deployment> <dataset>

# 2. Drill into a specific field to find unqueried values
scripts/analyze-query-coverage <deployment> <dataset> <field>

# 3. Deploy the cost control dashboard
scripts/deploy-dashboard <deployment>

# 4. Set up monitors (optional notifier for alerts)
scripts/create-monitors <deployment> [notifier_id] [contract_tb]
```

## Key Scripts

| Script | Purpose |
|--------|---------|
| `analyze-query-coverage` | Find unused columns and field values |
| `deploy-dashboard` | Deploy cost control dashboard |
| `create-monitors` | Create 5 hybrid monitors |
| `baseline-stats` | Get 30-day usage statistics |
| `update-glidepath` | Update weekly reduction target |

## Example Output

```
$ scripts/analyze-query-coverage prod kube-logs

=== Query Coverage Analysis ===
Dataset: kube-logs
24h events: 2,847,291,000

Suggested fields for value analysis:
  resource.k8s.pod.labels.app    # High cardinality, commonly filtered
  resource.k8s.namespace.name    # Commonly used in WHERE clauses

Queried columns: 12
Unqueried columns: 47 (potential reduction: 79%)

$ scripts/analyze-query-coverage prod kube-logs resource.k8s.pod.labels.app

=== Field Value Coverage ===
Value                    Est Events   Queried?
axiom-atlas              91,466,000   No ⚠️
axiom-db                 45,871,000   No ⚠️
frontend                  8,234,000   Yes
api-gateway               5,123,000   Yes

Never-queried values represent 77% of dataset volume.
```

## Related Skills

- `axiom-sre` - Required for API access
- `building-dashboards` - Required for dashboard deployment
- `spl-to-apl` - Helpful for migrations from Splunk
