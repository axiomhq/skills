export interface DatasetSchema {
  fields: Array<{ name: string; type: string }>;
}

export interface AxiomQueryResult {
  success: boolean;
  rowCount: number;
  error?: string;
  elapsedMs?: number;
  columns?: string[];
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

/** model output often wrapped in markdown fences; strip them for execution */
export function extractAplQuery(output: string): string {
  let query = output.trim();

  const fenceMatch = query.match(/^```\w*\s*\n([\s\S]*?)\n```\s*$/);
  if (fenceMatch?.[1]) {
    query = fenceMatch[1];
  }

  return query.trim();
}

export interface TimeExpression {
  start: string;
  end: string;
  raw: string;
}

export function extractTimeExpression(query: string): TimeExpression | null {
  const betweenMatch = query.match(
    /_time\s+between\s*\(\s*([^.]+?)\s*\.\.\s*([^)]+?)\s*\)/i
  );
  if (betweenMatch?.[1] && betweenMatch[2]) {
    return {
      start: betweenMatch[1].trim(),
      end: betweenMatch[2].trim(),
      raw: betweenMatch[0],
    };
  }

  const gteMatch = query.match(/_time\s*>=\s*([^\s|]+)/i);
  if (gteMatch?.[1]) {
    return {
      start: gteMatch[1].trim(),
      end: "now()",
      raw: gteMatch[0],
    };
  }

  const gtMatch = query.match(/_time\s*>\s*([^\s|]+)/i);
  if (gtMatch?.[1]) {
    return {
      start: gtMatch[1].trim(),
      end: "now()",
      raw: gtMatch[0],
    };
  }

  return null;
}

/**
 * API startTime/endTime controls time range; in-query time filters would
 * double-filter or conflict. remove them so API params are authoritative.
 *
 * WARNING: only handles standalone `| where _time ...` clauses.
 * combined predicates like `| where _time >= ago(1h) and status == 500`
 * will have the entire where clause removed, dropping the status filter.
 */
export function stripTimeFilter(query: string): string {
  return query
    .replace(/\|\s*where\s+_time\s+between\s*\([^()]*(?:\([^()]*\)[^()]*)*\)\s*/gi, "")
    .replace(/\|\s*where\s+_time\s*>=\s*[^|]+/gi, "")
    .replace(/\|\s*where\s+_time\s*>\s*[^|]+/gi, "")
    .replace(/\|\s*\|/g, "|")
    .trim();
}

export function injectTimeRange(
  query: string,
  timeRange: string = "ago(1h) .. now()"
): string {
  const stripped = stripTimeFilter(query);

  const datasetMatch = stripped.match(/^\s*(\[['"][^'"]+['"]\]|[a-zA-Z_][\w-]*)/);
  if (datasetMatch) {
    const datasetPart = datasetMatch[0];
    const rest = stripped.slice(datasetPart.length);
    return `${datasetPart}\n| where _time between (${timeRange})${rest}`;
  }

  return stripped;
}

export interface ExecuteOptions {
  /** ISO8601 */
  startTime?: string;
  /** ISO8601 */
  endTime?: string;
}

/**
 * time via API params avoids fragile regex parsing of expressions like
 * ago(1h) vs ago(60m). also ensures expected and generated queries
 * execute over identical windows regardless of what the model outputs.
 */
export async function executeAplQuery(
  query: string,
  options: ExecuteOptions = {}
): Promise<AxiomQueryResult> {
  const config = getAxiomPlaygroundConfig();

  if (!config) {
    return {
      success: false,
      rowCount: 0,
      error: "AXIOM_PLAY_URL and AXIOM_PLAY_TOKEN not configured",
    };
  }

  const cleanQuery = stripTimeFilter(query);

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    };

    if (config.orgId) {
      headers["X-Axiom-Org-Id"] = config.orgId;
    }

    const startTime = performance.now();

    const body: Record<string, unknown> = { apl: cleanQuery };
    if (options.startTime) {
      body.startTime = options.startTime;
    }
    if (options.endTime) {
      body.endTime = options.endTime;
    }

    const response = await fetch(
      `${config.url}/v1/datasets/_apl?format=tabular`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
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

    // tabular response: { tables: [{ fields: [{name}], columns: [[col0], [col1], ...] }] }
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

export function compareQueryResults(
  expected: AxiomQueryResult,
  actual: AxiomQueryResult
): { score: number; reason: string } {
  if (!expected.success || !actual.success) {
    return {
      score: 0,
      reason: expected.success
        ? `generated query failed: ${actual.error}`
        : `expected query failed: ${expected.error}`,
    };
  }

  const expectedCols = expected.columns ?? [];
  const actualCols = actual.columns ?? [];

  // order-insensitive — queries may return same data in different column order
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

  if (expected.rowCount !== actual.rowCount) {
    const ratio = Math.min(expected.rowCount, actual.rowCount) / 
                  Math.max(expected.rowCount, actual.rowCount);
    return {
      score: 0.5 + ratio * 0.25,
      reason: `row count mismatch: expected ${expected.rowCount}, got ${actual.rowCount}`,
    };
  }

  const expectedData = expected.data ?? [];
  const actualData = actual.data ?? [];

  // columnar format: data[colIndex][rowIndex]
  const expectedStr = JSON.stringify(expectedData);
  const actualStr = JSON.stringify(actualData);

  if (expectedStr === actualStr) {
    return { score: 1, reason: "exact match" };
  }

  return {
    score: 0.75,
    reason: "same structure but different values",
  };
}

const schemaCache = new Map<string, DatasetSchema>();

/**
 * fetch dataset schema via APL getschema operator.
 * useful for providing type context to translation prompts.
 * results are cached in memory for the duration of the process.
 */
export async function getDatasetSchema(
  datasetName: string
): Promise<DatasetSchema | null> {
  const cached = schemaCache.get(datasetName);
  if (cached) return cached;

  const query = `['${datasetName}'] | getschema`;
  const result = await executeAplQuery(query);

  if (!result.success || !result.columns || !result.data) {
    return null;
  }

  const nameColIdx = result.columns.indexOf("ColumnName");
  const typeColIdx = result.columns.indexOf("ColumnType");

  if (nameColIdx === -1 || typeColIdx === -1) {
    return null;
  }

  const names = result.data[nameColIdx] as string[];
  const types = result.data[typeColIdx] as string[];

  const fields = names.map((name, i) => ({
    name,
    type: types[i] ?? "unknown",
  }));

  const schema = { fields };
  schemaCache.set(datasetName, schema);
  return schema;
}

/** format schema for inclusion in prompts */
export function formatSchemaForPrompt(schema: DatasetSchema): string {
  const lines = schema.fields.map((f) => `  ${f.name}: ${f.type}`);
  return lines.join("\n");
}
