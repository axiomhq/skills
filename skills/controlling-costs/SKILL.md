---
name: controlling-costs
description: Analyzes Axiom query patterns to find unused data, then builds dashboards and monitors for cost optimization. Use when asked to reduce Axiom costs, find unused columns or field values, identify data waste, or track ingest spend.
skill_path: .
---

# Axiom Cost Control

End-to-end workflow for Axiom usage optimization: dashboards, monitors, and waste identification.

## Pre-flight Checks (REQUIRED)

**Complete ALL checks before starting any workflow.**

### 1. Load axiom-sre skill

```
skill: axiom-sre
```

All APL queries in this skill MUST use the axiom-sre workflow, NOT direct CLI commands.

### 2. Verify audit dataset access

This skill CANNOT work without audit data. Run:

```apl
['axiom-audit']
| where _time > ago(1h)
| summarize count() by action
| where action in ('usageCalculated', 'runAPLQueryCost')
```

**If dataset not found:** STOP and ask:

> "The `axiom-audit` dataset is not accessible. What is the audit dataset name for this deployment? (Common: `axiom-audit-logs-view`, `audit-logs`)
>
> Without audit data, this skill cannot proceed."

**If dataset exists but no `usageCalculated` events:** STOP - wrong dataset.

### 3. Confirm deployment and audit dataset with user

Before proceeding, confirm:
- Deployment: `<deployment>`
- Audit dataset: `<audit-dataset>`

### 4. Pass audit dataset to all scripts

All scripts use named flags:

```bash
scripts/baseline-stats -d <deployment> -a <audit-dataset>
scripts/deploy-dashboard -d <deployment> -a <audit-dataset> [-n <name>]
scripts/create-monitors -d <deployment> -a <audit-dataset> [-c <contract_tb>] [-g <glidepath_tb>] [-n <notifier_id>]
scripts/analyze-query-coverage -d <deployment> -D <dataset> -a <audit-dataset>
scripts/update-glidepath -d <deployment> -t <threshold_tb>
```

**Do NOT pipe script output to `head` or `tail`** - scripts produce complete reports that should run to completion. Truncating output causes SIGPIPE (exit 141).

Run any script with `-h` for full usage.

### Other requirements

- Access to `axiom-history` dataset (for Query Filter Patterns panel)
- `building-dashboards` skill (for dashboard creation)
- Tools: `jq`, `bc`

## Workflow Overview

```
1. DISCOVER  → Baseline current usage (ingest, query, by dataset/org)
2. DASHBOARD → Create visibility with cost control dashboard
3. MONITOR   → Set up hybrid alerting (thresholds + anomaly)
4. OPTIMIZE  → Find waste candidates, unused datasets, noisy apps
5. TRACK     → Glidepath toward contract/budget targets
```

## Phase 1: Discovery

Run baseline queries to understand current state:

```bash
# Get 30-day usage stats
scripts/baseline-stats <deployment>

# Or manually:
```

```apl
['axiom-audit']
| where action == 'usageCalculated'
| where _time > ago(30d)
| summarize daily_bytes = sum(toreal(['properties.hourly_ingest_bytes'])) by bin(_time, 1d)
| extend daily_tb = daily_bytes / 1000000000000
| summarize 
    avg_tb = round(avg(daily_tb), 2),
    p50_tb = round(percentile(daily_tb, 50), 2),
    p90_tb = round(percentile(daily_tb, 90), 2),
    p95_tb = round(percentile(daily_tb, 95), 2),
    max_tb = round(max(daily_tb), 2),
    stddev_tb = round(stdev(daily_tb), 2)
```

Key metrics to capture:
- **Daily ingest TB** (avg, p90, p95, max)
- **Top datasets** by ingest volume
- **Query cost GB·ms** by user/dataset
- **Contract limit** (if known)

## Phase 2: Dashboard

Deploy the cost control dashboard from `templates/dashboard.json`:

```bash
scripts/deploy-dashboard <deployment>
```

Dashboard includes:
- Total ingest, daily burn rate, 30-day projection
- % over contract, required cut %
- Top datasets by ingest and query cost
- Week-over-week movers
- Waste candidates (low query activity)
- Top users by query cost

See `reference/dashboard-panels.md` for panel details.

## Phase 3: Monitors

Deploy hybrid monitoring strategy:

```bash
scripts/create-monitors <deployment>
```

### Three-Layer Strategy

| Layer | Type | Purpose |
|-------|------|---------|
| **Budget Guardrails** | Threshold (24h) | Contract compliance |
| **Spike Attribution** | Anomaly (per-dataset) | Change detection |
| **Reduction Glidepath** | Threshold (weekly updates) | Track reduction progress |

### Monitors Created

1. **Last 24h Ingest vs Contract** - Threshold @ 1.5x contract
2. **Per-Dataset Spike Detection** - Anomaly, grouped by dataset
3. **Top Dataset Dominance** - Threshold @ 40% of hourly contract
4. **Query Cost Spike** - Anomaly on query GB·ms
5. **Reduction Glidepath** - Threshold, update weekly

See `reference/monitor-strategy.md` for threshold derivation.

## Phase 4: Optimization (STRICT PROCEDURE)

**Follow these steps IN ORDER. Do not skip steps. Complete each dataset fully before moving to the next.**

---

### STEP 4.1: Get Waste Candidates List

Run this query to get datasets ranked by Work/GB (lowest first = most waste):

```bash
scripts/baseline-stats -d <deployment> -a <audit-dataset>
```

Or manually:
```apl
['<audit-dataset>']
| where action == 'usageCalculated'
| where _time > ago(30d)
| summarize 
    total_bytes = sum(['properties.hourly_ingest_bytes']),
    query_gbms = sum(['properties.hourly_billable_query_gbms'])
  by dataset = tostring(['properties.dataset'])
| extend ingest_gb = total_bytes / 1000000000
| where ingest_gb > 10
| extend work_per_gb = query_gbms / ingest_gb
| order by work_per_gb asc
| take 20
```

**CHECKPOINT:** You now have a ranked list. Work/GB meanings:
- **= 0** → Never queried (🔴 drop candidate)
- **< 100** → Rarely queried (🟡 analyze further)
- **> 1000** → Actively used (🟢 but may have unqueried subsets)

---

### STEP 4.2: Analyze Each Dataset (IN ORDER)

**Process datasets in this priority order:**
1. Work/GB = 0 (never queried)
2. Work/GB < 100 (rarely queried)
3. Highest ingest volume (even if actively queried)

**For EACH dataset, complete ALL sub-steps before moving to the next dataset.**

---

#### STEP 4.2.1: Run Column Analysis

```bash
scripts/analyze-query-coverage -d <deployment> -D <dataset> -a <audit-dataset>
```

**CHECKPOINT:** Script will show:
- Total queries against this dataset
- Column usage ranking
- Unused columns list
- Suggested fields for value analysis

**If 0 queries found:** Dataset is completely unused → recommend dropping. Move to next dataset.

---

#### STEP 4.2.2: Run Field Value Analysis

Pick a field from the "Suggested fields for value analysis" list (usually app/service identifier):

```bash
scripts/analyze-query-coverage -d <deployment> -D <dataset> -a <audit-dataset> -f <field>
```

**CHECKPOINT:** Script will show:
- Values explicitly queried (safe to keep)
- Values with high volume but never queried (⚠️ markers)
- Potential reduction percentage

**Record findings:** Note the top unqueried values and their volume.

---

#### STEP 4.2.3: Handle Empty Values (REQUIRED if present)

**If the script shows `(empty)` with >5% volume, you MUST drill down:**

1. Look at the column usage list from Step 4.2.1
2. Pick an alternative field (e.g., `kubernetes.namespace_name`, `kubernetes.container_name`)
3. Run field value analysis on that field:

```bash
scripts/analyze-query-coverage -d <deployment> -D <dataset> -a <audit-dataset> -f <alternative-field>
```

**CHECKPOINT:** You should now understand WHAT the empty-label events are (e.g., "kube-system namespace pods without app labels").

**Record findings:** Note what the empty values represent.

---

#### STEP 4.2.4: Document Dataset Recommendations

Before moving to next dataset, record:
- [ ] Dataset name and 30d ingest volume
- [ ] Work/GB score
- [ ] Top unqueried values and their volume
- [ ] Empty value explanation (if applicable)
- [ ] Recommended action (drop/sample/reduce log level/keep)
- [ ] Estimated savings

---

### STEP 4.3: Compile Final Report

After analyzing ALL priority datasets, use `reference/analysis-report-template.md` to format findings:
- Executive summary with total potential savings
- Per-dataset findings table
- Prioritized recommendations (immediate/short-term/long-term)

---

### Reference: Optimization Actions

| Signal | Action |
|--------|--------|
| Work/GB = 0 | Drop dataset or stop ingesting |
| High-volume unqueried values | Reduce log level or sample at source |
| Empty field values from system namespaces | Filter at ingest or accept as necessary |
| WoW spike | Investigate recent deploys |

### Reference: Common Fields by Dataset Type

| Dataset Type | Primary Field | Alternative Fields |
|--------------|---------------|-------------------|
| Kubernetes logs | `kubernetes.labels.app` | `kubernetes.namespace_name`, `kubernetes.container_name` |
| Application logs | `app` or `service` | `level`, `logger`, `component` |
| Infrastructure | `host` | `region`, `instance`, `service` |
| Traces | `service.name` | `span.kind`, `http.route` |

## Phase 5: Glidepath Tracking

Update the Reduction Glidepath monitor threshold weekly:

| Week | Target |
|------|--------|
| 1 | Current p95 |
| 2 | -25% |
| 3 | -50% |
| 4 | Contract limit |

```bash
# Update glidepath threshold
scripts/update-glidepath <deployment> <new_threshold_tb>
```

## Cleanup

To delete monitors created by this skill:

```bash
# List cost control monitors
axiom-api <deployment> GET "/v2/monitors" | jq -r '.[] | select(.name | startswith("Cost Control:")) | "\(.id)\t\(.name)"'

# Delete a monitor
axiom-api <deployment> DELETE "/v2/monitors/<id>"
```

To delete the dashboard, use the building-dashboards skill or the Axiom UI.

**Note:** Running `create-monitors` multiple times creates duplicate monitors. Delete existing ones first if re-deploying.

## Quick Reference

### Key Fields in axiom-audit

| Field | Description |
|-------|-------------|
| `action` | Event type (`usageCalculated`, `runAPLQueryCost`) |
| `properties.hourly_ingest_bytes` | Hourly ingest in bytes |
| `properties.hourly_billable_query_gbms` | Hourly query cost in GB·ms |
| `properties.dataset` | Dataset name |
| `properties.query_cost_gbms` | Per-query cost |
| `resource.id` | Org ID |
| `actor.email` | User email |

### Units and Inputs

**Scripts use TB/day:**
- `create-monitors`: contract_tb parameter is TB/day
- `update-glidepath`: threshold is TB/day

**Dashboard uses GB/month:**
- The "Contract (GB/mo)" filter expects total monthly GB
- 5 PB/month = 5,000,000 GB/month

**Unit Conversions (decimal):**
- **TB** = bytes / 1,000,000,000,000
- **GB** = bytes / 1,000,000,000
- **PB/month → TB/day**: divide by 30, multiply by 1000

### Contract Math

| Contract | TB/day | GB/month |
|----------|--------|----------|
| 5 PB/month | 167 | 5,000,000 |
| 10 PB/month | 333 | 10,000,000 |
| 15 PB/month | 500 | 15,000,000 |
