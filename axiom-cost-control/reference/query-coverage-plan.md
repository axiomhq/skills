# Query Coverage Analysis - Implementation Plan

## Goal
Identify unused data (columns and field values) by analyzing query history, enabling customers to drop/sample data that is never queried.

---

## Phase 1: Robust AST Parsing

### 1.1 Complete predicate extraction
Current: Only handles `field == 'value'`, AND/OR, IN
Missing:
- [ ] Function calls: `tolower(field) == 'x'`, `substring(field, 0, 5) == 'y'`
- [ ] Negations: `field != 'value'`, `not(field in (...))`
- [ ] Contains/regex: `field contains 'x'`, `field matches regex '...'`
- [ ] Comparisons: `field > 100`, `field between (a .. b)`
- [ ] Nested field access: `properties['foo']`, `data.nested.field`

Implementation:
```
For each predicate node in AST:
  - If BinaryExpr with ==, !=, contains, etc: extract field + value
  - If left side is CallExpr (function): extract field from function args
  - If left side is IndexExpr (bracket access): extract base + key
  - Recursively handle AND/OR
  - Track operator (include vs exclude semantics)
```

### 1.2 Complete column extraction
Current: Extracts Entity nodes with .name
Missing:
- [ ] Columns in `extend` RHS expressions
- [ ] Columns in function arguments
- [ ] Columns in `join` conditions
- [ ] Columns in `sort`, `top`, `distinct`
- [ ] Detect `project *` and `project-away` patterns

Implementation:
```
Walk entire AST, collect all Entity nodes in "read" positions
Flag queries with wildcards (project *, no project = implicit all)
```

---

## Phase 2: Proper Usage Classification

### 2.1 Per-query summary structure
For each query, emit:
```json
{
  "dataset": "k8s-logs",
  "columns_referenced": ["app", "level", "message", "_time"],
  "has_wildcard": false,
  "predicates": [
    {"field": "app", "op": "==", "values": ["web"], "semantic": "include"},
    {"field": "level", "op": "!=", "values": ["debug"], "semantic": "exclude"}
  ],
  "group_by_fields": ["app"],
  "projected_fields": ["app", "message"]
}
```

### 2.2 Field usage classification
For each (dataset, field) pair, classify across all queries:
- **FILTERED_INCLUDE**: All queries that reference field have include filters → only those values used
- **FILTERED_EXCLUDE**: Queries use exclude filters → all except those values used  
- **GROUPED**: Field appears in `summarize by` → all values used
- **PROJECTED**: Field appears in `project` without filter → all values used
- **WILDCARD**: Query has `project *` or no projection → all columns used
- **NOT_REFERENCED**: Field never appears → candidate for column pruning

### 2.3 Value-level safety determination
```
SAFE_TO_DROP(dataset, field, value) =
  for all queries Q referencing (dataset, field):
    Q has include filter that excludes value, OR
    Q has exclude filter that includes value
  AND no query has GROUPED or PROJECTED without filter
```

---

## Phase 3: Efficient Anti-Join

### 3.1 Build queried values set
From all queries, for each (dataset, field):
- Collect all values in INCLUDE filters
- Collect all values in EXCLUDE filters
- Flag if any query uses field without specific value filter

### 3.2 Sample ingest and compute set difference
```apl
['dataset']
| where _time > ago(1d)
| sample 0.001
| summarize count() by field_value = tostring(['field'])
| where field_value !in (queried_values_list)  // anti-join
| order by count_ desc
```

### 3.3 Handle large value sets
If queried_values_list > 100 items:
- Use multiple queries with batched !in clauses
- Or use a different approach: fetch top-N by volume, check each against queried set client-side

---

## Phase 4: Column Pruning

### 4.1 Fetch dataset schema
```apl
['dataset'] | take 1 | getschema
```

### 4.2 Compare against used columns
```
schema_columns = set(columns from getschema)
used_columns = union(columns_referenced from all queries)
unused_columns = schema_columns - used_columns
```

### 4.3 Handle wildcards
If ANY query has wildcard (project * or implicit all):
- Report: "N queries use all columns, cannot identify unused"
- Still show column usage frequency for prioritization

---

## Phase 5: Scoring and Ranking

### 5.1 Opportunity score formula
```
score = ingest_volume × (1 - query_coverage)

where:
  ingest_volume = estimated GB or events for this value/column
  query_coverage = (queries using this) / (total queries against dataset)
```

### 5.2 Output format
```
Field: kubernetes.labels.app
Total queries: 150 | Queries referencing field: 45 (30%)

Value             | Ingest (GB/day) | Queries | Coverage | Score
------------------|-----------------|---------|----------|-------
axiom-atlas       | 450             | 0       | 0%       | 450 ⚠️
axiom-db          | 230             | 2       | 4%       | 221 ⚠️
compactor         | 50              | 40      | 89%      | 5.5
...
```

---

## Phase 6: Query History Completeness

### 6.1 Multiple sources
- [ ] axiom-history (interactive queries)
- [ ] Check if monitors/alerts are in axiom-history or separate
- [ ] Check if dashboard queries are captured
- [ ] API queries via axiom-audit (runAPLQueryCost events)

### 6.2 Deduplication
Group identical queries, count frequency:
```apl
['axiom-history']
| summarize query_count = count(), last_run = max(_time) 
  by dataset, query_hash = hash(query.apl)
```

---

## Phase 7: Time Range Handling

### 7.1 Support hours, not just days
Change parameter from `ingest_days` to `ingest_range`:
- `1d`, `12h`, `6h`, `1h`, `30m`
- Parse and pass directly to `ago()`

### 7.2 Align time ranges in output
Clearly show:
- Query history: last N days
- Ingest sample: last M hours
- Warning if mismatch is significant

---

## Implementation Order

1. **Phase 4 (Column Pruning)** - Low hanging fruit, high value
2. **Phase 5 (Scoring)** - Makes output actionable
3. **Phase 3 (Anti-Join)** - Core value prop
4. **Phase 1.1 (Better predicates)** - Needed for accuracy
5. **Phase 2 (Usage classification)** - Correctness
6. **Phase 6 (Query sources)** - Completeness
7. **Phase 7 (Time ranges)** - Polish
8. **Phase 1.2 (All columns)** - Completeness

---

## Testing Checklist

- [ ] Test with dataset that has `project *` queries
- [ ] Test with `summarize by` without where filter
- [ ] Test with complex predicates (functions, nested access)
- [ ] Test with large datasets (>1TB/day)
- [ ] Test with many distinct values (>10k)
- [ ] Verify anti-join produces correct results
- [ ] Verify scoring ranks opportunities correctly
