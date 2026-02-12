# Axiom Metrics

A skill for querying Axiom MetricsDB using MPL.

## Description

Queries OpenTelemetry metrics stored in Axiom's MetricsDB using MPL, a purpose-built query language. Discovers available metrics, tags, and tag values via info endpoints.

## When to Use

- Querying metrics data from Axiom MetricsDB
- Exploring available metrics, tags, and tag values in a dataset
- Investigating OTel metrics data
- Checking metric values for debugging or monitoring

## Installation

### Amp

```bash
amp skill add --global axiomhq/axiom-metrics
```

### Claude Code (via marketplace)

```bash
/plugin install axiom-metrics@axiom-marketplace
```

## Usage

Ask to query or explore metrics:
- "Query the CPU usage metric from axiom-dev.metrics"
- "What metrics are available in the dataset?"
- "Show me tag values for the service.name tag"
- "Find metrics related to http requests"

## License

MIT
