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

const model = wrapAISDKModel(gateway("google/gemini-2.5-flash"));

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
): Promise<string> {
  const skillFile = options.skillFile ?? "SKILL.md";
  const allContent = await loadAllContent(options.skillDir, skillFile);

  const systemPrompt = `${options.systemPromptPrefix}

${allContent}

${options.systemPromptSuffix}`;

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt,
    temperature: 0,
  });

  return result.text.trim();
}
