#!/usr/bin/env bash
# Exercise the local builders against the MCP dashboard document contract.
set -euo pipefail
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../scripts" && pwd)"
TEST_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_DIR"' EXIT

"$SCRIPTS_DIR/chart-add" --type Statistic --id requests --name Requests \
    --apl "['logs'] | count" > "$TEST_DIR/apl.json"
jq -e '.query.apl != null and (.query | has("mpl") | not)' "$TEST_DIR/apl.json" > /dev/null

"$SCRIPTS_DIR/chart-add" --type TimeSeries --id replicas --name Replicas \
    --mpl '`metrics`:replicas | align to $__interval using avg' \
    --dataset metrics > "$TEST_DIR/mpl.json"
jq -e '.query.mpl != null and .query.metricsDataset == "metrics"
    and (.query | has("apl") | not)' "$TEST_DIR/mpl.json" > /dev/null

"$SCRIPTS_DIR/chart-add" --type Statistic --id latency --name Latency \
    --mpl '`metrics`:latency | group using avg' --dataset metrics --unit ms \
    > "$TEST_DIR/stat.json"
jq -e '.query.mpl | startswith("set custom_unit=\"ms\";")' "$TEST_DIR/stat.json" > /dev/null

# Overlay two pipelines, using the same merge shape as the chart reference.
jq '.query as $first | .queries = [$first + {name: "A"}, $first + {name: "B"}]
    | .query = .queries[0]' "$TEST_DIR/mpl.json" > "$TEST_DIR/multi.json"
"$SCRIPTS_DIR/layout-pack" requests:Statistic replicas:TimeSeries > "$TEST_DIR/layout.json"
for refresh in 15 60 300 oncall team; do
    "$SCRIPTS_DIR/dashboard-assemble" --name Test --datasets logs,metrics \
        --owner me --refresh "$refresh" --time-window 24h \
        --layout "$TEST_DIR/layout.json" "$TEST_DIR/apl.json" "$TEST_DIR/multi.json" \
        > "$TEST_DIR/dashboard.json"
    jq -e '.owner == "me" and .schemaVersion == 2
        and (.refreshTime as $r | [15,60,300] | index($r) != null)
        and .timeWindowStart == "qr-now-24h" and .timeWindowEnd == "qr-now"
        and .charts[1].query == .charts[1].queries[0]
        and ([.charts[1].queries[] | has("mpl") and (has("apl") | not)] | all)' \
        "$TEST_DIR/dashboard.json" > /dev/null
    "$SCRIPTS_DIR/dashboard-validate" "$TEST_DIR/dashboard.json" --strict > /dev/null
done

for refresh in 0 30 900 exec invalid; do
    if "$SCRIPTS_DIR/dashboard-assemble" --name Test --datasets logs,metrics \
        --refresh "$refresh" --layout "$TEST_DIR/layout.json" \
        "$TEST_DIR/apl.json" "$TEST_DIR/multi.json" > /dev/null 2>&1; then
        echo "FAIL: unsupported MCP refresh value accepted: $refresh" >&2; exit 1
    fi
done
echo "PASS: APL/MPL fields, multi-query charts, units, private owner, and refresh settings"
