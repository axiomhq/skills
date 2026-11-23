# Cost-control behavioral checks

These are scenarios to execute, not a record of passed tests. Use a test organization for writes.

- **No MCP:** ask to connect/authenticate with the setup link and stop; do not inspect token files or run SRE/HTTP/CLI wrappers.
- **Authentication failure:** a listed tool fails its first read; ask to sign in rather than treating it as empty usage.
- **Limited access:** baseline queries work but monitor writes are forbidden; complete the requested read-only analysis and identify the blocked permission.
- **Organization selection:** ambiguous targets are resolved before collection; exported history, usage, dashboards, and monitors stay in that organization.
- **Missing history:** produce a usage baseline without claiming unqueried data; still support requested dashboards/monitors.
- **Incomplete data:** reject truncated ASTs, mismatched history counts, missing samples, cardinality-capped samples, and malformed CSV. Do not generate reduction estimates from those artifacts.
- **Existing monitor:** update the exact target from its current full document, preserving notifier IDs and unrelated settings. No automatic deletion/recreation.
- **Notification choice:** reuse a supplied destination; ask only if unresolved. A builder's empty notifier array must not clear existing routing.
- **Ambiguous write:** read back before retrying. Report which of the three monitors succeeded if a later write fails.
- **Dashboard update:** preserve ownership/settings, use current version and overwrite false, and reconcile a conflict without forcing it.
- **Evidence limits:** zero query cost, no history matches, or wildcard queries produce qualified candidates; an analysis request never deletes data.
- **Monitor verification:** compare validated queries and saved settings, then distinguish execution history from notification delivery. Do not intentionally trigger production alerts.
