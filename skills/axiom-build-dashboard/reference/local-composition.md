# Local dashboard composition

These optional helpers prepare JSON locally. All Axiom reads and writes go through MCP. Paths below are relative to the skill directory.

```bash
dashboard_dir=$(mktemp -d)
scripts/chart-add --type Statistic --id errors --name Errors \
  --apl "['logs'] | summarize errors=countif(status >= 500)" \
  > "$dashboard_dir/errors.json"
scripts/chart-add --type TimeSeries --id traffic --name 'Requests over time' \
  --apl "['logs'] | summarize count() by bin_auto(_time)" \
  > "$dashboard_dir/traffic.json"
scripts/layout-pack errors:Statistic traffic:TimeSeries > "$dashboard_dir/layout.json"
scripts/dashboard-assemble --name 'API health' --datasets logs \
  --owner X-AXIOM-EVERYONE --refresh team --time-window 24h \
  --layout "$dashboard_dir/layout.json" \
  --section 'Requests:errors,traffic' \
  "$dashboard_dir/errors.json" "$dashboard_dir/traffic.json" \
  > "$dashboard_dir/dashboard.json"
scripts/dashboard-validate "$dashboard_dir/dashboard.json" --strict
```

Replace sample dataset and field names with discovered names, and validate queries with MCP first. Read the completed file and pass its JSON contents as the `dashboardJson` string to `createDashboard`; a file path is not the document. For updates, follow [SKILL.md](../SKILL.md#4-apply-the-requested-change).

## Charts and layout

- `chart-add --apl` writes `query.apl`; `--mpl '<MPL>' --dataset <name>` writes `query.mpl` and `query.metricsDataset`. It rejects inline MPL time ranges and handles unit formatting. See [metrics/MPL](metrics-mpl.md).
- `chart-add --type Note --id deferred --name Deferred --text '<Markdown>'` documents a blocked panel. Notes use top-level `text`.
- `layout-pack` uses a 12-column grid: Statistic 3×3, TimeSeries 6×4, Table 6×5, LogStream 12×6, Note 12×2. Override with `id:WxH`.
- `dashboard-assemble` checks unique chart IDs and matching layout IDs. It assembles a new document; do not use it to reconstruct an existing dashboard for a small edit.
- Merge advanced fields or multi-query charts with `jq`; see [chart configuration](chart-config.md). Every pipeline needs the correct language field.

## Sections and settings

Repeat `--section 'Title:id,id'` in display order. `--section-collapsed` sets `defaultCollapsed: true`. Titles map to stable UUIDs. Omitted charts stay ungrouped; SmartFilters cannot belong to sections. Notes used as headers do not create collapsible groups.

Use `--refresh oncall` (60 seconds), `--refresh team` (300 seconds), or an explicit MCP-supported value (15, 60, 300). Choose slower refresh for long windows. `--time-window 24h` becomes `qr-now-24h` through `qr-now`. Follow the connected tool's schema if supported settings change.

The helper defaults to shared ownership (`X-AXIOM-EVERYONE`). Pass `--owner me` for a requested private dashboard with user authentication. Preserve the saved owner on edits.

## Templates and normalization

`dashboard-from-template` and `dashboard-new` produce JSON without saving anything to Axiom. Templates assume fields such as `service`, `status`, `route`, and `duration_ms`; adapt them to discovered fields and inspect the output.

For imported JSON missing layout defaults, normalize locally before validation:

```bash
jq -L scripts 'include "dashboard-normalize"; normalize_dashboard_layout' \
  input.json > normalized.json
scripts/dashboard-validate normalized.json --strict
```

Normalization fills missing `minH`, `minW`, `moved`, and `static`, preserving existing values. Validation catches structural and known chart problems; it does not execute queries, validate all server fields, or prove rendering.
