# metrics-chart

Renders saved Axiom metrics query results (v2 or v3 JSON) as
multi-series line charts — directly in your terminal or agent transcript.

## What It Does

- **Zero-dependency charts** - Pure Python stdlib Unicode/braille line chart that renders in any terminal, transcript, or CI log
- **Optional high-fidelity images** - If `gnuplot` is installed, emits PNG/SVG/sixel, displayed inline in image-capable terminals (Kitty/Ghostty, iTerm2)
- **Series reduction** - Collapses overlapping lines and caps at top-N by peak, reporting how many series were dropped
- **Time-aware** - Local-time x-axis by default (`--tz` to override); `null` points are drawn as gaps, not zeros
- **Readable legends** - Built from the response's `group_keys` (e.g. `200 | GET`), with the y-axis unit taken from the metadata

## Installation

```bash
# Amp
amp skill add axiomhq/skills/metrics-chart

# npx (Claude Code, Cursor, Codex, and more)
npx skills add axiomhq/skills -s metrics-chart
```

## Prerequisites

- **Python 3.9+** - standard library only; no pip packages
- **gnuplot** (optional) - only for `--format png|svg|sixel`; the default ASCII renderer needs nothing

No `~/.axiom.toml` and no network access required — this skill renders a query
response you already have.

## Input

Use the complete `{metadata, series}` JSON from Axiom MCP's `queryMetrics` with `truncate: false`. Save its `structuredContent` field as `response.json`; do not save the MCP envelope or reconstruct samples from the default CSV preview. The text response can include a query-budget footer.

The renderer also accepts saved API responses in v2 (`application/json+metrics.v2`) or v3 (`application/vnd.metrics.v3+json`) form. A per-series `summary` is ignored. Rendering an existing file needs no MCP connection.

## Usage

```bash
# Render a saved response (auto-picks an inline image or ASCII for your terminal)
scripts/metrics_chart.py response.json

# Read a saved response from stdin
scripts/metrics_chart.py < response.json

# Force a zero-dependency ASCII chart anywhere
scripts/metrics_chart.py --format ascii response.json

# High-fidelity PNG to a file
scripts/metrics_chart.py --format png --output chart.png response.json
```

Common options: `--tz <IANA|UTC>`, `--top <N>`, `--all`, `--title`,
`--width`/`--height`, `--color`/`--no-color`. See [SKILL.md](SKILL.md) for the
full reference and input schema.

## Scripts

| Script                  | Purpose                                                |
| ----------------------- | ------------------------------------------------------ |
| `metrics_chart.py`      | Render a metrics v3 (or v2) response as a line chart   |
| `test_metrics_chart.py` | Unit tests: `python3 -m unittest test_metrics_chart`   |

## Related Skills

- [`building-dashboards`](../building-dashboards/) - for persistent dashboards instead of ad-hoc terminal charts
