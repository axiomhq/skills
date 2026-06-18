# Error Analysis Guide

Read AI traces from Axiom, categorize failures, design scorers from the categories. Do this before writing scorers.

---

## Prerequisites

- `axiom-sre` skill loaded (for `axiom-query`)
- Content capture enabled (`captureMessageContent: 'full'`)
- Run `scripts/discover-axiom` to find the traces dataset name

---

## Step 1: Sample ~100 Traces

```apl
['<traces-dataset>']
| where _time > ago(7d)
| where ['attributes.gen_ai.capability.name'] == '<capability>'
| where ['attributes.gen_ai.operation.name'] == 'chat'
| project _time, trace_id,
    input = ['attributes.gen_ai.input.messages'],
    output = ['attributes.gen_ai.output.messages'],
    model = ['attributes.gen_ai.request.model'],
    ['status.code'],
    duration_ms = duration / 1000000,
    finish = ['attributes.gen_ai.response.finish_reasons']
| sort by _time desc
| take 100
```

Filter to a specific step: `| where ['attributes.gen_ai.step.name'] == '<step>'`

### Sampling strategies

| Strategy | APL pattern |
|----------|-------------|
| Random (default) | `\| sort by _time desc \| take 100` |
| Errors only | `\| where ['status.code'] == 'ERROR'` |
| Slowest | `\| order by duration desc \| take 50` |
| Tool-heavy | `\| where tostring(['attributes.gen_ai.output.messages']) contains 'tool_call'` |
| Diverse (high traffic) | `\| sample 100` |

Start with random. Add error and outlier sampling after the first pass if failure coverage is thin.

### Pull tool calls for agent traces

```apl
['<traces-dataset>']
| where trace_id == '<trace-id>'
| project _time, name, span_id, parent_span_id,
    op = ['attributes.gen_ai.operation.name'],
    tool = ['attributes.gen_ai.tool.name'],
    tool_args = ['attributes.gen_ai.tool.arguments'],
    tool_result = ['attributes.gen_ai.tool.message'],
    ['status.code'], duration_ms = duration / 1000000
| sort by _time asc
```

---

## Step 2: Label Each Trace

For each trace: **pass or fail**. For failures: note what went wrong.

Note the **first thing that went wrong**, not downstream effects. Write observations, not explanations:

```
✅ "SQL missed the budget constraint"
❌ "The model probably didn't understand the budget"
```

| Trace ID | Input (summary) | What went wrong | Pass/Fail |
|----------|-----------------|-----------------|-----------|
| abc123 | "Cancel my subscription" | Classified as billing instead of cancellation | Fail |
| def456 | "What's my balance?" | — | Pass |
| ghi789 | "" (empty) | Returned category instead of unknown | Fail |

Start grouping after 30–50 traces.

---

## Step 3: Group Failures into 5–10 Categories

Read failure notes. Group by root cause, not surface similarity.

**Split** when root causes differ: "Made up property features" ≠ "Made up client activity" — two categories, not one "hallucination" bucket.

**Merge** when root cause is the same: "Missed pet-friendly filter" + "Missed budget filter" → **"Missing query constraints"**.

| Category | Definition | Count |
|----------|-----------|-------|
| Wrong classification | Output category doesn't match intent | 12 |
| Missing constraints | Required input conditions ignored | 8 |
| Format violation | Output doesn't match expected schema | 5 |
| Hallucinated fields | Output contains fields not in input | 3 |

Categories must come from traces. Do not brainstorm categories before reading traces. Do not use generic labels ("helpfulness", "coherence", "hallucination score").

---

## Step 4: Label Every Trace Against Every Category

Once categories are defined, go back and label **every** trace against **each** failure category (not just one label per trace). A single trace can fail multiple categories.

| Trace ID | Wrong classification | Missing constraints | Format violation | Hallucinated fields |
|----------|---------------------|---------------------|------------------|---------------------|
| abc123   | 1                   | 0                   | 0                | 0                   |
| ghi789   | 0                   | 1                   | 1                | 0                   |
| jkl012   | 0                   | 0                   | 0                | 0                   |

This gives you accurate per-category failure rates in the next step.

---

## Step 5: Compute Failure Rates

```apl
['<traces-dataset>']
| where _time > ago(7d)
| where ['attributes.gen_ai.capability.name'] == '<capability>'
| where ['attributes.gen_ai.operation.name'] == 'chat'
| summarize
    total = count(),
    errors = countif(['status.code'] == 'ERROR'),
    tool_call_traces = countif(tostring(['attributes.gen_ai.output.messages']) contains 'tool_call')
```

Prioritize by frequency. Highest-frequency category first.

---

## Step 6: Fix or Score

For each category, in this order:

### 1. Fix it directly

| Signal | Fix |
|--------|-----|
| Prompt never mentioned the requirement | Add the instruction |
| Tool missing or misconfigured | Add/fix the tool |
| Parsing bug in output handling | Fix the code |
| Wrong model for the task | Switch models |

Do not build a scorer for something you can fix directly.

### 2. Choose scorer type

Use code scorers for anything objective. Use LLM-as-judge only for criteria requiring interpretation.

| Check type | Scorer |
|------------|--------|
| Format valid (JSON, schema) | Code — `JSON.parse`, Zod, regex |
| Contains required keywords | Code — string matching |
| Exact category match | Code — equality |
| Field presence/absence | Code — property check |
| Tone, coherence, faithfulness | LLM-as-judge |
| Semantic correctness of free text | LLM-as-judge |

---

## Step 7: Map Categories to Scorers

| Category | Scorer type | Pattern (scorer-patterns.md) |
|----------|-------------|------------------------------|
| Wrong classification | Exact match | Pattern 1 |
| Missing constraints | Contains / subset match | Pattern 3 or 4 |
| Format violation | Schema validation | Pattern 7 |
| Hallucinated fields | Structured field check | Pattern 5 |
| Tone mismatch | LLM-as-judge (binary) | Pattern 9 |

### LLM-as-judge rules

- One judge per failure mode. No holistic "is this good?" judges.
- Binary pass/fail only. No Likert scales (1-5).
- Output schema: `{ critique: string, result: "Pass" | "Fail" }`. Critique comes first.
- Use 2-4 few-shot examples from trace review: 1 clear pass, 1 clear fail, 1 borderline.

---

## Step 8: Iterate on Categories

Run 2–3 rounds of category refinement before writing evals:

- **Merge** categories that turn out to share a root cause
- **Split** categories that bundle distinct failure modes
- **Clarify** definitions that caused labeling disagreements
- **Re-label** traces after any category change

Stop when ~100 traces are labeled with no new failure types in the last 20.

---

## Step 9: Write the Eval

Go to the main workflow (SKILL.md Step 5: Generate). Use failure categories as `metadata.purpose` tags. Include test cases from each category.

---

## Re-run After

- Model switches
- Significant prompt changes
- Adding/removing tools
- Production incidents involving the capability
- Eval scores plateau
