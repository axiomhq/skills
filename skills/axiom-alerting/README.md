# axiom-alerting

Manage Axiom monitors and notifiers with the Axiom MCP server.

Requires a connected Axiom MCP server with access to the selected organization.

## What This Skill Covers

- Monitor lifecycle: list, get, history, create, update, delete
- Notifier lifecycle: list, create, update, delete
- End-to-end workflow: reuse a saved notifier, wire `notifierIds` into the monitor, validate behavior

Use [SKILL.md](SKILL.md) for the MCP workflow, monitor types, and configuration examples. For channels that need credentials, the MCP tools guide the user to the Axiom Console.

## JSON Notes

- Email notifier uses `emails`, not `recipients`.
- Monitor payload uses `notifierIds` to attach destinations.
- For noisy alerts, prefer `triggerAfterNPositiveResults` with `triggerFromNRuns`.
- Monitor `type` is `Threshold`, `MatchEvent`, `NewValues`, or `AnomalyDetection`. `SKILL.md` says when to use each and has a valid example of each.
