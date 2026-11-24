# Existing platform integrations

Read when the app's hosting platform could already send the chosen signals. Check coverage of those signals for the selected app; check other projects only when the More services item is on. Use the matching current guide from the [Axiom docs index](https://axiom.co/docs/llms.txt) or [Apps catalog](https://axiom.co/docs/apps/introduction). Keep installation commands in those guides rather than duplicating them here.

## Inspect before adding collection

- Match the repository to its deployed project/function and environment using deployment configuration and available provider tools. A framework alone does not establish a hosting platform.
- Resolve the selected Axiom target using the launch brief or [provision.md](provision.md#select-the-target) before API checks; confirm connected tools use the same organization. With suitable existing access, `GET /v1/integrations/configs` on its management API lists connection records. Inspect `integrationSlug`, `availableSources`, and `allowedSources` to match this app; a connection for another project is insufficient. `allowedSources: ["*"]` alone does not prove project coverage: source discovery can fail, so check provider configuration or delivery evidence when uncertain. Some integrations are configured entirely at the provider and have no connection record here.
- For provider-side setup, inspect existing infrastructure code or use read-only provider tools when available. For example, Lambda's `GetFunctionConfiguration` can identify the Axiom extension layer; inspect destination settings privately without printing environment secrets.
- Query recent data in the mapped dataset for the specific project/function and environment, using separate query access. A connection record, dashboard, or dataset alone does not prove delivery. If access fails or mapping is unclear, report status as unverified and clarify only when it materially changes the plan.

## Fill the gaps

Preserve working integrations and avoid exporting the same logs twice. Platform logs do not by themselves establish application tracing, and application traces do not establish platform log coverage. Reuse compatible existing destinations for each signal; do not route traces into a platform logs dataset merely because it exists.

| Platform | Matching setup and distinction |
| --- | --- |
| Vercel | [Vercel integration](https://axiom.co/docs/apps/vercel): check selected projects and platform logs in `vercel`. Inspect the app's OTel exporter separately for its traces destination. |
| AWS Lambda | [Lambda extension](https://axiom.co/docs/send-data/aws-lambda): check the function's installed extension or existing log forwarding. This setup can exist without an Axiom integration connection record. |
| Claude Platform | [Claude Platform guide](https://axiom.co/docs/guides/opentelemetry-claude-platform.md): when the app calls the Claude API, Axiom can be added as a trace destination in the Claude Console, with no app code. Inspect the app's own traces separately, and follow the guide to link Claude spans to them. |
| Cloudflare | [Logpush integration](https://axiom.co/docs/apps/cloudflare-logpush): check selected accounts/zones and datasets. Workers application instrumentation is a separate coverage check. |

If coverage is missing, explain the gap and follow the current platform guide within the user's authorized scope. Complete safe local setup and provide the connection/install handoff when provider access, account selection, or interactive authorization is required. Do not install integrations, change source selections, or deploy cloud resources merely because the platform was detected.

In the observability doc ([observability-doc.md](observability-doc.md)), say under "What's set up" which data existing integrations already send and where, and list missing setup under "Not done yet". Keep local app verification separate from unverified platform or production delivery.
