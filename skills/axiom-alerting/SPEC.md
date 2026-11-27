# Axiom alerting specification

## Intent and scope

Help an agent turn a detection goal into an actionable Axiom monitor and appropriate notification routing. Keep decisions and workflow in [SKILL.md](SKILL.md), and use Axiom MCP for discovery, queries, and resource operations.

In scope: creating and editing monitors or notifiers, investigating noisy or silent alerts, requested pauses/resumes, and explicitly requested resource deletion. Proposal and review requests remain read-only.

Out of scope: application instrumentation, organization provisioning, implementing an Axiom API client, and unrequested test notifications or production incidents.

## Connection contract

- Discover the tools required for the request using the client's available tool inventory; do not hard-code one client's server prefix.
- If no Axiom MCP tools are available, ask the user to connect and authenticate Axiom MCP and stop until the connection is available.
- Use the first relevant read to establish access. Authentication failures require signing in or reconnecting; a missing operation or denied permission requires that specific capability or access.
- Do not install MCP automatically, read script credentials, or use shell/HTTP fallbacks for alerting operations.
- Use the existing authorization for the task. Connection guidance is not a blanket requirement to reconfirm already authorized resource changes.

## Source and maintenance model

- [Axiom MCP setup](https://axiom.co/docs/console/intelligence/mcp-server) supplies client connection instructions.
- [Axiom MCP tools reference](https://axiom.co/docs/console/intelligence/mcp-server/tools) describes the public capabilities.
- The connected MCP tool schemas govern arguments, supported monitor types, replacement semantics, and notifier setup. Capabilities may differ across server versions.

Keep payload schemas and authentication implementation in MCP. Add skill content for decisions or workflow hazards that materially affect alert quality, preservation of existing resources, or the accuracy of the reported result.

## Acceptance scenarios

| Request or condition | Expected behavior |
|---|---|
| No Axiom MCP tools are available | Ask the user to connect and authenticate using the setup guide, then stop. No shell, HTTP, or credential-file fallback. |
| Tools are listed but the first read fails authentication | Ask the user to sign in or reconnect, then stop until access works. |
| Reads work but the requested write tool is missing or forbidden | Name the missing operation or permission and stop that operation; do not claim that MCP is absent. |
| User requests a read-only monitor review | Require only the tools needed for that review; do not require or invoke write tools. |
| User requests a notifier edit or a monitor pause/resume | Apply and verify that change without creating a monitor or redesigning its query. |
| User requests an alert in a different organization | Resolve the requested organization and consistently use its ID; do not write to the session default by accident. |
| Create an error-rate alert with an existing notifier | Discover the data, validate the denominator and units, reuse routing, check for duplicates, create through MCP, and read back. |
| Edit a threshold on an existing monitor | Fetch the full definition, preserve unrelated fields and routing, and send a complete updated configuration. |
| A quiet service has occasional isolated failures | Explain low-volume behavior and choose or clarify a suitable guard/window without inventing a universal threshold. |
| A notifier channel needs manual setup | Explain the handoff, wait for completion, and verify the saved notifier before using its ID. |
| A create call times out | Inspect current resources before retrying to avoid duplicates. |
| A new monitor has no recorded history | Report the saved/query-validated state and pending execution; do not claim notification delivery. |
| User requests editing or deleting a shared notifier | Inspect affected monitors and resolve any impact outside the existing authorization. |
| User requests a resource deletion | Delete only the identified authorized resource and verify its absence in the relevant list. |

Validate skill structure and local links after edits. Use these scenarios for behavioral evaluation with isolated or mocked resources; source validation alone does not establish agent behavior or live notification delivery.

## Repository integration

The alerting skill has no bundled API scripts. The generic API helper previously referenced by `axiom-create-org` lives with that skill, which handles organizations that may not yet be accessible through an MCP connection. It is not an alerting fallback.

Keep the skill description, README, and root catalog consistent with the MCP requirement. Other skills' script migrations are separate changes.
