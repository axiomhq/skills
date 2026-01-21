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

**dashctl support:** TimeSeries, Statistic, Table, Pie, LogStream, Note, MonitorList are fully validated. Heatmap, ScatterPlot, FilterBar work but trigger linter warnings (use `--no-lint` if needed).

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

### Heatmap
**When:** Distribution visualization, latency patterns, density analysis.

```apl
['logs']
| summarize histogram(duration_ms, 15) by bin_auto(_time)
```

**Best for:** Latency distributions, response time patterns, identifying outliers.

### Scatter Plot
**When:** Correlation between two metrics, identifying patterns.

```apl
['logs']
| summarize avg(duration_ms), avg(resp_size_bytes) by route
```

**Best for:** Response size vs latency correlation, resource usage patterns.

### SmartFilter (Filter Bar)
**When:** Interactive filtering for the entire dashboard.

SmartFilter is a **chart type** that creates dropdown/search filters. It requires TWO parts:
1. A `SmartFilter` chart in the `charts` array with filter definitions
2. `declare query_parameters` in each panel query that should respond to filters

**SmartFilter chart JSON structure:**
```json
{
  "id": "country-filter",
  "name": "Filters",
  "type": "SmartFilter",
  "query": {"apl": ""},
  "filters": [
    {
      "id": "country_filter",
      "name": "Country",
      "type": "select",
      "selectType": "apl",
      "active": true,
      "apl": {
        "apl": "['logs'] | distinct ['geo.country'] | project key=['geo.country'], value=['geo.country'] | sort by key asc",
        "queryOptions": {"quickRange": "1h"}
      },
      "options": [
        {"key": "All", "value": "", "default": true}
      ]
    }
  ]
}
```

**Filter types:**
- `"selectType": "apl"` — Dynamic dropdown populated by APL query (requires `apl.apl` and `apl.queryOptions`)
- `"selectType": "list"` — Static dropdown with predefined `options` array only

**Dynamic APL filter requirements:**
- `apl.apl`: Query returning `key` and `value` columns
- `apl.queryOptions.quickRange`: Time range for the query (e.g., `"1h"`, `"7d"`)
- `options`: Must include at least `[{"key": "All", "value": "", "default": true}]`

**Static list example:**
```json
{
  "id": "status_filter",
  "name": "Status",
  "type": "select",
  "selectType": "list",
  "active": true,
  "options": [
    {"key": "All", "value": "", "default": true},
    {"key": "2xx", "value": "2"},
    {"key": "4xx", "value": "4"},
    {"key": "5xx", "value": "5"}
  ]
}
```

**Layout:** Place SmartFilter at y=0, full width (w=12, h=1), shift other panels down.

**Panel queries must declare parameters:**
```apl
declare query_parameters (country_filter:string = "");
['logs']
| where isempty(country_filter) or ['geo.country'] == country_filter
| summarize count() by bin_auto(_time)
```

**Filter query for dynamic dropdowns:**
```apl
['logs']
| distinct ['geo.country']
| project key=['geo.country'], value=['geo.country']
| sort by key asc
```

**Dependent/cascading filters:**

Filters can depend on other filters by declaring their parameters in the APL query:

```json
{
  "id": "city_filter",
  "name": "City",
  "type": "select",
  "selectType": "apl",
  "active": true,
  "apl": {
    "apl": "declare query_parameters (country_filter:string=\"\");\n['logs']\n| where ['geo.country'] == country_filter\n| distinct ['geo.city']\n| project key=['geo.city'], value=['geo.city']",
    "queryOptions": {"quickRange": "1h"}
  },
  "options": [{"key": "All", "value": "", "default": true}]
}
```

The city dropdown re-queries when country_filter changes, showing only cities in the selected country.

**Search filter type:**

Use `"type": "search"` for free-text input instead of dropdown:

```json
{
  "id": "trace_id",
  "name": "Trace ID",
  "type": "search",
  "selectType": "list",
  "active": true,
  "options": [{"key": "All", "value": "", "default": true}]
}
```

**Best practices:**
- Filter `id` must match the parameter name in `declare query_parameters`
- Use `isempty(filter)` check so "All" option works (empty string = no filter)
- One SmartFilter chart can contain multiple filters
- Place at top of dashboard (y=0) for visibility
- For cascading filters, order matters: parent filter should come before dependent filters

### Monitor List
**When:** Display monitor status on operational dashboards.

No APL needed—select monitors from the UI. Shows:
- Monitor status (normal/triggered/off)
- Run history (green/red squares)
- Dataset, type, notifiers

### Note
**When:** Context, instructions, section headers.

Use GitHub Flavored Markdown for:
- Dashboard purpose and audience
- Runbook links
- Section dividers
- On-call instructions

---

## Chart Configuration

Charts support JSON configuration options beyond the query. These are set at the chart level.

### Common Options (All Charts)

```json
{
  "overrideDashboardTimeRange": false,
  "overrideDashboardCompareAgainst": false,
  "hideHeader": false
}
```

### Statistic Options

```json
{
  "type": "Statistic",
  "colorScheme": "Blue",
  "customUnits": "req/s",
  "unit": "Auto",
  "decimals": 2,
  "showChart": true,
  "hideValue": false,
  "errorThreshold": "Above",
  "errorThresholdValue": "100",
  "warningThreshold": "Above",
  "warningThresholdValue": "50",
  "invertTheme": false
}
```

| Option | Values | Description |
|--------|--------|-------------|
| `colorScheme` | Blue, Orange, Red, Purple, Teal, Yellow, Green, Pink, Grey, Brown | Color theme |
| `customUnits` | string | Unit suffix (e.g., "ms", "req/s", "trolls") |
| `unit` | Auto, Abbreviated, Byte, KB, MB, GB, TimeMS, TimeSec, Percent, etc. | Value formatting |
| `decimals` | number | Decimal places |
| `showChart` | boolean | Show sparkline |
| `hideValue` | boolean | Hide the main value |
| `errorThreshold` | Above, AboveOrEqual, Below, BelowOrEqual, AboveOrBelow | Error condition |
| `errorThresholdValue` | string | Error threshold value |
| `warningThreshold` | same as error | Warning condition |
| `warningThresholdValue` | string | Warning threshold value |
| `invertTheme` | boolean | Invert colors |

**Available units:**
- Numbers: `Auto`, `Abbreviated`
- Data: `Byte`, `Kilobyte`, `Megabyte`, `Gigabyte`
- Data rates: `BitsSec`, `BytesSec`, `KilobitsSec`, `MegabitsSec`, etc.
- Time: `TimeNS`, `TimeUS`, `TimeMS`, `TimeSec`, `TimeMin`, `TimeHour`, `TimeDay`
- Percent: `Percent` (0-1), `Percent100` (0-100)
- Currency: `CurrencyUSD`, `CurrencyEUR`, `CurrencyGBP`, etc.

### TimeSeries Options

TimeSeries chart options are stored in `query.queryOptions.aggChartOpts` as a JSON string:

```json
{
  "type": "TimeSeries",
  "query": {
    "apl": "['logs'] | summarize count() by bin_auto(_time)",
    "queryOptions": {
      "aggChartOpts": "{\"{\\\"alias\\\":\\\"count_\\\",\\\"op\\\":\\\"count\\\"}\":{\"variant\":\"area\",\"scaleDistr\":\"log\",\"displayNull\":\"span\"}}"
    }
  }
}
```

**Per-series options (inside aggChartOpts):**

| Option | Values | Description |
|--------|--------|-------------|
| `variant` | `line`, `area`, `bars` | Chart display mode |
| `scaleDistr` | `linear`, `log` | Y-axis scale |
| `displayNull` | `auto`, `null`, `span`, `zero` | Missing data handling |

**displayNull values:**
- `auto`: Best representation based on chart type
- `null`: Skip/ignore missing values (gaps in chart)
- `span`: Join adjacent values across gaps
- `zero`: Fill missing with zeros

### LogStream / Table Options

```json
{
  "type": "LogStream",
  "tableSettings": {
    "columns": [
      {"name": "_time", "width": 150},
      {"name": "message", "width": 400}
    ],
    "settings": {
      "fontSize": "12px",
      "highlightSeverity": true,
      "showRaw": true,
      "showEvent": true,
      "showTimestamp": true,
      "wrapLines": true,
      "hideNulls": true
    }
  }
}
```

| Option | Type | Description |
|--------|------|-------------|
| `columns` | array | Column order and widths |
| `fontSize` | string | Font size (e.g., "12px") |
| `highlightSeverity` | boolean | Color-code by log level |
| `showRaw` | boolean | Show raw JSON |
| `showTimestamp` | boolean | Show timestamp column |
| `wrapLines` | boolean | Wrap long lines |
| `hideNulls` | boolean | Hide null values |

### Pie Options

```json
{
  "type": "Pie",
  "hideHeader": false
}
```

### Note Options

```json
{
  "type": "Note",
  "text": "## Section Header\n\nMarkdown content here.",
  "variant": "default"
}
```

### Annotations

Display deployment markers, incidents, or custom events on charts.

Annotations are managed via the Axiom API `/v2/annotations` endpoint:

```bash
curl -X 'POST' 'https://api.axiom.co/v2/annotations' \
  -H 'Authorization: Bearer $AXIOM_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "time": "2024-03-18T08:39:28.382Z",
    "type": "deploy",
    "datasets": ["http-logs"],
    "title": "Production deployment",
    "description": "Deploy v2.1.0",
    "url": "https://github.com/org/repo/releases/tag/v2.1.0"
  }'
```

Or use GitHub Actions:
```yaml
- name: Add annotation
  uses: axiomhq/annotation-action@v0.1.0
  with:
    axiomToken: ${{ secrets.AXIOM_TOKEN }}
    datasets: http-logs
    type: "deploy"
    title: "Production deployment"
```

### Comparison Period (Against)
Compare current time range against a historical period:
- `-1D`: Same time yesterday
- `-1W`: Same time last week
- Custom offset

Use in dashboard URL: `?t_qr=24h&t_against=-1d`

### Custom Time Range per Panel
Individual panels can override the dashboard time range:
- Set `overrideDashboardTimeRange: true` in chart config
- Via UI: Edit panel → Time range → Custom

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

## Dashboard Settings

### Refresh Rate
Dashboard auto-refreshes at configured interval. Options: 15s, 30s, 1m, 5m, etc.

**⚠️ Query cost warning:** Short refresh (15s) + long time range (90d) = expensive queries running constantly.

Recommendations:
| Use case | Refresh rate |
|----------|-------------|
| Oncall/real-time | 15s–30s |
| Team health | 1m–5m |
| Executive/weekly | 5m–15m |

### Sharing
- **Just Me**: Private, only you can access
- **Group**: Specific team/group in your org
- **Everyone**: All users in your Axiom org

Data visibility is still governed by dataset permissions—users only see data from datasets they can access.

### URL Time Range Parameters
Share dashboards with specific time ranges:

```
# Quick range
?t_qr=24h
?t_qr=7d

# Custom range (ISO 8601)
?t_ts=2024-01-01T00:00:00Z&t_te=2024-01-07T23:59:59Z

# With comparison period
?t_qr=24h&t_against=-1d
```

---

## Setup

Run setup to check requirements:

```bash
scripts/setup
```

This will:
1. Check for required tools (curl, jq)
2. Check for `~/.axiom.toml` (shared with axiom-sre)
3. Make scripts executable

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

### Dashboard API Scripts

```bash
# Get your user ID (required for owner field)
scripts/get-user-id prod

# List all dashboards
scripts/dashboard-list prod

# Get dashboard JSON
scripts/dashboard-get prod <id>

# Validate before creating
scripts/dashboard-validate ./dashboard.json

# Create from file
scripts/dashboard-create prod ./dashboard.json

# Clone existing dashboard
scripts/dashboard-copy prod <id>

# Get shareable link
scripts/dashboard-link prod <id>

# Update (requires version from dashboard-get)
scripts/dashboard-get prod <id> > dashboard.json
# ... edit dashboard.json ...
scripts/dashboard-update prod <id> dashboard.json

# Delete (with confirmation)
scripts/dashboard-delete prod <id>
```

### Low-level API Access

```bash
# Direct API calls via axiom-api script
scripts/axiom-api prod GET /internal/dashboards
scripts/axiom-api prod GET /internal/dashboards/<id>
scripts/axiom-api prod POST /internal/dashboards '{"name":"Test",...}'
```

### Workflow

**⚠️ CRITICAL: Always validate queries BEFORE deploying.** Never skip step 4.

1. Design dashboard plan (sections + panels)
2. Write APL for each panel
3. Build dashboard JSON (from template or manually)
4. **Validate queries execute successfully** using axiom-sre:
   ```bash
   # Test each query against the actual dataset
   # Load axiom-sre skill and run queries with explicit time filter
   ['your-dataset'] | where _time > ago(1h) | ... your query ...
   ```
5. `dashboard-validate` to check JSON structure
6. `dashboard-create` to deploy
7. Verify dashboard renders correctly in browser
8. Iterate based on feedback

### Query Validation Checklist

Before creating any dashboard, verify:

- [ ] Dataset exists: `['dataset-name'] | take 1`
- [ ] Required fields exist: `['dataset-name'] | getschema`
- [ ] Each panel query returns data (not errors)
- [ ] Filters match actual field values (e.g., `service == 'x'` uses real service names)

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
3. Edit the JSON or use sed to fix field names before creating

| Template field | Description | Example alternatives |
|----------------|-------------|---------------------|
| `service` | Service name | `app`, `name`, `component`, `['kubernetes.labels.app']` |
| `status` | HTTP status code (numeric) | `status_code`, `http.status_code` |
| `route` | Request path | `uri`, `domain`, `path`, `http.target` |
| `duration_ms` | Request duration in ms | `req_duration_ms`, `latency_ms` |
| `error_message` | Error description | `message`, `error`, `exception.message` |
| `trace_id` | Trace identifier | `monitor_id`, `traceId`, `['trace.id']` |

**Fix field names before or after creation:**
```bash
# Before creating - edit the JSON
sed -i '' 's/duration_ms/latency_ms/g' dashboard.json
sed -i '' 's/route/uri/g' dashboard.json

# After creating - get, edit, update
scripts/dashboard-get prod <id> > dashboard.json
sed -i '' 's/duration_ms/latency_ms/g' dashboard.json
scripts/dashboard-update prod <id> dashboard.json
```

### Using Templates

```bash
# 1. Get your user ID
USER_ID=$(scripts/get-user-id prod)

# 2. Generate from template
scripts/dashboard-from-template service-overview "my-service" "$USER_ID" "my-dataset" ./dashboard.json

# 3. Validate
scripts/dashboard-validate ./dashboard.json

# 4. Fix field names if needed (before creating)
sed -i '' 's/duration_ms/latency_ms/g' ./dashboard.json

# 5. Deploy
DASHBOARD_ID=$(scripts/dashboard-create prod ./dashboard.json)

# 6. Get link to verify
scripts/dashboard-link prod $DASHBOARD_ID
```

---

## Common Pitfalls

| Problem | Cause | Solution |
|---------|-------|----------|
| "unable to find dataset" errors | Dataset name doesn't exist in your org | Check available datasets in Axiom UI |
| "creating dashboards for other users" 403 | Owner ID doesn't match your token | Use `scripts/get-user-id prod` to get your UUID |
| All panels show errors | Field names don't match your schema | Discover schema first, use sed to fix field names |
| Dashboard shows no data | Service filter too restrictive | Remove or adjust `where service == 'x'` filters |
| Queries time out | Missing time filter or too broad | Dashboard inherits time from picker; ad-hoc queries need explicit time filter |

---

## Reference

- `reference/design-playbook.md` — Decision-first design, anti-patterns
- `reference/chart-cookbook.md` — Detailed patterns per chart type
- `reference/layout-recipes.md` — Grid layouts and section blueprints
- `reference/splunk-migration.md` — Splunk panel → Axiom mapping
- `reference/templates/` — Ready-to-use dashboard JSON files

For APL syntax: https://axiom.co/docs/apl/introduction
