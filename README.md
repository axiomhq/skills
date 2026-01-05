# axiom-sre

Expert SRE investigator skill for AI coding agents. Uses hypothesis-driven methodology and systematic triage. Can query [Axiom](https://axiom.co) observability when available.

## Installation

### Amp

```bash
amp skill add axiomhq/axiom-sre
```

### Claude Code

```bash
git clone https://github.com/axiomhq/axiom-sre.git ~/.claude/skills/axiom-sre
```

### Manual

Clone or copy to your skills directory and reference in your agent config.

## Setup

### Axiom Credentials (optional)

To enable Axiom queries, create `~/.axiom.toml`:

```toml
[deployments.dev]
url = "https://api.axiom.co"
token = "xaat-your-token-here"
org_id = "your-org-id"
```

The memory system is initialized automatically on first use.

## What's Included

- **SKILL.md** — Main skill instructions (SRE methodology, APL patterns, memory system)
- **scripts/** — Axiom API helpers and memory self-test
- **templates/** — Memory system templates (journal, KB, archive)
- **reference/** — APL operators, functions, failure modes, query patterns

## Usage

The skill activates automatically for:
- Incident response and debugging
- Root cause analysis
- Log investigation
- Production troubleshooting

It provides:
- Hypothesis-driven investigation methodology
- Systematic triage (Golden Signals, USE/RED methods)
- APL query patterns for Axiom
- Memory system to learn from past incidents

## Memory System

The skill maintains persistent memory across investigations:

- **journal/** — Append-only capture during incidents
- **kb/** — Curated knowledge (facts, patterns, queries, incidents)
- **archive/** — Old entries preserved for reference

Memory is AI-driven: the agent captures observations, promotes valuable learnings, and consolidates over time.

## License

MIT
