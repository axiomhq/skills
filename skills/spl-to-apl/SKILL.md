---
name: spl-to-apl
description: Translates Splunk SPL queries to Axiom APL. Provides command mappings, function equivalents, and syntax transformations. Use when migrating from Splunk, converting SPL queries, or learning APL equivalents of SPL patterns.
---

# SPL to APL Translator

Expert translator from Splunk Processing Language (SPL) to Axiom Processing Language (APL).

## Translation Principles

1. **Structure differs:** SPL uses `index=... | command | command`. APL uses `['dataset'] | operator | operator`
2. **Time is explicit in APL:** SPL time pickers don't translate — add `where _time between (...)` based on the intended range
3. **Field names:** SPL uses bare `field`, APL uses `field` or `['field.with.dots']`
4. **Pipe semantics are similar:** Both flow data left-to-right through transformations
5. **Verify before deploying:** Test translated queries; some SPL behaviors have no direct APL equivalent

---

## Command Mappings

### Core Commands

| SPL | APL | Notes |
|-----|-----|-------|
| `search index=...` | `['dataset']` | Dataset replaces index |
| `search field=value` | `where field == "value"` | Explicit where clause |
| `search *error*` | `search "error"` or `where msg has "error"` | `has` is faster |
| `where` | `where` | Same semantics |
| `stats` | `summarize` | Different syntax for aggregations |
| `eval` | `extend` | Create/modify fields |
| `table` | `project` | Select columns |
| `fields` | `project` or `project-keep` | Select columns |
| `fields -` | `project-away` | Remove columns |
| `rename` | `project-rename new = old` | Single operator |
| `sort` | `order by` or `sort by` | Similar |
| `head N` | `take N` or `limit N` | Get first N rows |
| `tail N` | `take N` after `order by ... asc` | Reverse sort, then take |
| `top N field` | `summarize count() by field \| top N by count_` | Two-step |
| `rare N field` | `summarize count() by field \| top N by count_ asc` | Ascending order |
| `dedup field` | `summarize arg_max(_time, *) by field` | Keep latest row per field value |
| `rex` | `parse` or `extract()` | Regex extraction |
| `regex` | `where ... matches regex` | Filter by regex |
| `join` | `join` | **Preview feature** - limited to 50k rows, inner/innerunique/leftouter only |
| `append` | `union` | Combine datasets |
| `mvexpand` | `mv-expand` | Expand arrays |
| `spath` | Access via `['field']['path']` or `parse_json()` | JSON access |
| `lookup` | `lookup` | Similar |
| `fillnull` | `extend field = coalesce(field, default)` | Use coalesce |
| `transaction` | No direct equivalent | Use `summarize` with `make_list()` |
| `bucket` | `bin()` | Time bucketing |
| `timechart` | `summarize ... by bin(_time, span)` | Manual binning |
| `chart` | `summarize ... by field1, field2` | Group by multiple |
| `eventstats` | `join kind=leftouter (subquery) on keys` | Compute aggregates in subquery, then join |
| `streamstats` | No direct equivalent | Use `summarize` with binning for approximations |

---

## Stats → Summarize Translation

### Basic Pattern

```
# SPL
| stats count by status

# APL  
| summarize count() by status
```

### Aggregation Functions

| SPL | APL | Notes |
|-----|-----|-------|
| `count` | `count()` | Parentheses required |
| `count(field)` | `countif(isnotnull(field))` | Count non-null |
| `dc(field)` | `dcount(field)` | Distinct count |
| `sum(field)` | `sum(field)` | Same |
| `avg(field)` | `avg(field)` | Same |
| `min(field)` | `min(field)` | Same |
| `max(field)` | `max(field)` | Same |
| `median(field)` | `percentile(field, 50)` | Use percentile |
| `stdev(field)` | `stdev(field)` | Same |
| `var(field)` | `variance(field)` | Different name |
| `range(field)` | `max(field) - min(field)` | Calculate manually |
| `first(field)` | `arg_min(_time, field)` | First value by time |
| `last(field)` | `arg_max(_time, field)` | Last by time |
| `list(field)` | `make_list(field)` | Collect to array |
| `values(field)` | `make_set(field)` | Unique values as array |
| `perc95(field)` | `percentile(field, 95)` | Percentile syntax |
| `p95(field)` | `percentile(field, 95)` | Same |
| `percentile(field, 50, 95, 99)` | `percentiles_array(field, 50, 95, 99)` | Multiple percentiles |
| `earliest(field)` | `min(field)` or `arg_min(_time, *)` | Earliest value/row |
| `latest(field)` | `max(field)` or `arg_max(_time, *)` | Latest value/row |
| `earliest_time` | `min(_time)` | Earliest timestamp |
| `latest_time` | `max(_time)` | Latest timestamp |

### Complex Stats Examples

```
# SPL: Multiple aggregations
| stats count, avg(duration), max(bytes) by host

# APL
| summarize count(), avg(duration), max(bytes) by host
```

```
# SPL: Conditional count
| stats count(eval(status>=500)) as errors by host

# APL
| summarize errors = countif(status >= 500) by host
```

```
# SPL: Named aggregations
| stats count as total, dc(user) as unique_users by app

# APL
| summarize total = count(), unique_users = dcount(user) by app
```

---

## Eval → Extend Translation

### Basic Pattern

```
# SPL
| eval new_field = old_field * 2

# APL
| extend new_field = old_field * 2
```

### Function Mappings

| SPL | APL | Notes |
|-----|-----|-------|
| `if(cond, true, false)` | `iff(cond, true, false)` | Double 'f' |
| `case(c1,v1, c2,v2, ...)` | `case(c1, v1, c2, v2, ..., default)` | Requires default |
| `coalesce(a, b, c)` | `coalesce(a, b, c)` | Same |
| `null()` | `dynamic(null)` or typed: `string(null)` | Typed null literals |
| `isnull(x)` | `isnull(x)` | Same |
| `isnotnull(x)` | `isnotnull(x)` | Same |
| `len(str)` | `strlen(str)` | Different name |
| `lower(str)` | `tolower(str)` | Different name |
| `upper(str)` | `toupper(str)` | Different name |
| `substr(str, start, len)` | `substring(str, start, len)` | 0-indexed in APL |
| `replace(str, old, new)` | `replace_string(str, old, new)` | Different name |
| `split(str, delim)` | `split(str, delim)` | Same |
| `mvjoin(mv, delim)` | `strcat_array(arr, delim)` | Join array |
| `mvcount(mv)` | `array_length(arr)` | Array length |
| `mvindex(mv, idx)` | `arr[idx]` | Array indexing |
| `strftime(time, fmt)` | Use `datetime_part()` + `strcat()` | No direct equivalent (build manually) |
| `strptime(str, fmt)` | `todatetime(str)` | Parse datetime |
| `now()` | `now()` | Same |
| `relative_time(time, mod)` | Use `datetime_add()` | Manual calculation |
| `tonumber(str)` | `toint(str)` / `tolong(str)` / `toreal(str)` | Explicit types |
| `tostring(val)` | `tostring(val)` | Same |
| `urldecode(str)` | `url_decode(str)` | Different name |
| `match(str, regex)` | `str matches regex "pattern"` | Operator not function |
| `cidrmatch(cidr, ip)` | `ipv4_is_in_range(ip, cidr)` | Args reversed |
| `abs(x)` | `abs(x)` | Same |
| `ceil(x)` / `ceiling(x)` | `ceiling(x)` | Different name |
| `floor(x)` | `floor(x)` | Same |
| `round(x, n)` | `round(x, n)` | Same |
| `log(x, base)` | `log(x) / log(base)` or `log10(x)` | Manual base |
| `pow(x, y)` | `pow(x, y)` | Same |
| `sqrt(x)` | `sqrt(x)` | Same |
| `random()` | `rand()` | Different name |
| `md5(str)` | `hash_md5(str)` | Different name |
| `sha1(str)` | `hash_sha1(str)` | Different name |
| `sha256(str)` | `hash_sha256(str)` | Different name |

### Conditional Logic Examples

```
# SPL: if statement
| eval severity = if(status >= 500, "error", "ok")

# APL
| extend severity = iff(status >= 500, "error", "ok")
```

```
# SPL: case statement
| eval level = case(
    status >= 500, "error",
    status >= 400, "warning",
    1==1, "ok"
  )

# APL  
| extend level = case(
    status >= 500, "error",
    status >= 400, "warning",
    "ok"
  )
```

---

## Time Handling

### Time Range Translation

```
# SPL (time picker: Last 24 hours)
index=logs

# APL (explicit time range required)
['logs'] | where _time between (ago(24h) .. now())
```

### Timechart Translation

```
# SPL
| timechart span=5m count by status

# APL
| summarize count() by bin(_time, 5m), status
```

```
# SPL: Timechart with aggregation
| timechart span=1h avg(duration) as avg_duration

# APL
| summarize avg_duration = avg(duration) by bin(_time, 1h)
```

### Time Functions

| SPL | APL |
|-----|-----|
| `now()` | `now()` |
| `relative_time(now(), "-1d@d")` | `startofday(ago(1d))` |
| `strftime(_time, "%Y-%m-%d")` | Use `tostring()` or `datetime_part()` |
| `earliest=-1h` | `where _time >= ago(1h)` |
| `latest=now` | `where _time <= now()` |
| `_time` | `_time` |

### Time Literals

| SPL | APL |
|-----|-----|
| `-1h` / `earliest=-1h` | `ago(1h)` |
| `-7d` | `ago(7d)` |
| `@d` (start of day) | `startofday(now())` |
| `@w` (start of week) | `startofweek(now())` |

---

## Rex → Parse/Extract Translation

### Named Group Extraction

```
# SPL
| rex field=message "user=(?<username>\w+)"

# APL - using parse with regex
| parse kind=regex message with @"user=(?P<username>\w+)"

# APL - using extract function  
| extend username = extract("user=(\\w+)", 1, message)
```

### Pattern Extraction (Non-Regex)

```
# SPL
| rex field=uri "^/api/(?<version>v\d+)/(?<endpoint>\w+)"

# APL
| parse uri with "/api/" version "/" endpoint
```

### Multiple Captures

```
# SPL
| rex field=log "src=(?<src_ip>\d+\.\d+\.\d+\.\d+).*dst=(?<dst_ip>\d+\.\d+\.\d+\.\d+)"

# APL
| extend src_ip = extract(@"src=(\d+\.\d+\.\d+\.\d+)", 1, log)
| extend dst_ip = extract(@"dst=(\d+\.\d+\.\d+\.\d+)", 1, log)
```

---

## String Matching

| SPL | APL | Performance |
|-----|-----|-------------|
| `search "error"` | `search "error"` | Slow (all fields) |
| `field="value"` | `where field == "value"` | **Fastest** |
| `field="*value*"` | `where field contains "value"` | Moderate |
| `field="value*"` | `where field startswith "value"` | Fast |
| `field="*value"` | `where field endswith "value"` | Fast |
| `match(field, "regex")` | `where field matches regex "pattern"` | **Slowest** |
| `like(field, "val%")` | `where field startswith "val"` | Fast |

### Performance Tips

1. **Use `has` over `contains`** — word-boundary matching is faster
2. **Use `_cs` variants** — case-sensitive is faster (`has_cs`, `contains_cs`)
3. **Avoid regex** when simple operators work
4. **Filter by time FIRST** — always `where _time between ...` early

---

## Common Query Translations

### Error Count by Host

```
# SPL
index=logs status>=500 
| stats count by host

# APL
['logs'] 
| where _time between (ago(1h) .. now())
| where status >= 500 
| summarize count() by host
```

### Top 10 URIs

```
# SPL
index=logs 
| top limit=10 uri

# APL
['logs']
| where _time between (ago(1h) .. now())
| summarize count() by uri
| top 10 by count_
```

### Percentile Latency Over Time

```
# SPL
index=logs 
| timechart span=5m perc95(duration) as p95

# APL
['logs']
| where _time between (ago(1h) .. now())
| summarize p95 = percentile(duration, 95) by bin(_time, 5m)
```

### Error Rate Calculation

```
# SPL
index=logs
| stats count(eval(status>=500)) as errors, count as total by host
| eval error_rate = errors/total*100

# APL
['logs']
| where _time between (ago(1h) .. now())
| summarize errors = countif(status >= 500), total = count() by host
| extend error_rate = toreal(errors) / total * 100
```

### Dedup by User (Keep Latest)

```
# SPL
index=logs 
| sort - _time 
| dedup user

# APL
['logs']
| where _time between (ago(1h) .. now())
| summarize arg_max(_time, *) by user
```

### Transaction-like Grouping

```
# SPL
index=logs 
| transaction session_id maxspan=30m

# APL
['logs']
| where _time between (ago(1h) .. now())
| summarize 
    start_time = min(_time),
    end_time = max(_time),
    events = make_list(pack("time", _time, "action", action)),
    duration = max(_time) - min(_time)
  by session_id
```

### Join Datasets

```
# SPL
index=logs 
| join user_id [search index=users | fields user_id, name, email]

# APL
['logs']
| where _time between (ago(1h) .. now())
| join kind=inner (['users']) on user_id
```

### Subsearch / Subquery

```
# SPL
index=logs [search index=errors | fields user_id | format]

# APL
let error_users = ['errors'] | where _time between (ago(1h) .. now()) | distinct user_id;
['logs']
| where _time between (ago(1h) .. now())
| where user_id in (error_users)
```

---

## Field Escaping

### SPL vs APL Field Names

```
# SPL - dots in field names
kubernetes.pod.name="frontend"

# APL - bracket notation for dots (in where clause)
| where ['kubernetes.pod.name'] == "frontend"
```

### Special Characters

Fields with dots that are part of the field name (not hierarchy) need escaping:

```apl
// Field name literally contains "app.kubernetes.io"
| where ['kubernetes.labels.app\\.kubernetes\\.io/name'] == "frontend"

// Use getschema to discover exact field names
['dataset'] | where _time between (ago(1h) .. now()) | getschema
```

---

## Reference

See `reference/command-mapping.md` for complete command list.
See `reference/function-mapping.md` for complete function list.

For APL documentation: https://axiom.co/docs/apl/introduction
For detailed operator docs: Use the axiom-sre skill references.
