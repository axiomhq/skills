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

## License

MIT License - see [LICENSE](LICENSE)
