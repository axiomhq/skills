# axiom-sre

Expert SRE investigator skill for AI coding agents. Uses hypothesis-driven methodology and systematic triage. Can query [Axiom](https://axiom.co) observability when available.

## Installation

### Amp

```bash
amp skill add --global axiomhq/axiom-sre --name axiom-sre --overwrite
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

- **.agents/skills/axiom-sre/SKILL.md** — Main skill instructions (SRE methodology, APL patterns, memory system)
- **.agents/skills/axiom-sre/scripts/** — Axiom API helpers and memory self-test
- **.agents/skills/axiom-sre/templates/** — Memory system templates (journal, KB, archive)
- **.agents/skills/axiom-sre/reference/** — APL operators, functions, failure modes, query patterns

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

Two-tier memory that learns from every debugging session:

| Tier | Location | Purpose |
|------|----------|---------|
| Personal | `~/.config/amp/memory/personal/axiom-sre/` | Your preferences and scratch |
| Org | `~/.config/amp/memory/orgs/{org}/axiom-sre/` | Shared team knowledge |

**Tell the agent to remember things:**
- "Remember this" → saves to Personal
- "Save for the team" → saves to Org (git-synced)

**The agent also learns automatically when:**
- A query or approach finds the root cause
- You correct it — it records what didn't work and what did
- A debugging session completes successfully

**Org memory setup:**
```bash
scripts/org-add myorg git@github.com:myorg/sre-memory.git
scripts/mem-sync
```

**Consolidation ("digest"):**
```bash
scripts/mem-digest    # Review journal, prune stale entries
scripts/mem-doctor    # Health check
```

**Seed with your own knowledge:**
- Edit `kb/facts.md` — team contacts, Slack channels, conventions
- Edit `kb/integrations.md` — database connections, API endpoints
- Edit `kb/patterns.md` — failure patterns you've seen before

## License

MIT
