/**
 * Eval Metadata Collection
 *
 * Provides functions to collect metadata for eval runs.
 * Makes data explicit in eval results even when OTEL captures the same info.
 */

import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, relative } from "node:path";

export interface ModelMetadata {
  id: string;
  provider: string;
}

export interface SkillMetadata {
  path: string;
  contentHash: string;
  gitCommit: string | null;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface HarnessResultMetadata {
  model: ModelMetadata;
  skill: SkillMetadata;
  harness: {
    type: string;
  };
  tokens: TokenUsage;
  latency: {
    ms: number;
  };
  tools: {
    available: string[];
    called: string[];
  };
}

/**
 * Get the current git commit hash, or null if not in a git repo
 */
export function getGitCommit(cwd?: string): string | null {
  try {
    return execSync("git rev-parse HEAD", {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Compute a SHA-256 hash of file contents
 */
export function computeContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/**
 * Build skill metadata from skill directory and file
 */
export async function buildSkillMetadata(
  skillDir: string,
  skillFile: string = "SKILL.md",
  workspaceRoot?: string
): Promise<SkillMetadata> {
  const skillPath = resolve(skillDir, skillFile);
  const content = await readFile(skillPath, "utf-8");

  const relativePath = workspaceRoot
    ? relative(workspaceRoot, skillDir)
    : skillDir;

  return {
    path: relativePath,
    contentHash: computeContentHash(content),
    gitCommit: getGitCommit(skillDir),
  };
}

/**
 * Parse model ID into provider and model name
 * AI SDK uses format like "google/gemini-2.5-flash" via gateway
 * or provider-specific like "gpt-4o" for direct provider usage
 */
export function parseModelId(modelId: string): ModelMetadata {
  if (modelId.includes("/")) {
    const [provider, ...rest] = modelId.split("/");
    return {
      provider: provider ?? "unknown",
      id: rest.join("/"),
    };
  }
  return {
    provider: "unknown",
    id: modelId,
  };
}
