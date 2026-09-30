# Marketplace maintenance

## Release

1. Check that all five manifest versions match `version.txt`. Commit listing images under `assets/`.
2. Run the [client checks](plugin-review.md#client-checks), including changed skills.
3. Merge the Release Please PR. Confirm the tag, GitHub release, and `axiom-plugin.zip` from that commit.
4. Follow the provider steps below. Check review feedback, the public version or commit, and a fresh install. Record receipts and status locally.

## Publish and update

Complete [review preparation](plugin-review.md). Enter reviewer credentials only in secure portal forms.

| Provider | First publication | Updates |
| --- | --- | --- |
| OpenAI / Codex | Use Axiom's verified identity and an org owner or Apps Management Write account. [Submit](https://developers.openai.com/plugins/deploy/submission). | Upload the release ZIP to the existing plugin in the [portal](https://platform.openai.com/plugins). Publish after approval. |
| Claude | Use a Claude org Owner or Enterprise Directory permission, plus GitHub write access. Submit the [plugin](https://claude.com/docs/plugins/submit) and [MCP connector](https://claude.com/docs/connectors/building/submission) separately. | Check the scanned commit in [Versions](https://claude.ai/directory/manage). Request publication unless automatic publication is enabled by Anthropic and the publisher. |
| Cursor | Complete the [publisher application](https://cursor.com/marketplace/publish). Check account requirements in the form. | Request review through the publisher process; [every public update needs review](https://cursor.com/help/security-and-privacy/marketplace-security). |
| Gemini CLI | Keep the `gemini-cli-extension` topic and root manifest. Check the [listing](https://geminicli.com/extensions/?name=axiomhqskills). | Check the daily gallery refresh; run `gemini extensions update axiom`. See [release instructions](https://geminicli.com/docs/extensions/releasing/). |
| Grok Build | Use the existing Axiom listing. | Follow xAI's version-bump PR and confirm its merge. See below. |

Use the [README commands](../README.md#installation) to update direct repository installs.

## Grok updates

Check that Release Please bumps `.grok-plugin/plugin.json`. [xAI's bot](https://github.com/xai-org/plugin-marketplace/blob/main/.github/workflows/bump-plugin-shas.yml) checks daily at 15:00 UTC and proposes repository HEAD only when the version changes.

Follow up if the Release workflow's Grok check fails. It runs after releases, daily, and on manual runs, allowing 48 hours for publication. Verify the catalog and index agree and the pin contains the release commit; later descendants pass.

For a manual update, change Axiom's SHA in `.grok-plugin/marketplace.json` in a marketplace fork, then run:

```bash
python3 scripts/generate-plugin-index.py
python3 scripts/validate-catalog.py
python3 scripts/generate-plugin-index.py --check
```

Include both catalog files in the [update PR](https://github.com/xai-org/plugin-marketplace/blob/main/CONTRIBUTING.md).

## Restore a missing ZIP

Check out the release tag in a separate checkout, then run:

```bash
bash scripts/package-plugin /tmp/axiom-plugin.zip
gh release upload "$(git describe --tags --exact-match HEAD)" /tmp/axiom-plugin.zip --repo axiomhq/skills
```

Use committed files from the release tag. Rerunning Release Please alone may skip the upload for an existing release.
