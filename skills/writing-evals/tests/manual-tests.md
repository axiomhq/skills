# Writing Evals - Manual Test Guide

Comprehensive manual testing for all skill features. Run through each section to validate the skill works correctly.

**Test environment:** Use a project with the Axiom AI SDK installed (`npm install axiom`).

---

## Prerequisites

Before testing:

1. Run setup (checks config):
   ```bash
   cd skills/writing-evals
   ./scripts/setup
   ```

2. Have a project with Axiom AI SDK installed:
   ```bash
   npm install axiom
   ```

---

## Test 1: Skill Loading

**Prompt:** "Help me write an eval"

**Expected behavior:**
- Skill activates on eval-related requests
- Agent asks intake questions: capability, task function, success criteria

**Validation:**
- [ ] Skill activates on eval-related requests
- [ ] Agent asks clarifying questions before generating

---

## Test 2: Intake Workflow

**Prompt:** "I want to evaluate my message categorization function"

**Expected behavior:**
- Agent asks about capability name (and optionally step)
- Agent asks about function signature (input/output types)
- Agent asks about success criteria
- Agent asks about test data

**Validation:**
- [ ] Agent identifies capability (and optionally step)
- [ ] Agent asks about function types
- [ ] Agent proposes scorer pattern

---

## Test 3: Minimal Eval Generation

**Prompt:** "Create a simple eval for a function that takes a string and returns a string. The function is called `echo` and it should return the same string."

**Expected behavior:**
- Agent generates a valid `.eval.ts` file
- Uses ExactMatch scorer
- Includes at least 2-3 test cases

**Validation:**
- [ ] Valid TypeScript syntax
- [ ] Correct imports from 'axiom/ai/evals'
- [ ] Eval() call with capability, data, task, scorers
- [ ] File ends in .eval.ts

---

## Test 4: Classification Eval Generation

**Prompt:** "Create an eval for a function `classifyIntent(message: string): string` that categorizes customer messages into: billing, support, spam, other"

**Expected behavior:**
- Agent generates classification eval
- Uses ExactMatch scorer
- Includes happy path, adversarial, and boundary cases
- Each test case has metadata.purpose

**Validation:**
- [ ] Covers all 4 categories
- [ ] Has adversarial cases (prompt injection, disguised spam)
- [ ] Has boundary cases (ambiguous, empty)
- [ ] metadata.purpose on each case

---

## Test 5: Scorer Pattern Selection

**Prompt:** "What scorer should I use if my function returns a list of document IDs?"

**Expected:** Set match / retrieval scorer

**Prompt:** "What scorer for checking if an agent called the right tools?"

**Expected:** Tool use match scorer

**Prompt:** "What scorer for a function that returns a complex JSON object?"

**Expected:** Structured output scorer with metadata

**Validation:**
- [ ] Recommends set match for list outputs
- [ ] Recommends tool use match for agent outputs
- [ ] Recommends structured match for complex objects

---

## Test 6: Flag Schema Generation

**Prompt:** "Create a flag schema for a support agent that has 3 steps: categorize, retrieve, respond. Each step uses a model and the retrieve step also has a maxDocuments parameter."

**Expected behavior:**
- Generates valid Zod schema
- All leaves have .default()
- Uses z.enum() for model selection
- Nested under capability name

**Validation:**
- [ ] All leaf fields have .default()
- [ ] No union types
- [ ] Nested structure matches capability/step pattern
- [ ] Exports flag and pickFlags

---

## Test 7: Config Generation

**Prompt:** "Create an axiom.config.ts for my project"

**Expected behavior:**
- Generates valid axiom.config.ts
- Uses defineConfig from axiom/ai/config
- Includes eval.include, eval.exclude, eval.timeoutMs
- References environment variables

**Validation:**
- [ ] Valid TypeScript
- [ ] Correct import from 'axiom/ai/config'
- [ ] Uses process.env for secrets
- [ ] Includes instrumentation hook stub

---

## Test 8: Trials and Aggregations

**Prompt:** "Add trials to my eval — I want to run each case 3 times and pass if at least one trial succeeds"

**Expected behavior:**
- Sets trials: 3
- Uses numeric scorer (returns 0 or 1, not boolean)
- Adds aggregation: PassAtK() or AtLeastOneTrialPasses

**Validation:**
- [ ] trials: 3 in Eval config
- [ ] Scorer returns number (not boolean)
- [ ] Imports from 'axiom/ai/evals/aggregations'
- [ ] Uses PassAtK() aggregation

---

## Test 9: Script Execution

### 9.1 eval-validate
```bash
cd skills/writing-evals
echo 'import { Eval, Scorer } from "axiom/ai/evals";
const S = Scorer("s", ({ output }: { output: string }) => true);
Eval("test", { capability: "test", data: [{ input: "a", expected: "a" }], task: async ({ input }) => input, scorers: [S] });' > /tmp/test.eval.ts

./scripts/eval-validate /tmp/test.eval.ts
```

**Expected:** Validation passes

- [ ] Script runs without error
- [ ] Reports no errors
- [ ] Exits 0

### 9.2 eval-validate with bad input
```bash
echo 'console.log("not an eval")' > /tmp/bad.eval.ts
./scripts/eval-validate /tmp/bad.eval.ts
```

**Expected:** Reports missing Eval(), data, capability, task

- [ ] Reports errors for missing components
- [ ] Exits non-zero

---

## Test 10: Online Eval Guidance

**Prompt:** "How do I add scoring to my production code?"

**Expected behavior:**
- Agent recommends onlineEval()
- Shows fire-and-forget pattern with void
- Mentions sampling configuration

**Validation:**
- [ ] Uses onlineEval from axiom/ai
- [ ] Shows void onlineEval(...) pattern
- [ ] Mentions sampling.rate

---

## Test 11: End-to-End Eval Creation

**Prompt:** "Create a complete eval suite for a RAG pipeline with these steps:
1. retrieveDocuments(query: string): string[] - returns document IDs
2. generateAnswer(query: string, docs: string[]): string - returns answer text

Include flag schema, config, and eval files for both steps."

**Expected behavior:**
- Generates app-scope.ts with flag schema
- Generates axiom.config.ts
- Generates retrieval.eval.ts with set match scorer
- Generates generation.eval.ts with appropriate scorer
- All files have correct imports

**Validation:**
- [ ] Flag schema with two capability steps
- [ ] Config references flagSchema
- [ ] Retrieval eval with set match scorer
- [ ] Generation eval with appropriate scorer
- [ ] All imports correct
- [ ] All files valid TypeScript

---

## Test 12: Common Pitfalls

**Prompt:** "I'm getting 'All flag fields must have defaults' error"

**Expected:** Agent explains that every leaf field in flagSchema needs .default() and shows the fix.

**Prompt:** "My eval file isn't being discovered"

**Expected:** Agent checks file extension (.eval.ts), include patterns in axiom.config.ts.

**Validation:**
- [ ] Correct diagnosis for missing defaults
- [ ] Correct diagnosis for file discovery issues

---

## Validation Checklist

### Core Features
- [ ] Skill activates on eval-related requests
- [ ] Intake workflow asks right questions
- [ ] Correct scorer pattern recommendations
- [ ] Valid eval file generation
- [ ] Valid flag schema generation
- [ ] Valid config generation

### Scripts
- [ ] setup checks requirements
- [ ] eval-validate catches structural issues
- [ ] eval-list works
- [ ] eval-run passes through to axiom eval

### Templates
- [ ] All templates have valid TypeScript syntax
- [ ] All templates use correct import paths
- [ ] Templates have TODO placeholders for customization

### Quality
- [ ] Generated evals have metadata.purpose on test cases
- [ ] Generated evals cover happy path, adversarial, boundary
- [ ] Generated scorers explicitly type their args
- [ ] Flag schemas follow all validation rules

---

**Last validated:** _(fill in after testing)_
