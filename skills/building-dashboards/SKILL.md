---
name: building-dashboards
description: Designs and builds Axiom dashboards from intent, templates, or Splunk migrations. Covers APL patterns per chart type, layout composition, and best practices. Uses dashctl for deployment. Integrates with axiom-sre for exploration and spl-to-apl for migrations.
---

# Building Dashboards

You design dashboards that help humans make decisions quickly. Dashboards are products: audience, questions, and actions matter more than chart count.

## Philosophy

1. **Decisions first.** Every panel answers a question that leads to an action.
2. **Overview → drilldown → evidence.** Start broad, narrow on click/filter, end with raw logs.
3. **Rates and percentiles over averages.** Averages hide problems; p95/p99 expose them.
4. **Simple beats dense.** One question per panel. No chart junk.
5. **Validate with data.** Never guess fields—discover schema first.

---

## Entry Points

Choose your starting point:

| Starting from | Workflow |
|---------------|----------|
| **Vague description** | Intake → design blueprint → APL per panel → deploy |
| **Template** | Pick template → customize dataset/service/env → deploy |
| **Splunk dashboard** | Extract SPL → translate via spl-to-apl → map to chart types → deploy |
| **Exploration** | Use axiom-sre to discover schema/signals → productize into panels |

---

## Intake: What to Ask First

Before designing, clarify:

1. **Audience & decision**
   - Oncall triage? (fast refresh, error-focused)
   - Team health? (daily trends, SLO tracking)
   - Exec reporting? (weekly summaries, high-level)

2. **Scope**
   - Service, environment, region, cluster, endpoint?
   - Single service or cross-service view?

3. **Datasets**
   - Which Axiom datasets contain the data?
   - Run `getschema` to discover fields—never guess:
   ```apl
   ['dataset'] | where _time between (ago(1h) .. now()) | getschema
   ```

4. **Golden signals**
   - Traffic: requests/sec, events/min
   - Errors: error rate, 5xx count
   - Latency: p50, p95, p99 duration
   - Saturation: CPU, memory, queue depth, connections

5. **Drilldown dimensions**
   - What do users filter/group by? (service, route, status, pod, customer_id)

---

## Dashboard Blueprint

Use this 4-section structure as the default:

### 1. At-a-Glance (Statistic panels)
Single numbers that answer "is it broken right now?"
- Error rate (last 5m)
- p95 latency (last 5m)
- Request rate (last 5m)
- Active alerts (if applicable)

### 2. Trends (TimeSeries panels)
Time-based patterns that answer "what changed?"
- Traffic over time
- Error rate over time
- Latency percentiles over time
- Stacked by status/service for comparison

### 3. Breakdowns (Table/Pie panels)
Top-N analysis that answers "where should I look?"
- Top 10 failing routes
- Top 10 error messages
- Worst pods by error rate
- Request distribution by status

### 4. Evidence (LogStream + SmartFilter)
Raw events that answer "what exactly happened?"
- LogStream filtered to errors
- SmartFilter for service/env/route
- Key fields projected for readability

---

## Chart Types

**Note:** Dashboard queries inherit time from the UI picker—no explicit `_time` filter needed.

### Statistic
**When:** Single KPI, current value, threshold comparison.

```apl
['logs']
| where service == "api"
| summarize 
    total = count(),
    errors = countif(status >= 500)
| extend error_rate = round(100.0 * errors / total, 2)
| project error_rate
```

**Pitfalls:** Don't use for time series; ensure query returns single row.

### TimeSeries
**When:** Trends over time, before/after comparison, rate changes.

```apl
// Single metric - use bin_auto for automatic sizing
['logs']
| summarize ['req/min'] = count() by bin_auto(_time)

// Latency percentiles - use percentiles_array for proper overlay
['logs']
| summarize percentiles_array(duration_ms, 50, 95, 99) by bin_auto(_time)
```

**Best practices:**
- Use `bin_auto(_time)` instead of fixed `bin(_time, 1m)` — auto-adjusts to time window
- Use `percentiles_array()` instead of multiple `percentile()` calls — renders as one chart
- Too many series = unreadable; use `top N` or filter

### Table
**When:** Top-N lists, detailed breakdowns, exportable data.

```apl
['logs']
| where status >= 500
| summarize errors = count() by route, error_message
| top 10 by errors
| project route, error_message, errors
```

**Pitfalls:**
- Always use `top N` to prevent unbounded results
- Use `project` to control column order and names

### Pie
**When:** Share-of-total for LOW cardinality dimensions (≤6 slices).

```apl
['logs']
| summarize count() by status_class = case(
    status < 300, "2xx",
    status < 400, "3xx",
    status < 500, "4xx",
    "5xx"
  )
```

**Pitfalls:**
- Never use for high cardinality (routes, user IDs)
- Prefer tables for >6 categories
- Always aggregate to reduce slices

### LogStream
**When:** Raw event inspection, debugging, evidence gathering.

```apl
['logs']
| where service == "api" and status >= 500
| project-keep _time, trace_id, route, status, error_message, duration_ms
| take 100
```

**Pitfalls:**
- Always include `take N` (100-500 max)
- Use `project-keep` to show relevant fields only
- Filter aggressively—raw logs are expensive

### SmartFilter
**When:** Interactive filtering for the entire dashboard.

Configure with high-value filter fields:
- `service`, `environment`, `region`
- `route`, `status`, `customer_id`

No APL needed—SmartFilter uses field metadata.

### Note
**When:** Context, instructions, section headers.

Use markdown for:
- Dashboard purpose and audience
- Runbook links
- Section dividers

---

## APL Patterns

### Time Filtering in Dashboards vs Ad-hoc Queries

**Dashboard panel queries do NOT need explicit time filters.** The dashboard UI time picker automatically scopes all queries to the selected time window.

```apl
// DASHBOARD QUERY — no time filter needed
['logs']
| where service == "api"
| summarize count() by bin_auto(_time)
```

**Ad-hoc queries (Axiom Query tab, axiom-sre exploration) MUST have explicit time filters:**

```apl
// AD-HOC QUERY — always include time filter
['logs']
| where _time between (ago(1h) .. now())
| where service == "api"
| summarize count() by bin_auto(_time)
```

### Bin Size Selection

**Prefer `bin_auto(_time)`** — it automatically adjusts to the dashboard time window.

Manual bin sizes (only when auto doesn't fit your needs):

| Time window | Bin size |
|-------------|----------|
| 15m | 10s–30s |
| 1h | 1m |
| 6h | 5m |
| 24h | 15m–1h |
| 7d | 1h–6h |

### Cardinality Guardrails
Prevent query explosion:

```apl
// GOOD: bounded
| summarize count() by route | top 10 by count_

// BAD: unbounded high-cardinality grouping
| summarize count() by user_id  // millions of rows
```

### Field Escaping
Fields with dots need bracket notation:

```apl
| where ['kubernetes.pod.name'] == "frontend"
```

Fields with dots IN the name (not hierarchy) need escaping:

```apl
| where ['kubernetes.labels.app\\.kubernetes\\.io/name'] == "frontend"
```

### Golden Signal Queries

**Traffic:**
```apl
| summarize requests = count() by bin_auto(_time)
```

**Errors (as rate %):**
```apl
| summarize total = count(), errors = countif(status >= 500) by bin_auto(_time)
| extend error_rate = iff(total > 0, round(100.0 * errors / total, 2), 0.0)
| project _time, error_rate
```

**Latency (use percentiles_array for proper chart overlay):**
```apl
| summarize percentiles_array(duration_ms, 50, 95, 99) by bin_auto(_time)
```

---

## Layout Composition

### Grid Principles
- Dashboard width = 12 units
- Typical panel: w=3 (quarter), w=4 (third), w=6 (half), w=12 (full)
- Stats row: 4 panels × w=3, h=2
- TimeSeries row: 2 panels × w=6, h=4
- Tables: w=6 or w=12, h=4–6
- LogStream: w=12, h=6–8

### Section Layout Pattern

```
Row 0-1:  [Stat w=3] [Stat w=3] [Stat w=3] [Stat w=3]
Row 2-5:  [TimeSeries w=6, h=4] [TimeSeries w=6, h=4]
Row 6-9:  [Table w=6, h=4] [Pie w=6, h=4]
Row 10+:  [LogStream w=12, h=6]
```

### Naming Conventions
- Use question-style titles: "Error rate by route" not "Errors"
- Prefix with context if multi-service: "[API] Error rate"
- Include units: "Latency (ms)", "Traffic (req/s)"

---

## Setup

Run setup to install dashctl and check configuration:

```bash
scripts/setup
```

This will:
1. Check for bun (required - install via `curl -fsSL https://bun.sh/install | bash`)
2. Clone dashctl to `~/.local/share/dashctl`
3. Check for `~/.axiom.toml` (shared with axiom-sre)

### Configuration

Create `~/.axiom.toml` with your Axiom credentials:

```toml
[deployments.prod]
url = "https://api.axiom.co"
token = "xaat-your-token"
org_id = "your-org-id"

[deployments.staging]
url = "https://api.axiom.co"
token = "xaat-staging-token"
org_id = "your-org-id"
```

This config is shared with the axiom-sre skill.

---

## Deployment

### Using dashctl

```bash
# Get your user ID (required for owner field)
scripts/get-user-id prod

# List dashboards
scripts/dashctl prod getAll --summary

# Get dashboard JSON
scripts/dashctl prod get <id>

# Create from file
scripts/dashctl prod create ./dashboard.json

# Validate before creating
scripts/dashctl prod lint ./dashboard.json

# Clone existing dashboard
scripts/dashctl prod copy <id>

# Find and replace in queries (great for fixing dataset/field names)
scripts/dashctl prod findAndReplace <id> --find "old-dataset" --replace "new-dataset" --dry-run
scripts/dashctl prod findAndReplace <id> --find "old-dataset" --replace "new-dataset"  # apply

# Generate shareable dashboard link
scripts/dashboard-link prod <id>
```

### Workflow
1. Design dashboard plan (sections + panels)
2. Write APL for each panel
3. Test queries in Axiom UI or via axiom-sre scripts
4. Build dashboard JSON (from template or manually)
5. `dashctl lint` to validate
6. `dashctl create` to deploy
7. Iterate based on feedback

---

## Sibling Skill Integration

### With spl-to-apl (Splunk Migration)

When user provides SPL queries or Splunk dashboard export:

1. **Translate SPL → APL** using spl-to-apl skill
2. **Map panel types:**
   - Splunk `timechart` → TimeSeries
   - Splunk `stats` with single row → Statistic
   - Splunk `stats`/`top` with multiple rows → Table
   - Splunk `chart` with categorical → Pie (if low cardinality)
3. **Add time filters** (SPL time picker → explicit `where _time between`)
4. **Adjust binning** to match Axiom visualization

See `reference/splunk-migration.md` for detailed mapping.

### With axiom-sre (Exploration)

When dataset or fields are unknown:

1. **Discover schema:**
   ```apl
   ['dataset'] | where _time between (ago(1h) .. now()) | getschema
   ```

2. **Explore baselines** using axiom-sre golden signal patterns

3. **Identify drilldown dimensions** by sampling:
   ```apl
   ['dataset'] | where _time between (ago(1h) .. now()) | distinct service, route, status | take 100
   ```

4. **Productize** validated queries into dashboard panels

---

## Templates

Pre-built dashboard templates in `reference/templates/`:

| Template | Use case |
|----------|----------|
| `service-overview.json` | Single service oncall dashboard |
| `api-health.json` | HTTP API with traffic/errors/latency |
| `blank.json` | Minimal skeleton for custom dashboards |

### Template Placeholders

Templates use these placeholders:

| Placeholder | Description | How to get |
|-------------|-------------|------------|
| `{{owner_id}}` | Your Axiom user ID (UUID) | Run `scripts/get-user-id prod` |
| `{{service}}` | Service name for filtering | Your service identifier |
| `{{dataset}}` | Axiom dataset name | Check available datasets in Axiom UI |

### Template Field Assumptions

**⚠️ Templates assume specific field names.** You MUST adapt queries to match your dataset schema.

Before using a template:
1. Discover your schema: `['your-dataset'] | getschema`
2. Note which fields differ from template assumptions
3. After creating, use `findAndReplace` to fix field names

| Template field | Description | Example alternatives |
|----------------|-------------|---------------------|
| `service` | Service name | `app`, `name`, `component`, `['kubernetes.labels.app']` |
| `status` | HTTP status code (numeric) | `status_code`, `http.status_code` |
| `route` | Request path | `uri`, `domain`, `path`, `http.target` |
| `duration_ms` | Request duration in ms | `req_duration_ms`, `latency_ms` |
| `error_message` | Error description | `message`, `error`, `exception.message` |
| `trace_id` | Trace identifier | `monitor_id`, `traceId`, `['trace.id']` |

**Fix field names after creation:**
```bash
scripts/dashctl prod findAndReplace <id> --find "duration_ms" --replace "latency_ms"
scripts/dashctl prod findAndReplace <id> --find "route" --replace "uri"
```

### Using Templates

```bash
# 1. Get your user ID
USER_ID=$(scripts/get-user-id prod)

# 2. Generate from template
scripts/dashboard-from-template service-overview "my-service" "$USER_ID" "my-dataset" ./dashboard.json

# 3. Validate
scripts/dashboard-validate ./dashboard.json

# 4. Deploy
scripts/dashctl prod create ./dashboard.json

# 5. Fix field names if needed
DASHBOARD_ID=<id-from-create>
scripts/dashctl prod findAndReplace $DASHBOARD_ID --find "duration_ms" --replace "latency_ms"

# 6. Get link to verify
scripts/dashboard-link prod $DASHBOARD_ID
```

---

## Common Pitfalls

| Problem | Cause | Solution |
|---------|-------|----------|
| "unable to find dataset" errors | Dataset name doesn't exist in your org | Check available datasets with `axiom-api prod GET /v1/datasets` |
| "creating dashboards for other users" 403 | Owner ID doesn't match your token | Use `scripts/get-user-id prod` to get your UUID |
| All panels show errors | Field names don't match your schema | Discover schema first, then use `findAndReplace` to fix |
| Dashboard shows no data | Service filter too restrictive | Remove or adjust `where service == 'x'` filters |
| Queries time out | Missing time filter or too broad | Always include `where _time between (ago(1h) .. now())` first |

---

## Reference

- `reference/design-playbook.md` — Decision-first design, anti-patterns
- `reference/chart-cookbook.md` — Detailed patterns per chart type
- `reference/layout-recipes.md` — Grid layouts and section blueprints
- `reference/splunk-migration.md` — Splunk panel → Axiom mapping
- `reference/templates/` — Ready-to-use dashboard JSON files

For APL syntax: https://axiom.co/docs/apl/introduction
For dashctl: https://github.com/axiomhq/dashctl
