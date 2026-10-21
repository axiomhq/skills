#!/usr/bin/env bash
# tests/unit-for.sh — golden tests for scripts/metrics/unit-for
#
# Run from anywhere:
#   skills/axiom-building-dashboards/tests/unit-for.sh

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

# Expectations come from the Console unitMap and the registered formatters,
# not unit-for's table. See reference/metrics-mpl.md, Unit Handling.
# Exercise every explicitly mapped unit whose formatter supplies its label.
for unit in USD GBP EUR BTC % ns us ms s min h d Hz \
    By KiBy MiBy GiBy TiBy PiBy \
    kBy MBy GBy TBy PBy \
    By/s kBy/s MBy/s GBy/s TBy/s PBy/s \
    bit/s kbit/s Mbit/s Gbit/s Tbit/s Pbit/s \
    '{packets}/s' '{requests}/s' '{operations}/s'; do
    check "formatted:$unit" "$unit" '{}'
done

# The Console also resolves lowercased formatter IDs for unmapped inputs.
for unit in percent100 percent curusd curgbp cureur curbtc \
    bits bytes kbytes mbytes gbytes tbytes pbytes \
    decbits decbytes deckbytes decmbytes decgbytes dectbytes decpbytes \
    pps bps datetimeiso hertz ns µs ms secs mins hours days ago \
    cps ops reqps rps wps iops cpm opm reqpm rpm wpm; do
    check "formatter-id:$unit" "$unit" '{}'
done
check "formatter-id:BYTES" "BYTES" '{}'

# Currency symbols are rejected: the Console adds the symbol for the code.
for sym in '$' '€' '£'; do
    if "$SCRIPT" "$sym" > /dev/null 2>&1; then
        echo "FAIL [symbol:$sym]: accepted"
        FAIL=$((FAIL+1))
    else
        PASS=$((PASS+1))
    fi
done

# Units the Console does not format stay a suffix.
check "suffix:JPY"        "JPY"           '{"customUnits":"JPY"}'
# The Console's short formatter abbreviates counts but adds no count label.
check "count:requests"    "{requests}"    '{"customUnits":"{requests}"}'
check "count:packets"     "{packets}"     '{"customUnits":"{packets}"}'
# UCUM codes are case-sensitive: kBy is mapped, KBy is not.
check "unmapped:KBy"      "KBy"           '{"customUnits":"KBy"}'
check "unmapped:KBs"      "KBs"           '{"customUnits":"KBs"}'
check "unmapped:usd"      "usd"           '{"customUnits":"usd"}'
check "unmapped:seconds"  "seconds"       '{"customUnits":"seconds"}'
check "unitless:short"    "short"         '{"customUnits":"short"}'
check "unitless:none"     "none"          '{"customUnits":"none"}'

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
