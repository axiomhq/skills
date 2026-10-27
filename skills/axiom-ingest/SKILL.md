---
name: axiom-ingest
description: Send data to Axiom. Picks an org from ~/.axiom.toml, or provisions a temporary one when none is configured, creates the dataset, ingests JSON, NDJSON, or CSV, and confirms with a query. Use when asked to send, ingest, upload, or load data or events into Axiom or a new Axiom dataset.
---

# axiom-ingest

Get data into an Axiom dataset with the fewest questions.

## 1. Choose an org

List configured deployments:

```bash
grep -o '^\[deployments\.[^]]*\]' ~/.axiom.toml 2>/dev/null
```

| Found | Do |
|-------|----|
| None, and no Axiom MCP connection | Follow the `axiom-agent-created-orgs` skill to provision a temporary org, then continue here with its org id as the deployment. |
| None, but Axiom MCP is connected | Ask once: create an API token with ingest permission in that org and add it to `~/.axiom.toml`, or use a new temporary org. MCP alone cannot ingest. |
| One | Use it. Say which org you are writing to before you write. |
| Several | Ask once: which deployment, or a new temporary org. |

If the user named an org or deployment, use it and skip the table.

Load the deployment without printing the token:

```bash
cfg() { awk -F'"' -v d="[deployments.$1]" -v k="$2" '$0==d{f=1;next} /^\[/{f=0} f&&$1~"^"k" *= *$"{print $2}' ~/.axiom.toml; }
d=<deployment>; url=$(cfg "$d" url); token=$(cfg "$d" token); org=$(cfg "$d" org_id)
H=(-sS -H "Authorization: Bearer $token" -H "X-Axiom-Org-Id: $org")
```

## 2. Create the dataset

Names use letters, digits, `-`, `_`, and `.`. Pick a name from the task if the user gave none.

```bash
edge=$(curl "${H[@]}" -H 'Content-Type: application/json' -X POST "$url/v2/datasets" \
  -d '{"name": "<dataset>", "description": "<why>"}' | jq -r '.edgeDeploymentUrl // .message')
```

- `dataset license limit exceeded` (HTTP 400) means the org has no dataset slots left. Ask whether to reuse an existing dataset or use another org.
- `entity exists` (HTTP 409) means the name is taken. For a "new dataset" request, pick another name. To add to the existing one, read its edge URL: `curl "${H[@]}" "$url/v2/datasets/<dataset>" | jq -r .edgeDeploymentUrl`.

## 3. Ingest

Send to the dataset's edge URL. Set `Content-Type` to match the data:

| Data | Content-Type |
|------|--------------|
| JSON array of objects | `application/json` |
| One JSON object per line | `application/x-ndjson` |
| CSV with a header row | `text/csv` |

```bash
curl "${H[@]}" -H 'Content-Type: application/x-ndjson' -X POST "$edge/v1/ingest/<dataset>" \
  --data-binary @events.ndjson | jq '{ingested, failed, failures}'
```

- `_time` sets each event's timestamp. Without it, Axiom uses the ingest time.
- Any `failed` count above 0 needs fixing; `failures` says why.

## 4. Confirm

```bash
curl "${H[@]}" -H 'Content-Type: application/json' -X POST "$edge/v1/query/_apl?format=tabular" \
  -d "{\"apl\": \"['<dataset>'] | count\"}" | jq '.tables[0].columns'
```

New events can take a few seconds to show up. Report the org, dataset, and event count. If the org is temporary, also give the claim URL and expiry as `axiom-agent-created-orgs` describes.
