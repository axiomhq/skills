# Full setup

Read only the sections for items that are turned on: every section in full-setup mode, or just the named items in add-an-item mode (see the item table in SKILL.md). Each section is independent; doing one never requires another. Quick start offers these items as next steps instead of doing them.

## Scope

- **Whole repository:** discover every deployable process (services, workers, jobs, CLIs, functions). Show a compact inventory with enabled, preserved, unsupported, and deferred signals and reasons; never silently skip an in-scope service. Prove one representative service before extending the pattern.
- **Full-app web setup:** include browser telemetry for the enabled signals and, when tracing is enabled, verify browser-to-backend propagation. Browser export needs a controlled first-party gateway and collection/consent controls; see [deployment.md](deployment.md). If these cannot be established, report browser setup as blocked and the full-app result as partial. Backend-only requests leave browser code unchanged.

## Privacy sentinel check

Send a synthetic query-string value and a synthetic authorization/cookie header through a real request. Confirm in a local exporter or receiver that neither value appears in spans, logs, or metric attributes. Use only synthetic values. See [privacy.md](privacy.md) for fixes.

## Safe failure check

When tracing is enabled, exercise a representative failure in a test environment and verify error status and `error.type` on the span and, when logs are enabled, an error log in the same trace carrying the exception's type, message, and stack trace with sensitive details redacted (see [spans.md](spans.md#errors-and-exceptions)). Distinguish expected validation rejections from internal or downstream failures.

Use an existing error path, a local stub of a downstream dependency, or a temporary trigger in the app (for example a route or flag that throws), and remove the trigger afterward. Do not use a standalone script that calls the SDK outside the app: it bypasses the startup path being verified. Never disrupt production. Report a blocker if the failure cannot be exercised safely.

## Metric correctness

Baseline verification proves delivery. For a new or custom metric, or a suspected calculation problem, also prove the value:

- Exercise a known operation and verify the expected change for the same instance and complete attribute set.
- Cumulative counter: compare before and after without crossing a reset; never sum cumulative snapshots (`10, 10, 11` sums to `31` when the increase was `1`).
- Delta counter: sum samples in the exercise window.
- Histogram: use temporality-aware count or rate evidence, not a percentile alone. Do not run ordinary `align` or `group` over histogram components.
- Unrelated gauges and counters need not change.

## Business instrumentation

Requested with "add custom metrics" or "instrument more operations", or as part of full setup, after baseline telemetry is verified. Quick start already adds key context to 1–3 main operations; this extends it. Select further critical workflows whose duration or outcome answers a concrete question. Enrich existing spans before adding new ones; see [spans.md](spans.md). For each proposed metric, establish its name, unit, instrument type, recording point, the question it answers, allowed attributes with finite value sets, plausible series count, and excluded sensitive values. Repeat the relevant checks in [verify.md](verify.md).

## Production sign-off

Only when requested. See [deployment.md](deployment.md#production-sign-off).
