# Axiom Skills

Agent skills for working with [Axiom](https://axiom.co). Skills are folders of instructions, scripts, and resources that coding agents load dynamically to improve performance on specialized tasks.

## Available Skills

| Skill                                          | Description                                    |
| ---------------------------------------------- | ---------------------------------------------- |
| [sre](skills/sre/)                             | Hypothesis-driven SRE investigation with Axiom |
| [spl-to-apl](skills/spl-to-apl/)               | Translate Splunk SPL queries to Axiom APL      |
| [building-dashboards](skills/building-dashboards/) | Design and build Axiom dashboards from intent, templates, or Splunk migrations |
| [controlling-costs](skills/controlling-costs/) | Analyze query patterns to find unused data and optimize Axiom costs |

## Installation

### Amp

```bash
amp skill add axiomhq/skills/sre
amp skill add axiomhq/skills/spl-to-apl
amp skill add axiomhq/skills/building-dashboards
amp skill add axiomhq/skills/controlling-costs
```

### npx (Claude Code, Cursor, Codex, and more)

```bash
# Install all skills
npx skills add axiomhq/skills

# Install specific skill
npx skills add axiomhq/skills -s sre
npx skills add axiomhq/skills -s spl-to-apl
npx skills add axiomhq/skills -s building-dashboards
npx skills add axiomhq/skills -s controlling-costs
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
1. **org_id**: Settings → Organization → Copy the org ID (or from URL: `app.axiom.co/{org_id}/...`)
2. **token**: Settings → API Tokens → Create new token with query permissions

The deployment name (e.g., `prod`, `staging`) is passed to scripts: `scripts/axiom-query prod "..."`

## License

MIT License - see [LICENSE](LICENSE)
