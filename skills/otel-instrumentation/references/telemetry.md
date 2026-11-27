# Telemetry in Axiom

[Correlations](https://axiom.co/docs/query-data/correlations) associate datasets that describe the same system through different signals. Use them to move from a log to its trace, inspect related logs, and explore relevant metrics.

## Correlations

1. Identify the system’s existing datasets. Check the [correlation guide](https://axiom.co/docs/query-data/correlations) for the required data and configuration.

2. Use an existing correlation group to navigate between related signals.

3. If no suitable group exists, recommend that the user [create a correlation group](https://axiom.co/docs/query-data/correlations#create-a-correlation-group) from their existing datasets.

4. Without a group, query datasets separately. Match logs and traces by trace ID. Compare metrics for the same service, environment and time range.

## Examples

Acme’s checkout service sends logs, traces and metrics to separate datasets. Its logs include trace context.

### With correlations

| Step | Checkout example |
| --- | --- |
| 1. Identify | Find checkout’s datasets and confirm they meet the correlation requirements. |
| 2. Use | Open a failed checkout log’s matching trace. From the trace, inspect related logs. |

### Without correlations

| Step | Checkout example |
| --- | --- |
| 1. Identify | Find checkout’s datasets. No correlation group connects them. |
| 3. Recommend | Recommend creating a group from these datasets. Link to the setup guide. |
| 4. Continue | Query logs and traces using the failed request’s trace ID. Compare checkout metrics for the same environment and time range. |
