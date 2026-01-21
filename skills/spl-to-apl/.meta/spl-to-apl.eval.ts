import { Eval, Scorer } from "axiom/ai/evals";
import { testCases } from "./cases";
import { flag, pickFlags } from "../../../eval-tooling/src/shared";
import { runHarness, type HarnessType, type HarnessResult } from "../../../eval-tooling/src/harnesses";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SKILL_DIR = resolve(__dirname, "..");

interface TaskOutput {
  output: string;
  metadata: HarnessResult["metadata"];
}

/**
 * Normalize APL query for comparison:
 * - Remove code fences (```apl, ```kusto, ```, etc.)
 * - Collapse whitespace
 * - Trim
 * - Normalize quotes (single vs double for dataset names)
 */
function normalizeApl(query: string): string {
  let result = query.trim();

  const fenceMatch = result.match(/^```\w*\s*\n([\s\S]*?)\n```\s*$/);
  if (fenceMatch?.[1]) {
    result = fenceMatch[1];
  }

  return result
    .replace(/\s+/g, " ")
    .replace(/\["([^"]+)"\]/g, "['$1']")
    .trim();
}

const ExactMatch = Scorer(
  "exact-match",
  ({ output, expected }: { output: TaskOutput; expected: string }) =>
    normalizeApl(output.output) === normalizeApl(expected)
);

const KeyOperatorsPresent = Scorer(
  "key-operators-present",
  ({ output, expected }: { output: TaskOutput; expected: string }) => {
    const expectedLower = expected.toLowerCase();
    const outputLower = output.output.toLowerCase();

    const keyPatterns = [
      /\bsummarize\b/,
      /\bwhere\b/,
      /\bextend\b/,
      /\bproject\b/,
      /\border by\b/,
      /\btake\b/,
      /\bjoin\b/,
      /\bunion\b/,
      /\bmv-expand\b/,
      /\bparse\b/,
      /\bextract\b/,
      /\bcount\(\)/,
      /\bcountif\b/,
      /\bdcount\b/,
      /\bbin\b/,
      /\btop\b/,
      /\barg_max\b/,
      /\barg_min\b/,
    ];

    let matchedOperators = 0;
    let expectedOperators = 0;

    for (const pattern of keyPatterns) {
      if (pattern.test(expectedLower)) {
        expectedOperators++;
        if (pattern.test(outputLower)) {
          matchedOperators++;
        }
      }
    }

    return expectedOperators > 0 ? matchedOperators / expectedOperators : 1;
  }
);

const DatasetCorrect = Scorer(
  "dataset-correct",
  ({ output, expected }: { output: TaskOutput; expected: string }) => {
    const datasetMatch = expected.match(/\['([^']+)'\]/);
    if (!datasetMatch) return 1;

    const expectedDataset = datasetMatch[1];
    return output.output.includes(`['${expectedDataset}']`) ? 1 : 0;
  }
);

const TimeFilterPresent = Scorer(
  "time-filter-present",
  ({ output, expected }: { output: TaskOutput; expected: string }) => {
    const expectsTimeFilter =
      expected.includes("_time between") || expected.includes("ago(");
    if (!expectsTimeFilter) return 1;

    const hasTimeFilter =
      output.output.includes("_time between") ||
      output.output.includes("ago(") ||
      output.output.includes("_time >=");
    return hasTimeFilter ? 1 : 0;
  }
);

Eval("spl-translation", {
  data: async () =>
    testCases.map((tc) => ({
      input: tc.spl,
      expected: tc.expectedApl,
      metadata: {
        id: tc.id,
        name: tc.name,
        category: tc.category,
      },
    })),
  capability: "spl-to-apl",
  step: "translate",
  configFlags: pickFlags("harnessType", "harnessVersion"),
  metadata: {
    description: "Evaluates SPL to APL translation quality",
    testCaseCount: testCases.length,
  },

  task: async ({ input }: { input: string }): Promise<TaskOutput> => {
    const harnessType = flag("harnessType") as HarnessType;

    const result = await runHarness(input, harnessType, {
      skillDir: SKILL_DIR,
      systemPromptPrefix:
        "You are an expert at translating Splunk SPL queries to Axiom APL queries.",
      systemPromptSuffix:
        "Translate the following SPL query to APL. Output ONLY the APL query, no explanation.",
    });

    return {
      output: result.output,
      metadata: result.metadata,
    };
  },

  scorers: [ExactMatch, KeyOperatorsPresent, DatasetCorrect, TimeFilterPresent],
});
