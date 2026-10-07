#!/usr/bin/env bash
# Exercise both metrics API helpers with dummy config and a recording curl.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TEST_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_DIR"' EXIT
export AXIOM_TEST_CONFIG="$TEST_DIR/config.toml"
export AXIOM_TEST_REQUEST="$TEST_DIR/request"
cat > "$TEST_DIR/curl" <<'CURL'
#!/bin/bash
printf '%s\n' "$@" > "$AXIOM_TEST_REQUEST"
printf '{}\n200\n'
CURL
chmod +x "$TEST_DIR/curl"
export PATH="$TEST_DIR:$PATH"

write_config() {
    printf '[deployments.test]\nurl = "%s"\ntoken = "dummy-token"\norg_id = "dummy-org"\n' "$1" > "$AXIOM_TEST_CONFIG"
}
allowed() {
    local configured="$1" override="$2" path="$3" expected="$4"
    write_config "$configured"
    rm -f "$AXIOM_TEST_REQUEST"
    result=$(AXIOM_URL_OVERRIDE="$override" AXIOM_MAX_TIME=240 "$TEST_DIR/axiom-api" test GET "$path")
    [[ "$result" == '{}' ]] || { echo "FAIL: response changed"; exit 1; }
    grep -Fxq -- "$expected" "$AXIOM_TEST_REQUEST" || { echo "FAIL: request URL changed"; exit 1; }
    grep -Fxq -- 'Authorization: Bearer dummy-token' "$AXIOM_TEST_REQUEST" || { echo "FAIL: auth header changed"; exit 1; }
    grep -Fxq -- '240' "$AXIOM_TEST_REQUEST" || { echo "FAIL: timeout override changed"; exit 1; }
    echo "  OK: configured request or hosted edge"
}
rejected() {
    write_config "$1"
    rm -f "$AXIOM_TEST_REQUEST"
    if AXIOM_URL_OVERRIDE="$2" "$TEST_DIR/axiom-api" test GET "$3" > "$TEST_DIR/output" 2>&1; then
        echo "FAIL: accepted an unrelated destination or invalid path"
        exit 1
    fi
    [[ ! -e "$AXIOM_TEST_REQUEST" ]] || { echo "FAIL: curl ran before validation"; exit 1; }
    ! grep -Fq 'dummy-token' "$TEST_DIR/output" || { echo "FAIL: error exposed credentials"; exit 1; }
    echo "  OK: rejected before curl"
}

for relative in skills/query-metrics/scripts/axiom-api skills/building-dashboards/scripts/metrics/axiom-api; do
    echo "$relative"
    # Replace only the config-file location in a temporary copy; never read the
    # user's config or add a production configuration override just for tests.
    grep -Fxq 'CONFIG_FILE="$HOME/.axiom.toml"' "$REPO_DIR/$relative"
    sed 's|^CONFIG_FILE="$HOME/.axiom.toml"$|CONFIG_FILE="${AXIOM_TEST_CONFIG:?}"|' "$REPO_DIR/$relative" > "$TEST_DIR/axiom-api"
    chmod +x "$TEST_DIR/axiom-api"
    allowed https://api.axiom.co '' /v1/datasets https://api.axiom.co/v1/datasets
    allowed https://api.axiom.co https://eu-central-1.aws.edge.axiom.co /v1/query/_mpl https://eu-central-1.aws.edge.axiom.co/v1/query/_mpl
    allowed https://api.axiom.co https://us-east-1.aws.edge.axiom.co /v1/query/_mpl https://us-east-1.aws.edge.axiom.co/v1/query/_mpl
    allowed http://localhost:3000 '' /v1/datasets http://localhost:3000/v1/datasets
    allowed 'http://[::1]:3000' '' /v1/datasets 'http://[::1]:3000/v1/datasets'
    allowed https://private.test HTTPS://PRIVATE.TEST:443 /v1/datasets HTTPS://PRIVATE.TEST:443/v1/datasets
    rejected https://api.axiom.co https://unrelated.invalid /v1/datasets
    rejected https://api.axiom.co https://api.axiom.co.unrelated.invalid /v1/datasets
    rejected https://api.axiom.co https://api.axiom.co@unrelated.invalid /v1/datasets
    rejected https://api.axiom.co http://api.axiom.co /v1/datasets
    rejected https://private.test https://eu-central-1.aws.edge.axiom.co /v1/datasets
    rejected https://api.axiom.co '' @unrelated.invalid/path
    rejected https://api.axiom.co '' v1/datasets
    rejected https://api.axiom.co https /v1/datasets
done
echo "All metrics destination checks passed."
