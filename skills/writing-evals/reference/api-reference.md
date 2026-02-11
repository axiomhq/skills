# API Reference

Exact type signatures for the Axiom AI SDK evaluation APIs.

---

## Import Paths

| Import | Exports |
|--------|---------|
| `axiom/ai` | `createAppScope`, `initAxiomAI`, `withSpan`, `wrapAISDKModel`, `wrapTool`, `axiomAIMiddleware`, `RedactionPolicy` |
| `axiom/ai/evals` | `Eval`, `EvalTask`, `EvalParams` |
| `axiom/ai/evals/scorers` | `Scorer` |
| `axiom/ai/evals/online` | `onlineEval` |
| `axiom/ai/evals/aggregations` | `Mean`, `Median`, `PassAtK`, `PassHatK`, `AtLeastOneTrialPasses`, `AllTrialsPass` |
| `axiom/ai/config` | `defineConfig` |
| `axiom/ai/feedback` | `createFeedbackClient` |

---

## Eval()

```typescript
function Eval<TInput, TExpected, TOutput>(
  name: string,
  params: EvalParams<TInput, TExpected, TOutput> & {
    capability: string;
    step?: string;
  },
): void;
```

### EvalParams

```typescript
type EvalParams<TInput, TExpected, TOutput> = {
  data:
    | readonly CollectionRecord<TInput, TExpected>[]
    | Promise<readonly CollectionRecord<TInput, TExpected>[]>
    | (() => readonly CollectionRecord<TInput, TExpected>[] | Promise<readonly CollectionRecord<TInput, TExpected>[]>);
  capability: string;
  step?: string;
  task: EvalTask<TInput, TExpected, TOutput>;
  scorers: ReadonlyArray<ScorerLike<TInput, TExpected, TOutput>>;
  metadata?: Record<string, unknown>;
  timeout?: number;
  configFlags?: string[];
  trials?: number;  // default: 1
};
```

### CollectionRecord

```typescript
type CollectionRecord<TInput, TExpected> = {
  input: TInput;
  expected: TExpected;
  metadata?: Record<string, unknown>;
};
```

### EvalTask

```typescript
type EvalTask<TInput, TExpected, TOutput> = (args: {
  input: TInput;
  expected: TExpected;
}) => TOutput | Promise<TOutput> | AsyncIterable<TOutput>;
```

### Name Validation

Eval names and capability/step names are validated:
- Must be non-empty strings
- Used for telemetry span naming and Axiom console display

---

## Scorer

```typescript
function Scorer<TArgs extends Record<string, any>>(
  name: string,
  fn: (args: TArgs) => number | boolean | Score | Promise<number | boolean | Score>,
  options?: ScorerOptions,
): Scorer;
```

### Score

```typescript
type Score = {
  score: number | boolean | null;
  metadata?: Record<string, any>;
};
```

### ScorerOptions

```typescript
type ScorerOptions = {
  aggregation?: Aggregation;
};
```

### ScorerLike (what Eval accepts)

```typescript
type ScorerLike<TInput, TExpected, TOutput> = (
  args: {
    input?: TInput;
    expected?: TExpected;
    output: TOutput;
    trialIndex?: number;
  },
) => Score | Promise<Score>;
```

### ScoreWithName (result after execution)

```typescript
type ScoreWithName = Score & {
  name: string;
  trials?: number[];
  aggregation?: string;
  threshold?: number;
};
```

---

## Aggregations

```typescript
type Aggregation<T extends string = string> = {
  type: T;
  threshold?: number;
  aggregate: (scores: number[]) => number;
};
```

### Mean

```typescript
const Mean = (): Aggregation<'mean'>
// Average of all trial scores. Returns 0 for empty arrays.
```

### Median

```typescript
const Median = (): Aggregation<'median'>
// Median of sorted trial scores. Returns 0 for empty arrays.
```

### PassAtK

```typescript
const PassAtK = (opts?: { threshold?: number }): Aggregation<'pass@k'>
// Returns 1 if ANY trial score >= threshold (default: 1). Otherwise 0.
// Alias: AtLeastOneTrialPasses
```

### PassHatK

```typescript
const PassHatK = (opts?: { threshold?: number }): Aggregation<'pass^k'>
// Returns 1 if ALL trial scores >= threshold (default: 1). Otherwise 0.
// Alias: AllTrialsPass
```

---

## createAppScope

```typescript
function createAppScope<FlagSchema extends ZodObject<any>, FactSchema extends ZodObject<any> | undefined>(
  config: { flagSchema: FlagSchema; factSchema?: FactSchema },
): AppScope<FlagSchema, FactSchema>;
```

### AppScope

```typescript
interface AppScope<FS, SC> {
  flag: (path: string) => any;          // dot-notation access, e.g. flag('myCapability.model')
  fact: (name: string, value: any) => void;
  overrideFlags: (partial: Record<string, any>) => void;
  withFlags: <T>(overrides: Record<string, any>, fn: () => T) => T;
  pickFlags: (...paths: string[]) => string[];
  getAllDefaultFlags: () => Record<string, any>;
}
```

### Flag Precedence

1. CLI overrides (`--flag.path=value`) — highest
2. Eval context overrides (`overrideFlags()`)
3. Schema defaults (`.default()` values)

### Validation Rules

- All leaf fields **must** have `.default()`
- No `z.union()` or `z.discriminatedUnion()`
- No `z.record()` — all keys must be statically known

---

## defineConfig

```typescript
function defineConfig(config: AxiomConfig): AxiomConfig;
```

### AxiomConfig

```typescript
interface AxiomConfig {
  eval?: {
    url?: string;
    edgeUrl?: string;
    token?: string;
    dataset?: string;
    orgId?: string;
    flagSchema?: ZodObject<any> | null;
    instrumentation?: (options: {
      url: string;
      edgeUrl: string;
      token: string;
      dataset: string;
      orgId?: string;
    }) => { provider?: TracerProvider } | Promise<{ provider?: TracerProvider }>;
    timeoutMs?: number;           // default: 60000
    include?: string[];           // default: ['**/*.eval.{ts,js,mts,mjs,cts,cjs}']
    exclude?: string[];           // default: ['**/node_modules/**', '**/dist/**', '**/build/**']
  };
  [key: `$${string}`]: Partial<AxiomConfig['eval']>;  // environment overrides
}
```

---

## onlineEval

```typescript
function onlineEval<TInput, TOutput>(
  meta: {
    capability: string;
    step?: string;
    link?: SpanContext;
  },
  options: {
    input?: TInput;
    output: TOutput;
    scorers: readonly ScorerLike<TInput, unknown, TOutput>[];
    sampling?: { rate: number };  // 0.0–1.0, default 1.0
  },
): Promise<ScorerResult[]>;
```

### ScorerResult

```typescript
type ScorerResult = {
  name: string;
  score: Score;
  error?: string;
};
```

---

## CLI Options

```
axiom eval [target] [options]

Arguments:
  target              file, directory, glob, or eval name (default: ".")

Options:
  -w, --watch         watch for changes
  -t, --token TOKEN   Axiom API token
  -d, --dataset NAME  Axiom dataset
  -u, --url URL       Axiom API URL
  -o, --org-id ID     Axiom org ID
  -b, --baseline ID   compare against baseline
  --debug             local mode, no network
  --list              list cases without running
  --flag.*=value      override flag values
```
