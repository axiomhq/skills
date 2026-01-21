/**
 * Harness Index
 *
 * Provides a unified interface to harness types.
 * Harnesses are skill-agnostic - they accept skill directory and options.
 */

import { runPromptInjection, type PromptInjectionOptions } from "./prompt-injection";
import { runToolSimulation, type ToolSimulationOptions } from "./tool-simulation";

export type HarnessType = "prompt-injection" | "tool-simulation";

export interface HarnessMetadata {
  name: string;
  description: string;
  testsDiscoverability: boolean;
  testsReferences: boolean;
}

export const HARNESS_METADATA: Record<HarnessType, HarnessMetadata> = {
  "prompt-injection": {
    name: "Prompt Injection",
    description: "Injects skill content directly into system prompt",
    testsDiscoverability: false,
    testsReferences: false,
  },
  "tool-simulation": {
    name: "Tool Simulation",
    description: "Simulates Amp's skill loading via tool calls",
    testsDiscoverability: true,
    testsReferences: true,
  },
};

export interface HarnessOptions {
  skillDir: string;
  skillFile?: string;
  systemPromptPrefix: string;
  systemPromptSuffix: string;
}

export async function runHarness(
  prompt: string,
  harnessType: HarnessType,
  options: HarnessOptions
): Promise<string> {
  switch (harnessType) {
    case "prompt-injection":
      return runPromptInjection(prompt, options);
    case "tool-simulation":
      return runToolSimulation(prompt, options);
    default:
      throw new Error(`Unknown harness type: ${harnessType}`);
  }
}

export { runPromptInjection, runToolSimulation };
export type { PromptInjectionOptions, ToolSimulationOptions };
