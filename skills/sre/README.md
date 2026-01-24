# axiom-sre

Expert SRE investigator for incidents and debugging. Uses hypothesis-driven methodology and systematic triage. Can query Axiom observability when available.

## What It Does

- **Hypothesis-Driven Investigation** - State, test, disprove hypotheses with data queries
- **Systematic Triage** - Golden signals (traffic, errors, latency, saturation), USE/RED methods
- **Memory System** - Persistent knowledge base for patterns, queries, facts, and incidents
- **Axiom Integration** - Query logs, generate shareable links, discover schemas

## Installation

```bash
# Amp
amp skill add axiomhq/skills/sre

# npx (Claude Code, Cursor, Codex, and more)
npx skills add axiomhq/skills -s sre
```

## Prerequisites

- Access to Axiom deployment(s)
- Config in `~/.axiom.toml` with url, token, org_id per deployment
- Tools: `jq`, `curl`

## Usage

The skill activates for incident response, root cause analysis, production debugging, or log investigation. Key scripts:

```bash
# Run APL queries
scripts/axiom-query <deployment> "<apl query>"

# Make API calls
scripts/axiom-api <deployment> GET "/v1/datasets"

# Generate shareable query links
scripts/axiom-link <deployment> "<apl query>" "<time range>"

# Setup personal memory tier
scripts/setup
```

## Scripts

| Script | Purpose |
|--------|---------|
| `axiom-query` | Run APL queries against Axiom |
| `axiom-api` | Make raw API calls |
| `axiom-link` | Generate shareable query URLs |
| `axiom-deployments` | List configured deployments |
| `setup` | Initialize memory system |
| `mem-write` | Write entries to memory KB |
| `mem-sync` | Sync org memory from git |
| `mem-digest` | Consolidate journal to KB |
| `mem-doctor` | Health check all memory tiers |
| `mem-share` | Push org memory changes |

## Key Principles

1. Never guess - query to verify
2. State facts, not assumptions
3. Disprove hypotheses, don't confirm
4. Time filter FIRST in all queries
5. Discover schema before querying unfamiliar datasets
