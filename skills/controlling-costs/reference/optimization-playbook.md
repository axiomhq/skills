# Optimization Playbook

## Quick Wins

### 1. Find Never-Queried Datasets

```apl
['axiom-audit']
| where action == 'usageCalculated'
| where _time > ago(30d)
| summarize 
    ingest_gb = sum(['properties.hourly_ingest_bytes']) / 1000000000,
    query_gbms = sum(['properties.hourly_billable_query_gbms'])
  by dataset = tostring(['properties.dataset'])
| where query_gbms == 0 and ingest_gb > 10
| order by ingest_gb desc
```

**Action:** Stop ingesting or set short retention.

### 2. Find High-Volume, Low-Value Datasets

```apl
['axiom-audit']
| where action == 'usageCalculated'
| where _time > ago(30d)
| summarize 
    total_bytes = sum(['properties.hourly_ingest_bytes']),
    query_gbms = sum(['properties.hourly_billable_query_gbms'])
  by dataset = tostring(['properties.dataset'])
| extend ingest_gb = total_bytes / 1000000000
| where ingest_gb > 100
| extend work_per_gb = query_gbms / ingest_gb
| where work_per_gb < 100
| order by ingest_gb desc
| take 10
```

**Actions:**
- Sample at source (1:10 or 1:100)
- Filter noisy log levels (DEBUG, TRACE)
- Aggregate before ingest

### 3. Find Week-over-Week Spikes

```apl
['axiom-audit']
| where _time between (ago(14d) .. now())
| where action == 'usageCalculated'
| summarize 
    this_week = sumif(['properties.hourly_ingest_bytes'], _time >= ago(7d)),
    last_week = sumif(['properties.hourly_ingest_bytes'], _time < ago(7d))
  by dataset = tostring(['properties.dataset'])
| extend delta_gb = (this_week - last_week) / 1000000000
| extend delta_pct = round(100.0 * (this_week - last_week) / last_week, 1)
| where delta_gb > 50
| order by delta_gb desc
| take 10
```

**Action:** Investigate recent deploys, new services, or logging changes.

## Deep Dive Analysis

### 4. Analyze Specific Dataset's Content

Once you identify a high-volume dataset, understand what's in it:

```apl
['<dataset_name>']
| where _time > ago(1h)
| summarize count() by <field>
| order by count_ desc
| take 20
```

Common culprits:
- Repeated error messages
- Health check spam
- Debug logging left on
- Retry storms

### 5. Find Noisy Applications

If you have an `app` or `service` field:

```apl
['<dataset_name>']
| where _time > ago(24h)
| summarize events = count(), bytes = sum(estimate_data_size(*)) by app
| extend mb = bytes / 1e6
| order by mb desc
| take 10
```

### 6. Identify Log Level Distribution

```apl
['<dataset_name>']
| where _time > ago(24h)
| summarize count() by level
| order by count_ desc
```

If DEBUG/TRACE is high, recommend filtering at source.

## Query Cost Optimization

### 7. Find Expensive Queries

```apl
['axiom-audit']
| where action == 'runAPLQueryCost'
| where ['properties.query_cost_gbms'] > 1000000
| extend User = coalesce(['actor.email'], ['actor.name'], '[unknown]')
| project _time, User, cost_gbms = ['properties.query_cost_gbms'], 
          query = substring(['properties.query_string'], 0, 200)
| order by cost_gbms desc
| take 20
```

### 8. Find Users with Highest Query Costs

```apl
['axiom-audit']
| where action == 'runAPLQueryCost'
| where _time > ago(7d)
| extend User = coalesce(['actor.email'], ['actor.name'], '[unknown]')
| summarize total_cost = sum(['properties.query_cost_gbms']), queries = count() by User
| extend avg_cost = total_cost / queries
| order by total_cost desc
| take 10
```

### 9. Query Cost by Dataset

```apl
['axiom-audit']
| where action == 'runAPLQueryCost'
| where _time > ago(7d)
| summarize total_cost = sum(['properties.query_cost_gbms']), queries = count() 
  by dataset = tostring(['properties.dataset'])
| order by total_cost desc
| take 10
```

## Reduction Strategies

### By Reduction Amount

| Target | Strategy |
|--------|----------|
| 10-20% | Filter DEBUG/TRACE logs |
| 20-40% | Sample low-value data, drop unused datasets |
| 40-60% | Aggregate metrics, reduce cardinality |
| 60%+ | Architecture changes, move to cheaper tiers |

### By Data Type

| Data Type | Optimization |
|-----------|--------------|
| **Logs** | Filter levels, sample, shorter retention |
| **Traces** | Sample (head-based or tail-based), reduce span attributes |
| **Metrics** | Pre-aggregate, reduce label cardinality |
| **Events** | Dedupe, batch, filter noise |

### Implementation Checklist

1. [ ] Identify top 5 datasets by volume
2. [ ] Check Work/GB for each
3. [ ] Investigate datasets with Work/GB < 100
4. [ ] Check for WoW spikes
5. [ ] Review log level distribution
6. [ ] Identify sampling opportunities
7. [ ] Set up monitors for regression detection
8. [ ] Create glidepath with weekly targets
9. [ ] Report progress weekly

## Monitoring the Reduction

Track progress with this query:

```apl
['axiom-audit']
| where action == 'usageCalculated'
| where _time > ago(30d)
| summarize daily_tb = sum(toreal(['properties.hourly_ingest_bytes'])) / 1000000000000 by bin(_time, 1d)
| order by _time asc
```

Plot as a time series with the contract limit as a reference line.
