import type { TranslationCase } from "../../../eval-tooling/src/shared/types";

/**
 * Test cases from skills/spl-to-apl/tests/test-queries.md
 * These are validated against Axiom Playground (play.axiom.co) with real datasets.
 *
 * Datasets used:
 * - sample-http-logs: HTTP request logs with status, uri, method, req_duration_ms, geo.*, id fields
 * - otel-demo-traces: OpenTelemetry trace spans with service.name, duration, status_code fields
 *
 * Note: Time filters are not included in expected APL because the source SPL queries don't
 * specify time ranges. In Splunk, time is typically set via UI picker, not in the query.
 * The eval harness injects time via API startTime/endTime params for execution.
 */
export const testCases: TranslationCase[] = [
  // === sample-http-logs dataset ===
  {
    id: "basic-count-by-status",
    name: "Basic count by status",
    spl: `index=sample-http-logs | stats count by status`,
    expectedApl: `['sample-http-logs']
| summarize count() by status`,
    category: "aggregation",
    dataset: "sample-http-logs",
  },
  {
    id: "top-10-uris",
    name: "Top 10 URIs",
    spl: `index=sample-http-logs | top limit=10 uri`,
    expectedApl: `['sample-http-logs']
| summarize count() by uri
| top 10 by count_`,
    category: "aggregation",
    dataset: "sample-http-logs",
  },
  {
    id: "error-rate-over-time",
    name: "Error rate over time",
    spl: `index=sample-http-logs | timechart span=5m count(eval(status>=500)) as errors, count as total | eval error_rate=errors/total*100`,
    expectedApl: `['sample-http-logs']
| summarize errors = countif(toint(status) >= 500), total = count() by bin(_time, 5m)
| extend error_rate = toreal(errors) / total * 100`,
    category: "timeseries",
    dataset: "sample-http-logs",
    notes: "status field is string in sample-http-logs, needs toint()",
  },
  {
    id: "request-duration-percentiles",
    name: "Request duration percentiles by method",
    spl: `index=sample-http-logs | stats perc50(req_duration_ms) as p50, perc95(req_duration_ms) as p95, perc99(req_duration_ms) as p99 by method`,
    expectedApl: `['sample-http-logs']
| summarize 
    p50 = percentile(req_duration_ms, 50),
    p95 = percentile(req_duration_ms, 95),
    p99 = percentile(req_duration_ms, 99)
  by method`,
    category: "aggregation",
    dataset: "sample-http-logs",
  },
  {
    id: "geo-distribution",
    name: "Geo distribution top 20",
    spl: `index=sample-http-logs | iplocation clientip | stats count by Country, City | sort - count | head 20`,
    expectedApl: `['sample-http-logs']
| summarize count() by ['geo.country'], ['geo.city']
| order by count_ desc
| take 20`,
    category: "geo",
    dataset: "sample-http-logs",
    notes: "sample-http-logs has pre-computed geo.country and geo.city fields",
  },
  {
    id: "unique-users-per-endpoint",
    name: "Unique users per endpoint",
    spl: `index=sample-http-logs | stats dc(id) as unique_users, count as requests by uri | sort - unique_users`,
    expectedApl: `['sample-http-logs']
| summarize unique_users = dcount(id), requests = count() by uri
| order by unique_users desc`,
    category: "aggregation",
    dataset: "sample-http-logs",
  },
  {
    id: "conditional-severity",
    name: "Conditional field creation (severity)",
    spl: `index=sample-http-logs | eval severity=if(status>=500, "error", if(status>=400, "warning", "ok")) | stats count by severity`,
    expectedApl: `['sample-http-logs']
| extend severity = case(
    toint(status) >= 500, "error",
    toint(status) >= 400, "warning",
    "ok"
)
| summarize count() by severity`,
    category: "conditional",
    dataset: "sample-http-logs",
    notes: "status field is string in sample-http-logs, needs toint()",
  },

  // === otel-demo-traces dataset ===
  {
    id: "span-duration-by-service",
    name: "Span duration by service",
    spl: `index=otel-demo-traces | stats avg(duration) as avg_duration, perc95(duration) as p95_duration by service.name`,
    expectedApl: `['otel-demo-traces']
| summarize 
    avg_duration = avg(duration),
    p95_duration = percentile(duration, 95)
  by ['service.name']`,
    category: "aggregation",
    dataset: "otel-demo-traces",
  },
  {
    id: "error-spans-over-time",
    name: "Error spans over time by service",
    spl: `index=otel-demo-traces status_code="ERROR" | timechart span=1m count by service.name`,
    expectedApl: `['otel-demo-traces']
| where status_code == "ERROR"
| summarize count() by bin(_time, 1m), ['service.name']`,
    category: "timeseries",
    dataset: "otel-demo-traces",
  },
];

