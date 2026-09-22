# Axiom Skills

Agent skills for working with [Axiom](https://axiom.co). Skills are folders of instructions, scripts, and resources that coding agents load dynamically to improve performance on specialized tasks.

## Available Skills

| Skill                                          | Description                                    |
| ---------------------------------------------- | ---------------------------------------------- |
| [sre](skills/sre/)                             | Hypothesis-driven SRE investigation with Axiom |
| [spl-to-apl](skills/spl-to-apl/)               | Translate Splunk SPL queries to Axiom APL      |
| [building-dashboards](skills/building-dashboards/) | Design and build Axiom dashboards from intent, templates, Splunk migrations, and metrics/MPL chart payloads (works with [query-metrics](skills/query-metrics/)) |
| [axiom-alerting](skills/axiom-alerting/) | Unified monitor + notifier management for Axiom alerting via the v2 API |
| [controlling-costs](skills/controlling-costs/) | Analyze query patterns to find unused data and optimize Axiom costs |
| [query-metrics](skills/query-metrics/) | Run metrics queries against Axiom MetricsDB and discover available metrics, tags, and values |
| [metrics-chart](skills/metrics-chart/) | Render metrics query results (`application/vnd.metrics.v3+json`) as line charts; zero-dependency ASCII by default, optional gnuplot PNG/SVG/sixel (pairs with [query-metrics](skills/query-metrics/)) |
| [writing-evals](skills/writing-evals/) | Scaffold evaluation suites for the Axiom AI SDK |

## Requirements

- **jq** - JSON processor (`brew install jq` or `apt install jq`)
- **curl** - HTTP client (usually pre-installed)
- **bc** - Calculator, needed by controlling-costs (`brew install bc` or `apt install bc`)
- **timeout** or **gtimeout** - Required by SRE scripts (`brew install coreutils` on macOS)

## MCP Server

`.mcp.json` configures the hosted [Axiom MCP Server](https://github.com/axiomhq/mcp) at `https://mcp.axiom.co/mcp` for agent clients that install plugins from a manifest. APL queries use `queryDataset`; metrics queries use `queryMetrics` with MPL. See the [MCP setup docs](https://axiom.co/docs/console/intelligence/mcp-server).

## Installation

### Codex

Register Axiom's marketplace so Codex can find its plugins:

```bash
codex plugin marketplace add axiomhq/skills
```

Install the Axiom plugin, which includes all skills in this repository and the hosted MCP server connection:

```bash
codex plugin add axiom@axiom
```

In `axiom@axiom`, the first name is the plugin and the second is the marketplace.

Authorize Axiom in your browser when prompted. If you already added Axiom MCP manually, keep one connection to avoid duplicate tools.

To update, run `codex plugin marketplace upgrade axiom`, then `codex plugin add axiom@axiom`. Start a new session to use the update.

### Claude Code

```bash
claude plugin marketplace add axiomhq/skills
claude plugin install axiom@axiom
```

Restart Claude Code, then use `/mcp` to authorize Axiom.

To update, run `claude plugin marketplace update axiom`, then `claude plugin update axiom@axiom`. Restart Claude Code to load it.

### Skills installer

```bash
npx skills add axiomhq/skills
```

This installs all skills. Skills have dependencies on each other (e.g., `controlling-costs` depends on `sre` and `building-dashboards`), so installing all is recommended.

For SRE, run `scripts/init` from the installed skill directory; its location depends on your agent or plugin installer. From a checkout of this repository:

```bash
./skills/sre/scripts/init
```

This initializes SRE configuration and memory under `~/.config/axiom-sre/`. Edit the generated `config.toml` to add your deployments, then run the initializer again. See [SRE setup](skills/sre/README.md#setup) for configuration and migration from `~/.axiom.toml`.

## Configuration

SRE uses `~/.config/axiom-sre/config.toml` with `[axiom.deployments.<name>]` sections. Dashboard, alerting, and metrics scripts use the separate `~/.axiom.toml` format below. Cost-control workflows use SRE for queries and dashboard scripts for deployment, so configure both when using those workflows. MCP OAuth does not configure these script credentials.

For scripts that use `~/.axiom.toml`, add your deployment(s):

```toml
[deployments.prod]
url = "https://api.axiom.co"
token = "xaat-your-api-token"
org_id = "your-org-id"

[deployments.staging]
url = "https://api.axiom.co"
token = "xaat-your-staging-token"
org_id = "your-staging-org-id"
```

**To get these values:**
- **`org_id`** - The organization ID. Get it from Settings → Organization.
- **`token`** - Use an advanced API token with minimal privileges.

The deployment name (e.g., `prod`, `staging`) is passed to scripts: `scripts/axiom-query prod "..."`

## License

MIT License - see [LICENSE](LICENSE)
