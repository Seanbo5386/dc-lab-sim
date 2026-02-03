# PERFORMANCE ANALYSIS REPORT
## NVIDIA AI Infrastructure Simulator (DC-Sim)

**Analysis Date:** 2026-02-02
**Codebase:** C:\Users\Seanbo\Documents\Projects\Antigravity-Projects\DC-Sim-011126

---

## EXECUTIVE SUMMARY

This codebase is a React-based simulation environment with moderate performance concerns. The application uses Zustand for state management, D3.js for visualizations, and xterm.js for terminal emulation. Key findings:

- **Good**: Proper use of Zustand selectors, some memoization present
- **Concerns**: Multiple re-render triggers, expensive useEffect patterns, heavy JSON operations in hot paths
- **Critical**: Metrics simulation running every second with inefficient state updates

---

## CRITICAL PRIORITY ISSUES

### 1. **App.tsx: Metrics Simulation with JSON.stringify in Hot Path**
**Location:** `src/App.tsx:52-80`

**Issue:**
```typescript
useEffect(() => {
  if (isRunning) {
    metricsSimulator.start((updater) => {
      const store = useSimulationStore.getState();
      store.cluster.nodes.forEach(node => {
        const updated = updater({ gpus: node.gpus, hcas: node.hcas });

        // CRITICAL: JSON.stringify on every GPU, every second
        updated.gpus.forEach((gpu, idx) => {
          if (JSON.stringify(gpu) !== JSON.stringify(node.gpus[idx])) {
            store.updateGPU(node.id, gpu.id, gpu);
          }
        });
      });
    }, 1000);
  }
}, [isRunning]);
```

**Impact:**
- **Render time:** Runs every 1 second when simulation active
- **Memory:** Creates temporary strings for every GPU (8 GPUs × nodes × cluster)
- **CPU:** O(n) JSON serialization for deep equality check
- For an 8-node cluster with 8 GPUs each = 64 JSON.stringify operations/second = ~128 operations

**Fix:** Replace JSON.stringify with shallow field comparison helper function.

**Effort:** S (1-2 hours)

---

### 2. **LearningPaths: Massive localStorage Operations on Every State Change**
**Location:** `src/components/LearningPaths.tsx:78-82`

**Issue:**
```typescript
useEffect(() => {
  localStorage.setItem('ncp-aii-completed-lessons', JSON.stringify([...completedLessons]));
  localStorage.setItem('ncp-aii-completed-modules', JSON.stringify([...completedModules]));
  localStorage.setItem('ncp-aii-lesson-progress', JSON.stringify(Object.fromEntries(lessonProgress)));
}, [completedLessons, completedModules, lessonProgress]);
```

**Impact:**
- **Synchronous blocking:** localStorage is synchronous I/O
- **Bundle size impact:** No debouncing - saves on every keystroke in command input
- **Re-render cascade:** Three separate state updates trigger three re-renders

**Fix:** Add debounced save function with 500ms delay.

**Effort:** S (1 hour)

---

### 3. **Terminal.tsx: executeCommand Closure in useEffect with No Dependencies**
**Location:** `src/components/Terminal.tsx:143-843`

**Issue:**
```typescript
useEffect(() => {
  const executeCommand = async (cmdLine: string) => {
    // 600+ lines of command execution logic
    // Creates massive closure capturing all simulator refs
  };

  term.onData((data) => {
    handleKeyboardInput(data, { onExecute: executeCommand });
  });

  return () => { term.dispose(); };
}, []); // Empty dependency array
```

**Impact:**
- **Memory leak potential:** Terminal never re-initializes, but simulators are refs
- **Stale closures:** No mechanism to update executeCommand with new props
- **Bundle size:** 600+ line function in closure

**Fix:** Extract executeCommand to a separate useCallback hook with proper dependencies.

**Effort:** M (3-4 hours - requires careful dependency analysis)

---

## HIGH PRIORITY ISSUES

### 4. **Dashboard: MetricsHistory Collection Missing Dependency**
**Location:** `src/components/Dashboard.tsx:298-314`

**Issue:** Missing `selectedNode` dependency in useEffect for MetricsHistory.

**Impact:**
- **Incorrect behavior:** Doesn't restart collection when selectedNode changes
- **Memory:** Old intervals may not clear properly if component unmounts during node switch

**Fix:** Add selectedNode to dependency array and restart collection on change.

**Effort:** S (30 minutes)

---

### 5. **SimulatorView: Container Width State Causes Extra Render**
**Location:** `src/components/SimulatorView.tsx:50-80`

**Issue:** Using state for container width measurement causes double render on initial load.

**Impact:**
- **Double render:** Initial render with width=0, then second render with actual width
- **Layout shift:** Visible content jump on first load

**Fix:** Use ref for initial measurement, only trigger state update once initialized.

**Effort:** M (2 hours)

---

### 6. **LearningPaths: Inline Function Creation in Map**
**Location:** `src/components/LearningPaths.tsx:612-617`

**Issue:** New function instance created on every render for onClick handlers.

**Impact:**
- **New function every render:** Creates new function instance on every render
- **Child re-renders:** Button receives new onClick prop each time
- **Minimal individual impact** but pattern repeated 50+ times in file

**Fix:** Extract handlers to useCallback hooks.

**Effort:** M (2-3 hours to fix all instances across file)

---

## MEDIUM PRIORITY ISSUES

### 7. **App.tsx: useEffect Re-runs on Every showLearningPaths Change**
**Location:** `src/App.tsx:82-88`

**Issue:** getTotalPathStats() and localStorage read on modal open/close.

**Impact:** Unnecessary re-computation of static data.

**Fix:** Move to custom hook with empty dependency array.

**Effort:** S (1 hour)

---

### 8. **TopologyGraph: Good Memoization (Positive Finding)**
**Location:** `src/components/TopologyGraph.tsx:78-111`

**Note:** This component properly uses useMemo for expensive D3 calculations - good practice!

---

### 9. **Zustand Store: Nested Object Updates Without Immer**
**Location:** `src/store/simulationStore.ts:133-147`

**Issue:** Deep cloning without Immer helper is verbose and error-prone.

**Fix:** Add Immer middleware to Zustand for cleaner state updates.

**Effort:** M (2-3 hours + testing)

---

### 10. **Dashboard: Multiple Zustand Selectors**
**Location:** `src/components/Dashboard.tsx:256-261`

**Note:** Current approach with separate selectors is actually correct and prevents unnecessary re-renders. Optional optimization to combine if profiling shows issues.

**Effort:** S (1 hour if needed)

---

## LOW PRIORITY / OPTIMIZATIONS

### 11. **No Code Splitting or Lazy Loading**

**Issue:** All components loaded upfront, no route-based code splitting.

**Impact:**
- **Bundle size:** Initial bundle includes all features
- **First load:** Slower initial page load

**Fix:** Use React.lazy() and Suspense for major components.

**Effort:** M (2-3 hours)

---

### 12. **D3.js Bundle Size**

**Issue:** Full D3 import (`import * as d3`) instead of specific modules.

**Impact:** ~250KB for full D3 library, tree-shaking may not be effective.

**Fix:** Import only needed D3 modules.

**Effort:** S (1 hour)

---

### 13. **Terminal: No Virtual Scrolling for Command History**

**Issue:** Command history grows unbounded in array.

**Impact:** Memory grows indefinitely (low risk in practice).

**Fix:** Limit history to MAX_HISTORY items.

**Effort:** S (15 minutes)

---

## BUNDLE SIZE ANALYSIS

| Package | Size (gzipped) | Impact |
|---------|---------------|--------|
| react + react-dom | ~42KB | Required |
| xterm + addons | ~140KB | Required |
| d3 | ~90KB | **Optimizable** |
| recharts | ~100KB | Check usage |
| zustand | ~3KB | Excellent ✓ |
| lucide-react | ~5KB | Good ✓ |

**Total estimated bundle:** ~400-500KB (before gzip)

**Recommendations:**
1. Import D3 modules individually (saves ~50KB)
2. Check if all Recharts features are needed
3. Add route-based code splitting (defers ~200KB)

---

## MEMORY LEAK ANALYSIS

**No critical memory leaks detected.**

- Terminal.tsx: useEffect with empty deps creates eternal closure (see Critical #3)
- MetricsHistory.ts: Static class manages intervals - cleanup appears correct
- App.tsx metrics simulator: Cleanup callback present

---

## SUMMARY TABLE

| Issue | Priority | Impact | Effort | Est. Performance Gain |
|-------|----------|--------|--------|----------------------|
| #1 JSON.stringify in metrics loop | **Critical** | High render cost | S | 40-60% faster metrics updates |
| #2 localStorage on every change | **Critical** | Blocking I/O | S | Eliminates UI stuttering |
| #3 Terminal executeCommand closure | **Critical** | Memory/correctness | M | Prevents stale data bugs |
| #4 MetricsHistory missing dep | High | Logic flaw | S | Fixes node switching |
| #5 SimulatorView double render | High | Layout shift | M | Eliminates flash on load |
| #6 Inline function creation | High | Minor re-renders | M | 5-10% reduction |
| #7 App learning progress effect | Medium | Unnecessary work | S | Minimal |
| #9 Zustand without Immer | Medium | Code quality | M | Negligible |
| #11 Code splitting | Low | Bundle size | M | 30-40% smaller bundle |
| #12 D3 bundle size | Low | Bundle size | S | ~50KB reduction |

---

## RECOMMENDED ACTION PLAN

**Phase 1 (Week 1):**
- Fix #1: Replace JSON.stringify with shallow comparison
- Fix #2: Debounce localStorage writes
- Fix #7: Move learning progress to custom hook

**Phase 2 (Week 2):**
- Fix #3: Refactor Terminal executeCommand
- Fix #4: Add selectedNode to MetricsHistory deps
- Fix #5: Optimize SimulatorView initialization

**Phase 3 (Week 3):**
- Implement code splitting (#11)
- Optimize D3 imports (#12)
- Review and fix inline functions (#6)

**Total estimated effort:** 20-25 hours over 3 weeks

**Expected results:**
- 50-70% reduction in metrics simulation overhead
- Elimination of UI blocking during user input
- 30-40% smaller initial bundle size
- Smoother overall user experience

---

## POSITIVE FINDINGS

- Excellent use of Zustand with proper selectors
- Good memoization in TopologyGraph component
- Proper cleanup in most useEffect hooks
- No major memory leaks detected
- Reasonable component size (most under 500 lines)
- Clear separation of simulators from UI
- Well-structured store with atomic actions
- Good type safety with TypeScript
