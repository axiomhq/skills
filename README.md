# Axiom Skills

Agent skills for working with [Axiom](https://axiom.co). Skills are folders of instructions, scripts, and resources that coding agents load dynamically to improve performance on specialized tasks.

## Available Skills

| Skill                                          | Description                                    |
| ---------------------------------------------- | ---------------------------------------------- |
| [sre](skills/sre/)                             | Hypothesis-driven SRE investigation with Axiom |
| [spl-to-apl](skills/spl-to-apl/)               | Translate Splunk SPL queries to Axiom APL      |
| [building-dashboards](skills/building-dashboards/) | Design and build Axiom dashboards from intent, templates, or Splunk migrations |

## Installation

### Amp

```bash
amp skill add axiomhq/skills/sre
amp skill add axiomhq/skills/spl-to-apl
amp skill add axiomhq/skills/building-dashboards
```

### Claude Code

```bash
git clone https://github.com/axiomhq/skills.git ~/.claude/skills/axiom-skills
```

## License

MIT License - see [LICENSE](LICENSE)
