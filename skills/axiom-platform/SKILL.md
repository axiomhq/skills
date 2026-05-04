---
name: axiom-platform
description: Axiom platform specialist for APL logs/events queries and MetricsDB workflows. Use for dataset discovery, schema-aware APL analysis, metrics discovery, metrics query execution, and Axiom link generation.
---

> **CRITICAL:** ALL script paths are relative to this SKILL.md file's directory. Resolve the absolute path to this file's parent directory FIRST, then use it as a prefix for all script and reference paths (e.g., `<skill_dir>/scripts/axiom-query`). Do NOT assume the working directory is the skill folder.

# Axiom Platform

This skill provides Axiom-native platform operations only. It does not include
generic SRE methodology, bespoke memory systems, or non-Axiom integrations.

## Core Rules

1. **Discover before query.** Run `scripts/discover-axiom` before the first APL query.
2. **Never guess field names.** Use `getschema`, `distinct`, and `top` to verify fields and values.
3. **Time-bound every query.** Always scope queries with explicit time windows.
4. **Prefer evidence links.** Generate and share Axiom links for cited findings.
5. **Do not expose secrets.** Use `scripts/curl-auth` for authenticated requests.

## APL Workflow

1. Discover datasets:

```bash
scripts/discover-axiom <env>
```

2. Read schema:

```apl
['dataset'] | where _time > ago(15m) | getschema
```

3. Validate candidate filter values:

```apl
['dataset'] | where _time > ago(15m) | summarize count() by service | top 20 by count_
```

4. Execute focused query:

```bash
scripts/axiom-query <env> --since 1h <<< "['dataset'] | where _time > ago(1h) | take 20"
```

5. Generate permalink when citing data:

```bash
scripts/axiom-link <env> "['dataset'] | summarize count() by bin_auto(_time)" "1h"
```

## MetricsDB Workflow

1. Discover metrics datasets:

```bash
scripts/datasets <env> --kind otel:metrics:v1
```

2. Fetch metrics query spec (mandatory before first MPL query):

```bash
scripts/metrics-spec <env> <dataset>
```

3. Discover metrics and tags:

```bash
scripts/metrics-info <env> <dataset> metrics
scripts/metrics-info <env> <dataset> tags
```

4. Execute metrics query:

```bash
scripts/metrics-query <env> '<mpl>' 'now-1h' 'now'
```

## Available Scripts

- `scripts/curl-auth`
- `scripts/discover-axiom`
- `scripts/axiom-query`
- `scripts/axiom-link`
- `scripts/axiom-api`
- `scripts/axiom-deployments`
- `scripts/datasets`
- `scripts/metrics-spec`
- `scripts/metrics-info`
- `scripts/metrics-query`
- `scripts/resolve-url`
