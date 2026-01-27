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
  /** Column names from the result */
  columns?: string[];
  /** Raw result data for comparison */
  data?: unknown[][];
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
      tables?: { 
        fields?: { name: string }[];
        columns?: unknown[][];
      }[];
    };

    // Extract from tabular response
    // Response format: { tables: [{ fields: [{name: ...}], columns: [[...], [...], ...] }] }
    const table = result.tables?.[0];
    const columns = table?.fields?.map((f) => f.name) ?? [];
    const data = table?.columns ?? [];
    const rowCount = data[0]?.length ?? 0;

    return {
      success: true,
      rowCount,
      columns,
      data,
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

/**
 * Compare two query results for equivalence.
 * Returns a score between 0 and 1:
 * - 1.0: exact match (same columns, same data)
 * - 0.5-0.99: partial match (same columns, different row counts or data)
 * - 0.0: no match (different columns or one failed)
 */
export function compareQueryResults(
  expected: AxiomQueryResult,
  actual: AxiomQueryResult
): { score: number; reason: string } {
  // Both must succeed
  if (!expected.success || !actual.success) {
    return {
      score: 0,
      reason: expected.success
        ? `generated query failed: ${actual.error}`
        : `expected query failed: ${expected.error}`,
    };
  }

  // Compare columns (order matters for aggregations)
  const expectedCols = expected.columns ?? [];
  const actualCols = actual.columns ?? [];

  // Check if columns match (ignoring order for now, could be stricter)
  const expectedColSet = new Set(expectedCols);
  const actualColSet = new Set(actualCols);
  const missingCols = expectedCols.filter((c) => !actualColSet.has(c));
  const extraCols = actualCols.filter((c) => !expectedColSet.has(c));

  if (missingCols.length > 0 || extraCols.length > 0) {
    return {
      score: 0.25,
      reason: `column mismatch: missing [${missingCols.join(", ")}], extra [${extraCols.join(", ")}]`,
    };
  }

  // Columns match, compare row counts
  if (expected.rowCount !== actual.rowCount) {
    // Partial credit for same columns but different counts
    const ratio = Math.min(expected.rowCount, actual.rowCount) / 
                  Math.max(expected.rowCount, actual.rowCount);
    return {
      score: 0.5 + ratio * 0.25,
      reason: `row count mismatch: expected ${expected.rowCount}, got ${actual.rowCount}`,
    };
  }

  // Same columns and row count - compare actual data
  const expectedData = expected.data ?? [];
  const actualData = actual.data ?? [];

  // Simple comparison: stringify and compare
  // This handles the columnar format where data[colIndex][rowIndex]
  const expectedStr = JSON.stringify(expectedData);
  const actualStr = JSON.stringify(actualData);

  if (expectedStr === actualStr) {
    return { score: 1, reason: "exact match" };
  }

  // Same shape but different values
  return {
    score: 0.75,
    reason: "same structure but different values",
  };
}
