import { createAppScope } from "axiom/ai";
import { z } from "zod";

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
    harnessType: z
      .enum(["prompt-injection", "tool-simulation"])
      .default("prompt-injection"),
    harnessVersion: z.enum(["v1", "v2"]).default(HARNESS_VERSION),
  }),
});
