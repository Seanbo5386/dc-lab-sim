# Unified Help Command Design

## Problem

Three overlapping help commands confuse users:

- `dcgmi --help` — simulator-level flag, rich registry-based output
- `help dcgmi` — Terminal router, medium-detail output from hardcoded metadata
- `explain dcgmi` — Terminal router, richest output (registry + learning aids)

Users don't know which one to use, and `help` (the most natural choice) gives the weakest output.

## Solution

Make `help <cmd>` use the `explain` pipeline (the best output), then remove `explain` entirely.

- `dcgmi --help` — unchanged
- `help dcgmi` — now uses the rich registry + learning aids output (what `explain` did)
- `help` (bare) — still shows the command list
- `explain` — removed

## Changes

### 1. Rename `src/cli/explainCommand.ts` → `src/cli/helpCommand.ts`

Rename the file and its exports:

- `generateExplainOutput` → `generateHelpOutput`
- `ExplainOptions` → `HelpOptions`

### 2. Update `src/cli/index.ts`

Update the barrel export to reflect the rename:

```typescript
// Help Command
export { generateHelpOutput } from "./helpCommand";
export type { HelpOptions } from "./helpCommand";
```

### 3. Update `src/components/Terminal.tsx` (~lines 284-339)

Replace two handlers with one:

```typescript
router.register("help", async (cl) => {
  const args = cl.trim().split(/\s+/).slice(1);
  if (args.length === 0) {
    return { output: formatCommandList(), exitCode: 0 };
  }
  try {
    const { getCommandDefinitionRegistry, generateHelpOutput } =
      await import("@/cli");
    const registry = await getCommandDefinitionRegistry();
    const learningMeta = getCommandMetadata(args[0]);
    const output = await generateHelpOutput(
      args.join(" "),
      registry,
      { includeErrors: true, includeExamples: true, includePermissions: true },
      learningMeta,
    );
    return { output, exitCode: 0 };
  } catch {
    const metadata = getCommandMetadata(args[0]);
    if (metadata) {
      return { output: formatCommandHelp(metadata), exitCode: 0 };
    }
    let output = `\x1b[33mNo help available for '\x1b[36m${args[0]}\x1b[33m'.\x1b[0m`;
    const suggestion = getDidYouMeanMessage(args[0]);
    if (suggestion) output += "\n\n" + suggestion;
    output += `\n\nType \x1b[36mhelp\x1b[0m to see all available commands.`;
    return { output, exitCode: 0 };
  }
});

// Remove: router.register("explain", ...) — entire block deleted
```

### 4. Update `src/cli/__tests__/explainCommand.test.ts`

Rename to `helpCommand.test.ts`, update imports and function names.

### 5. Remove `explain` from static command list

If `explain` appears in `commandMetadata.ts` or anywhere as a recognized command, remove it.

## Files Modified

| File                                       | Change                                      |
| ------------------------------------------ | ------------------------------------------- |
| `src/cli/explainCommand.ts`                | Rename → `helpCommand.ts`, rename exports   |
| `src/cli/index.ts`                         | Update barrel export                        |
| `src/components/Terminal.tsx`              | Merge help+explain handlers, delete explain |
| `src/cli/__tests__/explainCommand.test.ts` | Rename → `helpCommand.test.ts`, update refs |

## Files NOT Changed

- `src/utils/commandMetadata.ts` — stays as-is (used by other utilities)
- `src/utils/commandSuggestions.ts` — stays as-is
- All simulator `--help` handling — unchanged
- `src/cli/CommandDefinitionRegistry.ts` — unchanged
- `src/cli/formatters.ts` — unchanged

## Verification

1. `npm run test:run` — all tests pass
2. `npm run lint` — 0 errors
3. `npm run build` — clean
4. Manual: `help nvidia-smi` shows rich output with learning aids
5. Manual: `help` (bare) shows command list
6. Manual: `explain nvidia-smi` shows "command not found" or similar
7. Manual: `nvidia-smi --help` works exactly as before
