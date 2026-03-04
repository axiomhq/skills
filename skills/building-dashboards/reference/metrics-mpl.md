# Metrics/MPL Chart Contract

This reference documents the chart query contract for *metrics-backed* dashboard charts.

Unlike event charts (which are driven by APL in `query.apl`), metrics charts are persisted with metrics-specific fields:

- `query.metricsDataset`
- `query.metricsMetric`
- `query.metricsFilter`
- `query.metricsTransformations`

The console still generates an APL preview from these fields, but the source of truth for metrics charts is the metrics payload.

## Canonical JSON Shape

```json
{
  "type": "TimeSeries",
  "query": {
    "apl": "`otel-metrics`:`http.server.duration`\n| where `service.name` == \"api\"\n| align to 1m using avg\n| group by `service.name` using avg",
    "metricsDataset": "otel-metrics",
    "metricsMetric": "http.server.duration",
    "metricsFilter": {
      "op": "and",
      "children": [
        {
          "op": "==",
          "field": "service.name",
          "value": "api"
        }
      ]
    },
    "metricsTransformations": [
      {
        "type": "align",
        "to": "1m",
        "using": "avg",
        "uuid": "align-1"
      },
      {
        "type": "group",
        "by": ["service.name"],
        "using": "avg",
        "uuid": "group-1"
      }
    ]
  }
}
```

## `metricsFilter` Node Shapes

`metricsFilter` is a recursive union.

The only supported logical operator is `and`.

1. **Logical node**

```json
{
  "op": "and",
  "children": [
    { "op": "==", "field": "service.name", "value": "api" },
    { "op": ">", "field": "status.code", "value": "499" }
  ]
}
```

2. **Leaf node**

```json
{
  "op": "==",
  "field": "service.name",
  "value": "api"
}
```

Supported leaf operators: `==`, `!=`, `>`, `<`, `>=`, `<=`.

## Logical-Root Rule (Critical)

The root of `metricsFilter` must be an `and` logical node, even for a single filter or no filters.

### ✅ Correct (single filter)

```json
{
  "op": "and",
  "children": [
    { "op": "==", "field": "service.name", "value": "api" }
  ]
}
```

### ✅ Correct (multiple filters)

```json
{
  "op": "and",
  "children": [
    { "op": "==", "field": "service.name", "value": "api" },
    { "op": "==", "field": "deployment.environment", "value": "prod" }
  ]
}
```

### ❌ Incorrect (children on a leaf root)

```json
{
  "op": "==",
  "field": "service.name",
  "value": "api",
  "children": [
    { "op": "==", "field": "deployment.environment", "value": "prod" }
  ]
}
```

In this malformed shape, the leaf is treated as a leaf and child predicates are effectively dropped/ignored during processing.

The UI may temporarily represent a single filter as a leaf while editing. For skill-generated JSON and persisted chart payloads, normalize back to an `and` root before writing dashboard config.

## Supported `metricsTransformations` Shapes

```json
[
  { "type": "align", "to": "1m", "using": "avg", "uuid": "align-1" },
  { "type": "group", "by": ["service.name"], "using": "sum", "uuid": "group-1" },
  { "type": "map", "expression": "rate", "uuid": "map-1" },
  {
    "type": "bucket",
    "to": "1m",
    "by": ["service.name"],
    "fn": "histogram",
    "histogramRateKind": "rate",
    "using": [
      { "fn": "avg" },
      { "fn": "percentile", "argument": 95 }
    ],
    "uuid": "bucket-1"
  }
]
```

Notes:
- `bucket.fn` is optional and defaults to `histogram`.
- `histogramRateKind` applies to histogram interpolation variants.
- Preserve additional transformation fields (for example `bucket.fn`, `bucket.histogramRateKind`, `map.argument`) when round-tripping form values.

## Transformation Order

`metricsTransformations` are applied **in array order**. Do not reorder unless requested.

If the array is:

```json
[
  { "type": "align", "to": "1m", "using": "avg", "uuid": "align-1" },
  { "type": "group", "by": ["service.name"], "using": "sum", "uuid": "group-1" },
  { "type": "map", "expression": "_value * 8", "uuid": "map-1" }
]
```

The generated pipeline order is:

```apl
| align to 1m using avg
| group by `service.name` using sum
| map _value * 8
```

## Authoring Checklist

When generating metrics chart JSON:

1. Set `metricsDataset` and `metricsMetric`.
2. Use `metricsFilter` with a logical `{"op":"and","children":[]}` root **always** (even for zero or one predicate).
3. Keep each filter leaf as `{op, field, value}` only.
4. Preserve `metricsTransformations` order.
5. Keep `query.apl` aligned with the metrics payload (for UI preview/debugging), but treat metrics fields as source-of-truth.

## Source Verification

Behavior above is verified in `axiomhq/app`:

- Metrics filter schema, logical/leaf union, and supported operators:
  - `packages/swagger/api/dashboards/dashboard.schema.ts`
- Metrics filter guards/constructors (logical root is `and`; non-logical leaves are separate shape):
  - `apps/console/src/hubs/dash/routes/query/builderHelpers/filterManipulation.ts`
- APL generation order (`dataset/metric` → `where` from filter → transformations in sequence, including `bucket`):
  - `apps/console/src/hubs/dash/util/apl/queryRequestToAplRequest.ts`
- Query-builder normalization/de-normalization behavior while editing metrics filters:
  - `apps/console/src/hubs/dash/routes/query/components/QueryFormBuilder.tsx`
- Raw `metricsTransformations` merge to preserve extended fields during form submit:
  - `apps/console/src/hubs/dash/routes/query/components/QueryForm.tsx`
- Assistant-side metrics filter schema for generated dashboards:
  - `apps/console/src/routes/frapi/-trpc/routers/assistant/generateDashboard.ts`
