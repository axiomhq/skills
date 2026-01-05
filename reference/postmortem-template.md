# Postmortem Template

Copy this template for each incident retrospective.

```markdown
## Incident: [Title]
**Date:** YYYY-MM-DD HH:MM - HH:MM UTC
**Severity:** P1/P2/P3
**Impact:** [X% of users affected, Y requests failed]

### Timeline
- HH:MM — Alert fired
- HH:MM — Acknowledged by [name]
- HH:MM — [action taken]
- HH:MM — Mitigated
- HH:MM — Fully resolved

### Root Cause
[Technical explanation without blame]

### Contributing Factors
- [What made this possible?]
- [What made detection slow?]
- [What made mitigation hard?]

### Detection
- How did we find out? (Alert? Customer report? Accident?)
- What query/dashboard was useful?

### Action Items
- [ ] [Specific fix with owner and due date]
- [ ] [Monitoring improvement]
- [ ] [Runbook update]

### Lessons
- What would have made this trivial to debug?
- What observability is missing?
```

## Key Principles

1. **Blameless** — Focus on systems and processes, not individuals
2. **Timeline** — Accurate timestamps help identify gaps
3. **Impact** — Quantify in SLO terms (error budget burned)
4. **Action items** — Specific, owned, and time-bound
5. **Learning** — What observability/tooling improvements would help?
