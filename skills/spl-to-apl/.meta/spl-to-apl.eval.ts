import { Eval, Scorer } from "axiom/ai/evals";
import { testCases } from "./cases";
import { flag, pickFlags, getGitCommit, buildSkillMetadata } from "../../../eval-tooling/src/shared";
import { runHarness, MODEL_ID, type HarnessType, type HarnessResult } from "../../../eval-tooling/src/harnesses";
import {
  extractAplQuery,
  executeAplQuery,
  compareQueryResults,
  getDatasetSchema,
  formatSchemaForPrompt,
} from "../../../eval-tooling/src/shared/axiom-query";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SKILL_DIR = resolve(__dirname, "..");
const WORKSPACE_ROOT = resolve(__dirname, "../../..");

const skillMetadata = await buildSkillMetadata(SKILL_DIR, "SKILL.md", WORKSPACE_ROOT);
const gitCommit = getGitCommit(WORKSPACE_ROOT);

interface TaskOutput {
  output: string;
  metadata: HarnessResult["metadata"];
}

/**
 * Static time range for reproducible results.
 * Axiom Playground sample data is continuously updated, so we use a recent fixed window.
 * This gets refreshed periodically when baselines are updated.
 */
const EVAL_START_TIME = "2026-01-27T00:00:00Z";
const EVAL_END_TIME = "2026-01-27T12:00:00Z";

/** runs both queries against axiom, compares results. see compareQueryResults for scoring. */
const ResultsMatch = Scorer(
  "results-match",
  async ({ output, expected }: { output: TaskOutput; expected: string }) => {
    const generatedQuery = extractAplQuery(output.output);
    const expectedQuery = extractAplQuery(expected);

    if (!generatedQuery) {
      console.warn("No APL query found in output");
      return 0;
    }

    // Run both queries with the same static time range via API params
    const [expectedResult, actualResult] = await Promise.all([
      executeAplQuery(expectedQuery, {
        startTime: EVAL_START_TIME,
        endTime: EVAL_END_TIME,
      }),
      executeAplQuery(generatedQuery, {
        startTime: EVAL_START_TIME,
        endTime: EVAL_END_TIME,
      }),
    ]);

    const comparison = compareQueryResults(expectedResult, actualResult);

    if (comparison.score < 1) {
      console.warn(`Results comparison: ${comparison.reason}`);
    }

    return comparison.score;
  }
);

interface EvalInput {
  spl: string;
  dataset: string;
}

Eval("spl-translation", {
  data: async () =>
    testCases.map((tc) => ({
      input: { spl: tc.spl, dataset: tc.dataset ?? "sample-http-logs" } as EvalInput,
      expected: tc.expectedApl,
      metadata: {
        id: tc.id,
        name: tc.name,
        category: tc.category,
      },
    })),
  capability: "spl-to-apl",
  step: "translate",
  configFlags: pickFlags("model", "harnessType", "harnessVersion", "git"),
  metadata: {
    description: "Evaluates SPL to APL translation quality",
    model: MODEL_ID,
    testCaseCount: testCases.length,
    git: {
      commit: gitCommit,
    },
    skill: skillMetadata,
  },

  task: async ({ input }: { input: EvalInput }): Promise<TaskOutput> => {
    const harnessType = flag("harnessType") as HarnessType;

    const schema = await getDatasetSchema(input.dataset);
    const schemaContext = schema
      ? `\n\nTarget dataset schema (${input.dataset}):\n${formatSchemaForPrompt(schema)}`
      : "";

    const result = await runHarness(input.spl, harnessType, {
      skillDir: SKILL_DIR,
      systemPromptPrefix:
        "You are an expert at translating Splunk SPL queries to Axiom APL queries.",
      systemPromptSuffix:
        `Translate the following SPL query to APL. Output ONLY the APL query, no explanation.${schemaContext}`,
    });

    return {
      output: result.output,
      metadata: result.metadata,
    };
  },

  scorers: [ResultsMatch],
});
