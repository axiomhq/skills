/**
 * Prompt Injection Harness
 *
 * Injects the skill content AND all reference files directly into the system prompt.
 * This gives the model everything upfront - no tool calling, no discoverability test.
 *
 * Pros:
 * - Simple, works with any provider
 * - No tool calling overhead
 * - Fair comparison: all content available regardless of skill structure
 *
 * Cons:
 * - Doesn't test skill discoverability
 * - Doesn't test whether skill teaches model to find references
 * - Large context window usage
 */

import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { wrapAISDKModel } from "axiom/ai";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import matter from "gray-matter";
import type { HarnessResult } from "./types";
import { buildSkillMetadata, parseModelId } from "../shared/metadata";

const MODEL_ID = "google/gemini-2.5-flash";
const model = wrapAISDKModel(gateway(MODEL_ID));

export interface PromptInjectionOptions {
  skillDir: string;
  skillFile?: string;
  systemPromptPrefix: string;
  systemPromptSuffix: string;
}

async function listReferenceFiles(refDir: string): Promise<string[]> {
  try {
    const entries = await readdir(refDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

async function loadAllContent(skillDir: string, skillFile: string): Promise<string> {
  const skillPath = resolve(skillDir, skillFile);
  const skillRaw = await readFile(skillPath, "utf-8");
  const { content: skillBody } = matter(skillRaw);

  const refDir = resolve(skillDir, "reference");
  const refFiles = await listReferenceFiles(refDir);

  const references: string[] = [];
  for (const file of refFiles) {
    const content = await readFile(resolve(refDir, file), "utf-8");
    references.push(`## Reference: ${file}\n\n${content}`);
  }

  if (references.length > 0) {
    return `${skillBody.trim()}\n\n---\n\n# Reference Files\n\n${references.join("\n\n---\n\n")}`;
  }

  return skillBody.trim();
}

export async function runPromptInjection(
  prompt: string,
  options: PromptInjectionOptions
): Promise<HarnessResult> {
  const skillFile = options.skillFile ?? "SKILL.md";
  const allContent = await loadAllContent(options.skillDir, skillFile);

  const systemPrompt = `${options.systemPromptPrefix}

${allContent}

${options.systemPromptSuffix}`;

  const startTime = performance.now();

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt,
    temperature: 0,
  });

  const latencyMs = Math.round(performance.now() - startTime);

  const skillMetadata = await buildSkillMetadata(options.skillDir, skillFile);

  return {
    output: result.text.trim(),
    metadata: {
      model: parseModelId(MODEL_ID),
      skill: skillMetadata,
      harness: {
        type: "prompt-injection",
      },
      tokens: {
        prompt: result.usage.inputTokens ?? 0,
        completion: result.usage.outputTokens ?? 0,
        total: result.usage.totalTokens ?? 0,
      },
      latency: {
        ms: latencyMs,
      },
      tools: {
        available: [],
        called: [],
      },
    },
  };
}
