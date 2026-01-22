import type { TranslationCase } from "../../../eval-tooling/src/shared/types";

/**
 * Test cases extracted from skills/spl-to-apl/reference/examples.md
 * and https://axiom.co/docs/apl/guides/splunk-cheat-sheet
 */
export const testCases: TranslationCase[] = [
  // === Basic Searches ===
  {
    id: "simple-field-search",
    name: "Simple field search with multiple conditions",
    spl: `index=web_logs status=500 method=POST`,
    expectedApl: `['web_logs']
| where _time between (ago(1h) .. now())
| where status == 500 and method == "POST"`,
    category: "basic",
  },
  {
    id: "wildcard-search",
    name: "Wildcard search with OR",
    spl: `index=logs error* OR fail*`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| where message has_cs "error" or message has_cs "fail"`,
    category: "basic",
  },
  {
    id: "fulltext-search",
    name: "Full-text search",
    spl: `index=logs "connection timeout"`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| search "connection timeout"`,
    category: "basic",
  },

  // === Aggregation Queries ===
  {
    id: "count-by-field",
    name: "Count by field",
    spl: `index=logs 
| stats count by status`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| summarize count() by status`,
    category: "aggregation",
  },
  {
    id: "multiple-aggregations",
    name: "Multiple aggregations",
    spl: `index=logs
| stats count, dc(user) as unique_users, avg(response_time) as avg_rt by endpoint`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| summarize 
    count(), 
    unique_users = dcount(user), 
    avg_rt = avg(response_time) 
  by endpoint`,
    category: "aggregation",
  },
  {
    id: "top-n-values",
    name: "Top N values",
    spl: `index=logs
| top 10 uri`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| summarize count() by uri
| top 10 by count_`,
    category: "aggregation",
  },
  {
    id: "rare-values",
    name: "Rare values",
    spl: `index=logs
| rare 10 error_code`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| summarize count() by error_code
| order by count_ asc
| take 10`,
    category: "aggregation",
  },

  // === Time-Series Analysis ===
  {
    id: "timechart-count",
    name: "Timechart count by status",
    spl: `index=logs
| timechart span=5m count by status`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| summarize count() by bin(_time, 5m), status`,
    category: "timeseries",
  },
  {
    id: "timechart-percentiles",
    name: "Timechart percentiles",
    spl: `index=logs
| timechart span=1m perc50(response_time) as p50, perc95(response_time) as p95, perc99(response_time) as p99`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| summarize 
    p50 = percentile(response_time, 50),
    p95 = percentile(response_time, 95),
    p99 = percentile(response_time, 99)
  by bin(_time, 1m)`,
    category: "timeseries",
  },
  {
    id: "error-rate-over-time",
    name: "Error rate over time",
    spl: `index=logs
| timechart span=5m count(eval(status>=500)) as errors, count as total
| eval error_rate = errors/total*100`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| summarize 
    errors = countif(status >= 500),
    total = count()
  by bin(_time, 5m)
| extend error_rate = toreal(errors) / total * 100`,
    category: "timeseries",
  },

  // === Field Extraction ===
  {
    id: "rex-named-groups",
    name: "Rex with named groups",
    spl: `index=logs
| rex field=message "user=(?<username>\\w+) action=(?<action>\\w+) duration=(?<dur>\\d+)ms"
| table _time, username, action, dur`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| extend username = extract(@"user=(\\w+)", 1, message)
| extend action = extract(@"action=(\\w+)", 1, message)
| extend dur = toint(extract(@"duration=(\\d+)ms", 1, message))
| project _time, username, action, dur`,
    category: "extraction",
  },
  {
    id: "simple-pattern-extraction",
    name: "Simple pattern extraction",
    spl: `index=logs
| rex field=uri "/api/(?<version>v\\d)/(?<resource>\\w+)"
| stats count by version, resource`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| parse uri with "/api/" version "/" resource
| summarize count() by version, resource`,
    category: "extraction",
  },
  {
    id: "json-extraction",
    name: "JSON extraction with spath",
    spl: `index=logs
| spath input=payload path=user.id output=user_id
| spath input=payload path=request.method output=method
| stats count by user_id, method`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| extend user_id = parse_json(payload)['user']['id']
| extend method = parse_json(payload)['request']['method']
| summarize count() by user_id, method`,
    category: "extraction",
  },

  // === Conditional Logic ===
  {
    id: "if-then-else",
    name: "If/then/else severity",
    spl: `index=logs
| eval severity = if(status>=500, "critical", if(status>=400, "warning", "ok"))
| stats count by severity`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| extend severity = case(
    status >= 500, "critical",
    status >= 400, "warning",
    "ok"
)
| summarize count() by severity`,
    category: "conditional",
  },
  {
    id: "case-statement",
    name: "Case statement for region",
    spl: `index=logs
| eval region = case(
    src_ip LIKE "10.0.%", "us-east",
    src_ip LIKE "10.1.%", "us-west",
    src_ip LIKE "10.2.%", "eu-west",
    1==1, "unknown"
)
| stats count by region`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| extend region = case(
    src_ip startswith "10.0.", "us-east",
    src_ip startswith "10.1.", "us-west",
    src_ip startswith "10.2.", "eu-west",
    "unknown"
)
| summarize count() by region`,
    category: "conditional",
  },

  // === Joins & Lookups ===
  {
    id: "inner-join",
    name: "Inner join with users",
    spl: `index=logs
| join type=inner user_id [search index=users | fields user_id, name, email]
| table _time, user_id, name, email, action`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| join kind=inner (
    ['users'] 
    | project user_id, name, email
) on user_id
| project _time, user_id, name, email, action`,
    category: "join",
  },
  {
    id: "left-outer-join",
    name: "Left outer join with coalesce",
    spl: `index=logs
| join type=left user_id [search index=users | fields user_id, tier]
| eval tier = coalesce(tier, "free")
| stats count by tier`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| join kind=leftouter (
    ['users'] 
    | project user_id, tier
) on user_id
| extend tier = coalesce(tier, "free")
| summarize count() by tier`,
    category: "join",
  },
  {
    id: "subsearch",
    name: "Subsearch / In-list filter",
    spl: `index=logs [search index=errors earliest=-1h | fields user_id | format]`,
    expectedApl: `let error_users = ['errors'] 
    | where _time between (ago(1h) .. now()) 
    | distinct user_id;
['logs']
| where _time between (ago(1h) .. now())
| where user_id in (error_users)`,
    category: "join",
  },

  // === Deduplication ===
  {
    id: "dedup-keep-latest",
    name: "Dedup keep latest",
    spl: `index=logs
| sort - _time
| dedup user_id`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| summarize arg_max(_time, *) by user_id`,
    category: "dedup",
  },
  {
    id: "dedup-keep-earliest",
    name: "Dedup keep earliest",
    spl: `index=logs
| sort _time
| dedup user_id`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| summarize arg_min(_time, *) by user_id`,
    category: "dedup",
  },

  // === Multivalue Operations ===
  {
    id: "mvexpand",
    name: "Expand array field",
    spl: `index=logs
| mvexpand tags
| stats count by tags`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| mv-expand tags
| summarize count() by tags`,
    category: "multivalue",
  },
  {
    id: "split-and-expand",
    name: "Split string to array and expand",
    spl: `index=logs
| eval tags = split(tag_string, ",")
| mvexpand tags
| stats count by tags`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| extend tags = split(tag_string, ",")
| mv-expand tags
| summarize count() by tags`,
    category: "multivalue",
  },
  {
    id: "collect-to-array",
    name: "Collect values to array",
    spl: `index=logs
| stats list(action) as actions, values(status) as unique_statuses by user_id`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| summarize 
    actions = make_list(action), 
    unique_statuses = make_set(status) 
  by user_id`,
    category: "multivalue",
  },

  // === Transaction-Like Queries ===
  {
    id: "session-reconstruction",
    name: "Session reconstruction",
    spl: `index=logs
| transaction session_id maxspan=30m
| eval duration = _time - earliest_time
| stats avg(duration) as avg_session_duration, count as session_count by user_id`,
    expectedApl: `['logs']
| where _time between (ago(6h) .. now())
| summarize 
    start_time = min(_time),
    end_time = max(_time),
    event_count = count()
  by session_id, user_id
| extend duration = end_time - start_time
| where duration <= 30m
| summarize 
    avg_session_duration = avg(duration), 
    session_count = count() 
  by user_id`,
    category: "transaction",
  },

  // === IP & Geo Analysis ===
  {
    id: "ip-location",
    name: "IP geolocation",
    spl: `index=logs
| iplocation clientip
| stats count by Country, City`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| extend geo = geo_info_from_ip_address(clientip)
| summarize count() by Country = geo.country, City = geo.city`,
    category: "geo",
  },
  {
    id: "cidr-matching",
    name: "CIDR matching for internal/external",
    spl: `index=logs
| eval is_internal = if(cidrmatch("10.0.0.0/8", src_ip) OR cidrmatch("172.16.0.0/12", src_ip), "internal", "external")
| stats count by is_internal`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| extend is_internal = iff(
    ipv4_is_in_range(src_ip, "10.0.0.0/8") or ipv4_is_in_range(src_ip, "172.16.0.0/12"),
    "internal",
    "external"
)
| summarize count() by is_internal`,
    category: "geo",
  },

  // === Performance Queries ===
  {
    id: "slow-requests",
    name: "Slow requests analysis",
    spl: `index=logs response_time > 1000
| stats count, avg(response_time) as avg_rt, perc95(response_time) as p95_rt by endpoint
| sort - count`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| where response_time > 1000
| summarize 
    count(), 
    avg_rt = avg(response_time), 
    p95_rt = percentile(response_time, 95) 
  by endpoint
| order by count_ desc`,
    category: "performance",
  },
  {
    id: "error-spike-detection",
    name: "Error spike detection",
    spl: `index=logs status>=500
| timechart span=1m count
| where count > 100`,
    expectedApl: `['logs']
| where _time between (ago(1h) .. now())
| where status >= 500
| summarize count() by bin(_time, 1m)
| where count_ > 100`,
    category: "performance",
  },

  // === Security Queries ===
  {
    id: "failed-login-analysis",
    name: "Failed login analysis",
    spl: `index=auth action=failed
| stats count by user, src_ip
| where count > 5
| sort - count`,
    expectedApl: `['auth']
| where _time between (ago(1h) .. now())
| where action == "failed"
| summarize count() by user, src_ip
| where count_ > 5
| order by count_ desc`,
    category: "security",
  },
  {
    id: "multiple-ips-per-user",
    name: "Multiple IPs per user",
    spl: `index=auth action=login
| stats dc(src_ip) as ip_count, values(src_ip) as ips by user
| where ip_count > 3`,
    expectedApl: `['auth']
| where _time between (ago(1h) .. now())
| where action == "login"
| summarize ip_count = dcount(src_ip), ips = make_set(src_ip) by user
| where ip_count > 3`,
    category: "security",
  },

  // === Complex Pipelines ===
  {
    id: "full-analysis-pipeline",
    name: "Full analysis pipeline",
    spl: `index=logs earliest=-24h
| rex field=uri "/api/(?<version>v\\d)/(?<endpoint>\\w+)"
| eval is_error = if(status >= 400, 1, 0)
| stats count, sum(is_error) as errors by version, endpoint
| eval error_rate = round(errors/count*100, 2)
| where count > 100
| sort - error_rate
| head 20`,
    expectedApl: `['logs']
| where _time between (ago(24h) .. now())
| parse uri with "/api/" version "/" endpoint
| summarize 
    count(), 
    errors = countif(status >= 400) 
  by version, endpoint
| extend error_rate = round(toreal(errors) / count_ * 100, 2)
| where count_ > 100
| order by error_rate desc
| take 20`,
    category: "complex",
  },
];

