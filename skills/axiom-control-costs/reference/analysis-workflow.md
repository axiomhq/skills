# Collect with MCP, analyze locally

Local helpers prepare queries and process files. They never call Axiom, launch an MCP client, or read tokens. Run commands from this skill's directory; keep exports in a separate task directory.

## Result handoff

1. Discover actual datasets and fields through MCP before using the query recipes.
2. Choose one fixed RFC3339 analysis end time with a timezone. Reuse it across related calls so counts and samples describe the same windows.
3. `prepare-queries` emits a JSON plan. For each entry in `calls`, invoke the connected `queryDataset` with its `arguments`, the selected organization, and any client-required fields. The helper itself executes nothing. Check the connected schema before using generated arguments.
4. Use `truncate: false` when supported, especially for parsed ASTs. Inspect server/client truncation, partial-results warnings, query errors, and effective time bounds before exporting. A successful call can still return incomplete data.
5. Save **only the complete CSV table** from each MCP result to its named `output` file, preserving quoting and embedded newlines. Do not copy Markdown fences, headings, statistics, links, or budget footers into CSV. If the client exposes structured rows, save a JSON array of row objects instead. Helpers accept both formats.
6. Preserve result links and scope/window information alongside the files. Use the connected tool's result-sharing option when returning evidence links. Keep complete results in files when the client supports it; do not summarize or hand-reconstruct thousands of rows.
7. A header-only CSV or JSON `[]` is allowed only after MCP explicitly confirmed an empty table. An error or an empty response is not an empty dataset.

The helpers reject missing columns, invalid numeric values, malformed ASTs, and mismatched history totals. They cannot detect every server-side omission; the caller must check tool warnings. If complete results cannot be exported, report the limitation and stop that analysis rather than reverting to HTTP or inventing rows.

## Baseline

```bash
scripts/prepare-queries baseline -a <audit-dataset> --end <fixed-end> > baseline-plan.json
# Execute the plan through queryDataset; export usage.csv and daily.csv.
scripts/baseline-stats --usage usage.csv --daily daily.csv > baseline.json
```

The default history window is 30 days; `--days` changes it. Do not silently widen a user-requested interval. Daily bins can include partial days or extend the effective API range: inspect that range, identify partial days, and exclude them when comparing full-day allowances.

Expected usage columns: `dataset,ingest_bytes,query_gbms`. Expected daily columns: `avg_tb,p50_tb,p90_tb,p95_tb,max_tb,total_tb,days`.

Shares use the total across **all returned datasets**, before the 10 GB candidate filter. Rankings use the unrounded Work/GB ratio; zero query cost is tracked separately from low but nonzero activity. Insufficient audit coverage is a blocker for confident totals.

## Query coverage

```bash
scripts/prepare-queries coverage -D <dataset> --history-dataset <history-dataset> --end <fixed-end> > coverage-plan.json
# Execute through MCP; export history-count.csv, history.csv, and schema.csv.
scripts/analyze-query-coverage --queries history.csv --counts history-count.csv --schema schema.csv > coverage.json
```

Expected columns:

| File | Columns |
|---|---|
| `history-count.csv` | `unique_queries,total_executions` |
| `history.csv` | `parsed,count`; parsed is the complete JSON value from `parse_apl` |
| `schema.csv` | `ColumnName` |

The two history queries use identical bounds and filters. Coverage is based on distinct query patterns; execution counts are retained separately and checked against the independent total. If the row limit is reached, partition by query text into disjoint batches, merge complete rows locally, and check totals again. Do not merge counts from overlapping batches.

The schema recipe observes five recent minutes, so it may omit rarely emitted columns. `getDatasetFields` discovery supplies additional schema context. Do not describe a recent schema observation as a complete inventory. Verify unfamiliar `parse_apl` behavior through Axiom docs; if the function or required data is unavailable, retain the baseline analysis and report that detailed coverage is blocked.

The retained AST parser is a heuristic. It excludes known aliases and parameters, extracts references and predicates, and flags explicit or implicit wildcards. Complex expressions, wildcard patterns, nested queries, and cross-dataset attribution can be incomplete. The local report says **unreferenced**, not safe to delete.

## Field-value sampling

Choose a meaningful field from coverage results. Use MCP to obtain recent daily ingest in GB from audit events before estimating scan volume; if unavailable, the estimate remains unknown.

```bash
scripts/prepare-queries samples -D <dataset> -f <field> --gb-per-day <recent-gb-per-day> --end <fixed-end> > samples-plan.json
# Inspect estimated_scan_gb, then execute each call through MCP and save its output.
scripts/analyze-query-coverage --queries history.csv --counts history-count.csv --field <field> --sample-plan samples-plan.json --samples-dir <export-directory> > values.json
```

The planner retains 8–24 one-minute windows spread over the previous day, with a five-minute ingest-lag allowance and a target scan size of 100 GB. **That target is not a hard cap**: the eight-window minimum can exceed it. Review the estimate and choose a narrower dataset scope or sampling plan if needed; do not execute an expensive plan blindly.

Every planned sample must be complete and present. Each query requests up to 501 groups; reaching that cap blocks volume analysis instead of extrapolating a truncated distribution. Narrow the scope or use a lower-cardinality field. A valid empty sample contributes elapsed time and zero events; missing/failed samples are errors.

The helper combines sample counts and scales by the total sampled duration to estimate events/day. It reports volume not explicitly targeted by literal equality/`in` predicates, cumulative shares, and the top 5/10/20 unmatched shares. Those are investigation leads: regex, inequalities, negation, unfiltered queries, and groupings may still use those values. Empty values above 5% require a second dimension for attribution.

Event percentages are not byte or currency savings. Data retention needs, incident-only queries, and dependencies outside this history window must be considered before recommending reductions.
