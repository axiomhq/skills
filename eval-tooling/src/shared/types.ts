export interface TranslationCase {
  id: string;
  name: string;
  spl: string;
  expectedApl: string;
  category?: string;
  /** Target dataset in Axiom Playground (e.g., "sample-http-logs", "otel-demo-traces") */
  dataset?: string;
  /** Notes about dataset-specific quirks (e.g., "status field is string, needs toint()") */
  notes?: string;
}

export interface EvalCase<TInput = string, TExpected = string> {
  id: string;
  name: string;
  input: TInput;
  expected: TExpected;
  category?: string;
}
