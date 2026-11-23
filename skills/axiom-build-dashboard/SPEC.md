# Axiom dashboard specification

## Intent and scope

Help an agent turn the user's questions into useful Axiom dashboards, with validated queries and changes limited to the requested scope. Keep runtime decisions and workflow in [SKILL.md](SKILL.md). This specification is the maintenance contract; it is not required reading during ordinary dashboard work.

In scope: dashboard discovery and review, creation, chart edits, layout and settings changes, requested copies and deletions, and migrations from Grafana or Splunk. Proposal and review requests remain read-only.

Out of scope: application instrumentation, organization provisioning, implementing an Axiom API client, automatic MCP installation, and unrelated changes to datasets, monitors, or notification routing.

## Connection contract

- Discover the tools needed for the request from the client's tool inventory; do not depend on a particular server prefix.
- If Axiom MCP is unavailable, ask the user to connect and authenticate, then stop until it is available.
- Establish access with the first relevant read-only call. Listed tools alone do not prove authentication works.
- Distinguish authentication failure from a missing capability or denied permission. Ask for the specific connection or access fix and stop the blocked operation.
- Keep discovery, query validation, and writes in the selected organization. A read-only request does not require write capabilities.
- Use MCP for all Axiom operations. Do not read script credentials or fall back to shell/HTTP clients when MCP fails.
- Respect the authorization already supplied by the user. Connection checks do not require reconfirming an already authorized resource change.

## Source and evidence model

- [Axiom MCP setup](https://axiom.co/docs/console/intelligence/mcp-server) supplies connection instructions.
- [Axiom MCP tools reference](https://axiom.co/docs/console/intelligence/mcp-server/tools) describes public capabilities. The connected tool schemas govern current arguments, document shape, supported operations, and concurrency behavior.
- Dataset and metric discovery supply actual names, types, dimensions, and units. Query results provide evidence for panel calculations. Existing dashboard readback supplies the owner, version, and configuration to preserve.
- Migration inputs define the requested measurement and filters. Discovery verifies that they can be represented; it does not authorize substituting a different measurement.
- Local references retain chart and query guidance. Their historical verification notes are not evidence that every current MCP operation or UI rendering path has been tested.

## Resource responsibilities

| Resource | Responsibility |
|---|---|
| [SKILL.md](SKILL.md) | Runtime workflow, tool selection, and essential constraints |
| `reference/` | Chart design, query patterns, migration guidance, and templates loaded when relevant |
| `scripts/` | Optional local JSON composition, normalization, unit formatting, and structural validation; no Axiom network access |
| [tests/manual-tests.md](tests/manual-tests.md) | Behavioral scenarios for connection handling, data validation, edits, and failures |
| `tests/*.sh` | Offline checks of local helper behavior |

Keep authentication and remote operations in MCP. Local helpers may encode useful document constraints, but must not become an alternate API client or a prerequisite for using MCP directly.

## Acceptance expectations

Use the detailed [behavioral scenarios](tests/manual-tests.md) to evaluate these requirements:

- **Connection and scope:** missing MCP and failed authentication stop the workflow with actionable guidance; denied operations are identified accurately; read-only requests make no changes.
- **Data correctness:** events use APL and metrics use MPL. Validate new or changed queries, including filter queries and every multi-query pipeline. Preserve intended units, filters, groupings, and time-picker behavior. A blocked measurement becomes an explanatory Note.
- **Resource preservation:** chart-only edits use `updateDashboardChart`; structural changes use the complete current document with `replaceDashboard`. Preserve unrelated configuration and ownership.
- **Concurrency and retries:** edits explicitly use `overwrite: false` and the latest version. Conflicts require rereading and reconciliation. Ambiguous write failures require checking current resources before retrying.
- **Visibility and target selection:** resolve the exact dashboard and organization. Do not broaden private visibility, edit integration/dynamic dashboards, or create unsolicited copies.
- **Verification:** read back saved configuration or verify deletion. Return the link supplied by MCP. Report query execution, saved configuration, and observed rendering as distinct outcomes.
- **Dependent workflows:** cost-dashboard preparation remains local; validation and saving follow this MCP workflow in the same organization as the cost analysis.

## Known limitations and validation status

Integration/dynamic dashboards are read-only. Private dashboards require user authentication; an organization API token cannot own one. Features unavailable through the connected tools require an explained manual handoff, not invented fields or a shell fallback.

Local validation checks selected structural and chart constraints, not the complete server schema or query semantics. Passing helper tests does not establish that an agent follows the connection contract, that MCP accepts a saved document, or that its panels render correctly. Behavioral scenarios are documented; they have not been executed as part of this specification addition. Live saving and rendering remain unverified for this migration.

## Maintenance and repository integration

When MCP contracts change, review tool selection, query-language fields, update/version semantics, ownership, and supported settings. Update affected runtime instructions, references, and helper checks together. Record the source and limits of any new compatibility claim.

Keep the README and skill description consistent with the MCP requirement. Preserve the cost-control handoff through its local `build-dashboard` helper; broader cost-control and SRE migrations are separate work.

After documentation changes, validate skill structure and local links. After helper changes, run the affected offline tests. Use behavioral evaluation for workflow changes, recording what was actually exercised rather than treating written scenarios as passed tests.
