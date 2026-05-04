# Axiom Skills

Agent skills for working with [Axiom](https://axiom.co). Skills are folders of instructions, scripts, and resources that coding agents load dynamically to improve performance on specialized tasks.

## Available Skills

| Skill                                          | Description                                    |
| ---------------------------------------------- | ---------------------------------------------- |
| [axiom-platform](skills/axiom-platform/)       | Axiom-native observability and MetricsDB workflows |
| [sre](skills/sre/)                             | Hypothesis-driven SRE investigation that composes platform integrations |
| [spl-to-apl](skills/spl-to-apl/)               | Translate Splunk SPL queries to Axiom APL      |
| [building-dashboards](skills/building-dashboards/) | Design and build Axiom dashboards from intent, templates, Splunk migrations, and metrics/MPL chart payloads (works with [query-metrics](skills/query-metrics/)) |
| [controlling-costs](skills/controlling-costs/) | Analyze query patterns to find unused data and optimize Axiom costs |
| [query-metrics](skills/query-metrics/) | Run metrics queries against Axiom MetricsDB and discover available metrics, tags, and values |
| [writing-evals](skills/writing-evals/) | Scaffold evaluation suites for the Axiom AI SDK |

## Requirements

- **jq** - JSON processor (`brew install jq` or `apt install jq`)
- **curl** - HTTP client (usually pre-installed)
- **bc** - Calculator, needed by controlling-costs (`brew install bc` or `apt install bc`)

## Installation

```bash
npx skills add axiomhq/skills
```

This installs all skills. Skills have dependencies on each other (e.g., `controlling-costs` depends on `sre` and `building-dashboards`), so installing all is recommended.

## Maintainers

`axiom-platform` is the canonical source for shared Axiom scripts. `sre` and
`query-metrics` mirror selected scripts so standalone installs keep working.

Sync mirrors after changing canonical scripts:

```bash
scripts/sync-axiom-platform-scripts.sh --write
```

Note: `skills/sre/scripts/axiom-api` intentionally remains SRE-local for
backward compatibility; it is not mirrored from `axiom-platform`.

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
