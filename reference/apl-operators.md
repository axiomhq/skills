# APL Operators Reference (Compressed)

## Time Range (CRITICAL)
**ALWAYS use `between` first** — enables time-based indexing:
```apl
['logs'] | where _time between (ago(1h) .. now())
['logs'] | where _time between (datetime(2024-01-15T14:00:00Z) .. datetime(2024-01-15T15:00:00Z))
```

## Tabular Operators

| Operator | Purpose | Example |
|----------|---------|---------|
| `where` | Filter rows | `where status >= 500` |
| `summarize` | Aggregate | `summarize count() by service` |
| `extend` | Add columns | `extend is_slow = duration > 1000` |
| `project` | Select columns | `project _time, status, uri` |
| `project-away` | Remove columns | `project-away debug_info` |
| `top N by` | Top N rows | `top 10 by duration desc` |
| `order by` | Sort | `order by _time desc` |
| `take` / `limit` | First N rows | `take 100` |
| `count` | Row count | `count` |
| `distinct` | Unique values | `distinct service, method` |
| `search` | Full-text search | `search "error"` |
| `parse` | Extract from strings | `parse msg with * "user=" user " "` |
| `parse-kv` | Extract key-value | `parse-kv msg as (user:string)` |
| `join` | Join tables | `join kind=inner (other) on id` |
| `union` | Combine tables | `union ['logs-east'], ['logs-west']` |
| `lookup` | Enrich with table | `lookup LookupTable on id` |
| `mv-expand` | Expand arrays | `mv-expand tags` |
| `make-series` | Time series arrays | `make-series count() on _time step 5m` |
| `sample` | Random sample | `sample 100` |
| `getschema` | Show schema | `getschema` |
| `redact` | Mask sensitive data | `redact email with "***"` |

## String Operators (Performance Order)

**Use `has` over `contains`** — word boundary matching is faster.
**Use `_cs` versions** — case-sensitive is faster.

| Operator | Description | Performance |
|----------|-------------|-------------|
| `==` | Exact match | **Fastest** |
| `has_cs` | Word boundary (case-sensitive) | **Fastest** |
| `has` | Word boundary | Fast |
| `hasprefix_cs` | Starts with word | Fast |
| `hassuffix_cs` | Ends with word | Fast |
| `startswith_cs` | Prefix match | Fast |
| `endswith_cs` | Suffix match | Fast |
| `contains_cs` | Substring (case-sensitive) | Moderate |
| `contains` | Substring | Moderate |
| `in` | In set | Fast |
| `matches regex` | Regex | **Slowest — avoid** |

Negations: `!has`, `!contains`, `!startswith`, `!in`

```apl
// GOOD: Fast
['logs'] | where _time between (ago(1h) .. now()) | where message has_cs "error"
['logs'] | where _time between (ago(1h) .. now()) | where uri startswith_cs "/api/v2"
['logs'] | where _time between (ago(1h) .. now()) | where status in (500, 502, 503)

// SLOW: Avoid
['logs'] | where message matches regex ".*error.*"
```

## Logical Operators
| Operator | Example |
|----------|---------|
| `and` | `status >= 500 and method == "POST"` |
| `or` | `status == 500 or status == 502` |
| `not` | `not (status == 200)` |
| `==`, `!=` | Equality |
| `<`, `<=`, `>`, `>=` | Comparison |

## Arithmetic
| Operator | Example |
|----------|---------|
| `+`, `-`, `*`, `/`, `%` | `duration_ms / 1000` |

## Search Operator (Full-Text)
```apl
// Search all fields (case-insensitive by default)
['logs'] | search "error"

// Case-sensitive
['logs'] | search kind=case_sensitive "ERROR"

// Field-specific
['logs'] | search message:"timeout"

// Wildcards
['logs'] | search "error*"        // hasprefix
['logs'] | search "*timeout*"     // contains

// Combined
['logs'] | search "error" and ("api" or "auth")
```

## Join Kinds
| Kind | Description |
|------|-------------|
| `inner` | Only matching rows |
| `leftouter` | All left + matching right (nulls for no match) |
| `rightouter` | All right + matching left |
| `fullouter` | All rows from both |
| `leftanti` | Left rows with no match |
| `leftsemi` | Left rows with match |

```apl
['requests'] | join kind=inner (['users']) on user_id
['logs'] | join kind=leftouter (['metadata']) on $left.id == $right.log_id
```

## Parse Operator
```apl
// Simple pattern
['logs'] | parse uri with * "/api/" version "/" endpoint

// With types
['logs'] | parse message with * "duration=" duration:int "ms"

// Regex mode
['logs'] | parse kind=regex message with @"user=(?P<user>\w+)"
```

## Lookup Operator (Enrich Data)
```apl
let LookupTable = datatable(code:int, meaning:string)[
  200, "OK", 
  500, "Internal Error"
];
['logs'] | lookup LookupTable on $left.status == $right.code
```

## Make-Series (Time Series Arrays)
```apl
// Create array-based time series for series_* functions
['logs'] | make-series count() default=0 on _time from ago(1h) to now() step 5m
['logs'] | make-series avg(duration) on _time step 10m by service
```
