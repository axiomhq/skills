"""Offline cost-analysis helpers. All Axiom access belongs to the calling MCP client."""

import argparse
import csv
import io
import json
import math
from pathlib import Path
import subprocess
from collections import Counter
from datetime import datetime, timedelta, timezone


def read_rows(path, columns):
    """Read an extracted MCP CSV table or JSON row array, never a tool envelope."""
    text = Path(path).read_text(encoding="utf-8-sig")
    if not text.strip():
        raise ValueError(f"{path}: empty file is not a verified empty result")
    if text.lstrip().startswith(("[", "{")):
        rows = json.loads(text)
        if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
            raise ValueError(f"{path}: expected a JSON array of row objects")
    else:
        reader = csv.DictReader(io.StringIO(text), strict=True)
        if not reader.fieldnames or not set(columns) <= set(reader.fieldnames):
            raise ValueError(f"{path}: required CSV columns: {', '.join(columns)}")
        if len(reader.fieldnames) != len(set(reader.fieldnames)):
            raise ValueError(f"{path}: duplicate CSV columns")
        rows = list(reader)
    for row in rows:
        if None in row or any(key not in row or row[key] is None for key in columns):
            raise ValueError(f"{path}: incomplete row; expected {', '.join(columns)}")
    return rows


def number(value, label):
    if isinstance(value, bool):
        raise ValueError(f"{label}: expected a non-negative number")
    result = float(value)
    if not math.isfinite(result) or result < 0:
        raise ValueError(f"{label}: expected a finite non-negative number")
    return result


def integer(value, label):
    result = number(value, label)
    if result != int(result):
        raise ValueError(f"{label}: expected an integer")
    return int(result)


def baseline(args):
    usage = read_rows(args.usage, ["dataset", "ingest_bytes", "query_gbms"])
    seen = set()
    for row in usage:
        if not row["dataset"] or row["dataset"] in seen:
            raise ValueError("Usage must have one row per named dataset")
        seen.add(row["dataset"])
        for key in ("ingest_bytes", "query_gbms"):
            row[key] = number(row[key], key)
    total = sum(row["ingest_bytes"] for row in usage)
    queue = []
    ranked = sorted(usage, key=lambda row: -row["ingest_bytes"])
    for rank, row in enumerate((r for r in ranked if r["ingest_bytes"] > 1e10), 1):
        ingest, work = row["ingest_bytes"], row["query_gbms"]
        ratio, share = work / (ingest / 1e9), 100 * ingest / total
        priority = 0 if rank <= 3 or share > 10 else 1 if work == 0 else 2 if ratio < 100 else 3 if rank <= 10 else 99
        if priority == 99:
            continue
        reasons = []
        for condition, reason in ((rank <= 3, "top3_ingest"), (share > 10, ">10%_share"),
                                  (work == 0, "no_observed_query_cost"), (0 < ratio < 100, "low_work_gb"),
                                  (rank <= 5, "top5_ingest"), (3 < rank <= 10, "top10_ingest")):
            if condition:
                reasons.append(reason)
        queue.append(dict(row, rank=rank, priority=priority, reasons=reasons,
                          ingest_tb=ingest / 1e12, work_per_gb=ratio, share_pct=share))
    queue.sort(key=lambda row: (row["priority"], -row["ingest_bytes"]))
    result = {"total_ingest_bytes": total, "queue": queue,
              "note": "Query cost per ingested GB is a prioritization signal, not proof of data value or safe deletion."}
    if args.daily:
        daily = read_rows(args.daily, ["avg_tb", "p50_tb", "p90_tb", "p95_tb", "max_tb", "total_tb", "days"])
        if len(daily) != 1:
            raise ValueError("Expected one daily summary row; investigate missing usage data")
        result["daily"] = {key: number(value, key) for key, value in daily[0].items()}
    return result


def coverage(args):
    rows = read_rows(args.queries, ["parsed", "count"])
    counts = read_rows(args.counts, ["unique_queries", "total_executions"])
    if len(counts) != 1:
        raise ValueError("Expected one history-count row")
    executions = sum(integer(row["count"], "count") for row in rows)
    if len(rows) != integer(counts[0]["unique_queries"], "unique_queries") or executions != integer(counts[0]["total_executions"], "total_executions"):
        raise ValueError("History is incomplete or counts differ; partition and refetch through MCP")
    asts = [json.loads(row["parsed"]) if isinstance(row["parsed"], str) else row["parsed"] for row in rows]
    if any(not isinstance(ast, dict) or not isinstance(ast.get("body"), dict) for ast in asts):
        raise ValueError("Missing or malformed parse_apl result; do not treat parse failures as unused data")
    parsed = subprocess.run(["jq", "-L", str(Path(__file__).parent),
                             'include "ast-parser"; map(extract_query_info)'],
                            input=json.dumps(asts), capture_output=True, text=True, check=True)
    queries = json.loads(parsed.stdout)
    n = len(queries)
    usage = Counter(column for query in queries for column in query["all_columns"])
    wildcard = sum(query["has_wildcard"] for query in queries)
    result = {"unique_queries": n, "total_executions": executions, "wildcard_queries": wildcard,
              "column_usage": [{"column": col, "query_count": count, "coverage_pct": 100 * count / n,
                                "opportunity_score": 1 - count / n} for col, count in usage.most_common()],
              "note": "Coverage counts distinct query patterns, not executions. No observed reference does not prove data is unused."}
    if args.schema:
        schema = read_rows(args.schema, ["ColumnName"])
        columns = {row["ColumnName"] for row in schema}
        result["schema_column_count"] = len(columns)
        result["unreferenced_columns"] = sorted(columns - usage.keys())
        result["unreferenced_column_count"] = len(result["unreferenced_columns"])
    fields = Counter(field for query in queries for field in
                     [p["field"] for p in query["where_predicates"]] + query["summarize_groups"] if field)
    result["suggested_fields"] = [{"field": field, "count": count} for field, count in fields.most_common(10) if count > n * .05]
    if not args.field:
        return result
    field = args.field
    refs = [q for q in queries if field in q["all_columns"]]
    predicates = [p for q in queries for p in q["where_predicates"] if p["field"] == field]
    # Literal matches are evidence of explicit targeting only. A parser cannot prove
    # exclusion for regex, negation, expressions, joins, wildcard or unfiltered queries.
    literal_values = set()
    for p in predicates:
        values = p.get("values", []) if p["op"] == "in" else [p.get("value")] if p["op"] == "==" else []
        for value in values:
            if isinstance(value, (str, int, float, bool)):
                literal_values.add(str(value).lower() if isinstance(value, bool) else str(value))
    result["field"] = {"name": field, "references": len(refs),
                       "coverage_pct": 100 * len(refs) / n if n else 0,
                       "queries_with_filter": sum(any(p["field"] == field for p in q["where_predicates"]) for q in queries),
                       "groups": sum(field in q["summarize_groups"] for q in queries),
                       "unfiltered_references": sum(not any(p["field"] == field for p in q["where_predicates"]) for q in refs),
                       "explicit_literal_values": sorted(literal_values),
                       "note": "Values absent from literal filters may still be queried through other predicates or broad queries."}
    if bool(args.sample_plan) != bool(args.samples_dir):
        raise ValueError("Provide both --sample-plan and --samples-dir")
    if args.sample_plan:
        plan = json.loads(Path(args.sample_plan).read_text())
        if plan.get("mode") != "samples" or plan.get("field") != field:
            raise ValueError("Sample plan must match the analyzed field")
        calls = plan["calls"]
        if not calls:
            raise ValueError("Sample plan contains no windows")
        events, minutes, filenames, windows = Counter(), 0, set(), []
        for call in calls:
            name = call["output"]
            if Path(name).name != name or name in filenames:
                raise ValueError("Sample outputs must be distinct filenames")
            filenames.add(name)
            start, end = timestamp(call["arguments"]["startTime"]), timestamp(call["arguments"]["endTime"])
            duration = (end - start).total_seconds() / 60
            if duration <= 0:
                raise ValueError("Invalid sample duration")
            if any(start < previous_end and end > previous_start for previous_start, previous_end in windows):
                raise ValueError("Sample windows overlap; cannot extrapolate duplicate observations")
            windows.append((start, end))
            minutes += duration
            sample = read_rows(Path(args.samples_dir) / name, ["value", "count"])
            if len(sample) >= 501:
                raise ValueError("Sample reached its cardinality cap; narrow the scope through MCP")
            seen_values = set()
            for row in sample:
                if str(row["value"]) in seen_values:
                    raise ValueError("Duplicate value groups in one sample")
                seen_values.add(str(row["value"]))
                events[str(row["value"])] += integer(row["count"], "sample count")
        total = sum(events.values())
        volume = []
        cumulative = 0
        for value, count in events.most_common():
            cumulative += count
            volume.append({"value": value, "est_events_per_day": count * 1440 / minutes,
                           "pct": 100 * count / total if total else 0,
                           "cumulative_pct": 100 * cumulative / total if total else 0,
                           "explicitly_targeted": value in literal_values})
        unmatched = [row for row in volume if not row["explicitly_targeted"]]
        result["volume"] = {"rows": volume, "sampled_minutes": minutes,
                            "est_events_per_day": total * 1440 / minutes,
                            "not_explicitly_targeted_pct": sum(row["pct"] for row in unmatched),
                            "top_unmatched_pct": {str(k): sum(row["pct"] for row in unmatched[:k]) for k in (5, 10, 20)},
                            "empty_value_needs_drilldown": any(row["value"] == "" and row["pct"] > 5 for row in volume),
                            "note": "Strided samples estimate event counts, not byte savings. All planned samples are required."}
    return result


def timestamp(value):
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.tzinfo is None:
        raise ValueError("Timestamps must include a timezone")
    return result.astimezone(timezone.utc)


def prepare(args):
    end = timestamp(args.end)
    start = end - timedelta(days=args.days)
    calls = []
    def call(name, query, begin=start, finish=end):
        calls.append({"tool": "queryDataset", "output": name + ".csv", "arguments": {
            "apl": query, "startTime": begin.isoformat(), "endTime": finish.isoformat(), "truncate": False}})
    def source(dataset):
        if not dataset:
            raise ValueError("A dataset name is required for this mode")
        return "[" + json.dumps(dataset) + "]"
    if args.mode == "baseline":
        base = source(args.audit_dataset) + '\n| where action == "usageCalculated"'
        call("usage", base + "\n| summarize ingest_bytes = sum(toreal(['properties.hourly_ingest_bytes'])), query_gbms = sum(toreal(['properties.hourly_billable_query_gbms'])) by dataset = tostring(['properties.dataset'])")
        call("daily", base + "\n| summarize daily_bytes = sum(toreal(['properties.hourly_ingest_bytes'])) by bin(_time, 1d)\n| extend daily_tb = daily_bytes / 1000000000000\n| summarize avg_tb = avg(daily_tb), p50_tb = percentile(daily_tb, 50), p90_tb = percentile(daily_tb, 90), p95_tb = percentile(daily_tb, 95), max_tb = max(daily_tb), total_tb = sum(daily_tb), days = count()")
    elif args.mode == "coverage":
        if not args.dataset:
            raise ValueError("--dataset is required")
        base = source(args.history_dataset) + '\n| where kind == "apl" and dataset == ' + json.dumps(args.dataset) + "\n| summarize count = count() by query_text = ['query.apl']"
        call("history-count", base + "\n| summarize unique_queries = count(), total_executions = sum(count)")
        call("history", base + "\n| extend parsed = parse_apl(query_text)\n| project parsed, count")
        call("schema", source(args.dataset) + "\n| getschema\n| project ColumnName", end - timedelta(minutes=5))
    elif args.mode == "samples":
        if not args.field:
            raise ValueError("--field is required")
        # Retain 8–24 one-minute windows and a 100 GB target from the original helper.
        # The minimum window count may exceed the target on high-volume datasets.
        count = max(8, min(24, math.floor(100 / (args.gb_per_day / 1440)))) if args.gb_per_day else 8
        stride = 24 // count
        for i in range(count):
            finish = end - timedelta(hours=i * stride, minutes=5)
            begin = finish - timedelta(minutes=1)
            call(f"sample-{i:02}", source(args.dataset) + "\n| summarize count = count() by value = tostring([" + json.dumps(args.field) + "])\n| take 501", begin, finish)
        return {"mode": args.mode, "dataset": args.dataset, "field": args.field,
                "estimated_scan_gb": args.gb_per_day * count / 1440 if args.gb_per_day else None,
                "note": "Review scan size before execution; 100 GB is a target, not a hard cap. Reduce the scope if too expensive.", "calls": calls}
    return {"mode": args.mode, "calls": calls}


def main(command):
    parser = argparse.ArgumentParser(description="Local preparation/analysis only. No network calls or credentials.")
    if command == "baseline":
        parser.add_argument("--usage", required=True, help="MCP result with dataset, ingest_bytes, query_gbms")
        parser.add_argument("--daily", help="Optional daily summary MCP result")
        action = baseline
    elif command == "coverage":
        parser.add_argument("--queries", required=True)
        parser.add_argument("--counts", required=True, help="Independent history totals for detecting incomplete input")
        parser.add_argument("--schema")
        parser.add_argument("--field")
        parser.add_argument("--sample-plan")
        parser.add_argument("--samples-dir")
        action = coverage
    else:
        parser.add_argument("mode", choices=["baseline", "coverage", "samples"])
        parser.add_argument("--end", required=True, help="Fixed RFC3339 end time with timezone")
        parser.add_argument("--days", type=int, default=30)
        parser.add_argument("-a", "--audit-dataset")
        parser.add_argument("-D", "--dataset")
        parser.add_argument("--history-dataset", default="axiom-history")
        parser.add_argument("-f", "--field")
        parser.add_argument("--gb-per-day", type=float, default=0, help="Recent daily ingest from MCP; 0 means unknown")
        action = prepare
    args = parser.parse_args()
    try:
        if command == "prepare" and (args.days <= 0 or not math.isfinite(args.gb_per_day) or args.gb_per_day < 0):
            raise ValueError("--days must be positive and --gb-per-day finite and non-negative")
        result = action(args)
        print(json.dumps(result, indent=2, allow_nan=False))
    except (ValueError, TypeError, KeyError, OSError, csv.Error, subprocess.CalledProcessError) as error:
        parser.exit(1, f"Error: {error}\n")
