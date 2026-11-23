# axiom-control-costs

Analyze Axiom usage and query history, identify potential waste, and build cost dashboards and monitors through Axiom MCP.

## Requirements

Connect and authenticate [Axiom MCP](https://axiom.co/docs/console/intelligence/mcp-server) with access to the intended organization. Plugin installations may include the connection; skills-only installations require connecting it separately.

The skill asks you to connect or sign in when MCP is missing or authentication fails. Missing capabilities and denied permissions are reported separately. It does not use SRE API wrappers, direct HTTP, or a separate token file.

Usage analysis needs an audit dataset with usage events. Query-coverage analysis additionally needs query history; dashboard and alert creation do not require that history dataset.

Local helpers require Python 3.10+, Bash, and `jq`. They make no network calls and do not read credentials. Dashboard and monitor workflows use the bundled `axiom-build-dashboard` and `axiom-alerting` skills.

## Example requests

- "Find which datasets drive our ingestion and identify potential waste."
- "Create a cost dashboard using our audit dataset."
- "Set up cost alerts against our 167 TB/day allowance using our existing operations notifier."
- "Review the cost monitors without changing them."

## Local helpers

| Helper | Purpose |
|---|---|
| `prepare-queries` | Prepare bounded APL query arguments for the agent to execute through MCP |
| `baseline-stats` | Rank datasets from exported usage results |
| `analyze-query-coverage` | Analyze exported parsed queries, schema, and sampled field values |
| `build-dashboard` | Prepare dashboard JSON |
| `build-monitors` | Prepare three monitor definitions, without creating resources |
| `lib/ast-parser.jq` | Extract APL field references and query patterns |

See [analysis workflow](reference/analysis-workflow.md) for commands and input formats. The old deployment-based commands, `setup`, `list-notifiers`, and `create-monitors` are replaced by MCP orchestration and these local helpers.

See [SKILL.md](SKILL.md) for runtime guidance and [SPEC.md](SPEC.md) for the maintenance contract and validation boundaries.
