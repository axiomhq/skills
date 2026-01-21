# Skill Eval Tooling

Framework for evaluating Axiom skills with different harness types.

## Structure

```
eval-tooling/
├── src/
│   ├── harnesses/           # Harness implementations
│   │   ├── prompt-injection.ts   # Inject skill + refs into system prompt
│   │   ├── tool-simulation.ts    # Simulate Amp's skill loading via tools
│   │   └── anthropic-native.ts   # Anthropic Skills API (not yet implemented)
│   └── shared/              # Shared utilities
│       ├── app-scope.ts     # Flag configuration
│       └── types.ts         # Common types
skills/
└── <skill-name>/
    ├── SKILL.md             # Skill definition
    ├── reference/           # Reference files
    └── .meta/
        ├── <skill>.eval.ts  # Eval definition
        └── cases.ts         # Test cases
```

## Harness Types

### prompt-injection
Injects skill content + all reference files directly into system prompt.
- Pros: Simple, works with any provider, no tool calling overhead
- Cons: Doesn't test skill discoverability

### tool-simulation
Simulates Amp's skill loading via tool calls.
- Pros: Tests skill discoverability and progressive disclosure
- Cons: Adds tool calling latency

## Usage

```bash
cd eval-tooling

# Install dependencies
pnpm install

# Type check
pnpm check

# Run SPL-to-APL eval
pnpm eval:spl-to-apl

# Run with specific harness type
pnpm eval:spl-to-apl --flag.harnessType=tool-simulation
```

## Adding a New Skill Eval

1. Create `.meta/` directory in skill folder
2. Create `cases.ts` with test cases
3. Create `<skill>.eval.ts` using the harness

See `skills/spl-to-apl/.meta/` for an example.
