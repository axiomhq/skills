# axiom-build-dashboard

Design, create, and edit Axiom dashboards using Axiom MCP. Covers APL and metrics/MPL charts, SmartFilters, layout, sections, and migrations from Grafana or Splunk.

## Installation

```bash
npx skills add axiomhq/skills
```

## Prerequisite: Axiom MCP

Connect and authenticate [Axiom MCP](https://axiom.co/docs/console/intelligence/mcp-server) in your agent client. On clients that load MCP configuration from the Axiom plugin, sign in to the included connection. Otherwise, including skills-only installations, connect the server separately.

The skill checks the available tools and makes a relevant read-only call before proceeding. If MCP is missing, it asks you to connect. If authentication fails, it asks you to sign in again. Missing capabilities or permissions are reported separately. It does not fall back to HTTP scripts or `~/.axiom.toml` credentials.

MCP handles dataset discovery, query validation, and dashboard creation, updates, and deletion. Small chart edits use `updateDashboardChart`; layout and dashboard settings use `replaceDashboard`. Updates use the current version to avoid overwriting concurrent changes.

## Usage

Ask your agent to:

- “Build an API health dashboard for production.”
- “Change the latency panel on this dashboard to p99.”
- “Migrate this Grafana dashboard to Axiom.”

The agent validates queries against your data, applies the requested change, reads it back, and returns the dashboard link from MCP.

## Local helpers

These helpers only generate or validate JSON; they do not connect to Axiom. Bash and `jq` are needed to run them; section ID generation also uses `openssl` and `xxd`.

| Helper | Purpose |
|---|---|
| `chart-add` | Generate an APL or MPL chart with appropriate unit handling |
| `layout-pack` | Arrange charts on a 12-column grid |
| `dashboard-assemble` | Compose chart files, layout, settings, and sections |
| `dashboard-validate` | Check local structure and chart constraints |
| `dashboard-normalize.jq` | Fill missing layout defaults without replacing existing values |
| `dashboard-from-template`, `dashboard-new` | Prepare JSON from bundled templates |
| `metrics/unit-for` | Map chart units to display suffixes |

See [local composition](reference/local-composition.md) for examples. The previous dashboard and metrics HTTP wrappers have been removed; use MCP for those operations.

## References

Start with [SKILL.md](SKILL.md). Detailed chart configuration, query patterns, migrations, and templates live in `reference/`. [SPEC.md](SPEC.md) defines the maintenance contract, scope, and acceptance expectations. [Manual scenarios](tests/manual-tests.md) cover connection handling and the MCP workflow.
