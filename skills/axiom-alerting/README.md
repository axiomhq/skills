# axiom-alerting

Design, create, tune, and troubleshoot Axiom monitors and notification routing through Axiom MCP.

## Requirements

Connect and authenticate [Axiom MCP](https://axiom.co/docs/console/intelligence/mcp-server) in your agent client, with access to the organization and alerting operations you need. On clients that load MCP configuration from the Axiom plugin, sign in to the included connection. Otherwise, including skills-only installations, connect the MCP server separately.

The skill checks for the tools needed by the request and uses its first relevant read to verify access. If MCP is missing or authentication fails, it asks you to connect or sign in and stops until access is available. If only an operation is unavailable or forbidden, it identifies that capability or permission. It does not fall back to scripts or a separate API-token configuration.

## Example requests

- "Create an alert when checkout's error rate exceeds 2% for a sustained period, using our existing on-call notifier."
- "Investigate why this monitor is noisy and propose changes without applying them."
- "Change this monitor's threshold while keeping its current notification routing."
- "Pause this monitor until tomorrow at 09:00 Dubai time."
- "Check this monitor's recent history and explain what has been verified."

## Workflow

The skill discovers existing monitors and data, chooses an appropriate condition and evaluation window, reuses notification destinations, and applies the requested changes through MCP. Some notifier channels require completing setup in Axiom; the skill verifies the saved notifier before attaching it.

Verification distinguishes a saved configuration, a validated query, recorded monitor execution, and confirmed notification delivery. Creating a monitor alone does not establish all four.

See [SKILL.md](SKILL.md) for the agent instructions and [SPEC.md](SPEC.md) for scope, maintenance guidance, and acceptance scenarios.
