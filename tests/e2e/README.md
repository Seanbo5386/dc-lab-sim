# E2E Test Suite - Phase 1 Coverage

Comprehensive Playwright test suite for Phase 1 exam coverage features.

## Test Structure

```
tests/e2e/
├── setup/
│   └── test-helpers.ts       # SimulatorTestHelper class
├── fixtures/
│   └── cluster-states.ts     # Cluster state fixtures
├── phase1-coverage/
│   ├── clusterkit.spec.ts           # ClusterKit commands (~20 tests)
│   ├── burn-in-tests.spec.ts        # NCCL/HPL/NeMo burn-in (~25 tests)
│   ├── firmware-cable.spec.ts       # fw-check and ibdiagnet (~20 tests)
│   ├── scenarios-domain4.spec.ts    # Lab scenarios (~30 tests)
│   └── integration-workflows.spec.ts # Multi-command flows (~15 tests)
└── visual-regression/
    └── baseline-snapshots.spec.ts   # Visual regression baselines
```

## Running Tests

**All tests:**
```bash
npm run test:e2e
```

**Specific test file:**
```bash
npm run test:e2e -- clusterkit.spec.ts
```

**Interactive UI mode:**
```bash
npm run test:e2e:ui
```

**Debug mode:**
```bash
npm run test:e2e:debug
```

**Specific viewport:**
```bash
npm run test:e2e -- --project=laptop-1366
```

**Update visual snapshots:**
```bash
npm run test:e2e -- --update-snapshots
```

## Test Coverage

### ClusterKit Commands (20 tests)
- Basic execution and output
- Verbose mode (-v, --verbose)
- Node targeting (--node)
- Error handling
- Edge cases
- Responsive behavior

### Burn-in Tests (25 tests)
- NCCL burn-in with iterations
- HPL burn-in with thermal validation
- NeMo burn-in with throughput checks
- Error handling
- Large iteration counts
- Cross burn-in workflows

### Firmware/Cable Validation (20 tests)
- ipmitool BMC and FRU checks
- nvidia-smi GPU VBIOS versions
- mlxconfig/mlxlink network firmware
- ibdiagnet cable signal quality
- ibstat port status
- Error handling and edge cases

### Lab Scenarios (30 tests)
- Scenario navigation and loading
- Lab workspace UI elements
- Command execution in lab context
- Hints system integration
- Lab exit and progress tracking
- Responsive lab panel behavior
- Multi-domain lab access
- Practice exam access

### Integration Workflows (15 tests)
- Production readiness workflow
- Cross-tool validation
- Sequential execution
- Performance/stress tests
- Error recovery
- Node switching

### Visual Regression (20 tests)
- Welcome screen across viewports
- Terminal output snapshots
- Labs page layouts
- Lab workspace responsiveness
- Component-specific snapshots

## Viewports

Tests run across 3 viewports:
- **Desktop:** 1920x1080
- **Laptop:** 1366x768
- **Large Display:** 2560x1440

## Writing New Tests

Use the `SimulatorTestHelper` class:

```typescript
import { test } from '@playwright/test';
import { createHelper } from '../setup/test-helpers';

test('my test', async ({ page }) => {
  const helper = await createHelper(page);
  await helper.navigateToSimulator();

  await helper.typeCommand('clusterkit');
  await helper.waitForCommandOutput();
  await helper.verifyOutputContains('Health Status');
});
```

### Available Helper Methods

| Method | Description |
|--------|-------------|
| `navigateToSimulator()` | Opens app and enters simulator |
| `typeCommand(cmd)` | Types command in terminal |
| `waitForCommandOutput(timeout?)` | Waits for command to complete |
| `getTerminalOutput()` | Gets all terminal text content |
| `verifyOutputContains(text)` | Asserts output contains text |
| `verifyOutputNotContains(text)` | Asserts output doesn't contain text |
| `navigateToLabs()` | Navigates to labs section |
| `selectScenario(title)` | Selects a specific scenario |
| `clearTerminal()` | Clears the terminal |
| `takeSnapshot(name)` | Takes a screenshot |
| `compareSnapshot(name)` | Compares against baseline |

## CI/CD

Tests run automatically on:
- Push to main branch
- Pull requests to main

Results available in GitHub Actions artifacts:
- `playwright-report/` - HTML test report
- `test-screenshots/` - Screenshots on failure
- `test-artifacts/` - Test traces and videos

## Troubleshooting

### Tests timing out
Increase the timeout in `waitForCommandOutput()`:
```typescript
await helper.waitForCommandOutput(15000); // 15 seconds
```

### Visual regression failures
Update snapshots after intentional UI changes:
```bash
npm run test:e2e -- --update-snapshots
```

### Terminal not responding
Ensure the simulator is fully loaded before typing:
```typescript
await page.waitForTimeout(500);
await helper.typeCommand('...');
```

## Test Maintenance

- **Update snapshots** when UI intentionally changes
- **Add new tests** for new features
- **Run locally** before pushing to catch issues early
- **Review CI failures** carefully - may indicate real bugs
