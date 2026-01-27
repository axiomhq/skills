/**
 * Axiom Query Executor
 *
 * Executes APL queries against Axiom API for validation.
 * Used by eval scorers to verify generated queries actually work.
 */

export interface AxiomQueryResult {
  success: boolean;
  rowCount: number;
  error?: string;
  elapsedMs?: number;
}

interface AxiomConfig {
  url: string;
  token: string;
  orgId?: string;
}

function getAxiomPlaygroundConfig(): AxiomConfig | null {
  const url = process.env.AXIOM_PLAY_URL;
  const token = process.env.AXIOM_PLAY_TOKEN;

  if (!url || !token) {
    return null;
  }

  return {
    url,
    token,
    orgId: process.env.AXIOM_PLAY_ORG_ID,
  };
}

/**
 * Extract APL query from model output, removing code fences
 */
export function extractAplQuery(output: string): string {
  let query = output.trim();

  // Remove code fences (```apl, ```kusto, ```, etc.)
  const fenceMatch = query.match(/^```\w*\s*\n([\s\S]*?)\n```\s*$/);
  if (fenceMatch?.[1]) {
    query = fenceMatch[1];
  }

  return query.trim();
}

/**
 * Inject time range into APL query if not present.
 * Adds `| where _time between (ago(1h) .. now())` after the dataset reference.
 */
export function injectTimeRange(
  query: string,
  timeRange: string = "ago(1h) .. now()"
): string {
  // Check if query already has a time filter
  if (
    query.includes("_time between") ||
    query.includes("_time >=") ||
    query.includes("_time >")
  ) {
    return query;
  }

  // Find the dataset reference and inject time filter after it
  // Pattern: ['dataset-name'] or ["dataset-name"]
  const datasetMatch = query.match(/^\s*\[['"][^'"]+['"]\]/);
  if (datasetMatch) {
    const datasetPart = datasetMatch[0];
    const rest = query.slice(datasetPart.length);
    return `${datasetPart}\n| where _time between (${timeRange})${rest}`;
  }

  // Fallback: prepend time filter if we can't find dataset
  return query;
}

/**
 * Execute an APL query against Axiom Playground.
 * Returns success/failure and row count.
 */
export async function executeAplQuery(
  query: string,
  options: { injectTime?: boolean; timeRange?: string } = {}
): Promise<AxiomQueryResult> {
  const config = getAxiomPlaygroundConfig();

  if (!config) {
    return {
      success: false,
      rowCount: 0,
      error: "AXIOM_PLAY_URL and AXIOM_PLAY_TOKEN not configured",
    };
  }

  let finalQuery = query;
  if (options.injectTime !== false) {
    finalQuery = injectTimeRange(query, options.timeRange);
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    };

    if (config.orgId) {
      headers["X-Axiom-Org-Id"] = config.orgId;
    }

    const startTime = performance.now();

    const response = await fetch(
      `${config.url}/v1/datasets/_apl?format=tabular`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ apl: finalQuery }),
      }
    );

    const elapsedMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.message || errorBody;
      } catch {
        errorMessage = errorBody;
      }
      return {
        success: false,
        rowCount: 0,
        error: `HTTP ${response.status}: ${errorMessage}`,
        elapsedMs,
      };
    }

    const result = (await response.json()) as {
      tables?: { columns?: unknown[][] }[];
    };

    // Extract row count from tabular response
    // Response format: { tables: [{ columns: [[...], [...], ...] }] }
    let rowCount = 0;
    if (result.tables?.[0]?.columns?.[0]) {
      rowCount = result.tables[0].columns[0].length;
    }

    return {
      success: true,
      rowCount,
      elapsedMs,
    };
  } catch (error) {
    return {
      success: false,
      rowCount: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
