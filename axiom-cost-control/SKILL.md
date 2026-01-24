---
name: axiom-cost-control
description: Builds Axiom cost control dashboards and monitors for usage optimization. Use when asked to reduce Axiom costs, track ingest/query spend, find unused datasets, or set up cost alerting.
---

# Axiom Cost Control

End-to-end workflow for Axiom usage optimization: dashboards, monitors, and waste identification.

## Prerequisites

- `axiom-sre` skill (for querying)
- `building-dashboards` skill (for dashboard creation)
- Access to `axiom-audit` dataset in target org
- Access to `axiom-history` dataset (for Query Filter Patterns panel)
- Tools: `jq`, `bc`

### Verify Data Availability

Before starting, confirm you have the required events:

```apl
['axiom-audit']
| where _time > ago(24h)
| summarize count() by action
| where action in ('usageCalculated', 'runAPLQueryCost')
```

You need `usageCalculated` events (hourly usage metrics) and `runAPLQueryCost` events (query cost tracking).

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

## Phase 4: Optimization

### Optimization Philosophy

**Why parse fields from body?**
Axiom's columnar storage compresses structured fields much better than raw text. When you parse fields out of `body` (like `app`, `level`, `error_code`), you get:
- **Better compression**: Columnar storage can dedupe and encode structured values efficiently
- **Faster queries**: Less I/O because queries only read needed columns
- **Lower costs**: Smaller storage footprint and faster scans

**The duplication problem**: If a dataset has BOTH the raw `body` AND parsed fields containing the same data, that's storage waste. Look for:
- `attributes.*` fields that duplicate info in `body`
- `resource.*` fields that repeat container/pod info from log lines
- Multiple fields with the same semantic value (e.g., `app` vs `kubernetes.labels.app`)

**System fields are not redundant**: Fields starting with `_` are Axiom system fields:
- `_time` - Event timestamp (required)
- `_sysTime` - When Axiom received the event (for debugging ingest lag)
- `_rowId` - Internal row identifier

These serve different purposes and should NOT be flagged as optimization candidates.

### Find Unused Datasets

```apl
['axiom-audit']
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

**Work/GB = 0** means data ingested but never queried.

### Drill Down: Find Never-Queried Subsets

Dataset-level analysis is just the start. Use `analyze-query-coverage` to find specific field values that are ingested but never appear in query filters:

```bash
# See which fields are commonly filtered/grouped on
scripts/analyze-query-coverage <deployment> <dataset>

# Find values of a specific field that are never queried
scripts/analyze-query-coverage <deployment> <dataset> <field>
```

This uses `parse_apl()` to analyze actual query history from `axiom-history`:
1. Extracts all APL queries against the dataset
2. Parses WHERE clauses and SUMMARIZE BY groups
3. Builds set of queried field/values
4. Anti-joins to find high-volume, never-queried values

Example output:
```
kubernetes.labels.app=axiom-atlas est_events_24h=91466000  # Never filtered!
kubernetes.labels.app=axiom-db est_events_24h=45871000     # Never filtered!
```

These represent massive savings opportunities - data being ingested but never used in queries.

### Find High-Volume Unqueried Values (Key Optimization)

For multi-tenant datasets like Kubernetes logs, the biggest wins come from finding **specific values that log heavily but are never queried**. Common cardinality fields to analyze:

| Dataset Type | Key Fields to Analyze |
|--------------|----------------------|
| Kubernetes logs | `resource.k8s.pod.labels.app`, `resource.k8s.namespace.name`, `resource.k8s.container.name` |
| Application logs | `app`, `service`, `component` |
| Infrastructure | `host`, `instance`, `region` |

```bash
# Find apps that log heavily but are never filtered for
scripts/analyze-query-coverage -d prod -D kube_logs -f resource.k8s.pod.labels.app

# Output shows:
# - Which app values are explicitly queried (safe to keep)
# - Which apps log millions of events but are NEVER in query filters
# - Opportunity score combining volume × (1 - query coverage)
```

**What to look for:**
- Apps with high `Est Events` but `Queried? = No` → candidates for log level reduction or exclusion
- Apps with `⚠️` marker → high volume AND never queried (strongest candidates)
- Compare against business criticality before dropping

**Actions for high-volume unqueried apps:**
1. **Reduce log level** at source (warn+ only)
2. **Sample** high-volume apps at ingest (keep 10%)
3. **Exclude entirely** from this dataset if truly unused
4. **Move to cold tier** if occasionally needed but not time-critical

### Find Noisy Applications

```apl
['axiom-audit']
| where action == 'usageCalculated'
| where _time > ago(7d)
| summarize 
    this_week = sumif(['properties.hourly_ingest_bytes'], _time >= ago(7d)),
    last_week = sumif(['properties.hourly_ingest_bytes'], _time < ago(7d) and _time >= ago(14d))
  by dataset = tostring(['properties.dataset'])
| extend delta_gb = (this_week - last_week) / 1000000000
| extend delta_pct = 100.0 * (this_week - last_week) / last_week
| where delta_gb > 100
| order by delta_gb desc
| take 10
```

### Find Expensive Queries

```apl
['axiom-audit']
| where action == 'runAPLQueryCost'
| where ['properties.query_cost_gbms'] > 1000000
| extend User = coalesce(['actor.email'], ['actor.name'], '[unknown]')
| project _time, User, cost_gbms = ['properties.query_cost_gbms'], query = substring(['properties.query_string'], 0, 100)
| order by cost_gbms desc
| take 20
```

### Optimization Actions

| Signal | Action |
|--------|--------|
| Work/GB = 0 | Drop dataset or stop ingesting |
| Low Work/GB + High Ingest | Partition, sample, or filter at source |
| WoW spike | Investigate recent deploys |
| Single dataset >40% | Review if necessary |

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
