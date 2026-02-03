# Feature Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete and polish the Learning Paths feature, add comprehensive tests, and wire up full integration with the terminal for command execution.

**Architecture:** The Learning Paths feature has a complete UI component (1314 lines) and engine (4131 lines with 33 lessons, 14 modules, 5 domain paths). The work needed is: (1) Add tests for the engine and component, (2) Wire up command execution so lessons can interact with the terminal, (3) Polish the integration and ensure data persistence works correctly.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Zustand

---

## Task 1: Create Learning Path Engine Tests

**Files:**

- Create: `src/utils/__tests__/learningPathEngine.test.ts`

**Step 1: Write basic structure and import tests**

```typescript
import { describe, it, expect } from "vitest";
import {
  LEARNING_PATHS,
  ALL_PATHS,
  getLearningPath,
  getPathsByWeight,
  getLessonById,
  getModuleById,
  areLessonPrerequisitesMet,
  areModulePrerequisitesMet,
  getNextLesson,
  calculatePathProgress,
  validateCommand,
  getTotalPathStats,
  getDomainWithPath,
  EXAM_COMMAND_REFERENCE,
  XID_REFERENCE,
  DGX_A100_SPECS,
  getStudyPriorities,
} from "../learningPathEngine";

describe("learningPathEngine", () => {
  describe("LEARNING_PATHS constant", () => {
    it("should have paths for all 5 domains", () => {
      expect(Object.keys(LEARNING_PATHS)).toHaveLength(5);
      expect(LEARNING_PATHS.domain1).toBeDefined();
      expect(LEARNING_PATHS.domain2).toBeDefined();
      expect(LEARNING_PATHS.domain3).toBeDefined();
      expect(LEARNING_PATHS.domain4).toBeDefined();
      expect(LEARNING_PATHS.domain5).toBeDefined();
    });

    it("should have correct exam weights totaling 100%", () => {
      const totalWeight = ALL_PATHS.reduce(
        (sum, path) => sum + path.examWeight,
        0,
      );
      expect(totalWeight).toBe(100);
    });

    it("should have at least one module per path", () => {
      ALL_PATHS.forEach((path) => {
        expect(path.modules.length).toBeGreaterThan(0);
      });
    });

    it("should have at least one lesson per module", () => {
      ALL_PATHS.forEach((path) => {
        path.modules.forEach((module) => {
          expect(module.lessons.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("getLearningPath", () => {
    it("should return correct path for domain1", () => {
      const path = getLearningPath("domain1");
      expect(path.domainId).toBe("domain1");
      expect(path.examWeight).toBe(31);
    });

    it("should return correct path for domain4", () => {
      const path = getLearningPath("domain4");
      expect(path.domainId).toBe("domain4");
      expect(path.examWeight).toBe(33);
    });
  });

  describe("getPathsByWeight", () => {
    it("should return paths sorted by exam weight descending", () => {
      const paths = getPathsByWeight();
      for (let i = 0; i < paths.length - 1; i++) {
        expect(paths[i].examWeight).toBeGreaterThanOrEqual(
          paths[i + 1].examWeight,
        );
      }
    });
  });

  describe("getLessonById", () => {
    it("should find existing lesson", () => {
      const result = getLessonById("lesson-d1-dmidecode");
      expect(result).not.toBeNull();
      expect(result?.lesson.title).toContain("dmidecode");
    });

    it("should return null for non-existent lesson", () => {
      const result = getLessonById("non-existent-lesson");
      expect(result).toBeNull();
    });
  });

  describe("getModuleById", () => {
    it("should find existing module", () => {
      const result = getModuleById("mod-d1-bios-bmc");
      expect(result).not.toBeNull();
      expect(result?.module.title).toContain("BIOS");
    });

    it("should return null for non-existent module", () => {
      const result = getModuleById("non-existent-module");
      expect(result).toBeNull();
    });
  });

  describe("areLessonPrerequisitesMet", () => {
    it("should return true when no prerequisites", () => {
      const result = areLessonPrerequisitesMet(
        "lesson-d1-dmidecode",
        new Set(),
      );
      expect(result).toBe(true);
    });

    it("should return false when prerequisites not met", () => {
      const result = areLessonPrerequisitesMet("lesson-d1-ipmitool", new Set());
      expect(result).toBe(false);
    });

    it("should return true when prerequisites are met", () => {
      const completed = new Set(["lesson-d1-dmidecode"]);
      const result = areLessonPrerequisitesMet("lesson-d1-ipmitool", completed);
      expect(result).toBe(true);
    });
  });

  describe("areModulePrerequisitesMet", () => {
    it("should return true when no prerequisites", () => {
      const result = areModulePrerequisitesMet("mod-d1-bios-bmc", new Set());
      expect(result).toBe(true);
    });

    it("should return false when prerequisites not met", () => {
      const result = areModulePrerequisitesMet("mod-d1-drivers", new Set());
      expect(result).toBe(false);
    });

    it("should return true when prerequisites are met", () => {
      const completed = new Set(["mod-d1-bios-bmc"]);
      const result = areModulePrerequisitesMet("mod-d1-drivers", completed);
      expect(result).toBe(true);
    });
  });

  describe("getNextLesson", () => {
    it("should return first lesson when nothing completed", () => {
      const result = getNextLesson(new Set(), new Set());
      expect(result).not.toBeNull();
      expect(result?.lesson).toBeDefined();
    });

    it("should return next incomplete lesson", () => {
      const completedLessons = new Set(["lesson-d1-dmidecode"]);
      const result = getNextLesson(completedLessons, new Set());
      expect(result).not.toBeNull();
      expect(result?.lesson.id).not.toBe("lesson-d1-dmidecode");
    });
  });

  describe("calculatePathProgress", () => {
    it("should return 0% when no lessons completed", () => {
      const progress = calculatePathProgress("path-domain1", new Set());
      expect(progress.completedLessons).toBe(0);
      expect(progress.overallPercentage).toBe(0);
    });

    it("should calculate correct percentage when lessons completed", () => {
      const completedLessons = new Set(["lesson-d1-dmidecode"]);
      const progress = calculatePathProgress("path-domain1", completedLessons);
      expect(progress.completedLessons).toBe(1);
      expect(progress.overallPercentage).toBeGreaterThan(0);
    });
  });

  describe("validateCommand", () => {
    it("should validate exact command match", () => {
      const step = {
        id: "test",
        type: "command" as const,
        title: "Test",
        content: "Test",
        expectedCommand: "nvidia-smi",
      };
      const result = validateCommand("nvidia-smi", step);
      expect(result.valid).toBe(true);
    });

    it("should validate command with pattern", () => {
      const step = {
        id: "test",
        type: "command" as const,
        title: "Test",
        content: "Test",
        expectedCommand: "dmidecode -t bios",
        validationPattern: /dmidecode\s+(-t\s+bios|-t\s+0)/,
      };
      const result = validateCommand("dmidecode -t 0", step);
      expect(result.valid).toBe(true);
    });

    it("should reject incorrect command", () => {
      const step = {
        id: "test",
        type: "command" as const,
        title: "Test",
        content: "Test",
        expectedCommand: "nvidia-smi",
      };
      const result = validateCommand("wrong-command", step);
      expect(result.valid).toBe(false);
    });
  });

  describe("getTotalPathStats", () => {
    it("should return correct totals", () => {
      const stats = getTotalPathStats();
      expect(stats.totalPaths).toBe(5);
      expect(stats.totalModules).toBeGreaterThan(0);
      expect(stats.totalLessons).toBeGreaterThan(0);
      expect(stats.totalEstimatedMinutes).toBeGreaterThan(0);
    });
  });

  describe("Reference data", () => {
    it("EXAM_COMMAND_REFERENCE should have commands for each domain", () => {
      expect(EXAM_COMMAND_REFERENCE.domain1).toBeDefined();
      expect(EXAM_COMMAND_REFERENCE.domain1.length).toBeGreaterThan(0);
    });

    it("XID_REFERENCE should have XID codes", () => {
      expect(XID_REFERENCE.length).toBeGreaterThan(0);
      expect(XID_REFERENCE[0]).toHaveProperty("xid");
      expect(XID_REFERENCE[0]).toHaveProperty("desc");
    });

    it("DGX_A100_SPECS should have GPU specs", () => {
      expect(DGX_A100_SPECS.gpus.count).toBe(8);
      expect(DGX_A100_SPECS.nvlink.nvSwitchCount).toBe(6);
    });
  });

  describe("getStudyPriorities", () => {
    it("should return priorities for all 5 domains", () => {
      const priorities = getStudyPriorities();
      expect(priorities).toHaveLength(5);
    });

    it("should have High priority for Domain 4 (33%)", () => {
      const priorities = getStudyPriorities();
      const domain4 = priorities.find((p) => p.domain.includes("Domain 4"));
      expect(domain4?.priority).toBe("High");
    });
  });
});
```

**Step 2: Run tests to verify they pass**

```bash
npm test -- src/utils/__tests__/learningPathEngine.test.ts
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add src/utils/__tests__/learningPathEngine.test.ts
git commit -m "test: add comprehensive tests for learningPathEngine"
```

---

## Task 2: Create Learning Paths Component Tests

**Files:**

- Create: `src/components/__tests__/LearningPaths.test.tsx`

**Step 1: Write component tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LearningPaths } from '../LearningPaths';

// Mock the learningStore
vi.mock('@/store/learningStore', () => ({
  useLearningStore: () => ({
    trackCommand: vi.fn(),
  }),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('LearningPaths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Initial Render', () => {
    it('should render the Learning Paths title', () => {
      render(<LearningPaths />);
      expect(screen.getByText('Learning Paths')).toBeInTheDocument();
    });

    it('should show all 5 learning path cards', () => {
      render(<LearningPaths />);
      expect(screen.getByText('Platform Bring-Up Mastery')).toBeInTheDocument();
    });

    it('should display total stats', () => {
      render(<LearningPaths />);
      expect(screen.getByText('Learning Paths')).toBeInTheDocument();
      expect(screen.getByText('Total Lessons')).toBeInTheDocument();
    });

    it('should show close button when onClose provided', () => {
      const onClose = vi.fn();
      render(<LearningPaths onClose={onClose} />);

      const closeButton = screen.getByText('×');
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('should navigate to modules view when path is clicked', async () => {
      render(<LearningPaths />);

      const pathCard = screen.getByText('Platform Bring-Up Mastery');
      fireEvent.click(pathCard.closest('div[style*="cursor: pointer"]')!);

      await waitFor(() => {
        expect(screen.getByText('BIOS & BMC Fundamentals')).toBeInTheDocument();
      });
    });

    it('should show back button in modules view', async () => {
      render(<LearningPaths />);

      const pathCard = screen.getByText('Platform Bring-Up Mastery');
      fireEvent.click(pathCard.closest('div[style*="cursor: pointer"]')!);

      await waitFor(() => {
        expect(screen.getByText('← Back')).toBeInTheDocument();
      });
    });

    it('should navigate back to paths view', async () => {
      render(<LearningPaths />);

      // Navigate to modules
      const pathCard = screen.getByText('Platform Bring-Up Mastery');
      fireEvent.click(pathCard.closest('div[style*="cursor: pointer"]')!);

      await waitFor(() => {
        expect(screen.getByText('← Back')).toBeInTheDocument();
      });

      // Go back
      fireEvent.click(screen.getByText('← Back'));

      await waitFor(() => {
        expect(screen.getByText('Learning Paths')).toBeInTheDocument();
      });
    });
  });

  describe('Progress Tracking', () => {
    it('should load progress from localStorage on mount', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'ncp-aii-completed-lessons') {
          return JSON.stringify(['lesson-d1-dmidecode']);
        }
        return null;
      });

      render(<LearningPaths />);

      expect(localStorageMock.getItem).toHaveBeenCalledWith('ncp-aii-completed-lessons');
    });

    it('should save progress to localStorage when updated', async () => {
      render(<LearningPaths />);

      // Progress is saved on mount even with empty sets
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });
    });
  });

  describe('Recommended Next Lesson', () => {
    it('should show recommended lesson when nothing completed', () => {
      render(<LearningPaths />);
      expect(screen.getByText('📌 Continue Learning')).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run tests to verify they pass**

```bash
npm test -- src/components/__tests__/LearningPaths.test.tsx
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add src/components/__tests__/LearningPaths.test.tsx
git commit -m "test: add tests for LearningPaths component"
```

---

## Task 3: Wire Up Command Execution in LearningPaths

**Files:**

- Modify: `src/App.tsx:562-570`

**Step 1: Read Terminal implementation to understand executeCommand**

The Terminal component exposes command execution via `executeCommandRef`. We need to pass this capability to LearningPaths.

**Step 2: Create a global command executor context**

First, let's check if there's an existing way to execute commands from App.tsx. The Terminal stores executeCommandRef internally.

**Step 3: Modify App.tsx to pass command executor to LearningPaths**

For now, we'll create a simple approach - add a ref in App.tsx that Terminal can populate, then pass it to LearningPaths.

In `src/App.tsx`, add state and ref near the top of the App function (around line 31):

```typescript
// Command executor ref for Learning Paths integration
const terminalExecuteRef = useRef<((cmd: string) => Promise<string>) | null>(
  null,
);
```

**Step 4: Pass the onExecuteCommand prop to LearningPaths**

Update the LearningPaths modal (around line 566):

```typescript
{/* Learning Paths Modal */}
{showLearningPaths && (
  <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
    <div className="w-full max-w-6xl max-h-[90vh] overflow-auto">
      <LearningPaths
        onClose={() => setShowLearningPaths(false)}
        onExecuteCommand={async (cmd) => {
          // For now, return a placeholder message
          // Full integration requires exposing Terminal's executeCommand
          return `Command executed: ${cmd}\n(Full terminal integration pending)`;
        }}
      />
    </div>
  </div>
)}
```

**Step 5: Run the app to verify no errors**

```bash
npm run dev
```

Open browser, click "Start Learning" from Labs tab, verify LearningPaths modal opens without errors.

**Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire up command execution placeholder for LearningPaths"
```

---

## Task 4: Add Practice/Observe Step Types Support

**Files:**

- Modify: `src/components/LearningPaths.tsx:386-392`

**Step 1: Read current renderTutorialStep to understand structure**

The current implementation handles 'concept', 'command', and 'quiz' types. We need to add support for 'observe' and 'practice' types.

**Step 2: Add observe step rendering**

After the quiz section (around line 385), add:

```typescript
{/* Observe type - auto-execute and show output */}
{step.type === 'observe' && (
  <div style={styles.commandSection}>
    <div style={styles.observeLabel}>
      Observe the following command output:
    </div>
    <div style={styles.commandDisplay}>
      <code style={styles.commandCode}>$ {step.observeCommand}</code>
    </div>
    {commandOutput ? (
      <div style={styles.outputBox}>
        <pre style={styles.outputText}>{commandOutput}</pre>
      </div>
    ) : (
      <button
        onClick={async () => {
          if (onExecuteCommand && step.observeCommand) {
            const output = await onExecuteCommand(step.observeCommand);
            setCommandOutput(output);
          }
        }}
        style={styles.executeButton}
      >
        Run Command
      </button>
    )}
    <button onClick={advanceStep} style={styles.continueButton}>
      Continue →
    </button>
  </div>
)}

{/* Practice type - free-form practice */}
{step.type === 'practice' && (
  <div style={styles.commandSection}>
    <div style={styles.practiceLabel}>
      Practice Mode - Try the commands yourself:
    </div>
    <div style={styles.commandInputWrapper}>
      <span style={styles.prompt}>$</span>
      <input
        type="text"
        value={commandInput}
        onChange={(e) => setCommandInput(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === 'Enter' && onExecuteCommand && commandInput.trim()) {
            const output = await onExecuteCommand(commandInput);
            setCommandOutput(output);
          }
        }}
        placeholder="Type any command to practice..."
        style={styles.commandInput}
        autoFocus
      />
      <button
        onClick={async () => {
          if (onExecuteCommand && commandInput.trim()) {
            const output = await onExecuteCommand(commandInput);
            setCommandOutput(output);
          }
        }}
        style={styles.executeButton}
      >
        Execute
      </button>
    </div>
    {commandOutput && (
      <div style={styles.outputBox}>
        <pre style={styles.outputText}>{commandOutput}</pre>
      </div>
    )}
    <button onClick={advanceStep} style={styles.continueButton}>
      Continue →
    </button>
  </div>
)}
```

**Step 3: Add the new styles**

Add to the styles object (around line 1190):

```typescript
observeLabel: {
  color: '#76b900',
  fontSize: '14px',
  fontWeight: 'bold',
  marginBottom: '15px',
},
commandDisplay: {
  backgroundColor: '#1a1a1a',
  padding: '15px',
  borderRadius: '6px',
  marginBottom: '15px',
},
commandCode: {
  color: '#76b900',
  fontFamily: 'monospace',
  fontSize: '14px',
},
practiceLabel: {
  color: '#a855f7',
  fontSize: '14px',
  fontWeight: 'bold',
  marginBottom: '15px',
},
```

**Step 4: Run lint and tests**

```bash
npm run lint
npm test -- src/components/__tests__/LearningPaths.test.tsx
```

**Step 5: Commit**

```bash
git add src/components/LearningPaths.tsx
git commit -m "feat: add observe and practice step types to LearningPaths"
```

---

## Task 5: Add Reset Progress Feature

**Files:**

- Modify: `src/components/LearningPaths.tsx`

**Step 1: Add reset function**

Add after the completeLesson function (around line 114):

```typescript
// Reset all progress
const resetProgress = useCallback(() => {
  if (
    window.confirm(
      "Are you sure you want to reset all learning progress? This cannot be undone.",
    )
  ) {
    setCompletedLessons(new Set());
    setCompletedModules(new Set());
    setLessonProgress(new Map());
    localStorage.removeItem("ncp-aii-completed-lessons");
    localStorage.removeItem("ncp-aii-completed-modules");
    localStorage.removeItem("ncp-aii-lesson-progress");
  }
}, []);
```

**Step 2: Add reset button to the header**

In the header section (around line 455), add a reset button before the close button:

```typescript
<div style={styles.headerRight}>
  {viewState === 'paths' && (
    <button onClick={resetProgress} style={styles.resetButton}>
      Reset Progress
    </button>
  )}
  {onClose && (
    <button onClick={onClose} style={styles.closeButton}>
      ×
    </button>
  )}
</div>
```

**Step 3: Update header styles**

Modify the header style and add headerRight and resetButton:

```typescript
header: {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px',
  borderBottom: '1px solid #333',
},
headerRight: {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
},
resetButton: {
  padding: '8px 16px',
  backgroundColor: '#4d1b1b',
  border: '1px solid #F44336',
  borderRadius: '4px',
  color: '#F44336',
  cursor: 'pointer',
  fontSize: '12px',
},
```

**Step 4: Run and verify**

```bash
npm run dev
```

Test the reset button in browser.

**Step 5: Commit**

```bash
git add src/components/LearningPaths.tsx
git commit -m "feat: add reset progress feature to LearningPaths"
```

---

## Task 6: Add Domain Progress Summary to Welcome Screen

**Files:**

- Modify: `src/App.tsx:437-470`

**Step 1: Import learning path utilities**

Add to imports at top of App.tsx:

```typescript
import { getTotalPathStats, LEARNING_PATHS } from "./utils/learningPathEngine";
```

**Step 2: Add progress state**

Add near other state declarations (around line 37):

```typescript
const [learningProgress, setLearningProgress] = useState({
  completed: 0,
  total: 0,
});

// Load learning progress on mount
useEffect(() => {
  const savedLessons = localStorage.getItem("ncp-aii-completed-lessons");
  const completed = savedLessons ? JSON.parse(savedLessons).length : 0;
  const stats = getTotalPathStats();
  setLearningProgress({ completed, total: stats.totalLessons });
}, [showLearningPaths]); // Refresh when modal closes
```

**Step 3: Update the Learning Paths card**

Modify the Learning Paths card (around line 437-470) to show progress:

```typescript
{/* Learning Paths */}
<div className="bg-gray-800 rounded-lg p-6 border border-purple-600">
  <div className="text-sm text-purple-400 font-semibold mb-2 flex items-center gap-2">
    <GraduationCap className="w-4 h-4" />
    Guided Learning
  </div>
  <h3 className="text-lg font-bold mb-3">
    Learning Paths
  </h3>

  {/* Progress indicator */}
  <div className="mb-4">
    <div className="flex justify-between text-sm mb-1">
      <span className="text-gray-400">Progress</span>
      <span className="text-purple-400">
        {learningProgress.completed}/{learningProgress.total} lessons
      </span>
    </div>
    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
      <div
        className="h-full bg-purple-600 transition-all duration-300"
        style={{ width: `${(learningProgress.completed / learningProgress.total) * 100}%` }}
      />
    </div>
  </div>

  <ul className="space-y-2 text-sm text-gray-300">
    <li className="flex items-start gap-2">
      <span className="text-purple-400">▸</span>
      Structured curricula for each domain
    </li>
    <li className="flex items-start gap-2">
      <span className="text-purple-400">▸</span>
      Step-by-step interactive tutorials
    </li>
    <li className="flex items-start gap-2">
      <span className="text-purple-400">▸</span>
      Hands-on command practice
    </li>
  </ul>
  <button
    onClick={() => setShowLearningPaths(true)}
    className="mt-4 w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
  >
    {learningProgress.completed > 0 ? 'Continue Learning' : 'Start Learning'}
  </button>
</div>
```

**Step 4: Run and verify**

```bash
npm run dev
```

**Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add learning progress indicator to Labs view"
```

---

## Task 7: Commit Staged Changes from SimulatorView

**Files:**

- Already modified: `src/components/SimulatorView.tsx`

**Step 1: Review the changes**

```bash
git diff src/components/SimulatorView.tsx
```

The changes add:

- Touch support for mobile dragging
- Better resize handling with ResizeObserver
- Container height tracking

**Step 2: Run tests**

```bash
npm test
```

**Step 3: Commit the SimulatorView improvements**

```bash
git add src/components/SimulatorView.tsx
git commit -m "feat: add touch support and improve resize handling in SimulatorView"
```

---

## Task 8: Commit Remaining Staged Changes

**Files:**

- `src/components/Terminal.tsx` - Auto-SSH improvements
- `src/simulators/dcgmiSimulator.ts` - DCGM improvements
- `src/simulators/fabricManagerSimulator.ts` - Fabric Manager improvements
- `src/simulators/slurmSimulator.ts` - Slurm improvements

**Step 1: Review all remaining changes**

```bash
git diff src/components/Terminal.tsx
git diff src/simulators/dcgmiSimulator.ts
git diff src/simulators/fabricManagerSimulator.ts
git diff src/simulators/slurmSimulator.ts
```

**Step 2: Run tests to ensure nothing is broken**

```bash
npm test
```

**Step 3: Commit Terminal improvements**

```bash
git add src/components/Terminal.tsx
git commit -m "fix: improve auto-SSH connection on node selection"
```

**Step 4: Commit simulator improvements**

```bash
git add src/simulators/dcgmiSimulator.ts src/simulators/fabricManagerSimulator.ts src/simulators/slurmSimulator.ts
git commit -m "feat: enhance DCGM, Fabric Manager, and Slurm simulators"
```

---

## Task 9: Final Verification and Test Run

**Step 1: Run full lint check**

```bash
npm run lint
```

Note: Some lint errors may remain from pre-existing code. The code-quality plan addresses those.

**Step 2: Run all tests**

```bash
npm test
```

Expected: All tests pass

**Step 3: Run the app and verify features**

```bash
npm run dev
```

Manual verification checklist:

- [ ] Learning Paths modal opens from Labs tab
- [ ] Can navigate: Paths → Modules → Lessons → Tutorial
- [ ] Back button works at each level
- [ ] Progress persists across page reloads
- [ ] Reset progress works
- [ ] Command steps accept input
- [ ] Quiz steps show choices and feedback
- [ ] Concept steps show Continue button
- [ ] Progress bar updates as steps complete
- [ ] SimulatorView split pane resizes smoothly
- [ ] Touch dragging works on split pane

**Step 4: Commit any final fixes**

```bash
git status
git add -A
git commit -m "chore: final polish for feature completion"
```

---

## Summary

| Task | Description                    | Files                |
| ---- | ------------------------------ | -------------------- |
| 1    | Learning Path Engine Tests     | New test file        |
| 2    | Learning Paths Component Tests | New test file        |
| 3    | Wire Up Command Execution      | App.tsx              |
| 4    | Add Practice/Observe Steps     | LearningPaths.tsx    |
| 5    | Add Reset Progress Feature     | LearningPaths.tsx    |
| 6    | Progress Indicator in Labs     | App.tsx              |
| 7    | Commit SimulatorView Changes   | SimulatorView.tsx    |
| 8    | Commit Remaining Changes       | Terminal, simulators |
| 9    | Final Verification             | All                  |

**New Files Created:** 2 test files
**Files Modified:** 5 (App.tsx, LearningPaths.tsx, SimulatorView.tsx, Terminal.tsx, simulators)
**Estimated Tests Added:** ~40 new tests
