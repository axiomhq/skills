# Assessment

1. Set the datasets, services, environment, and absolute time window. Inspect the schema, field meanings, and relevant values.

2. Read each requested rule below. Adapt its example query to the actual data. Follow the criteria, including required grouping, comparison periods, and observation coverage.

3. Assess every requested rule for each service. Record `pass`, `fail`, or `not_assessed`. If evidence is missing or ambiguous, use `not_assessed` and explain the gap.

## Rules

| Group | Rules |
| --- | --- |
| Logs | [LOG-001](../rules/LOG-001.md), [LOG-002](../rules/LOG-002.md), [LOG-003](../rules/LOG-003.md) |
| Metrics | [MET-001](../rules/MET-001.md), [MET-002](../rules/MET-002.md), [MET-003](../rules/MET-003.md), [MET-004](../rules/MET-004.md), [MET-005](../rules/MET-005.md), [MET-006](../rules/MET-006.md), [MET-007](../rules/MET-007.md), [MET-008](../rules/MET-008.md) |
| Resources | [RES-001](../rules/RES-001.md), [RES-002](../rules/RES-002.md), [RES-003](../rules/RES-003.md), [RES-004](../rules/RES-004.md), [RES-005](../rules/RES-005.md), [RES-006](../rules/RES-006.md), [RES-007](../rules/RES-007.md), [RES-010](../rules/RES-010.md) |
| SDK | [SDK-001](../rules/SDK-001.md) |
| Traces and spans | [SPA-001](../rules/SPA-001.md), [SPA-002](../rules/SPA-002.md), [SPA-003](../rules/SPA-003.md), [SPA-004](../rules/SPA-004.md), [SPA-005](../rules/SPA-005.md), [SPA-006](../rules/SPA-006.md) |

## Example

Acme’s checkout service sends logs to `checkout-logs`.
The team requests LOG-001–003 for production.

| Step | Checkout example |
| --- | --- |
| 1. Scope | Select `checkout` in production, from `2026-11-01T12:00:00Z` to `2026-11-01T13:00:00Z`. |
| 2. Adapt | Schema inspection finds `severity_number`. Use that field to assess LOG-002. |
| 3. Assess | LOG-002 passes because every observed record has a severity number. LOG-003 fails because a record contains a credential. LOG-001 remains unassessed because one hour cannot establish its 14-day condition. |

Source: [instrumentation-score/spec, Apache-2.0](https://github.com/instrumentation-score/spec/tree/ef080a8a42d2fe73a4f0ed8d64eda93bfe84adc7/rules).
