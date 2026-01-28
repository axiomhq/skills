/**
 * Tool Simulation Harness
 *
 * Simulates how Amp/Vercel loads skills: the model sees skill metadata in the
 * tool description and must call the skill tool to load full instructions.
 *
 * Pattern borrowed from vercel-labs/bash-tool:
 * - Single `skill` tool with dynamic description listing available skills
 * - Returns structured { success, instructions, files } output
 * - `readFile` tool for accessing reference files (progressive disclosure)
 * - System prompt does NOT mention reference files - the skill body teaches that
 *
 * Pros:
 * - Tests skill discoverability (model must call skill tool)
 * - Tests whether skill teaches model to use reference files
 * - Works with any provider that supports tool calling
 *
 * Cons:
 * - More complex setup
 * - Adds tool calling latency
 */

import { generateText, tool, stepCountIs } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { wrapAISDKModel } from "axiom/ai";
import { readFile, readdir } from "node:fs/promises";
import { resolve, posix } from "node:path";
import { z } from "zod";
import matter from "gray-matter";
import type { HarnessResult } from "./types";
import { buildSkillMetadata, parseModelId } from "../shared/metadata";

const MODEL_ID = "anthropic/claude-opus-4.5";
const model = wrapAISDKModel(gateway(MODEL_ID));

export interface ToolSimulationOptions {
  skillDir: string;
  skillFile?: string;
  systemPromptPrefix: string;
  systemPromptSuffix: string;
}

interface SkillMetadata {
  name: string;
  description: string;
}

interface DiscoveredSkill extends SkillMetadata {
  localPath: string;
  skillFile: string;
  files: string[];
}

async function parseFrontmatter(content: string): Promise<SkillMetadata | null> {
  try {
    const { data } = matter(content);

    if (
      typeof data.name !== "string" ||
      typeof data.description !== "string" ||
      !data.name ||
      !data.description
    ) {
      return null;
    }

    return {
      name: data.name,
      description: data.description,
    };
  } catch {
    return null;
  }
}

function extractBody(content: string): string {
  const { content: body } = matter(content);
  return body.trim();
}

async function listSkillFiles(skillDir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string, prefix: string = "") {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = prefix ? posix.join(prefix, entry.name) : entry.name;
      if (entry.isDirectory()) {
        await walk(resolve(dir, entry.name), relativePath);
      } else if (entry.name.endsWith(".md")) {
        files.push(relativePath);
      }
    }
  }

  await walk(skillDir);
  return files;
}

async function discoverSkill(skillDir: string, skillFile: string): Promise<DiscoveredSkill> {
  const skillPath = resolve(skillDir, skillFile);
  const content = await readFile(skillPath, "utf-8");
  const metadata = await parseFrontmatter(content);

  if (!metadata) {
    throw new Error(`Invalid skill frontmatter in ${skillFile}`);
  }

  const allFiles = await listSkillFiles(skillDir);
  const referenceFiles = allFiles.filter(
    (f) => f.startsWith("reference/") || f.startsWith("reference\\")
  );

  return {
    ...metadata,
    localPath: skillDir,
    skillFile,
    files: referenceFiles,
  };
}

function generateSkillDescription(skill: DiscoveredSkill): string {
  return `Load a skill to get detailed instructions. Available skills:

- ${skill.name}: ${skill.description}

Call this tool with the skill name to receive full instructions.`;
}

export async function runToolSimulation(
  prompt: string,
  options: ToolSimulationOptions
): Promise<HarnessResult> {
  const skillFile = options.skillFile ?? "SKILL.md";
  const skill = await discoverSkill(options.skillDir, skillFile);

  const toolsCalled: string[] = [];
  const filesRead: string[] = [];

  const tools = {
    skill: tool({
      description: generateSkillDescription(skill),
      inputSchema: z.object({
        skillName: z.string().describe("The name of the skill to load"),
      }),
      execute: async ({ skillName }) => {
        toolsCalled.push("skill");

        if (skillName !== skill.name) {
          return {
            success: false,
            error: `Skill "${skillName}" not found. Available skills: ${skill.name}`,
          };
        }

        try {
          const content = await readFile(
            resolve(skill.localPath, skill.skillFile),
            "utf-8"
          );
          const instructions = extractBody(content);

          return {
            success: true,
            skill: {
              name: skill.name,
              description: skill.description,
              path: `./skills/${skill.name}`,
            },
            instructions,
            files: skill.files,
          };
        } catch (error) {
          return {
            success: false,
            error: `Failed to read skill: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    }),

    readFile: tool({
      description:
        "Read a file from the skill directory. Use this to access reference documentation mentioned in skill instructions.",
      inputSchema: z.object({
        path: z
          .string()
          .describe(
            "The file path relative to the skill directory, e.g. 'reference/examples.md'"
          ),
      }),
      execute: async ({ path: filePath }) => {
        toolsCalled.push("readFile");
        filesRead.push(filePath);

        const normalizedPath = posix.normalize(filePath);
        if (
          normalizedPath.startsWith("..") ||
          normalizedPath.startsWith("/") ||
          normalizedPath.includes("/../")
        ) {
          return {
            success: false,
            error: "Invalid path: cannot access files outside skill directory",
          };
        }

        const fullPath = resolve(skill.localPath, normalizedPath);

        if (!fullPath.startsWith(skill.localPath)) {
          return {
            success: false,
            error: "Invalid path: cannot access files outside skill directory",
          };
        }

        try {
          const content = await readFile(fullPath, "utf-8");
          return {
            success: true,
            path: filePath,
            content,
          };
        } catch {
          return {
            success: false,
            error: `File not found: ${filePath}`,
          };
        }
      },
    }),
  };

  const systemPrompt = `${options.systemPromptPrefix}

You have access to skills that can help you. Use the skill tool to load instructions when needed.

${options.systemPromptSuffix}`;

  const startTime = performance.now();

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt,
    tools,
    stopWhen: stepCountIs(10),
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
        type: "tool-simulation",
      },
      tokens: {
        prompt: result.totalUsage.inputTokens ?? 0,
        completion: result.totalUsage.outputTokens ?? 0,
        total: result.totalUsage.totalTokens ?? 0,
      },
      latency: {
        ms: latencyMs,
      },
      tools: {
        available: Object.keys(tools),
        called: toolsCalled,
        filesRead,
      },
    },
  };
}
