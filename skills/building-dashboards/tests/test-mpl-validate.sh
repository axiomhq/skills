#!/usr/bin/env bash
# Check the metrics query that mpl-validate-chart and metrics-query send, with stub helpers.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
METRICS_DIR="$SCRIPT_DIR/../scripts/metrics"
TEST_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_DIR"' EXIT
export STUB_DATASET="$TEST_DIR/dataset" STUB_BODY="$TEST_DIR/body"

cp "$METRICS_DIR/mpl-validate-chart" "$METRICS_DIR/metrics-query" "$TEST_DIR/"
cat > "$TEST_DIR/resolve-url" <<'STUB'
#!/bin/bash
printf '%s\n' "$2" > "$STUB_DATASET"
STUB
cat > "$TEST_DIR/axiom-api" <<'STUB'
#!/bin/bash
printf '%s\n' "$4" > "$STUB_BODY"
echo '{}'
STUB
chmod +x "$TEST_DIR/resolve-url" "$TEST_DIR/axiom-api"

failed=0
check() {
    if [[ "$2" == "$3" ]]; then
        echo "  OK: $1"
    else
        echo "  FAIL: $1: got $2"
        failed=1
    fi
}

query='`m`:cpu | align to $__interval using avg'
"$TEST_DIR/mpl-validate-chart" test "$query" > /dev/null
check "mpl-validate-chart sends the query as written" "$(jq -r .apl "$STUB_BODY")" "$query"
check "mpl-validate-chart sends no params" "$(jq -c '.params // null' "$STUB_BODY")" null

"$TEST_DIR/metrics-query" test $'set custom_unit="h";\n`m`:cpu | align to 1h using avg' now-1h now > /dev/null
check "metrics-query reads the dataset after a set line" "$(cat "$STUB_DATASET")" m

[[ $failed -eq 0 ]]
echo "All metrics query checks passed."
