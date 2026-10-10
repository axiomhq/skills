# Axiom Skills

Agent skills for working with [Axiom](https://axiom.co). Skills are folders of instructions, scripts, and resources that coding agents load dynamically to improve performance on specialized tasks.

## Available Skills

| Skill                                          | Description                                    |
| ---------------------------------------------- | ---------------------------------------------- |
| [axiom-sre](skills/sre/)                       | Hypothesis-driven SRE investigation with Axiom |
| [axiom-spl-to-apl](skills/axiom-spl-to-apl/)   | Translate Splunk SPL queries to Axiom APL      |
| [axiom-building-dashboards](skills/axiom-building-dashboards/) | Design and build Axiom dashboards from intent, templates, Splunk migrations, and metrics/MPL chart payloads |
| [axiom-alerting](skills/axiom-alerting/) | Unified monitor + notifier management for Axiom alerting via the v2 API |
| [axiom-controlling-costs](skills/axiom-controlling-costs/) | Analyze query patterns to find unused data and optimize Axiom costs |
| [axiom-metrics-chart](skills/axiom-metrics-chart/) | Render saved metrics v2/v3 JSON as line charts; zero-dependency ASCII by default, optional gnuplot PNG/SVG/sixel |

## Requirements

- **jq** - JSON processor (`brew install jq` or `apt install jq`)
- **curl** - HTTP client (usually pre-installed)
- **bc** - Calculator, needed by axiom-controlling-costs (`brew install bc` or `apt install bc`)
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

### Cursor

On Teams or Enterprise, an admin must enable **Allow Local Plugin Imports**. Then clone into Cursor's local plugin directory:

```bash
git clone https://github.com/axiomhq/skills.git ~/.cursor/plugins/local/axiom
```

Reload Cursor and authorize Axiom when prompted. To update an existing install, run `git -C ~/.cursor/plugins/local/axiom pull --ff-only`, then reload Cursor.

Teams and Enterprise admins can also import `axiomhq/skills` through **Plugins & MCPs → Add Marketplace → Import from Repo** in the Cursor dashboard. See [Cursor's plugin guide](https://cursor.com/docs/plugins).

### Gemini CLI

```bash
gemini extensions install https://github.com/axiomhq/skills
```

Restart Gemini CLI, then use `/mcp auth axiom` to authorize Axiom.

To update, run `gemini extensions update axiom`, then restart Gemini CLI. See the [Gemini extension reference](https://geminicli.com/docs/extensions/reference/).

### Skills installer

```bash
npx skills add axiomhq/skills
```

This installs all skills. Skills have dependencies on each other (e.g., `axiom-controlling-costs` depends on `axiom-sre` and `axiom-building-dashboards`), so installing all is recommended.

For SRE, run `scripts/init` from the installed skill directory; its location depends on your agent or plugin installer. From a checkout of this repository:

```bash
./skills/sre/scripts/init
```

This initializes SRE configuration and memory under `~/.config/axiom-sre/`. Edit the generated `config.toml` to add your deployments, then run the initializer again. See [SRE setup](skills/sre/README.md#setup) for configuration and migration from `~/.axiom.toml`.

## Configuration

Skills use your configured credentials to query Axiom and optional Grafana, Pyroscope, Sentry, Slack, and Kubernetes connections. They can update dashboards and alerts. SRE stores investigation memory locally and can sync it to a Git repository you configure.

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

## Releases

Use conventional commit titles: `feat:`, `fix:`, or `docs:`. Release Please opens a PR to update `version.txt`, all five client manifests, and `CHANGELOG.md`. The daily run also picks up SRE sync commits.

Merging the release PR automatically creates a GitHub release and attaches `axiom-openai-plugin.zip` from that commit. Download the ZIP and submit it to OpenAI using the docs below.

### Marketplace docs

- [OpenAI / Codex](https://developers.openai.com/plugins/deploy/submission)
- [Claude plugins](https://claude.com/docs/plugins/submit)
- [Cursor](https://cursor.com/docs/plugins)
- [Gemini CLI](https://geminicli.com/docs/extensions/releasing/)
- [Grok Build](https://github.com/xai-org/plugin-marketplace/blob/main/CONTRIBUTING.md)

## License

MIT License - see [LICENSE](LICENSE)
