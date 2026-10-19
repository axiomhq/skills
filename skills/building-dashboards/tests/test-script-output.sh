#!/usr/bin/env bash
# test-script-output.sh: Ensure deployment scripts keep machine-readable stdout
#
# Usage: ./test-script-output.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$SCRIPT_DIR/../scripts"

passed=0
failed=0

ok() {
    ((passed++)) || true
    echo "  ✓ $1"
}

fail() {
    ((failed++)) || true
    echo "  ✗ $1: $2"
}

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

cp "$SCRIPTS_DIR/dashboard-create" "$TMPDIR/"
cp "$SCRIPTS_DIR/dashboard-update" "$TMPDIR/"
cp "$SCRIPTS_DIR/dashboard-chart-patch" "$TMPDIR/"
cp "$SCRIPTS_DIR/dashboard-validate" "$TMPDIR/"
cp "$SCRIPTS_DIR/dashboard-normalize.jq" "$TMPDIR/"

chmod +x "$TMPDIR/dashboard-create" "$TMPDIR/dashboard-update" "$TMPDIR/dashboard-chart-patch" "$TMPDIR/dashboard-validate"

cat > "$TMPDIR/input.json" <<'JSON'
{
  "id": "dashboard-root-id",
  "version": "v1",
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-02T11:00:00Z",
  "createdBy": "alice@example.com",
  "updatedBy": "bob@example.com",
  "schemaVersion": 2,
  "name": "Test Dashboard",
  "description": "Test",
  "owner": "user-123",
  "charts": [
    {
      "id": "error-rate",
      "name": "Error Rate",
      "type": "Statistic",
      "query": { "apl": "['logs'] | summarize c=count()" }
    }
  ],
  "layout": [
    { "i": "error-rate", "x": 0, "y": 0, "w": 3, "h": 2 }
  ]
}
JSON

cat > "$TMPDIR/chart.patch.json" <<'JSON'
{
  "name": "Error Rate (5m)",
  "query": { "apl": "['logs'] | summarize errors=countif(status >= 500)" },
  "config": { "stale": null }
}
JSON

cat > "$TMPDIR/axiom-api" <<'BASH'
#!/usr/bin/env bash
set -euo pipefail
METHOD="${2:-}"
PATH_="${3:-}"
BODY="${4:-}"

case "$METHOD:$PATH_" in
  "POST:/dashboards")
    echo '{"status":"created","dashboard":{"uid":"created-uid","id":"created-id","version":1,"dashboard":{"name":"Test Dashboard"},"createdAt":"2026-02-01T10:00:00Z","updatedAt":"2026-02-01T10:00:00Z","createdBy":"alice@example.com","updatedBy":"alice@example.com"}}'
    ;;
  "PUT:/dashboards/uid/dashboard-root-id")
    echo '{"status":"updated","dashboard":{"uid":"dashboard-root-id","id":"dashboard-root-id","version":2,"dashboard":{"name":"Test Dashboard","updated":true},"createdAt":"2026-02-01T10:00:00Z","updatedAt":"2026-02-02T11:00:00Z","createdBy":"alice@example.com","updatedBy":"bob@example.com"}}'
    ;;
  "PATCH:/dashboards/uid/dashboard-root-id/charts/error-rate")
    echo "$BODY" | jq -e '
      .chart.name == "Error Rate (5m)" and
      .chart.query.apl == "['\''logs'\''] | summarize errors=countif(status >= 500)" and
      (.chart.config | has("stale")) and
      .chart.config.stale == null and
      .version == 7 and
      .message == "Tune error chart" and
      (.overwrite | not)
    ' > /dev/null
    echo '{"status":"updated","dashboard":{"uid":"dashboard-root-id","id":"dashboard-root-id","version":8,"dashboard":{"name":"Test Dashboard","chartPatched":true},"createdAt":"2026-02-01T10:00:00Z","updatedAt":"2026-02-02T12:00:00Z","createdBy":"alice@example.com","updatedBy":"bob@example.com"}}'
    ;;
  *)
    echo "Unexpected call: $METHOD $PATH_" >&2
    exit 1
    ;;
esac
BASH

chmod +x "$TMPDIR/axiom-api"

echo "Script Stdout Contract"
echo "======================"

create_out=$("$TMPDIR/dashboard-create" prod "$TMPDIR/input.json")
if [[ "$create_out" == "created-uid" ]]; then
    ok "dashboard-create outputs only dashboard UID"
else
    fail "dashboard-create outputs only dashboard UID" "got: $create_out"
fi

update_out=$("$TMPDIR/dashboard-update" prod dashboard-root-id "$TMPDIR/input.json")
if echo "$update_out" | jq -e '.dashboard.uid == "dashboard-root-id" and .dashboard.dashboard.updated == true' > /dev/null 2>&1; then
    ok "dashboard-update outputs valid JSON only"
else
    fail "dashboard-update outputs valid JSON only" "got: $update_out"
fi

patch_out=$("$TMPDIR/dashboard-chart-patch" prod dashboard-root-id error-rate "$TMPDIR/chart.patch.json" --version 7 --message "Tune error chart")
if echo "$patch_out" | jq -e '.dashboard.uid == "dashboard-root-id" and .dashboard.dashboard.chartPatched == true' > /dev/null 2>&1; then
    ok "dashboard-chart-patch outputs valid JSON only"
else
    fail "dashboard-chart-patch outputs valid JSON only" "got: $patch_out"
fi

apl_fmt=$("$SCRIPTS_DIR/chart-add" --type Statistic --id t --name T \
    --apl "['logs'] | where a=='x' | summarize c=count()" | jq -r '.query.apl')
if [[ "$(printf '%s' "$apl_fmt" | grep -c '^| ')" == "2" && "$apl_fmt" != *" | "* ]]; then
    ok "chart-add breaks each pipeline stage onto its own line"
else
    fail "chart-add breaks each pipeline stage onto its own line" "got: $apl_fmt"
fi

apl_str=$("$SCRIPTS_DIR/chart-add" --type Statistic --id t --name T \
    --apl "['logs'] | where msg=='a | b'" | jq -r '.query.apl')
if [[ "$apl_str" == *"msg=='a | b'"* ]]; then
    ok "chart-add leaves a pipe inside a string literal untouched"
else
    fail "chart-add leaves a pipe inside a string literal untouched" "got: $apl_str"
fi

# Constructs whose string boundaries the split cannot follow must round-trip
# byte-for-byte rather than risk a newline landing inside a literal.
check_verbatim() {
    local label="$1" input="$2" got
    got=$("$SCRIPTS_DIR/chart-add" --type Statistic --id t --name T --apl "$input" | jq -r '.query.apl')
    if [[ "$got" == "$input" ]]; then
        ok "chart-add stores $label untouched"
    else
        fail "chart-add stores $label untouched" "got: $got"
    fi
}

check_verbatim "a backslash-escaped quote" '["logs"] | where msg == "a \" b | c" | project msg'
check_verbatim "an @-verbatim literal" '["logs"] | where p == @"c:\x | y" | project p'
check_verbatim "a // comment" '["logs"] // note | here
| count'

check_stat_units() {
    local label="$1" expected="$2" got
    shift 2
    # Keep only the unit keys that are present, so an absent key never reads as null.
    got=$("$SCRIPTS_DIR/chart-add" --type Statistic --id t --name T "$@" \
        | jq -c 'with_entries(select(.key == "unit" or .key == "customUnits"))')
    if [[ "$got" == "$expected" ]]; then
        ok "chart-add Statistic $label"
    else
        fail "chart-add Statistic $label" "got: $got"
    fi
}

check_stat_units "APL --unit ms writes customUnits only" '{"customUnits":"ms"}' \
    --apl "['logs'] | summarize avg(duration_ms)" --unit ms
check_stat_units "APL --unit 1 writes no unit fields" '{}' \
    --apl "['logs'] | summarize count()" --unit 1
check_stat_units "MPL --unit USD writes no unit fields" '{}' \
    --mpl '`m`:cost | group using sum' --dataset m --unit USD
check_stat_units "MPL --unit % writes the % suffix" '{"customUnits":"%"}' \
    --mpl '`m`:ratio | map * 100' --dataset m --unit %

sizes=$("$SCRIPTS_DIR/layout-pack" n:Note s:Statistic t:TimeSeries h:Heatmap tb:Table p:Pie l:LogStream m:MonitorList f:SmartFilter \
    | jq -c 'map("\(.i)=\(.w)x\(.h)") | join(" ")')
want='"n=12x2 s=3x2 t=4x4 h=4x4 tb=6x5 p=3x5 l=12x7 m=4x4 f=12x1"'
if [[ "$sizes" == "$want" ]]; then
    ok "layout-pack uses the documented default sizes"
else
    fail "layout-pack uses the documented default sizes" "got: $sizes"
fi

logstream_doc() {
    jq -n --arg apl "$1" '{name: "T", owner: "X-AXIOM-EVERYONE", schemaVersion: 2,
        charts: [{id: "logs", name: "Logs", type: "LogStream", query: {apl: $apl}}],
        layout: [{i: "logs", x: 0, y: 0, w: 12, h: 7, minW: 3, minH: 3}]}'
}

check_logstream() {
    local want="$1" label="$2" apl="$3" got
    logstream_doc "$apl" > "$TMPDIR/ls.json"
    if "$SCRIPTS_DIR/dashboard-validate" "$TMPDIR/ls.json" --strict > /dev/null; then
        got=accepts
    else
        got=rejects
    fi
    if [[ "$got" == "$want" ]]; then
        ok "dashboard-validate --strict $want a LogStream $label"
    else
        fail "dashboard-validate --strict $want a LogStream $label" "it $got it"
    fi
}

check_logstream accepts "without take" "['logs'] | where status >= 500 | project-keep _time, msg"
check_logstream rejects "with take" "['logs'] | where status >= 500 | take 100"
check_logstream rejects "with limit" "['logs'] | where status >= 500 | limit 100"
check_logstream accepts "with '| take' in a string" "['logs'] | where message contains \"| take 100\""
check_logstream accepts "with '| take' in a single-quoted string" "['logs'] | where message contains '| take 100'"
check_logstream accepts "with '| take' in a comment" $'[\'logs\'] // old example: | take 100\n| where status >= 500'
check_logstream rejects "with take after a comment" $'[\'logs\']\n| // comment\ntake 100'

echo ""
echo "======================"
echo "Passed: $passed | Failed: $failed"

[[ $failed -eq 0 ]]
