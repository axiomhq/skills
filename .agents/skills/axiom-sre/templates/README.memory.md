# Axiom SRE Memory

This is your working memory for investigations. Append freely, consolidate periodically.

## Directory Structure

```
axiom-sre/
├── README.memory.md     # This file - instructions for memory maintenance
├── journal/
│   └── journal-YYYY-MM.md   # Append-only log during investigations
├── kb/
│   ├── facts.md         # Stable environment facts, teams, channels
│   ├── integrations.md  # DBs, APIs, tools, auth details
│   ├── patterns.md      # Failure signatures, recurring causes
│   ├── queries.md       # APL learnings and reusable snippets
│   └── incidents.md     # Incident summaries and playbooks
├── archive/
│   └── *.md             # Old entries moved here
└── index.md             # Optional: AI-maintained table of contents
```

---

## Entry Format

Every memory is a markdown section with a header and metadata list:

```markdown
## M-2025-01-05T14:32:10Z orders-api-500s

- type: pattern
- tags: orders, http-500, ingress
- status: active
- usefulness: 0.7
- used: 3
- last_used: 2025-01-12

**Summary**

Brief description of what this memory captures.

**Details**

Extended information, queries, evidence, etc.
```

### Required Fields

| Field | Values | Description |
|-------|--------|-------------|
| type | fact, query, incident, pattern, integration, note | What kind of memory |
| tags | comma-separated | Free-form, for retrieval |
| status | active, draft, merged, archived | Lifecycle state |

### Optional Fields

| Field | Description |
|-------|-------------|
| usefulness | 0.0–1.0, how helpful this has been |
| used | Count of times retrieved and judged helpful |
| last_used | Timestamp of last helpful retrieval |
| origin | Reference to incident or query that created this |
| merged_into | If merged, pointer to canonical entry |

---

## During Investigations

### Capture (Low Friction)

**Append to journal only.** Don't organize during incidents.

```markdown
## M-2025-01-05T14:32:10Z noticed-connection-pool-errors

- type: note
- tags: orders, database, connection-pool

Seeing "connection pool exhausted" in orders-api logs.
Started after deploy at 14:15.
```

**For queries that worked:**

```markdown
## M-2025-01-05T14:45:00Z query-found-root-cause

- type: query
- tags: orders, http-500
- outcome: root_cause

**Query**
\`\`\`apl
['orders-logs']
| where status >= 500
| summarize count() by bin(_time, 5m), host
\`\`\`

Identified host-3 had all the errors. Checked deploy - it got bad config.
```

### End of Incident

Create one summary entry in `kb/incidents.md`:

```markdown
## M-2025-01-05T16:00:00Z INC-1234 orders-api-outage

- type: incident
- tags: orders, config, deploy
- status: active
- usefulness: 0.5

**Summary**

30-minute outage caused by bad config pushed to host-3.

**Key Learnings**

- Query Q-20250105-01 found the bad host
- Should add config validation pre-deploy

**Playbook**

1. Check recent deploys: `kubectl rollout history`
2. Query by host to isolate: `summarize by host`
3. Rollback if single host: `kubectl rollout undo`
```

---

## Retrieval

Before investigating, scan relevant KB files:

1. `kb/patterns.md` - Known failure signatures
2. `kb/queries.md` - Proven query patterns
3. `kb/facts.md` - Environment context
4. `kb/integrations.md` - External system access

Filter by tags matching current symptoms. Prefer entries with:
- Higher `usefulness` and `used` counts
- More recent `last_used`
- Matching tags

Track which memories you use - update their metadata after the incident.

---

## Consolidation (Periodic Maintenance)

Run maintenance when:
- After completing an incident
- When journal exceeds ~100 entries
- Weekly if actively investigating

### Promote Journal → KB

1. Review recent journal entries
2. For valuable entries:
   - Move to appropriate `kb/*.md` file
   - Normalize metadata (add missing fields)
   - Set `status: active`
3. For duplicate/similar entries:
   - Merge into existing KB entry
   - Add new evidence/examples
   - Increment `used` if applicable

### Merge Duplicates

Within KB files, find entries with similar tags and content:
- Pick or create canonical entry
- Merge details, preserve specific examples
- Set `status: merged` on duplicates with `merged_into: <canonical-id>`

### Update Effectiveness

For entries that helped in investigations:
- Increment `used`
- Bump `usefulness` toward 1.0 (e.g., +0.1)
- Update `last_used`

For dead ends:
- Optionally decrease `usefulness` (e.g., -0.05)
- Add note under **Feedback** section

### Archive Stale Entries

Criteria for archiving:
- `last_used` > 90 days AND `usefulness` < 0.3
- System/service no longer exists
- Superseded by better pattern

Process:
1. Move full entry to `archive/<filename>.md`
2. Leave stub in KB:
   ```markdown
   ## M-2024-02-01T10:00:00Z legacy-pattern (archived)
   - status: archived
   - archived_to: archive/patterns.md
   - reason: System deprecated
   ```

### Summarize Large Files

When KB file exceeds ~400 lines:
1. Identify oldest entries
2. Create/update "High-level Summary" section at top
3. Move detailed old entries to archive
4. Keep stubs with links

---

## Query Effectiveness Tracking

**Only persist queries that:**
- Found root cause
- Significantly narrowed investigation
- Are reusable patterns
- Were notable dead ends (anti-patterns)

**Format in kb/queries.md:**

```markdown
## M-2025-01-05T14:40:00Z error-rate-by-host

- type: query
- tags: errors, host, troubleshooting
- status: active
- usefulness: 0.8
- used: 5

**Query**
\`\`\`apl
['logs']
| where status >= 500
| summarize count() by host
| order by count_ desc
\`\`\`

**Usage Notes**
- 2025-01-05 (INC-1234): [root_cause] Found bad host
- 2025-01-20 (INC-1250): [helpful] Ruled out host issues
- 2025-02-01: [dead_end] Problem was in upstream, not hosts
```

Don't log every query execution - aggregate into patterns.

---

## Anti-Patterns to Avoid

- **Query spam**: Don't log every query, only significant ones
- **Over-structuring during incidents**: Just append to journal
- **Forgetting to update usefulness**: Track what actually helped
- **Keeping stale entries**: Archive aggressively
- **Losing specifics when merging**: Keep timestamps and incident refs
