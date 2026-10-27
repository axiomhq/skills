# axiom-ingest

Sends data to a new or existing Axiom dataset.

## What This Skill Covers

- Picking an org from `~/.axiom.toml`, or provisioning a temporary one with `axiom-agent-created-orgs` when none is configured
- Creating the dataset and ingesting JSON, NDJSON, or CSV through the dataset's edge endpoint
- Confirming the event count with an APL query

## Requirements

- `curl`
- `jq`

See [Send data to Axiom](https://axiom.co/docs/restapi/ingest).
