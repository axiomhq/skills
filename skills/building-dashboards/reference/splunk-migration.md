# Splunk Dashboard Migration

Guide for converting Splunk dashboards to Axiom dashboards.

---

## Migration Workflow

1. **Export Splunk dashboard** (XML or JSON)
2. **Inventory panels** — list each panel with its SPL query and visualization type
3. **Translate SPL → APL** using the `spl-to-apl` skill
4. **Map visualization types** (see table below)
5. **Test queries** with explicit time filters in Query tab (dashboards inherit time from UI picker)
6. **Adjust binning** for Axiom visualization
7. **Build Axiom dashboard** using templates (remove time filters from panel queries)
8. **Validate and deploy** with dashctl

---

## Visualization Type Mapping

| Splunk Visualization | Axiom Chart Type | Notes |
|---------------------|------------------|-------|
| Single Value | Statistic | Direct mapping |
| Line Chart | TimeSeries | Ensure `bin(_time, ...)` |
| Area Chart | TimeSeries | Same as line |
| Column Chart | TimeSeries | Axiom renders as bars |
| Bar Chart (horizontal) | Table | No horizontal bar; use table |
| Pie Chart | Pie | Limit to ≤6 categories |
| Table | Table | Direct mapping |
| Events List | LogStream | Add `take N` and `project-keep` |
| Choropleth Map | Table | No map support; use table |
| Scatter Plot | Table | No scatter; use table with dimensions |

---

## Panel Translation Examples

### Single Value → Statistic

**Splunk:**
```spl
index=web status>=500
| stats count as errors
```

**Axiom:**
```apl
['web-logs']
| where _time between (ago(15m) .. now())
| where status >= 500
| summarize errors = count()
```

### Timechart → TimeSeries

**Splunk:**
```spl
index=web
| timechart span=5m count by status
```

**Axiom:**
```apl
['web-logs']
| where _time between (ago(1h) .. now())
| summarize count() by bin(_time, 5m), status
```

### Stats Table → Table

**Splunk:**
```spl
index=web status>=500
| stats count by uri
| sort - count
| head 10
```

**Axiom:**
```apl
['web-logs']
| where _time between (ago(1h) .. now())
| where status >= 500
| summarize count = count() by uri
| top 10 by count
| project URI = uri, Errors = count
```

### Top Command → Table

**Splunk:**
```spl
index=web
| top limit=10 user_agent
```

**Axiom:**
```apl
['web-logs']
| where _time between (ago(1h) .. now())
| summarize count() by user_agent
| top 10 by count_
| project "User Agent" = user_agent, Count = count_
```

### Events Search → LogStream

**Splunk:**
```spl
index=web status>=500
| table _time, uri, status, error_message
```

**Axiom:**
```apl
['web-logs']
| where _time between (ago(15m) .. now())
| where status >= 500
| project-keep _time, uri, status, error_message
| order by _time desc
| take 100
```

### Chart with Eval → TimeSeries

**Splunk:**
```spl
index=web
| timechart span=5m count as total, count(eval(status>=500)) as errors
| eval error_rate = round(errors/total*100, 2)
```

**Axiom:**
```apl
['web-logs']
| where _time between (ago(1h) .. now())
| summarize 
    total = count(),
    errors = countif(status >= 500)
  by bin(_time, 5m)
| extend error_rate = round(100.0 * errors / total, 2)
| project _time, error_rate
```

---

## Time Range Translation

Splunk dashboards use time pickers. Axiom dashboards also have a time picker that automatically scopes all queries—**panel queries don't need explicit time filters**.

For **ad-hoc testing** in the Query tab, use these time filters:

| Splunk Time Picker | Axiom APL (for Query tab testing) |
|-------------------|-----------------------------------|
| Last 15 minutes | `where _time between (ago(15m) .. now())` |
| Last 60 minutes | `where _time between (ago(1h) .. now())` |
| Last 4 hours | `where _time between (ago(4h) .. now())` |
| Last 24 hours | `where _time between (ago(24h) .. now())` |
| Last 7 days | `where _time between (ago(7d) .. now())` |
| Today | `where _time between (startofday(now()) .. now())` |
| Yesterday | `where _time between (startofday(ago(1d)) .. startofday(now()))` |

**Remember:** Remove time filters when placing queries in dashboard panels.

---

## Binning Adjustment

Splunk `timechart span=` maps to Axiom `bin(_time, ...)`.

| Splunk | Axiom |
|--------|-------|
| `span=1m` | `bin(_time, 1m)` |
| `span=5m` | `bin(_time, 5m)` |
| `span=1h` | `bin(_time, 1h)` |
| `span=1d` | `bin(_time, 1d)` |

Or use `bin_auto(_time)` for automatic sizing based on time range.

---

## Field Name Mapping

Splunk and Axiom may have different field names for the same data.

| Concept | Splunk (common) | Axiom (common) |
|---------|-----------------|----------------|
| Timestamp | `_time` | `_time` |
| Raw event | `_raw` | `_raw` or structured fields |
| Source | `source` | `_source` or custom |
| Host | `host` | `host` or `['kubernetes.node.name']` |
| Index | `index` | N/A (use dataset) |

**Tip:** Run `getschema` on your Axiom dataset to discover actual field names:
```apl
['your-dataset'] | where _time between (ago(1h) .. now()) | getschema
```

---

## Features Without Direct Equivalents

| Splunk Feature | Axiom Approach |
|----------------|----------------|
| `transaction` | Use `summarize` with `make_list()` grouped by session/trace |
| `streamstats` | No direct equivalent; approximate with window functions |
| `eventstats` | Use subquery + join |
| Drilldown actions | Use SmartFilter for interactive filtering |
| Trellis layout | Create separate panels per dimension |
| Real-time search | Use short time window + fast refresh |

---

## Common Migration Pitfalls

### Missing Time Filter
**Problem:** Splunk uses time picker; APL query has no time filter.
**Fix:** Always add `where _time between (...)` first.

### Unbounded Results
**Problem:** Splunk implicitly limits; Axiom may return all rows.
**Fix:** Add `| top N by ...` or `| take N` for tables/logs.

### Case Sensitivity
**Problem:** Splunk search is case-insensitive by default.
**Fix:** Use `has` (case-insensitive) or `tolower()` for matching.

### Field Escaping
**Problem:** Splunk uses bare field names; Axiom needs brackets for dots.
**Fix:** `field.name` → `['field.name']`

### Different Aggregation Names
**Problem:** Function names differ between SPL and APL.
**Fix:** Consult `spl-to-apl` skill for complete mapping.

---

## Migration Checklist

- [ ] Inventory all panels from Splunk dashboard
- [ ] Map each panel's visualization type
- [ ] Translate SPL queries using spl-to-apl
- [ ] Add explicit time filters to all queries
- [ ] Verify field names with getschema
- [ ] Add `top N` or `take N` where needed
- [ ] Test each query individually in Axiom
- [ ] Build dashboard JSON with appropriate layout
- [ ] Validate with `dashctl lint`
- [ ] Deploy with `dashctl create`
- [ ] Compare visually to original Splunk dashboard
