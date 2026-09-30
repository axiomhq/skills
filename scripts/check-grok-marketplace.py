#!/usr/bin/env python3
"""Check that Grok's reviewed pin has caught up with our latest release."""

import base64
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
from urllib.parse import quote


def gh(*args):
    return json.loads(subprocess.check_output(["gh", *args], text=True))


def report(message):
    print(message)
    if path := os.environ.get("GITHUB_STEP_SUMMARY"):
        with Path(path).open("a") as summary:
            summary.write(message + "\n")


releases = gh("release", "list", "--repo", "axiomhq/skills", "--limit", "1",
              "--exclude-drafts", "--exclude-pre-releases", "--json", "tagName,publishedAt")
if not releases:
    report("Grok: waiting for the first Axiom GitHub release.")
    raise SystemExit(0)

release = releases[0]
tag = release["tagName"]
marketplace = "repos/xai-org/plugin-marketplace"
revision = gh("api", f"{marketplace}/commits/main")["sha"]


def catalog_file(name):
    result = gh("api", f"{marketplace}/contents/.grok-plugin/{name}?ref={revision}")
    return json.loads(base64.b64decode(result["content"]))


catalog = catalog_file("marketplace.json")
entries = [entry for entry in catalog["plugins"] if entry["name"] == "axiom"]
if len(entries) != 1 or entries[0]["source"]["url"] != "https://github.com/axiomhq/skills.git":
    raise SystemExit("Grok: expected one Axiom entry pointing to axiomhq/skills.")
pin = entries[0]["source"]["sha"]
index = catalog_file("plugin-index.json")["plugins"]["axiom"]
if index["sha"] != pin:
    raise SystemExit("Grok: catalog pin and generated index disagree.")

comparison = gh("api", f"repos/axiomhq/skills/compare/{quote(tag, safe='')}...{pin}")
if comparison["status"] in ("identical", "ahead"):
    report(f"Grok: published pin `{pin}` includes release `{tag}` (index version `{index['version']}`).")
    raise SystemExit(0)

age = datetime.now(timezone.utc) - datetime.fromisoformat(release["publishedAt"].replace("Z", "+00:00"))
report(f"Grok: published pin `{pin}` does not yet include `{tag}`. "
       "Check [xAI's daily version-bump workflow]"
       "(https://github.com/xai-org/plugin-marketplace/actions/workflows/bump-plugin-shas.yml) "
       "and [marketplace PRs](https://github.com/xai-org/plugin-marketplace/pulls). "
       "xAI must review and merge the update.")
if age.total_seconds() >= 48 * 60 * 60:
    raise SystemExit("Grok is still behind 48 hours after release; maintainer follow-up is needed.")
