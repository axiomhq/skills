# PromQL → MPL Translation

How to translate a PromQL expression into an Axiom MPL pipeline without losing structure. The translation rules are mechanical; the source PromQL carries the spec.

> **Two rules govern this whole document:**
>
> 1. **Mechanical preservation.** Every PromQL `{label="x"}` selector becomes an MPL `where` clause. Every PromQL `by(label1, label2)` dimension becomes an MPL `group by`. Never drop one because the metric name "feels" scoped to it — the selector or grouping was a deliberate authoring choice, not decoration.
> 2. **Reverse-tag discovery for name mismatches.** When a PromQL label name does not exist verbatim in the MPL dataset, **do not drop the selector**. Apply the OTel ingest rename rules first, then use `scripts/metrics/metrics-info` to find the equivalent tag, then map. Discovery is a validator, never a generator.

This doc covers translation, not MPL syntax. Run `scripts/metrics/metrics-spec <deploy> <dataset>` before authoring to fetch the live spec for the target deployment — operator names and availability evolve, and the spec is the only source of truth. The translation rules below assume you've done that.

---

## Pre-translation: Name shape

Before reaching for `metrics-info`, apply the deterministic Prometheus → OTel renaming rules. Most "missing metric" cases dissolve at this step.

| PromQL form                                                    | OTel form                              |
|:---------------------------------------------------------------|:---------------------------------------|
| `<metric>_total` (counter)                                     | `<metric>` (counter-ness in metadata)  |
| `<metric>_bucket` / `<metric>_sum` / `<metric>_count` (histogram derivatives) | `<metric>` (one Histogram metric) |
| `<metric>_seconds`, `<metric>_bytes`, `<metric>_milliseconds`  | sometimes preserved; sometimes only in `unit` metadata |

**Label names are not deterministic.** Prometheus label names do not round-trip cleanly to OTel attribute names — the OTel→Prom direction (dots in OTel attributes become underscores in Prom) is convention, but the reverse is a guess. A Prom label like `job` is *not* a renamed OTel attribute; a Prom label like `service_name` *might* be the OTel attribute `service.name`, or it might just be a Prom label called `service_name`. Treat label-name resolution as reverse-tag-discovery work (see below), not as a deterministic renaming step.

Full rules and order of operations are in [grafana-migration.md § Name Mapping](./grafana-migration.md#name-mapping-promql--otel-ingest).

---

## Selector translation: PromQL `{…}` → MPL `where`

Every label matcher in the PromQL `{…}` becomes a `where` clause on the MPL pipeline. Multiple matchers are conjunctive in PromQL and translate to a chain of `where` clauses (also conjunctive) — or one `where` with `and`.

> **Fetch the tag type before translating.** PromQL stores every label as a string, so its only comparison operators are equality (`=`, `!=`) and regex (`=~`, `!~`). MPL has typed tags — string, int, float, bool — and supports typed comparisons (`==`, `!=`, `<`, `<=`, `>`, `>=`) on numeric and bool tags. **The right MPL operator depends on the tag's type in the dataset, not on what PromQL did with it.**
>
> **The authoritative type check is MPL's `<tag> is <type>` operator** (run via `metrics-query`):
>
> ```bash
> scripts/metrics/metrics-query <deploy> '`<dataset>`:`<metric>` | filter `<tag>` is int | align to 5m using sum' now-1h now
> ```
>
> Non-empty `series` in the response means the tag is `int`-typed for that metric. Run the probe for `int`, `float`, `string`, `bool` as needed; the type that returns series is the type the dataset stores. Type can vary across datasets — Prometheus-imported data tends to stringify everything (even values that look numeric or boolean), OTel-native ingest preserves types — so probe per dataset, never assume.
>
> **The `tags/<tag>/values` endpoint is a hint, not a determination:**
>
> ```bash
> scripts/metrics/metrics-info <deploy> <dataset> tags <tag> values
> ```
>
> Unquoted numbers in the JSON response strongly suggest numeric typing. Uniformly quoted values are **inconclusive** — could be a string-typed tag, a numeric tag stringified at ingest, or a float tag with `+Inf`/`NaN` rendered as JSON strings (JSON has no infinity literal even though MPL types these as `float`). Use the values list to pick candidate types, then confirm with the `is <type>` probe.
>
> **For tags with inconsistent type across rows,** use the defensive form (from the `/v1/query/_mpl` OPTIONS spec):
>
> ```mpl
> | filter (`tag` is int and `tag` == 200) or (`tag` is string and `tag` == "200")
> ```

### Translation by tag type

**String-typed tag** (most labels — `service.name`, `path`, `container`, etc.):

| PromQL matcher              | MPL `where` form                              |
|:----------------------------|:----------------------------------------------|
| `{label="value"}`           | `\| where label == "value"`                    |
| `{label!="value"}`          | `\| where label != "value"`                    |
| `{label=~"regex"}`          | `\| where label == #/regex/`                   |
| `{label!~"regex"}`          | `\| where label != #/regex/`                   |

MPL regex uses `#/…/` delimiters (no quotes). Forward slashes inside the pattern need escaping (`\/`).

**Numeric-typed tag** (`int` or `float` — common for HTTP status codes, ports, queue depths):

PromQL stored the value as a string and used regex to match ranges (`code=~"5.."`). When the same tag is `int`-typed in MPL, **translate to a typed comparison** — it's faster, clearer, and matches the user's intent.

| PromQL                       | MPL (when `code` is `int`)                  |
|:-----------------------------|:--------------------------------------------|
| `{code="500"}`               | `\| where code == 500`                       |
| `{code=~"5.."}`              | `\| where code >= 500 and code < 600`        |
| `{code!~"[1234].."}`         | `\| where code >= 500`                       |
| `{code=~"500\|502\|503"}`    | `\| where code == 500 or code == 502 or code == 503` |

**Bool-typed tag:** `{flag="true"}` → `| where flag == true`.

**Worked example:**

```promql
http_request_duration_seconds_count{
  container=~"api|web",
  path=~".*\/v1\/(traces|logs|metrics).*",
  code!~"[1234].."
}
```

Probe each tag's type before authoring (per the type-fetch rule above):

```bash
scripts/metrics/metrics-query test '`test`:`http_request_duration_seconds_count` | filter `code` is int | align to 5m using sum' now-1h now
```

Non-empty result confirms `code` is `int`-typed. Repeat for `container` and `path` with `is string`. If `code` came back empty for `is int` and non-empty for `is string`, the dataset stores `code` as a string and you'd translate the regex form instead (`| where code == #/[5-9]../`) — see the string-typed table above.

In MPL, with `container` and `path` confirmed as strings and `code` confirmed as int:

```mpl
test:http_request_duration_seconds_count
| where container == #/api|web/
| where path == #/.*\/v1\/(traces|logs|metrics).*/
| where code >= 500
```

The `code!~"[1234].."` regex (Prom's only way to express "5xx or higher") collapses to `where code >= 500` — a typed comparison the dataset can satisfy directly.

**Backticking non-identifier names.** MPL identifiers that contain dots (or other non-alphanumeric characters) must be backtick-escaped: `` `service.name` ``, `` `kubernetes.pod.name` ``. The metric name itself is also backtick-escaped when it contains dots: `` `http.server.duration` ``.

---

## Aggregation translation: `rate(...)` and friends

PromQL aggregation operators map onto MPL's `align`, `group`, and `bucket` operators. The translation preserves the semantic; idiomatic MPL is shorter than PromQL because MPL composes left-to-right instead of nesting.

### Rate

`rate(metric[5m])` becomes `align to 5m using prom::rate`. The Prom range vector duration becomes the `align` window.

```promql
rate(http_requests_total{path="/api"}[5m])
```

```mpl
test:http_requests_total
| where path == "/api"
| align to 5m using prom::rate
```

> **Why `prom::rate` and not `rate`?** `prom::rate` preserves Prometheus semantics (handles counter resets, extrapolates over the window). Use it for any translation from PromQL `rate()`. Plain `rate` exists for native MPL use cases where you do not want Prom's extrapolation. When in doubt, match the source: PromQL `rate(...)` → `prom::rate`. Confirm operator availability with `scripts/metrics/metrics-spec` before authoring.

### Other aggregations

| PromQL                          | MPL                                                |
|:--------------------------------|:---------------------------------------------------|
| `sum(metric)`                   | `\| group using sum`                               |
| `sum by (a, b) (metric)`        | `\| group by a, b using sum`                       |
| `avg by (a) (rate(metric[5m]))` | `\| align to 5m using prom::rate \| group by a using avg` |
| `max_over_time(metric[7d])`     | `\| group using max \| align to 7d using avg`      |
| `min by (a) (metric)`           | `\| group by a using min`                          |
| `count by (a) (metric)`         | `\| group by a using count`                        |

### `by(...)` is mandatory to preserve

The single most common F3 failure: dropping a dimension from `by(...)` because the metric name "feels" scoped to one of them. Never do this — the dimension was specified for a reason. Drop one and the resulting chart has the wrong shape.

```promql
sum by (instance, name) (workqueue_depth)   // two dimensions, both required
```

```mpl
test:workqueue_depth
| group by instance, name using sum         // both dimensions preserved
```

---

## Histogram translation: `histogram_quantile(...)` → `bucket … using interpolate_*_histogram(...)`

PromQL histograms are three derived series (`_bucket`, `_sum`, `_count`); a histogram_quantile pipeline reduces them via a sum-by-le, then computes a quantile. MPL collapses this into a single `bucket` operator that takes the quantile as a function argument.

```promql
histogram_quantile(0.90,
  sum by (method, path, le) (
    rate(http_request_duration_seconds_bucket{service="api"}[5m])
  )
)
```

```mpl
test:http_request_duration_seconds_bucket
| where service == "api"
| bucket by method, path to 5m using interpolate_cumulative_histogram(rate, 0.90, 0.99)
```

**Two things drop out** of the literal translation, structurally:

1. **The `le` dimension drops from the `by` list.** MPL handles bucket boundaries internally; surfacing `le` would be redundant. The `by(method, path, le)` becomes `bucket by method, path` — `le` is gone.
2. **The outer `rate(...)` collapses into the bucket call** as the rate argument: `interpolate_cumulative_histogram(rate, 0.90, …)`. The `[5m]` Prom range becomes the `bucket … to 5m` window.

**Pick the right histogram operator** for the metric's temporality. Cumulative histograms (the OTel default) use `interpolate_cumulative_histogram`. Delta histograms use `interpolate_delta_histogram`. Read the metric's `temporality` from `scripts/metrics/metrics-info <deploy> <dataset> metrics <metric> info` before choosing — this is part of the metric metadata, not a guess.

---

## Boolean step functions: `<bool` and friends

PromQL's `<bool 0.4` expression returns 0 or 1 per timestamp depending on whether the value is below the threshold. MPL expresses this with `map is::lt(0.4)` (and analogous predicates).

```promql
(metric <bool 0.4)
```

```mpl
| map is::lt(0.4)
```

Common predicates: `is::lt`, `is::le`, `is::gt`, `is::ge`, `is::eq`, `is::ne`. Confirm names against `metrics-spec` for the dataset — operator availability evolves.

---

## Ratios and division: `compute … using /`

PromQL ratio expressions — `sum(rate(errors[5m])) / sum(rate(total[5m]))` — translate to MPL `compute` blocks that join two parenthesized branches.

```promql
sum(rate(http_requests_total{outcome="failure"}[5m]))
/
sum(rate(http_requests_total[5m]))
```

```mpl
(
  test:http_requests_total
  | where outcome == "failure"
  | align to 5m using prom::rate
  | group using sum,
  test:http_requests_total
  | align to 5m using prom::rate
  | group using sum
)
| compute error_rate using /
```

**Two notes for translators:**

1. **Both branches must have the same shape** — same `align` window, same grouping. If one has `group by service` and the other doesn't, the join will not line up.
2. **Ratios are 0–1 fractions, not percentages.** If the chart is a Statistic with `unit: "Percent100"`, multiply by 100 in MPL before deploying: `| map * 100`. See [chart-config.md § Unit Configuration](./chart-config.md#unit-configuration-cross-chart) and [metrics-mpl.md § Percentages and ratios](./metrics-mpl.md#percentages-and-ratios-otel-01-fractions).

For naming a branch in `compute`, use the `as` keyword: `test:http_requests_total as failure`. Helpful when the same metric appears twice with different filters.

---

## Reverse-Tag Discovery for Missing Labels

When a PromQL label name does not exist verbatim in the MPL dataset *after* applying OTel rename rules — e.g. PromQL has `{job="ingest-worker"}` but the dataset has no `job` tag — **do not drop the selector**. The selector was authored deliberately; the dataset just spells the dimension differently.

### Workflow

1. **List all tags in the dataset.**
   ```bash
   scripts/metrics/metrics-info <deploy> <dataset> tags
   ```
2. **Inspect candidate values.** Pick the most likely candidate (often `service.name` for `job`, `k8s.pod.name` for `instance`, etc.) and confirm:
   ```bash
   scripts/metrics/metrics-info <deploy> <dataset> tags <candidate> values
   ```
   Look for the value the PromQL selector matched on.
3. **Map the selector** to the equivalent tag.
   ```promql
   {job="ingest-worker"}
   ```
   ```mpl
   | where `service.name` == "ingest-worker"
   ```
4. **If no equivalent exists,** surface the mismatch to the user as a blocker. Document the panel as deferred. **Never silently drop the selector** — that ships a wrong-shape dashboard.

### Discovery cap

Cap reverse-search at **two candidates** before surfacing a question. If two reasonable candidate tags don't carry the expected value, the dataset probably doesn't model the dimension and the user has to decide. Burning ten discovery calls on a hunch is a smell, not diligence.

### What discovery does NOT do

Discovery validates that the spec'd subset exists in the dataset. It **does not** invent a subset. If you find yourself running `metrics-info` to *decide* what the panel should filter on, stop — the source dashboard already wrote that down. (See also [grafana-migration.md § Common Migration Pitfalls](./grafana-migration.md#common-migration-pitfalls).)

---

## Selector Values Not in the Dataset Are Aliases — Cite the Source

When a PromQL selector value is **absent** from the dataset's tag values, the value is a recording-rule alias or other shorthand defined elsewhere — not a literal value to translate. Shape of the case: PromQL has `{<label>="<alias>"}`, but `metrics-info … tags <label> values` returns a set that does not include `"<alias>"`. The alias resolves to some subset `{A, B, …}` of the values that *are* in the dataset, but the subset is defined outside the dashboard JSON.

Resolve the alias by citing a **written source**:

- the panel's `description` field (often enumerates the subset in prose), **or**
- the upstream rule library file and line (e.g. `<rule-library>.<ext>:L<n>`).

**Memory is not a source.** Prior knowledge of an upstream rule library is unreliable — agents recall the *shape* of definitions more confidently than they recall the exact contents, and rule libraries get edited over time. The failure mode on file: an agent expanded an alias from memory instead of opening either the panel `description` or the upstream rule definition; both written sources agreed on the subset, the agent's recall matched neither, and the deployed panel filtered a different subset than the source dashboard. The fix is procedural: **no expansion of an alias may be attributed to general knowledge — produce a citation, or defer the panel with a Note.**

Detection trigger: `metrics-info <deploy> <dataset> tags <label> values` does not contain the value the PromQL selector expects. That absence is the cue that an alias is in play; from that moment forward, prior-knowledge expansion is forbidden.

---

## Translation Checklist

Per panel:

- [ ] Applied OTel metric-name rename rules to every metric in `expr` (drop `_total`, decompose histogram derivatives, normalize unit suffixes).
- [ ] Validated each renamed metric name with `metrics-info` (or marked the chart blocked).
- [ ] Resolved label names via `metrics-info … tags` — not via assumed renaming. Reverse-search if absent (capped at 2 candidates).
- [ ] **For every PromQL selector value not present in `metrics-info … tags <label> values`: cited a written source for the expansion** (panel `description`, or upstream rule library file + line). Memory-as-source is forbidden; no citation → defer the panel. See [§ Selector Values Not in the Dataset Are Aliases](#selector-values-not-in-the-dataset-are-aliases--cite-the-source).
- [ ] For each PromQL `{…}` matcher: produced a corresponding MPL `where` clause (regex `=~` → `== #/…/`, etc.).
- [ ] For each PromQL `by(…)` dimension: included it in the MPL `group by` (or `bucket by` for histograms).
- [ ] For each `rate(metric[X])`: produced `align to X using prom::rate`.
- [ ] For each `histogram_quantile(...)`: chose `interpolate_cumulative_histogram` or `interpolate_delta_histogram` based on the metric's `temporality` metadata.
- [ ] For each ratio: built a `compute … using /` block, branches with matching shape; multiplied by 100 if the chart is `Percent100`.
- [ ] For each missing label: ran reverse-tag discovery (capped at 2 candidates), surfaced a blocker rather than dropping the selector.
- [ ] No inline time ranges on the MPL source.
- [ ] Tested via `scripts/metrics/metrics-query`, preserving `$__interval` (with `param` declaration and `-p __interval=…`).
- [ ] Spot-checked: does each translated panel filter the same subset and group by the same dimensions as the original?
