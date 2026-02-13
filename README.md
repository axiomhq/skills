# Axiom Skills

Agent skills for working with [Axiom](https://axiom.co). Skills are folders of instructions, scripts, and resources that coding agents load dynamically to improve performance on specialized tasks.

## Available Skills

| Skill                                          | Description                                    |
| ---------------------------------------------- | ---------------------------------------------- |
| [sre](skills/sre/)                             | Hypothesis-driven SRE investigation with Axiom |
| [spl-to-apl](skills/spl-to-apl/)               | Translate Splunk SPL queries to Axiom APL      |
| [building-dashboards](skills/building-dashboards/) | Design and build Axiom dashboards from intent, templates, or Splunk migrations |
| [controlling-costs](skills/controlling-costs/) | Analyze query patterns to find unused data and optimize Axiom costs |
| [query-metrics](skills/query-metrics/) | Run metrics queries against Axiom MetricsDB and discover available metrics, tags, and values |

## Requirements

- **jq** - JSON processor (`brew install jq` or `apt install jq`)
- **curl** - HTTP client (usually pre-installed)
- **bc** - Calculator, needed by controlling-costs (`brew install bc` or `apt install bc`)

## Installation

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
token = "API_TOKEN"
org_id = "ORG_ID"
edge_url = "AXIOM_DOMAIN"

[deployments.staging]
url = "https://api.axiom.co"
token = "API_TOKEN"
org_id = "ORGANIZATION_ID"
edge_url = "AXIOM_DOMAIN"
```

- **`ORGANIZATION_ID`** - The organization ID. Get it from Settings → Organization.
- **`API_TOKEN`** - Use an advanced API token with minimal privileges.
- **`AXIOM_DOMAIN`** - The edge domain of your Axiom deployment.

The deployment name (e.g., `prod`, `staging`) is passed to scripts: `scripts/axiom-query prod "..."`

## License

MIT License - see [LICENSE](LICENSE)
