# Comprehensive Codebase Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address all 66 identified issues from the 7-dimension codebase analysis, prioritized by impact and effort.

**Architecture:** Phased approach - Critical fixes first (safety/correctness), then High priority (performance/UX), then Medium (maintainability), finally Low (polish). Each phase is independently deployable.

**Tech Stack:** React 18, TypeScript, Zustand, Vitest, Tailwind CSS, D3.js, xterm.js

---

## Phase 1: Critical Fixes (Week 1)

### Task 1: Fix JSON.stringify Performance Hotspot

**Files:**

- Modify: `src/App.tsx:52-80`
- Create: `src/utils/shallowCompare.ts`

**Step 1: Create shallow comparison utility**

```typescript
// src/utils/shallowCompare.ts
export function shallowCompareGPU(a: GPU, b: GPU): boolean {
  return (
    a.id === b.id &&
    a.temperature === b.temperature &&
    a.utilization === b.utilization &&
    a.memoryUsed === b.memoryUsed &&
    a.powerUsage === b.powerUsage &&
    a.healthStatus === b.healthStatus &&
    a.eccErrors === b.eccErrors
  );
}

export function shallowCompareHCA(a: InfiniBandHCA, b: InfiniBandHCA): boolean {
  return (
    a.guid === b.guid &&
    a.state === b.state &&
    a.physicalState === b.physicalState &&
    a.linkSpeed === b.linkSpeed
  );
}
```

**Step 2: Write test for shallow comparison**

```typescript
// src/utils/__tests__/shallowCompare.test.ts
import { describe, it, expect } from "vitest";
import { shallowCompareGPU, shallowCompareHCA } from "../shallowCompare";

describe("shallowCompareGPU", () => {
  it("returns true for identical GPUs", () => {
    const gpu = {
      id: 0,
      temperature: 65,
      utilization: 80,
      memoryUsed: 40000,
      powerUsage: 250,
      healthStatus: "OK",
      eccErrors: 0,
    };
    expect(shallowCompareGPU(gpu, { ...gpu })).toBe(true);
  });

  it("returns false when temperature differs", () => {
    const gpu1 = {
      id: 0,
      temperature: 65,
      utilization: 80,
      memoryUsed: 40000,
      powerUsage: 250,
      healthStatus: "OK",
      eccErrors: 0,
    };
    const gpu2 = { ...gpu1, temperature: 70 };
    expect(shallowCompareGPU(gpu1, gpu2)).toBe(false);
  });
});
```

**Step 3: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/shallowCompare.test.ts`
Expected: PASS

**Step 4: Update App.tsx to use shallow comparison**

Replace lines 52-80 in `src/App.tsx`:

```typescript
import { shallowCompareGPU, shallowCompareHCA } from "@/utils/shallowCompare";

// In the metrics simulation useEffect:
updated.gpus.forEach((gpu, idx) => {
  if (!shallowCompareGPU(gpu, node.gpus[idx])) {
    store.updateGPU(node.id, gpu.id, gpu);
  }
});
```

**Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/utils/shallowCompare.ts src/utils/__tests__/shallowCompare.test.ts src/App.tsx
git commit -m "perf: replace JSON.stringify with shallow comparison in metrics loop"
```

---

### Task 2: Add Debounced localStorage Saves

**Files:**

- Modify: `src/components/LearningPaths.tsx:78-82`
- Create: `src/hooks/useDebouncedStorage.ts`

**Step 1: Create debounced storage hook**

```typescript
// src/hooks/useDebouncedStorage.ts
import { useEffect, useRef } from "react";

export function useDebouncedStorage<T>(
  key: string,
  value: T,
  delay: number = 500,
): void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error(`Failed to save ${key} to localStorage:`, e);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, value, delay]);
}
```

**Step 2: Write test for debounced storage**

```typescript
// src/hooks/__tests__/useDebouncedStorage.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDebouncedStorage } from "../useDebouncedStorage";

describe("useDebouncedStorage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  it("saves value after delay", () => {
    renderHook(() => useDebouncedStorage("test-key", { value: "test" }, 500));

    expect(localStorage.getItem("test-key")).toBeNull();

    vi.advanceTimersByTime(500);

    expect(localStorage.getItem("test-key")).toBe('{"value":"test"}');
  });

  it("debounces rapid updates", () => {
    const { rerender } = renderHook(
      ({ value }) => useDebouncedStorage("test-key", value, 500),
      { initialProps: { value: "first" } },
    );

    rerender({ value: "second" });
    rerender({ value: "third" });

    vi.advanceTimersByTime(500);

    expect(localStorage.getItem("test-key")).toBe('"third"');
  });
});
```

**Step 3: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/useDebouncedStorage.test.ts`
Expected: PASS

**Step 4: Update LearningPaths.tsx to use debounced storage**

In `src/components/LearningPaths.tsx`, replace lines 78-82:

```typescript
import { useDebouncedStorage } from "@/hooks/useDebouncedStorage";

// Replace the useEffect with:
useDebouncedStorage("ncp-aii-completed-lessons", [...completedLessons], 500);
useDebouncedStorage("ncp-aii-completed-modules", [...completedModules], 500);
useDebouncedStorage(
  "ncp-aii-lesson-progress",
  Object.fromEntries(lessonProgress),
  500,
);
```

**Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/hooks/useDebouncedStorage.ts src/hooks/__tests__/useDebouncedStorage.test.ts src/components/LearningPaths.tsx
git commit -m "perf: add debounced localStorage saves to prevent UI blocking"
```

---

### Task 3: Add Color Alternatives to Health Indicators

**Files:**

- Modify: `src/components/Dashboard.tsx:16-32`

**Step 1: Read current HealthIndicator implementation**

Read: `src/components/Dashboard.tsx` lines 16-32

**Step 2: Update HealthIndicator with text/icon alternatives**

```tsx
// src/components/Dashboard.tsx - Update HealthIndicator component
const HealthIndicator: React.FC<{ status: "OK" | "Warning" | "Critical" }> = ({
  status,
}) => {
  const config = {
    OK: {
      bg: "bg-green-500/20",
      color: "text-green-500",
      Icon: CheckCircle,
      symbol: "✓",
      ariaLabel: "Healthy",
    },
    Warning: {
      bg: "bg-yellow-500/20",
      color: "text-yellow-500",
      Icon: AlertTriangle,
      symbol: "⚠",
      ariaLabel: "Warning",
    },
    Critical: {
      bg: "bg-red-500/20",
      color: "text-red-500",
      Icon: XCircle,
      symbol: "✕",
      ariaLabel: "Critical",
    },
  };

  const { bg, color, Icon, symbol, ariaLabel } = config[status];

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 rounded-full ${bg}`}
      role="status"
      aria-label={`Health status: ${ariaLabel}`}
    >
      <Icon className={`w-4 h-4 ${color}`} aria-hidden="true" />
      <span className={`text-sm font-medium ${color}`}>
        {status}
        <span className="ml-1 text-xs" aria-hidden="true">
          {symbol}
        </span>
      </span>
    </div>
  );
};
```

**Step 3: Run build to verify no errors**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "a11y: add text/icon alternatives to color-only health indicators"
```

---

### Task 4: Implement Modal Focus Trap

**Files:**

- Modify: `src/components/WelcomeScreen.tsx`
- Create: `src/hooks/useFocusTrap.ts`

**Step 1: Create focus trap hook**

```typescript
// src/hooks/useFocusTrap.ts
import { useEffect, useRef, RefObject } from "react";

export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  isActive: boolean = true,
  onEscape?: () => void,
): void {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const focusableElements =
      container.querySelectorAll<HTMLElement>(focusableSelector);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus on cleanup
      previousActiveElement.current?.focus();
    };
  }, [containerRef, isActive, onEscape]);
}
```

**Step 2: Write test for focus trap**

```typescript
// src/hooks/__tests__/useFocusTrap.test.ts
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRef } from "react";
import { useFocusTrap } from "../useFocusTrap";

describe("useFocusTrap", () => {
  it("calls onEscape when Escape key pressed", () => {
    const onEscape = vi.fn();
    const container = document.createElement("div");
    container.innerHTML = "<button>Test</button>";
    document.body.appendChild(container);

    renderHook(() => {
      const ref = useRef(container);
      useFocusTrap(ref, true, onEscape);
    });

    const event = new KeyboardEvent("keydown", { key: "Escape" });
    document.dispatchEvent(event);

    expect(onEscape).toHaveBeenCalled();
    document.body.removeChild(container);
  });
});
```

**Step 3: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/useFocusTrap.test.ts`
Expected: PASS

**Step 4: Update WelcomeScreen to use focus trap**

```tsx
// src/components/WelcomeScreen.tsx - Add focus trap
import { useFocusTrap } from "@/hooks/useFocusTrap";

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 500);
  }, [onClose]);

  useFocusTrap(modalRef, isVisible, handleClose);

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className={/* existing classes */}
    >
      {/* Add id to title */}
      <h1 id="welcome-title" className="text-4xl md:text-5xl font-bold">
        AI Infrastructure <span className="text-nvidia-green">Simulator</span>
      </h1>
      {/* ... rest of component */}
    </div>
  );
};
```

**Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/hooks/useFocusTrap.ts src/hooks/__tests__/useFocusTrap.test.ts src/components/WelcomeScreen.tsx
git commit -m "a11y: implement focus trap for modal dialogs"
```

---

### Task 5: Create CONTRIBUTING.md

**Files:**

- Create: `CONTRIBUTING.md`

**Step 1: Create CONTRIBUTING.md file**

```markdown
# Contributing to NVIDIA AI Infrastructure Simulator

Thank you for your interest in contributing! This document provides guidelines and instructions for contributors.

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

\`\`\`bash
git clone <repository-url>
cd DC-Sim-011126
npm install
\`\`\`

### Running Locally

\`\`\`bash
npm run dev # Start development server (http://localhost:5173)
npm test # Run tests
npm run build # Production build
\`\`\`

## Code Standards

### TypeScript

- **Strict mode enabled** - No `any` types without justification
- Use interfaces for object shapes, types for unions/primitives
- All exported functions must have TypeScript types

### React

- Functional components with hooks only
- Use `React.FC<Props>` for typed components
- Prefer `useCallback` and `useMemo` for expensive operations
- Custom hooks should start with `use` prefix

### Testing

- All new features require tests
- Minimum coverage: 80% lines, 85% branches
- Test file location: `__tests__/` subdirectory or `*.test.ts(x)`
- Use Vitest with React Testing Library

### Styling

- Tailwind CSS for all styling
- No inline styles except for dynamic values
- Follow existing color scheme (nvidia-green, gray-800, etc.)

## Pull Request Process

1. **Branch naming**: `feature/description`, `fix/description`, `docs/description`
2. **Commits**: Use conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`)
3. **Tests**: All tests must pass (`npm test`)
4. **Build**: Must build without errors (`npm run build`)
5. **Review**: At least one approval required

## Code Review Checklist

- [ ] TypeScript types complete (no `any`)
- [ ] Tests added/updated
- [ ] Accessibility considered (keyboard nav, aria labels)
- [ ] No console.log in production code
- [ ] Component < 300 lines

## Architecture Overview

### Key Directories

- `src/components/` - React components
- `src/simulators/` - Command simulators (nvidia-smi, dcgmi, etc.)
- `src/store/` - Zustand state management
- `src/utils/` - Utility functions
- `src/types/` - TypeScript type definitions
- `src/hooks/` - Custom React hooks

### State Management

- **simulationStore** - Cluster state, GPU metrics, scenarios
- **learningStore** - Learning paths, progress, achievements

### Adding a New Simulator

1. Create `src/simulators/mySimulator.ts` extending `BaseSimulator`
2. Implement `execute()` method
3. Register in `src/simulators/CommandInterceptor.ts`
4. Add tests in `src/simulators/__tests__/`

## Getting Help

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Use discussions for questions
```

**Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add comprehensive CONTRIBUTING.md"
```

---

### Task 6: Fix Critical `any` Types (Top 5)

**Files:**

- Modify: `src/types/commands.ts:16,19`
- Modify: `src/store/scenarioContext.ts:16`

**Step 1: Fix CommandContext types**

```typescript
// src/types/commands.ts - Replace any types with proper imports
import type { ClusterConfig } from "./cluster";
import type { ScenarioContext } from "@/store/scenarioContext";

export interface CommandContext {
  scenarioContext?: ScenarioContext;
  cluster?: ClusterConfig;
  // ... rest of interface
}
```

**Step 2: Fix scenarioContext.ts type**

```typescript
// src/store/scenarioContext.ts - Replace any with proper type
import type { ClusterConfig } from '@/types/cluster';

// Line 16: Change from
// initialClusterState?: any;
// To:
initialClusterState?: ClusterConfig;
```

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/types/commands.ts src/store/scenarioContext.ts
git commit -m "fix: replace critical any types with proper TypeScript types"
```

---

## Phase 2: High Priority Fixes (Week 2)

### Task 7: Add JSON Schema Validation to Cluster Import

**Files:**

- Create: `src/utils/clusterSchema.ts`
- Modify: `src/App.tsx:109-111`

**Step 1: Create schema validation utility**

```typescript
// src/utils/clusterSchema.ts
import type { ClusterConfig } from "@/types/cluster";

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateClusterConfig(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Invalid data: expected object"] };
  }

  const obj = data as Record<string, unknown>;

  // Check for prototype pollution
  if ("__proto__" in obj || "constructor" in obj || "prototype" in obj) {
    return {
      valid: false,
      errors: ["Invalid data: potential prototype pollution"],
    };
  }

  // Required fields
  if (!obj.name || typeof obj.name !== "string") {
    errors.push('Missing or invalid "name" field');
  }

  if (!Array.isArray(obj.nodes)) {
    errors.push('Missing or invalid "nodes" array');
  } else if (obj.nodes.length > 64) {
    errors.push("Cluster exceeds maximum of 64 nodes");
  }

  return { valid: errors.length === 0, errors };
}

export function safeParseClusterJSON(
  jsonString: string,
  maxSize: number = 5 * 1024 * 1024,
): ValidationResult & { data?: ClusterConfig } {
  // Check size limit (default 5MB)
  if (jsonString.length > maxSize) {
    return { valid: false, errors: ["File exceeds maximum size of 5MB"] };
  }

  try {
    const parsed = JSON.parse(jsonString);
    const validation = validateClusterConfig(parsed);

    if (validation.valid) {
      return { ...validation, data: parsed as ClusterConfig };
    }
    return validation;
  } catch (e) {
    return {
      valid: false,
      errors: [`JSON parse error: ${(e as Error).message}`],
    };
  }
}
```

**Step 2: Write tests**

```typescript
// src/utils/__tests__/clusterSchema.test.ts
import { describe, it, expect } from "vitest";
import { validateClusterConfig, safeParseClusterJSON } from "../clusterSchema";

describe("validateClusterConfig", () => {
  it("rejects prototype pollution attempts", () => {
    const result = validateClusterConfig({ __proto__: { admin: true } });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Invalid data: potential prototype pollution",
    );
  });

  it("accepts valid cluster config", () => {
    const result = validateClusterConfig({
      name: "test-cluster",
      nodes: [{ id: "node-1", gpus: [] }],
    });
    expect(result.valid).toBe(true);
  });
});

describe("safeParseClusterJSON", () => {
  it("rejects oversized files", () => {
    const largeString = "a".repeat(6 * 1024 * 1024);
    const result = safeParseClusterJSON(largeString);
    expect(result.valid).toBe(false);
  });
});
```

**Step 3: Run tests**

Run: `npx vitest run src/utils/__tests__/clusterSchema.test.ts`
Expected: PASS

**Step 4: Update App.tsx import handler**

```typescript
// src/App.tsx - Update cluster import (lines 109-111)
import { safeParseClusterJSON } from "@/utils/clusterSchema";

// In the file input handler:
const handleImport = (jsonString: string) => {
  const result = safeParseClusterJSON(jsonString);

  if (!result.valid) {
    alert(`Import failed:\n${result.errors.join("\n")}`);
    return;
  }

  importCluster(result.data!);
};
```

**Step 5: Commit**

```bash
git add src/utils/clusterSchema.ts src/utils/__tests__/clusterSchema.test.ts src/App.tsx
git commit -m "security: add JSON schema validation to cluster import"
```

---

### Task 8: Refactor App.tsx - Extract MetricsSimulation Hook

**Files:**

- Create: `src/hooks/useMetricsSimulation.ts`
- Modify: `src/App.tsx`

**Step 1: Create useMetricsSimulation hook**

```typescript
// src/hooks/useMetricsSimulation.ts
import { useEffect, useRef } from "react";
import { MetricsSimulator } from "@/utils/metricsSimulator";
import { useSimulationStore } from "@/store/simulationStore";
import { shallowCompareGPU, shallowCompareHCA } from "@/utils/shallowCompare";

export function useMetricsSimulation(isRunning: boolean): void {
  const metricsSimulatorRef = useRef<MetricsSimulator>(new MetricsSimulator());

  useEffect(() => {
    const metricsSimulator = metricsSimulatorRef.current;

    if (isRunning) {
      metricsSimulator.start((updater) => {
        const store = useSimulationStore.getState();

        store.cluster.nodes.forEach((node) => {
          const updated = updater({ gpus: node.gpus, hcas: node.hcas });

          updated.gpus.forEach((gpu, idx) => {
            if (!shallowCompareGPU(gpu, node.gpus[idx])) {
              store.updateGPU(node.id, gpu.id, gpu);
            }
          });

          updated.hcas.forEach((hca, idx) => {
            if (!shallowCompareHCA(hca, node.hcas[idx])) {
              store.updateHCA(node.id, hca.guid, hca);
            }
          });
        });
      }, 1000);
    }

    return () => {
      metricsSimulator.stop();
    };
  }, [isRunning]);
}
```

**Step 2: Update App.tsx to use hook**

```typescript
// src/App.tsx - Replace inline metrics logic with hook
import { useMetricsSimulation } from "@/hooks/useMetricsSimulation";

function App() {
  const isRunning = useSimulationStore((state) => state.isRunning);

  // Replace 30+ lines of metrics code with:
  useMetricsSimulation(isRunning);

  // ... rest of component
}
```

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/hooks/useMetricsSimulation.ts src/App.tsx
git commit -m "refactor: extract MetricsSimulation to custom hook"
```

---

### Task 9: Fix Weak Test Assertions

**Files:**

- Modify: `src/simulators/__tests__/adversarialInputs.test.ts`
- Modify: `src/simulators/__tests__/dcgmiSimulator.test.ts`

**Step 1: Fix adversarialInputs.test.ts assertions**

Replace `toBeGreaterThanOrEqual(0)` with specific expectations:

```typescript
// Pattern to find and replace:
// Before:
expect(result.exitCode).toBeGreaterThanOrEqual(0);

// After (for error cases):
expect(result.exitCode).not.toBe(0);
expect(result.output.toLowerCase()).toMatch(/error|invalid|unknown|failed/i);

// After (for success cases):
expect(result.exitCode).toBe(0);
```

**Step 2: Fix dcgmiSimulator.test.ts assertions**

Apply same pattern to dcgmi tests.

**Step 3: Run tests to ensure they still pass with correct expectations**

Run: `npm test`
Expected: All tests pass (or fail for real bugs)

**Step 4: Commit**

```bash
git add src/simulators/__tests__/
git commit -m "test: strengthen weak assertions with specific expectations"
```

---

### Task 10: Add Keyboard Navigation to Node Selector

**Files:**

- Modify: `src/components/Dashboard.tsx:127-149`

**Step 1: Update NodeSelector with keyboard support**

```tsx
// src/components/Dashboard.tsx - NodeSelector component
const NodeSelector: React.FC = () => {
  const nodes = useSimulationStore((state) => state.cluster.nodes);
  const selectedNode = useSimulationStore((state) => state.selectedNode);
  const selectNode = useSimulationStore((state) => state.selectNode);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (
    e: React.KeyboardEvent,
    nodeId: string,
    index: number,
  ) => {
    const nodeIds = nodes.map((n) => n.id);

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        const nextIndex = (index + 1) % nodes.length;
        selectNode(nodeIds[nextIndex]);
        // Focus the next button
        const nextButton = containerRef.current?.querySelector(
          `[data-node-index="${nextIndex}"]`,
        ) as HTMLButtonElement;
        nextButton?.focus();
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        const prevIndex = (index - 1 + nodes.length) % nodes.length;
        selectNode(nodeIds[prevIndex]);
        const prevButton = containerRef.current?.querySelector(
          `[data-node-index="${prevIndex}"]`,
        ) as HTMLButtonElement;
        prevButton?.focus();
        break;
      case "Home":
        e.preventDefault();
        selectNode(nodeIds[0]);
        break;
      case "End":
        e.preventDefault();
        selectNode(nodeIds[nodes.length - 1]);
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="Node selection"
      className="flex gap-2 overflow-x-auto pb-2"
    >
      {nodes.map((node, index) => (
        <button
          key={node.id}
          data-node-index={index}
          role="tab"
          aria-selected={selectedNode === node.id}
          aria-controls={`node-panel-${node.id}`}
          tabIndex={selectedNode === node.id ? 0 : -1}
          onClick={() => selectNode(node.id)}
          onKeyDown={(e) => handleKeyDown(e, node.id, index)}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors
            focus:outline-none focus:ring-2 focus:ring-nvidia-green focus:ring-offset-2 focus:ring-offset-gray-900
            ${
              selectedNode === node.id
                ? "bg-nvidia-green text-black"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
        >
          {node.id}
        </button>
      ))}
    </div>
  );
};
```

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "a11y: add keyboard navigation to node selector"
```

---

### Task 11: Add Tests for containerSimulator

**Files:**

- Create: `src/simulators/__tests__/containerSimulator.test.ts`

**Step 1: Create test file**

```typescript
// src/simulators/__tests__/containerSimulator.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { ContainerSimulator } from "../containerSimulator";

describe("ContainerSimulator", () => {
  let simulator: ContainerSimulator;

  beforeEach(() => {
    simulator = new ContainerSimulator();
  });

  describe("docker commands", () => {
    it("executes docker ps", async () => {
      const result = await simulator.execute("docker ps", {});
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("CONTAINER ID");
    });

    it("executes docker images", async () => {
      const result = await simulator.execute("docker images", {});
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("REPOSITORY");
    });

    it("returns error for unknown docker subcommand", async () => {
      const result = await simulator.execute("docker unknowncmd", {});
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe("ngc commands", () => {
    it("executes ngc registry image list", async () => {
      const result = await simulator.execute("ngc registry image list", {});
      expect(result.exitCode).toBe(0);
    });
  });

  describe("enroot commands", () => {
    it("executes enroot list", async () => {
      const result = await simulator.execute("enroot list", {});
      expect(result.exitCode).toBe(0);
    });
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run src/simulators/__tests__/containerSimulator.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/simulators/__tests__/containerSimulator.test.ts
git commit -m "test: add tests for containerSimulator"
```

---

## Phase 3: Medium Priority Fixes (Week 3-4)

### Task 12: Add Immer Middleware to Zustand

**Files:**

- Modify: `src/store/simulationStore.ts`

**Step 1: Install immer**

Run: `npm install immer`

**Step 2: Update simulationStore with immer**

```typescript
// src/store/simulationStore.ts
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist } from "zustand/middleware";

export const useSimulationStore = create<SimulationState>()(
  persist(
    immer((set) => ({
      // ... state

      // Simplified mutations with immer:
      updateGPU: (nodeId, gpuId, updates) =>
        set((state) => {
          const node = state.cluster.nodes.find((n) => n.id === nodeId);
          if (node) {
            const gpu = node.gpus.find((g) => g.id === gpuId);
            if (gpu) {
              Object.assign(gpu, updates);
            }
          }
        }),

      // ... other actions simplified similarly
    })),
    { name: "simulation-store" },
  ),
);
```

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add package.json package-lock.json src/store/simulationStore.ts
git commit -m "refactor: add immer middleware to Zustand for cleaner mutations"
```

---

### Task 13: Create Logging Utility

**Files:**

- Create: `src/utils/logger.ts`
- Modify files with console.log statements

**Step 1: Create logger utility**

```typescript
// src/utils/logger.ts
type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = import.meta.env.DEV ? "debug" : "warn";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (shouldLog("debug")) console.log("[DEBUG]", ...args);
  },
  info: (...args: unknown[]) => {
    if (shouldLog("info")) console.info("[INFO]", ...args);
  },
  warn: (...args: unknown[]) => {
    if (shouldLog("warn")) console.warn("[WARN]", ...args);
  },
  error: (...args: unknown[]) => {
    if (shouldLog("error")) console.error("[ERROR]", ...args);
  },
};
```

**Step 2: Replace console.log in scenarioContext.ts (20 instances)**

```bash
# Use find/replace to change console.log -> logger.debug
# and console.error -> logger.error
```

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds, no console statements in production

**Step 4: Commit**

```bash
git add src/utils/logger.ts src/store/scenarioContext.ts
git commit -m "refactor: replace console.log with logger utility"
```

---

### Task 14: Add Reduced Motion Support

**Files:**

- Modify: `src/components/TopologyGraph.tsx`
- Modify: `src/components/InfiniBandMap.tsx`

**Step 1: Create useReducedMotion hook**

```typescript
// src/hooks/useReducedMotion.ts
import { useState, useEffect } from "react";

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);

    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return reducedMotion;
}
```

**Step 2: Update TopologyGraph to respect motion preference**

```typescript
// src/components/TopologyGraph.tsx
import { useReducedMotion } from "@/hooks/useReducedMotion";

// Inside component:
const reducedMotion = useReducedMotion();

// In animation code:
if (!reducedMotion) {
  // Run particle animations
}
```

**Step 3: Apply same pattern to InfiniBandMap**

**Step 4: Commit**

```bash
git add src/hooks/useReducedMotion.ts src/components/TopologyGraph.tsx src/components/InfiniBandMap.tsx
git commit -m "a11y: add reduced motion support for animations"
```

---

### Task 15: Split learningPathEngine.ts

**Files:**

- Create: `src/utils/learningPaths/index.ts`
- Create: `src/utils/learningPaths/types.ts`
- Create: `src/utils/learningPaths/domain1-lessons.ts`
- Create: `src/utils/learningPaths/domain2-lessons.ts`
- Create: `src/utils/learningPaths/domain3-lessons.ts`
- Create: `src/utils/learningPaths/domain4-lessons.ts`
- Create: `src/utils/learningPaths/domain5-lessons.ts`
- Create: `src/utils/learningPaths/flashcards.ts`
- Create: `src/utils/learningPaths/pathEngine.ts`
- Modify: imports throughout codebase

**Step 1: Create types.ts with shared types**

Extract all interfaces and types from learningPathEngine.ts to types.ts.

**Step 2: Create domain lesson files**

Split the lesson definitions by domain into separate files.

**Step 3: Create pathEngine.ts**

Move the core engine logic to pathEngine.ts.

**Step 4: Create index.ts barrel export**

```typescript
// src/utils/learningPaths/index.ts
export * from "./types";
export * from "./pathEngine";
export { domain1Lessons } from "./domain1-lessons";
// ... etc
```

**Step 5: Update imports throughout codebase**

**Step 6: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 7: Commit**

```bash
git add src/utils/learningPaths/ src/utils/learningPathEngine.ts
git commit -m "refactor: split learningPathEngine.ts into modular files"
```

---

## Phase 4: Low Priority Polish (Week 5+)

### Task 16: Add Skip Links

**Files:**

- Modify: `src/App.tsx`

**Step 1: Add skip link component**

```tsx
// At the top of App return:
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-nvidia-green focus:text-black focus:px-4 focus:py-2 focus:rounded"
>
  Skip to main content
</a>

// Add id to main content area:
<main id="main-content">
  {/* ... */}
</main>
```

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "a11y: add skip links for keyboard navigation"
```

---

### Task 17: Fix README Port Number

**Files:**

- Modify: `README.md`

**Step 1: Update port from 3000 to 5173**

Find and replace `localhost:3000` with `localhost:5173`.

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: fix README port number (3000 -> 5173)"
```

---

### Task 18: Add .env.example

**Files:**

- Create: `.env.example`

**Step 1: Create .env.example**

```bash
# Environment Variables for DC-Sim
# Copy this file to .env and configure as needed

# Development mode (auto-detected by Vite)
# NODE_ENV=development

# API endpoint (if backend is added in future)
# VITE_API_URL=http://localhost:3001

# Feature flags (future use)
# VITE_ENABLE_ANALYTICS=false
# VITE_ENABLE_DEBUG=true
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add .env.example for environment documentation"
```

---

### Task 19: Add Error Boundaries

**Files:**

- Create: `src/components/ErrorBoundary.tsx`
- Modify: `src/App.tsx`

**Step 1: Create ErrorBoundary component**

```tsx
// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-8 bg-red-500/10 border border-red-500 rounded-lg m-4">
            <h2 className="text-xl font-bold text-red-500 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-300">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 px-4 py-2 bg-nvidia-green text-black rounded"
            >
              Try Again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

**Step 2: Wrap App with ErrorBoundary**

```tsx
// src/main.tsx or src/App.tsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

**Step 3: Commit**

```bash
git add src/components/ErrorBoundary.tsx src/App.tsx
git commit -m "feat: add React Error Boundary for graceful error handling"
```

---

### Task 20: Add Pre-commit Hooks

**Files:**

- Create: `.husky/pre-commit`
- Modify: `package.json`

**Step 1: Install husky and lint-staged**

Run: `npm install -D husky lint-staged`

**Step 2: Configure husky**

Run: `npx husky init`

**Step 3: Create pre-commit hook**

```bash
# .husky/pre-commit
npx lint-staged
```

**Step 4: Add lint-staged config to package.json**

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

**Step 5: Commit**

```bash
git add .husky/ package.json
git commit -m "chore: add pre-commit hooks with husky and lint-staged"
```

---

## Summary

### Phase 1 (Critical) - 6 Tasks

1. Fix JSON.stringify performance hotspot
2. Add debounced localStorage saves
3. Add color alternatives to health indicators
4. Implement modal focus trap
5. Create CONTRIBUTING.md
6. Fix critical `any` types

### Phase 2 (High Priority) - 5 Tasks

7. Add JSON schema validation
8. Extract MetricsSimulation hook
9. Fix weak test assertions
10. Add keyboard navigation to node selector
11. Add tests for containerSimulator

### Phase 3 (Medium Priority) - 4 Tasks

12. Add Immer middleware to Zustand
13. Create logging utility
14. Add reduced motion support
15. Split learningPathEngine.ts

### Phase 4 (Low Priority) - 5 Tasks

16. Add skip links
17. Fix README port number
18. Add .env.example
19. Add error boundaries
20. Add pre-commit hooks

**Total Tasks:** 20
**Estimated Effort:** 40-60 hours
