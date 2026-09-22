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

## MCP Server

`.mcp.json` configures the hosted [Axiom MCP Server](https://github.com/axiomhq/mcp) at `https://mcp.axiom.co/mcp` for agent clients that install plugins from a manifest. See the [MCP setup docs](https://axiom.co/docs/console/intelligence/mcp-server).

## Installation

### Codex

Add the Axiom marketplace:

```bash
codex plugin marketplace add axiomhq/skills
codex plugin add axiom@axiom
```

In Codex Desktop, you can also install **Axiom** from that marketplace in the plugin directory. The plugin includes the same shared skills as the Grok plugin, including SRE, and registers the hosted MCP server. It can be used in Codex Desktop and CLI versions that support plugins.

Authorize the MCP connection in your browser when prompted. APL queries use `queryDataset`; metrics queries use `queryMetrics` with MPL. If you already configured the Axiom MCP server manually, use one connection to avoid duplicate tool registrations.

The scripts included in some skills still use their documented dependencies and Axiom configuration below. MCP OAuth does not configure those script credentials.

### Claude Code

```bash
claude plugin marketplace add axiomhq/skills
claude plugin install axiom@axiom
```

The plugin loads the shared skills and `.mcp.json`, as the Grok plugin does. Restart Claude Code after installation and use `/mcp` to authorize **axiom** when prompted. Skill scripts still require their documented dependencies and configuration below.

### Cursor

For a local install, clone this repository into Cursor's local plugin directory, then reload Cursor:

```bash
git clone https://github.com/axiomhq/skills.git ~/.cursor/plugins/local/axiom
```

If that directory already exists, update its checkout instead of cloning over it. Teams and Enterprise administrators can also import `axiomhq/skills` through **Plugins & MCPs → Add Marketplace → Import from Repo** in the Cursor dashboard.

The plugin uses the shared skills and explicitly loads `.mcp.json`. Authorize the Axiom connection when prompted; skill scripts use their separate configuration below. These are direct-install routes; public marketplace availability depends on review. See [Cursor's plugin guide](https://cursor.com/docs/plugins).

### Skills installer

```bash
npx skills add axiomhq/skills
```

This installs all skills. Skills have dependencies on each other (e.g., `controlling-costs` depends on `sre` and `building-dashboards`), so installing all is recommended.

After installing, run the setup script to configure Axiom access:

```bash
~/.config/agents/skills/sre/scripts/setup
```

## Configuration

Most skills require access to Axiom. Create `~/.axiom.toml` with your deployment(s):

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
