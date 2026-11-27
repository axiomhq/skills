# Cost Analysis Report Template

Use this template when presenting findings from the axiom-control-costs workflow.

---

## Cost Analysis Report: [Organization]

**Date:** [YYYY-MM-DD]  
**Analyst:** [Name]  
**Audit Dataset:** [dataset name]  
**Analysis Period:** [e.g., Last 30 days]

**Evidence coverage:** [Audit/history availability, effective windows, partial days, parser limits, and sampling gaps]

Fill monetary estimates only when pricing and billable-volume evidence are available; otherwise mark them unavailable. Event-count shares do not establish byte savings. Findings are review candidates, not authorization to delete or stop ingesting data.

---

### Executive Summary

| Metric | Value |
|--------|-------|
| Daily Ingest (avg) | X TB/day |
| Daily Ingest (p95) | X TB/day |
| Contract Limit | X TB/day |
| Over/Under Contract | +X% / -X% |
| Estimated Monthly Cost | $X |
| Potential Savings | $X (X%) |

**Key Finding:** [One sentence summary of the biggest opportunity]

---

### Top Datasets by Ingest

| Rank | Dataset | 30d Ingest (TB) | % of Total | Work/GB | Action |
|------|---------|-----------------|------------|---------|--------|
| 1 | dataset-a | X | X% | X | [Recommendation] |
| 2 | dataset-b | X | X% | X | [Recommendation] |
| 3 | dataset-c | X | X% | X | [Recommendation] |

**Work/GB Key:**
- Raw query cost = 0: no query cost observed in this interval; inspect history and dependencies.
- Work/GB <100: low query cost relative to ingest; review candidate, not proof of low value.
- High Work/GB: more query work relative to ingest, not a guarantee that all data is needed.

---

### Waste Candidates

Datasets with high ingest but low query activity:

| Dataset | Ingest (GB) | Query Cost (GB·ms) | Work/GB | Recommendation |
|---------|-------------|-------------------|---------|----------------|
| dataset-x | X | X | X | [Action] |

**Estimated Savings:** X TB/day (X% reduction)

---

### Field-Level Analysis: [Dataset Name]

#### Columns Without Observed References

Found **X unreferenced columns** out of Y observed schema columns. This is a reference-count share, not a waste or byte-saving estimate. State whether wildcard or broad queries prevent exclusion claims.

Columns to review (rank by measured size only if available):
1. `field.name.a` - never referenced
2. `field.name.b` - never referenced
3. `field.name.c` - never referenced

**Recommendation:** Review dependencies and required retention before considering ingest filtering or schema changes.

#### High-Volume Values Without Explicit Literal Targeting

For field `[field_name]`:

| Value | Est. Events/Day | Explicitly targeted? | Recommendation |
|-------|-----------------|----------|----------------|
| value-a | X M | ❌ No | Review as sampling candidate |
| value-b | X M | ❌ No | Reduce log level |
| value-c | X M | ✅ Yes | Keep |

**Potential reduction:** X% of sampled events are candidates for review. Report GB/day only with supporting byte measurements; other query predicates may still access these values.

---

### Week-over-Week Changes

| Dataset | Last Week (GB) | This Week (GB) | Δ GB | Δ % | Cause |
|---------|----------------|----------------|------|-----|-------|
| dataset-a | X | X | +X | +X% | [Investigation result] |

---

### Recommendations Summary

#### Immediate Actions (This Week)
1. **[Action 1]** - [Dataset] - Est. savings: X TB/day
2. **[Action 2]** - [Dataset] - Est. savings: X TB/day

#### Short-Term (2-4 Weeks)
1. **[Action]** - [Details]

#### Long-Term (1-3 Months)
1. **[Action]** - [Details]

---

### Glidepath to Contract

| Week | Target (TB/day) | Status |
|------|-----------------|--------|
| Current | X | 🔴 Over |
| Week 1 | X | |
| Week 2 | X | |
| Week 3 | X | |
| Week 4 (Contract) | X | |

---

### Appendix: Queries Used

<details>
<summary>Click to expand</summary>

**Top datasets by ingest:**
```apl
['audit-dataset'] | where action == 'usageCalculated' ...
```
Evidence: <MCP-returned query link>

**Waste candidates:**
```apl
...
```
Evidence: <MCP-returned query link>

</details>
