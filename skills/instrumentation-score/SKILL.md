---
name: instrumentation-score
description: Assess instrumentation quality against spec rules using Axiom queries.
---

# Instrumentation score

Read the requested rules from `rules/` when needed.
Available: [LOG-001](rules/LOG-001.md), [LOG-002](rules/LOG-002.md), [LOG-003](rules/LOG-003.md),
[MET-001](rules/MET-001.md), [MET-002](rules/MET-002.md), [MET-003](rules/MET-003.md),
[MET-004](rules/MET-004.md), [MET-005](rules/MET-005.md), [MET-006](rules/MET-006.md),
[MET-007](rules/MET-007.md), [MET-008](rules/MET-008.md),
[RES-001](rules/RES-001.md), [RES-002](rules/RES-002.md), [RES-003](rules/RES-003.md),
[RES-004](rules/RES-004.md), [RES-005](rules/RES-005.md), [RES-006](rules/RES-006.md),
[RES-007](rules/RES-007.md), [RES-010](rules/RES-010.md), [SDK-001](rules/SDK-001.md),
[SPA-001](rules/SPA-001.md), [SPA-002](rules/SPA-002.md), [SPA-003](rules/SPA-003.md),
[SPA-004](rules/SPA-004.md), [SPA-005](rules/SPA-005.md), [SPA-006](rules/SPA-006.md).

1. Discover the dataset schema and relevant values. Fix the service scope and
   absolute time window before querying.
2. Adapt the example query to the rule's criteria and actual data. Check field
   meanings, missing values, observation coverage, and representative records.
3. Record `pass`, `fail`, or `not_assessed`. Missing evidence or unresolved
   ambiguity means `not_assessed`; explain why.

Return JSON keyed by service name, with an array of `ReturnFormat` results per service.

```graphql
type Passed = {
  rule: string;
  verdict: "pass";
  queryUrl: string;
};

type Failed = {
  rule: string;
  verdict: "fail";
  queryUrl: string;
  notes: string;
};

type NotAssessed = {
  rule: string;
  verdict: "not_assessed";
  notes: string;
};

type ReturnFormat = Passed | Failed | NotAssessed;
```

Use notes for relevant counts, assessment limits, or recommendations. Report each
service's calculated score and assessed/requested rule count alongside the JSON.
Scores describe the requested rules only.

| Weight | Score |
| --- | ---: |
| Critical | 40 |
| Important | 30 |
| Normal | 20 |
| Low | 10 |

Score = 100 × sum of passed rule weights / sum of pass/fail rule weights; if none are assessed, report "not assessed".

Source: [instrumentation-score/spec, Apache-2.0](https://github.com/instrumentation-score/spec/tree/ef080a8a42d2fe73a4f0ed8d64eda93bfe84adc7/rules).
