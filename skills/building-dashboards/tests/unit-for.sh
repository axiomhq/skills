#!/usr/bin/env bash
# tests/unit-for.sh — golden tests for scripts/metrics/unit-for
#
# Run from anywhere:
#   skills/building-dashboards/tests/unit-for.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$SCRIPT_DIR/scripts/metrics/unit-for"

if [[ ! -x "$SCRIPT" ]]; then
    echo "FAIL: $SCRIPT is not executable" >&2
    exit 2
fi

PASS=0
FAIL=0

# Compare two JSON blobs as sorted objects so key order doesn't matter.
check() {
    local label="$1" input="$2" expected="$3"
    local actual
    if actual=$("$SCRIPT" "$input" 2>&1); then
        :
    else
        echo "FAIL [$label]: '$input' -> script errored: $actual"
        FAIL=$((FAIL+1))
        return
    fi
    local actual_sorted expected_sorted
    actual_sorted=$(echo "$actual" | jq -S .)
    expected_sorted=$(echo "$expected" | jq -S .)
    if [[ "$actual_sorted" == "$expected_sorted" ]]; then
        PASS=$((PASS+1))
    else
        echo "FAIL [$label]: '$input'"
        echo "  expected: $expected_sorted"
        echo "  actual:   $actual_sorted"
        FAIL=$((FAIL+1))
    fi
}

# The Console formats these from the metric's own unit. A suffix would show
# the unit twice ("$1.03K$").
check "formatted:s"       "s"             '{}'
check "formatted:ms"      "ms"            '{}'
check "formatted:us"      "us"            '{}'
check "formatted:ns"      "ns"            '{}'
check "formatted:min"     "min"           '{}'
check "formatted:h"       "h"             '{}'
check "formatted:d"       "d"             '{}'
check "formatted:By"      "By"            '{}'
check "formatted:KiBy"    "KiBy"          '{}'
check "formatted:USD"     "USD"           '{}'
check "formatted:EUR"     "EUR"           '{}'

# Percent: the suffix for a 0-1 ratio scaled with `| map * 100`.
check "percent"           "%"             '{"customUnits":"%"}'

# Units the Console does not format stay a suffix.
check "suffix:MBy"        "MBy"           '{"customUnits":"MBy"}'
check "suffix:By/s"       "By/s"          '{"customUnits":"By/s"}'
check "suffix:JPY"        "JPY"           '{"customUnits":"JPY"}'

# Custom units exercise the fallback path.
check "custom:Cel"        "Cel"           '{"customUnits":"Cel"}'
check "custom:kW.h"       "kW.h"          '{"customUnits":"kW.h"}'
check "custom:[ppm]"      "[ppm]"         '{"customUnits":"[ppm]"}'
check "custom:m3/h"       "m3/h"          '{"customUnits":"m3/h"}'
check "custom:lx"         "lx"            '{"customUnits":"lx"}'
check "custom:ug/m3"      "ug/m3"         '{"customUnits":"ug/m3"}'
check "custom:A"          "A"             '{"customUnits":"A"}'
check "custom:V"          "V"             '{"customUnits":"V"}'

# Ambiguous — by design, NOT auto-mapped. These properties are documented in
# unit-for's header and in reference/metrics-mpl.md; a regression here means
# we have unintentionally introduced a footgun.
check "ambiguous:m"       "m"             '{"customUnits":"m"}'
check "ambiguous:B"       "B"             '{"customUnits":"B"}'

# Special sentinels
check "sentinel:1"        "1"             '{}'
check "sentinel:empty"    ""              '{}'

# Missing arg should behave like empty string (bash ${1-})
if MISSING_OUT=$("$SCRIPT" 2>&1); then
    actual_sorted=$(echo "$MISSING_OUT" | jq -S .)
    expected_sorted=$(echo '{}' | jq -S .)
    if [[ "$actual_sorted" == "$expected_sorted" ]]; then
        PASS=$((PASS+1))
    else
        echo "FAIL [missing-arg]: expected $expected_sorted, got $actual_sorted"
        FAIL=$((FAIL+1))
    fi
else
    echo "FAIL [missing-arg]: script errored: $MISSING_OUT"
    FAIL=$((FAIL+1))
fi

echo "---"
echo "Passed: $PASS  Failed: $FAIL"
[[ $FAIL -eq 0 ]] || exit 1
