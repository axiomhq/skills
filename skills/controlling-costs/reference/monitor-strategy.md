# Monitor Strategy

## Why Hybrid Monitoring?

**Problem:** Pure anomaly detection learns from historical patterns. If you're already 3x over contract, that overspend becomes your "normal" baseline. Static thresholds (like "40% of hourly budget") are meaningless if that's the steady state.

**Solution:** Hybrid approach combining:

1. **Budget Guardrails** (Threshold) - Absolute limits for immediate reaction
2. **Statistical Attribution** (Spotlight) - Detect significant changes, identify which dataset
3. **Progress Tracking** (Threshold) - Track reduction progress toward targets

## The 4 Monitors

| # | Monitor | Type | Reactivity | Purpose |
|---|---------|------|------------|---------|
| 1 | Budget Guardrail | Threshold | 1 hour | Immediate: "total over limit" |
| 2 | Per-Dataset Spike | Robust Z-Score | 2+ hours | Attribution: "which dataset changed" |
| 3 | Query Cost Spike | Spotlight→Threshold | 6 hours | Separate cost driver detection |
| 4 | Glidepath | Threshold | 1 day | Progress tracking |

## Spotlight-Based Change Detection

### How It Works

Spotlight compares a "comparison" period against a "baseline" and outputs statistical metrics:

```apl
['audit-dataset']
| where action == "usageCalculated"
| extend bytes = toreal(['properties.hourly_ingest_bytes'])
| summarize result = spotlight(_time > ago(6h), bytes) by dataset = tostring(['properties.dataset'])
| mv-expand result
| extend p_value = toreal(result.p_value), delta_score = toreal(result.delta_score)
```

### Key Metrics

| Metric | Range | Meaning |
|--------|-------|---------|
| `p_value` | 0-1 | Statistical significance (lower = more confident change is real) |
| `delta_score` | 0-1 | Normalized Wasserstein distance (how different distributions are) |
| `effect_size` | 0-∞ | Magnitude accounting for sample size |
| `median_relative_change` | -1 to +1 | Direction: positive = increase, negative = decrease |

### Alert Logic

**Gate on significance + materiality:**

```
p_value < 0.01           # Stricter than 0.05 due to multiple dataset comparisons
AND delta_score > 0.3    # Meaningful distribution change
AND median_change > 0    # Only cost increases (not decreases)
```

### Why p < 0.01?

With N datasets evaluated per run, using `p < 0.05` causes too many false positives. Stricter alpha (0.01) reduces noise without formal multiple comparison correction.

### Threshold Guidelines

| delta_score | Interpretation |
|-------------|----------------|
| < 0.2 | Minor variation, probably noise |
| 0.2 - 0.3 | Noticeable change, worth monitoring |
| 0.3 - 0.5 | Significant change, likely actionable |
| > 0.5 | Major change, investigate immediately |

## Monitor Details

### 1. Budget Guardrail

- **Type:** Threshold
- **Query:** Sum ingest bytes over 24h range
- **Threshold:** 1.5x contract (in bytes)
- **Frequency:** Hourly
- **Range:** 24 hours (1440 minutes)
- **Trigger after:** 2 consecutive runs

Purpose: Immediate reaction when total ingest exceeds absolute limit. Cannot be "learned away" by anomaly detection.

### 2. Per-Dataset Spike Detection (Robust Z-Score)

- **Type:** Threshold (on robust z-score output)
- **Query:** Log-transform + IQR-based sigma, dual gate (z>3 AND >p99), sustained 2+ hours
- **Threshold:** 1 (any dataset with sustained spikes)
- **Frequency:** Hourly
- **Range:** 7 days (10080 minutes)
- **Trigger after:** 1 run (persistence built into query)

Purpose: Statistical attribution - identifies *which* dataset's ingest pattern changed significantly. Uses robust statistics to avoid false positives on high-variance datasets.

**Why not Spotlight?** Spotlight produces false positives on naturally high-variance datasets (e.g., k8s-events). The robust z-score approach handles this by:
- Log-transforming bytes to tame heavy tails
- Using IQR-based sigma (resistant to outliers) instead of stdev
- Requiring dual gate: z > 3 AND bytes > p99
- Requiring 2+ sustained hours (filters transient noise)

**Query:** See "Robust Z-Score Spike Detection" section below for full query and rationale.

### 3. Query Cost Spike

- **Type:** Threshold (on spotlight output)
- **Query:** Spotlight on hourly GB·ms
- **Threshold:** delta_score ≥ 0.3
- **Frequency:** Hourly
- **Range:** 7 days + 6 hours (10080 minutes)
- **Trigger after:** 2 consecutive runs

Purpose: Detect changes in query cost patterns (different cost driver than ingest). Same statistical approach as per-dataset spike.

### 4. Reduction Glidepath

- **Type:** Threshold
- **Query:** Sum daily ingest bytes
- **Threshold:** Current reduction target (update weekly)
- **Frequency:** 6 hours
- **Range:** 24 hours (1440 minutes)
- **Trigger after:** 1 run

Purpose: Track progress toward contract. Update threshold weekly as reduction progresses:
- Week 1: Current p95
- Week 2: -25%
- Week 3: -50%
- Week 4: Contract target

## Reactivity Trade-offs

| Approach | Reactivity | Statistical Rigor |
|----------|------------|-------------------|
| Threshold (absolute) | ~1 hour | None - fixed limit |
| Spotlight (6h comparison) | ~6 hours | High - p-value + effect size |
| Spotlight (1h comparison) | ~1 hour | Low - insufficient samples |

**Why 6 hours?** Spotlight needs `n ≥ 6` samples for statistical significance. With hourly audit data, that's 6 hours minimum.

**Hybrid approach:** Use threshold for immediate reaction, spotlight for attribution after the fact.

## Units

All thresholds are specified in **bytes**. Human-readable output auto-formats to appropriate unit (PB/TB/GB/MB/KB/bytes).

```bash
# Accept bytes or human-readable
--contract 167000000000000
--contract 167TB
--contract 5PB
```

## Robust Z-Score Spike Detection (Recommended)

### Why Replace Spotlight for Per-Dataset Spike Detection?

**Problem:** Spotlight-based detection produces false positives on high-variance datasets. If a dataset has naturally spiky ingest patterns (e.g., k8s-events), Spotlight's p-value will often be significant even during normal operation.

**Solution:** Robust z-score approach using log-transform and IQR-based sigma estimation:

1. **Log transform**: Tames heavy tails (10x spike becomes ~2.3 in log-space)
2. **IQR-based sigma**: Resistant to outlier contamination (unlike stdev)
3. **Dual gate**: Requires BOTH statistical anomaly AND material size
4. **Sustained condition**: Requires 2+ spike hours to filter transient noise

### The Query (Ingest Spike Detection)

```apl
['axiom-audit']
| where _time >= ago(4h) and _time < bin(now(), 1h) and action == "usageCalculated"
| extend bytes = toreal(['properties.hourly_ingest_bytes']), dataset = tostring(['properties.dataset'])
| where isfinite(bytes) and bytes >= 0
| summarize hourly_bytes = sum(bytes) by bucket = bin(_time, 1h), dataset
| extend hourly_y = log(hourly_bytes + 1)
| join kind=inner (
    ['axiom-audit']
    | where _time >= ago(15d) and _time < ago(1h) and action == "usageCalculated"
    | extend bytes = toreal(['properties.hourly_ingest_bytes']), dataset = tostring(['properties.dataset'])
    | where isfinite(bytes) and bytes >= 0
    | summarize hourly_bytes = sum(bytes) by bin(_time, 1h), dataset
    | extend hourly_y = log(hourly_bytes + 1)
    | summarize baseline_hours = count(), y_p = percentiles_array(hourly_y, 25, 50, 75), b_p = percentiles_array(hourly_bytes, 50, 99) by dataset
    | where baseline_hours >= 72
    | extend median_y = todouble(y_p[1]), sigma_y = max_of((todouble(y_p[2]) - todouble(y_p[0])) / 1.349, 0.1), median_bytes = todouble(b_p[0]), p99_bytes = todouble(b_p[1])
) on dataset
| extend robust_z = (hourly_y - median_y) / sigma_y, excess_bytes = hourly_bytes - median_bytes
| where robust_z > 3 and hourly_bytes > p99_bytes and excess_bytes > 0
| summarize spike_hours = count(), max_z = round(max(robust_z), 2), max_excess_bytes = max(excess_bytes) by dataset
| where spike_hours >= 2
| top 10 by max_excess_bytes desc
| summarize spike_count = count()
```

The query cost spike detection uses the same pattern with `hourly_billable_query_gbms` instead of `hourly_ingest_bytes`.

### Key Design Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Log transform | `log(bytes + 1)` | Compresses heavy-tailed distributions; 10x spike → ~2.3 log units |
| Sum first, then log | `sum() → log()` | Correct order; avoids bias if multiple records per hour |
| Sigma estimation | `IQR / 1.349` | IQR is robust to outliers; 1.349 converts to sigma-equivalent for normal distributions |
| Minimum sigma | `max_of(..., 0.1)` | Prevents division-by-zero on constant datasets |
| Current window | `ago(4h)` | Short window avoids re-alerting on old spikes |
| Baseline period | 15d (excl. last 1h) | Longer baseline captures weekly patterns; excludes recent data to avoid self-contamination |
| Baseline guard | `baseline_hours >= 72` | Ensures enough data points for stable percentiles |
| Z-score threshold | `> 3` | Standard anomaly threshold (~0.1% false positive rate for normal data) |
| Relative gate | `> p99_bytes` | Spike must exceed dataset's own p99 (relative materiality) |
| Excess gate | `excess_bytes > 0` | Spike must be above baseline median |
| Persistence filter | `spike_hours >= 2` | Filters transient noise; catches sustained anomalies |
| Rank-based filter | `top 10 by max_excess_bytes` | Only alert on top 10 datasets by cost impact (scale-free) |
| isfinite guard | `isfinite(bytes)` | Filters invalid/null values before log transform |

### Why This Works Better Than Spotlight

| Scenario | Spotlight | Robust Z-Score |
|----------|-----------|----------------|
| High-variance dataset (k8s-events) | False positive (low p-value, high delta) | Correctly filtered (z=2.48 < 3) |
| Genuine 10x spike | True positive | True positive (z=8.06 > 3) |
| Gradual increase over weeks | May miss (adapts baseline) | May miss (same limitation) |
| Transient 1-hour spike | False positive possible | Filtered (requires 2+ hours) |

### Monitor Configuration

When using this query as a threshold monitor:

- **Threshold:** 1 (alert if any dataset has sustained spikes)
- **Operator:** AboveOrEqual on `| summarize count()`
- **Range:** 7 days (10080 minutes)
- **Frequency:** Hourly
- **Trigger after:** 1 run (persistence is built into the query)

### Seasonality Handling

The IQR implicitly handles regular seasonality because:
- IQR measures the *spread* of normal values (25th to 75th percentile)
- Weekly/daily patterns create a wider IQR, which means a higher sigma
- Higher sigma = higher threshold for anomaly detection
- This automatically adjusts sensitivity for high-variance vs stable datasets

## Notifier Configuration

Recommended routing:

| Monitor | Severity | Channel |
|---------|----------|---------|
| Budget Guardrail | Critical | PagerDuty + Slack |
| Per-Dataset Spike | Warning | Slack |
| Query Cost Spike | Warning | Slack |
| Reduction Glidepath | Info | Slack (ops channel) |
