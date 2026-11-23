# Report

Return JSON keyed by service name, with an array of `ReturnFormat` results per service.
Include each requested rule once per service.

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

Use notes for relevant counts, assessment limits, or recommendations.
For `not_assessed`, explain what prevented a verdict.

Alongside the JSON, report each service’s score and assessed/requested rule count.
Count `pass` and `fail` as assessed. Scores describe the requested rules only.

## Scoring

Use each rule’s Impact to select its weight.

| Weight | Score |
| --- | ---: |
| Critical | 40 |
| Important | 30 |
| Normal | 20 |
| Low | 10 |

Score = 100 × sum of passed rule weights / sum of pass/fail rule weights; if none are assessed, report "not assessed".

## Example

Acme’s checkout assessment requests LOG-001–003.

| Service | Passed | Failed | Not assessed | Score | Assessed/requested |
| --- | --- | --- | --- | ---: | ---: |
| checkout | LOG-002 (30) | LOG-003 (40) | LOG-001 | 42.9 | 2/3 |
