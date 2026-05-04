#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Sync canonical axiom-platform scripts to mirrored skills.

Usage:
  scripts/sync-axiom-platform-scripts.sh --write
  scripts/sync-axiom-platform-scripts.sh --check

Modes:
  --write  Copy canonical files into mirrors
  --check  Verify mirrors are in sync (non-zero on drift)
EOF
}

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

MODE="$1"
if [[ "$MODE" != "--write" && "$MODE" != "--check" ]]; then
  usage
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

DRIFT=0

sync_file() {
  local src_rel="$1"
  shift
  local src="$REPO_ROOT/$src_rel"

  if [[ ! -f "$src" ]]; then
    echo "missing canonical source: $src_rel" >&2
    exit 1
  fi

  local dest_rel
  for dest_rel in "$@"; do
    local dest="$REPO_ROOT/$dest_rel"
    local in_sync=0

    if [[ -f "$dest" ]] && cmp -s "$src" "$dest"; then
      in_sync=1
    fi

    if [[ "$in_sync" -eq 1 ]]; then
      continue
    fi

    if [[ "$MODE" == "--write" ]]; then
      mkdir -p "$(dirname "$dest")"
      cp "$src" "$dest"
      if [[ -x "$src" ]]; then
        chmod +x "$dest"
      else
        chmod -x "$dest"
      fi
      echo "synced: $dest_rel"
    else
      echo "out of sync: $dest_rel (from $src_rel)" >&2
      DRIFT=1
    fi
  done
}

sync_file "skills/axiom-platform/scripts/axiom-api" \
  "skills/query-metrics/scripts/axiom-api"

sync_file "skills/axiom-platform/scripts/axiom-deployments" \
  "skills/sre/scripts/axiom-deployments"

sync_file "skills/axiom-platform/scripts/axiom-link" \
  "skills/sre/scripts/axiom-link"

sync_file "skills/axiom-platform/scripts/axiom-query" \
  "skills/sre/scripts/axiom-query"

sync_file "skills/axiom-platform/scripts/axiom-query-fmt" \
  "skills/sre/scripts/axiom-query-fmt"

sync_file "skills/axiom-platform/scripts/config" \
  "skills/sre/scripts/config"

sync_file "skills/axiom-platform/scripts/curl-auth" \
  "skills/sre/scripts/curl-auth"

sync_file "skills/axiom-platform/scripts/discover-axiom" \
  "skills/sre/scripts/discover-axiom"

sync_file "skills/axiom-platform/scripts/datasets" \
  "skills/query-metrics/scripts/datasets"

sync_file "skills/axiom-platform/scripts/metrics-info" \
  "skills/query-metrics/scripts/metrics-info"

sync_file "skills/axiom-platform/scripts/metrics-query" \
  "skills/query-metrics/scripts/metrics-query"

sync_file "skills/axiom-platform/scripts/metrics-spec" \
  "skills/query-metrics/scripts/metrics-spec"

sync_file "skills/axiom-platform/scripts/resolve-url" \
  "skills/query-metrics/scripts/resolve-url"

if [[ "$MODE" == "--check" && "$DRIFT" -ne 0 ]]; then
  echo "script mirrors are stale; run scripts/sync-axiom-platform-scripts.sh --write" >&2
  exit 1
fi

if [[ "$MODE" == "--check" ]]; then
  echo "script mirrors are in sync"
fi
