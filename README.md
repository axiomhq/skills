# spl-to-apl

Translates Splunk SPL queries to [Axiom](https://axiom.co) APL. Provides command mappings, function equivalents, and syntax transformations for AI coding agents.

## Installation

### Amp

```bash
amp skill add --global axiomhq/spl-to-apl --name spl-to-apl --overwrite
```

### Claude Code

```bash
git clone https://github.com/axiomhq/spl-to-apl.git ~/.claude/skills/spl-to-apl
```

### Manual

Clone or copy to your skills directory and reference in your agent config.

## What's Included

- **.agents/skills/spl-to-apl/SKILL.md** — Main skill instructions (translation principles, quick reference)
- **.agents/skills/spl-to-apl/reference/command-mapping.md** — Complete SPL to APL command mappings
- **.agents/skills/spl-to-apl/reference/function-mapping.md** — Function equivalents (aggregations, string, datetime, etc.)
- **.agents/skills/spl-to-apl/reference/examples.md** — Real-world query translation examples

## Usage

The skill activates automatically when:
- Migrating from Splunk to Axiom
- Converting SPL queries to APL
- Learning APL equivalents of SPL patterns

## Key Translations

| SPL | APL |
|-----|-----|
| `index=logs` | `['logs']` |
| `stats count by field` | `summarize count() by field` |
| `eval x = y * 2` | `extend x = y * 2` |
| `table a, b, c` | `project a, b, c` |
| `rex field=msg "(?<name>\w+)"` | `parse` or `extract()` |
| `timechart span=5m count` | `summarize count() by bin(_time, 5m)` |

## What's Verified

All APL functions and operators in this skill have been verified against official Axiom documentation:
- Tabular operators (summarize, extend, project, join, union, etc.)
- Aggregation functions (count, dcount, avg, percentile, stdev, variance, etc.)
- Scalar functions (string, datetime, array, math, hash, IP, conditional)

## License

MIT
