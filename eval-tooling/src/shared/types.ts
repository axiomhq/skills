export interface TranslationCase {
  id: string;
  name: string;
  spl: string;
  expectedApl: string;
  category?: string;
}

export interface EvalCase<TInput = string, TExpected = string> {
  id: string;
  name: string;
  input: TInput;
  expected: TExpected;
  category?: string;
}
