# Monitor Strategy

## Why Hybrid Monitoring?

**Problem:** Pure anomaly detection learns from historical patterns. If you're already 3x over contract, that overspend becomes your "normal" baseline.

**Solution:** Three-layer hybrid approach:

1. **Budget Guardrails** (Threshold) - Absolute limits tied to contract
2. **Spike Attribution** (Anomaly) - Detect changes, identify which dataset
3. **Reduction Glidepath** (Threshold) - Track progress toward targets

## Threshold Derivation

Run this query to determine baseline:

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

### Recommended Thresholds

| Level | Formula | Purpose |
|-------|---------|---------|
| Warning | p90 + 1×stddev | Early signal |
| Critical | p95 + 2×stddev | Immediate attention |
| Contract | Fixed (e.g., 167 TB/day) | Budget limit |

## Monitor Details

### 1. Last 24h Ingest vs Contract

- **Type:** Threshold
- **Query:** Sum ingest bytes over monitor range (24h)
- **Threshold:** 1.5x contract (e.g., 251 TB if contract is 167 TB)
- **Frequency:** Hourly
- **Range:** 24 hours
- **Trigger after:** 2 consecutive runs (reduces noise)

The monitor's `rangeMinutes: 1440` provides the 24h window; the query simply sums over that range.

### 2. Per-Dataset Spike Detection

- **Type:** Anomaly
- **Query:** Hourly ingest by dataset
- **Operator:** Above only
- **Tolerance:** 3 (medium)
- **Frequency:** 15 minutes
- **Range:** 12 hours
- **Notify by group:** Yes (separate alert per dataset)

**Note:** No min volume filter is applied. The Axiom monitors API has a bug where anomaly detection queries fail with "Internal Server Error" if a `where` clause follows a `summarize` operation. Small datasets may generate occasional alerts, but anomaly detection naturally adapts to their baseline.

### 3. Top Dataset Dominance

- **Type:** Threshold
- **Query:** Top 1 dataset by hourly ingest
- **Threshold:** 40% of hourly contract (computed by script)
- **Frequency:** Hourly
- **Range:** 3 hours

Catches runaway datasets that dominate ingest. Threshold formula: `contract_tb / 24 * 0.4`.

### 4. Query Cost Spike

- **Type:** Anomaly
- **Query:** Hourly query GB·ms
- **Operator:** Above only
- **Tolerance:** 3 (medium)
- **Frequency:** 15 minutes
- **Range:** 24 hours

Different cost driver than ingest - catches expensive queries.

### 5. Reduction Glidepath

- **Type:** Threshold
- **Query:** Daily ingest TB
- **Threshold:** Start at current p95, decrease weekly
- **Frequency:** 6 hours
- **Range:** 24 hours

Update threshold weekly as reduction progresses:
- Week 1: 450 TB/day
- Week 2: 350 TB/day
- Week 3: 250 TB/day
- Week 4: 167 TB/day (contract)

## Anomaly Detection Settings

### Tolerance Values

| Value | Sensitivity | Use Case |
|-------|-------------|----------|
| 1-2 | High | Catch small changes |
| 3 | Medium | Balance signal/noise |
| 4-5 | Low | Only major deviations |

### Operators

| Operator | Alerts When |
|----------|-------------|
| Above | Value exceeds expected |
| Below | Value drops below expected |
| AboveOrBelow | Any deviation |

For cost control, use **Above only** - we care about increases.

## Notifier Configuration

Recommended routing:

| Monitor | Severity | Channel |
|---------|----------|---------|
| 24h Rolling vs Contract | Critical | PagerDuty + Slack |
| Per-Dataset Spike | Warning | Slack |
| Top Dataset Dominance | Warning | Slack |
| Query Cost Spike | Warning | Slack |
| Reduction Glidepath | Info | Slack (ops channel) |
