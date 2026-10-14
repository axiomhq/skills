#!/usr/bin/env bash
# test-sections.sh: dashboard-assemble writes sections; dashboard-validate checks them.
#
# Usage: ./test-sections.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$SCRIPT_DIR/../scripts"

passed=0
failed=0

ok() {
    passed=$((passed + 1))
    echo "  ✓ $1"
}

fail() {
    failed=$((failed + 1))
    echo "  ✗ $1: $2"
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cat > "$TMP/err.json" <<'JSON'
{"id":"err-rate","name":"Error Rate","type":"Statistic"}
JSON
cat > "$TMP/traffic.json" <<'JSON'
{"id":"traffic-ts","name":"Traffic","type":"TimeSeries","sectionId":"stale"}
JSON
cat > "$TMP/errors.json" <<'JSON'
{"id":"top-errors","name":"Top Errors","type":"Table"}
JSON
cat > "$TMP/filters.json" <<'JSON'
{"id":"filters","name":"Filters","type":"SmartFilter"}
JSON
cat > "$TMP/layout.json" <<'JSON'
[
  {"i":"filters","x":0,"y":0,"w":12,"h":1},
  {"i":"err-rate","x":0,"y":1,"w":6,"h":4},
  {"i":"traffic-ts","x":6,"y":1,"w":6,"h":4},
  {"i":"top-errors","x":0,"y":5,"w":12,"h":5}
]
JSON

ASSEMBLE="$SCRIPTS_DIR/dashboard-assemble"
VALIDATE="$SCRIPTS_DIR/dashboard-validate"

echo "Dashboard sections"
echo "=================="

assemble() {
    "$ASSEMBLE" \
        --name "API" \
        --datasets logs \
        --layout "$TMP/layout.json" \
        --section "Requests:err-rate,traffic-ts" \
        --section-collapsed "Errors:top-errors" \
        "$TMP/filters.json" "$TMP/err.json" "$TMP/traffic.json" "$TMP/errors.json"
}

out=$(assemble)
printf '%s\n' "$out" > "$TMP/dashboard.json"

requests_id="96620b15-69d1-5ced-89ff-e91fef6c82f5"
errors_id=$(python3 -c 'import uuid; print(uuid.uuid5(uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8"), "axiom-dashboard-section:Errors"))')

if jq -e --arg rid "$requests_id" --arg eid "$errors_id" '
  .sections == [
    {id: $rid, title: "Requests"},
    {id: $eid, title: "Errors", defaultCollapsed: true}
  ]
  and (.charts[] | select(.id == "err-rate") | .sectionId) == $rid
  and (.charts[] | select(.id == "traffic-ts") | .sectionId) == $rid
  and (.charts[] | select(.id == "top-errors") | .sectionId) == $eid
  and (.charts[] | select(.id == "filters") | has("sectionId") | not)
' "$TMP/dashboard.json" > /dev/null; then
    ok "assemble writes sections and sectionId"
else
    fail "assemble writes sections and sectionId" "$(jq -c '{sections, charts: [.charts[] | {id, sectionId}]}' "$TMP/dashboard.json")"
fi

out2=$(assemble)
if [[ "$out" == "$out2" ]]; then
    ok "the same titles keep the same section ids"
else
    fail "the same titles keep the same section ids" "output changed between runs"
fi

if "$VALIDATE" "$TMP/dashboard.json" > /dev/null; then
    ok "validate accepts assembled sections"
else
    fail "validate accepts assembled sections" "validator rejected a document assemble emitted"
fi

plain=$("$ASSEMBLE" --name "API" --datasets logs --layout "$TMP/layout.json" \
    "$TMP/filters.json" "$TMP/err.json" "$TMP/traffic.json" "$TMP/errors.json")
if printf '%s' "$plain" | jq -e '(has("sections") | not) and ([.charts[].sectionId] | all(. == null))' > /dev/null; then
    ok "assemble without --section omits sections and drops a stale sectionId"
else
    fail "assemble without --section omits sections and drops a stale sectionId" "$plain"
fi

if "$ASSEMBLE" --name "API" --datasets logs --layout "$TMP/layout.json" \
    --section "Filters:filters" \
    "$TMP/filters.json" "$TMP/err.json" "$TMP/traffic.json" "$TMP/errors.json" \
    > /dev/null 2> "$TMP/smart.err"; then
    fail "SmartFilter cannot be placed in a section" "assemble succeeded"
else
    ok "SmartFilter cannot be placed in a section"
fi

jq '.charts |= map(if .id == "err-rate" then .sectionId = "11111111-2222-4333-8444-555555555555" else . end)' "$TMP/dashboard.json" > "$TMP/dangling.json"
if "$VALIDATE" "$TMP/dangling.json" > /dev/null 2>&1; then
    fail "validate rejects a chart sectionId with no section" "validator passed"
else
    ok "validate rejects a chart sectionId with no section"
fi

jq '.sections[0].id as $sid | .charts |= map(if .id == "filters" then .sectionId = $sid else . end)' \
    "$TMP/dashboard.json" > "$TMP/filter-section.json"
if "$VALIDATE" "$TMP/filter-section.json" > /dev/null 2>&1; then
    fail "validate rejects a SmartFilter inside a section" "validator passed"
else
    ok "validate rejects a SmartFilter inside a section"
fi

echo ""
echo "$passed passed, $failed failed"
[[ "$failed" -eq 0 ]]
