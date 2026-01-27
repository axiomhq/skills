import { createAppScope } from "axiom/ai";
import { z } from "zod";
import { MODEL_ID } from "../harnesses";

/**
 * Harness version changelog:
 * - v1: Initial implementation
 *   - prompt-injection: skill only, no references
 *   - tool-simulation: separate loadSkill/listReferenceFiles/readReferenceFile tools
 * - v2: Vercel bash-tool pattern
 *   - prompt-injection: skill + all reference files injected
 *   - tool-simulation: single skill tool, readFile for references, no system prompt hints
 */
const HARNESS_VERSION = "v2" as const;

export const { flag, pickFlags } = createAppScope({
  flagSchema: z.object({
    model: z.string().default(MODEL_ID),
    harnessType: z
      .enum(["prompt-injection", "tool-simulation"])
      .default("tool-simulation"),
    harnessVersion: z.enum(["v1", "v2"]).default(HARNESS_VERSION),
    git: z
      .object({
        branch: z.string().default(""),
        commit: z.string().default(""),
      })
      .default({ branch: "", commit: "" }),
  }),
});
