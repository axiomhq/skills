# axiom-create-org

Lets an agent provision a temporary Axiom organization with `POST https://api.axiom.co/v2/orgs/provision`, no account or token needed.

## What This Skill Covers

- Provisioning an org and storing its one-time token in `~/.axiom.toml` without printing it
- Using the org through API-based workflows (the org id is the deployment name), or through MCP once the connection can access it
- Handing the claim URL to the user, with the 24-hour expiry and unclaimed-org limits

## Requirements

- `curl`
- `jq`

See [agent-created organizations](https://axiom.co/docs/console/intelligence/agent-created-orgs).
