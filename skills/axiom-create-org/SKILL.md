---
name: axiom-create-org
description: Create a temporary Axiom organization through the CLI. Use when the user needs an organization before account setup or requests a temporary one.
---

# Temporary organizations

Use the Axiom CLI to create an organization and store its credentials locally.
Follow current Axiom docs for the claim process and temporary limits.

1. Identify whether the task needs a new organization. Reuse a configured organization when it meets the request. Read `axiom org create --help` for the installed command’s options. If the command is unavailable, update the CLI before continuing.

2. Run `axiom org create --temporary --name=<project>`. The CLI saves the credentials in `~/.axiom.toml`, or the existing file selected with `--config`. Keep credentials in that file. If creation or storage fails, follow the CLI’s error and recovery guidance instead of repeating creation. Keep recovery-file contents out of output.

3. Use the returned organization ID as the deployment for subsequent CLI commands: `-D <org-id>`. Reuse the same configuration file. Existing deployments and the default remain unchanged; the first deployment becomes the default. Creating an organization does not configure or switch an MCP connection.

4. Give the user the returned claim URL and expiry. The user must complete the browser claim before that deadline to keep the organization and its data. Share the claim URL only with that user: anyone with it can take ownership. Notifications remain disabled until the organization is claimed.

## References

| Read when | Source |
| --- | --- |
| Installing the CLI or selecting a deployment and configuration file | [Axiom CLI](https://axiom.co/docs/reference/cli) and `axiom --help` |
| Selecting provisioning options or recovering a failed save | `axiom org create --help` and the command’s error output |
| Explaining expiry, claiming or temporary limits | [Agent-created organizations](https://axiom.co/docs/console/intelligence/agent-created-orgs) |

## Example

Acme wants to try Axiom with checkout events and has no configured organization.

| Step | Checkout example |
| --- | --- |
| 1. Identify | Confirm that a temporary organization fits the trial. Read the installed command’s help. |
| 2. Create | Run `axiom org create --temporary --name=checkout-trial`. Let the CLI save the credentials. |
| 3. Continue | Use the returned organization ID with `-D` when creating a dataset, ingesting events or querying them through the CLI. |
| 4. Hand off | Give the user the claim URL and deadline from the result. Explain that the trial data is deleted if the organization remains unclaimed. |
