# Comprehensive Codebase Analysis Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Perform a full-spectrum technical review of the NVIDIA Certification Simulator codebase, producing an actionable report with prioritized improvements.

**Architecture:** The analysis will be executed in 7 parallel analysis phases (one per dimension), followed by a synthesis phase that consolidates findings into a prioritized report. Each phase uses the code-reviewer agent focused on its specific dimension.

**Tech Stack:** TypeScript/React codebase, Vitest testing, Zustand state management, Tailwind CSS

---

## Codebase Overview

- **166 TypeScript/TSX files** across 11 directories
- **6 test directories** with existing test coverage
- **Key areas:** components, simulators, store, utils, hooks, data, types

---

### Task 1: Architecture & Design Analysis

**Files to analyze:**

- `src/App.tsx` - Main application structure
- `src/store/` - State management patterns
- `src/simulators/` - Simulator architecture
- `src/components/` - Component hierarchy
- `src/types/` - Type definitions and interfaces

**Step 1: Invoke code-reviewer agent for architecture analysis**

Prompt for agent:

```
Analyze the ARCHITECTURE & DESIGN of this codebase. Focus on:

1. Overall system architecture and component relationships
2. Separation of concerns and module boundaries
3. State management patterns and data flow (Zustand store)
4. Dependency structure and coupling between modules
5. Scalability considerations
6. Design pattern usage (appropriate vs. overengineered)

Key files to examine:
- src/App.tsx (main application)
- src/store/*.ts (state management)
- src/simulators/*.ts (simulator pattern)
- src/components/*.tsx (component hierarchy)
- src/types/*.ts (type system)

For each finding:
- **Issue**: Clear description
- **Location**: Specific files and line numbers
- **Impact**: What this affects
- **Fix**: Concrete implementation steps
- **Effort**: S (< 1 hour) / M (1-4 hours) / L (> 4 hours)

Output a structured report with Critical/High/Medium/Low priority sections.
```

**Step 2: Save output**

Save the agent's output to `docs/analysis/architecture-findings.md`

**Step 3: Commit**

```bash
git add docs/analysis/architecture-findings.md
git commit -m "docs: add architecture analysis findings"
```

---

### Task 2: Code Quality Analysis

**Files to analyze:**

- All `src/**/*.ts` and `src/**/*.tsx` files
- Focus on patterns, consistency, and maintainability

**Step 1: Invoke code-reviewer agent for code quality analysis**

Prompt for agent:

```
Analyze the CODE QUALITY of this codebase. Focus on:

1. Code consistency and style adherence
2. DRY violations and code duplication
3. Function/component complexity (cognitive load)
4. Naming conventions and readability
5. Type safety and TypeScript usage
6. Error handling patterns
7. Dead code and unused exports

Examine all directories:
- src/components/ (React components)
- src/simulators/ (simulator implementations)
- src/utils/ (utility functions)
- src/hooks/ (custom hooks)
- src/store/ (state management)

For each finding:
- **Issue**: Clear description
- **Location**: Specific files and line numbers
- **Impact**: What this affects
- **Fix**: Concrete implementation steps
- **Effort**: S/M/L estimate

Look specifically for:
- Functions over 50 lines
- Components over 300 lines
- Duplicated logic across files
- Inconsistent naming patterns
- Missing or incorrect TypeScript types
- try/catch blocks without proper error handling

Output a structured report with Critical/High/Medium/Low priority sections.
```

**Step 2: Save output**

Save the agent's output to `docs/analysis/code-quality-findings.md`

**Step 3: Commit**

```bash
git add docs/analysis/code-quality-findings.md
git commit -m "docs: add code quality analysis findings"
```

---

### Task 3: Security Analysis

**Files to analyze:**

- All input handling code
- Any API or external data processing
- Authentication/authorization patterns
- Dependencies in `package.json`

**Step 1: Invoke code-reviewer agent for security analysis**

Prompt for agent:

```
Analyze the SECURITY of this codebase. Focus on:

1. Input validation and sanitization
2. XSS, injection, and OWASP Top 10 vulnerabilities
3. Sensitive data exposure risks
4. Authentication/authorization patterns (if any)
5. Dependency vulnerabilities
6. Secrets management
7. dangerouslySetInnerHTML usage
8. eval() or Function() usage
9. URL handling and redirects

Key areas to examine:
- src/components/ (user input handling)
- src/simulators/ (command parsing and execution)
- src/utils/commandParser.ts (input processing)
- package.json (dependency audit)

For each finding:
- **Issue**: Clear description with CVE reference if applicable
- **Location**: Specific files and line numbers
- **Impact**: Security risk level and potential exploit
- **Fix**: Concrete remediation steps
- **Effort**: S/M/L estimate

Output a structured report with Critical/High/Medium/Low priority sections.
```

**Step 2: Save output**

Save the agent's output to `docs/analysis/security-findings.md`

**Step 3: Commit**

```bash
git add docs/analysis/security-findings.md
git commit -m "docs: add security analysis findings"
```

---

### Task 4: Performance Analysis

**Files to analyze:**

- React components for render optimization
- State management for unnecessary updates
- Large computations and memoization
- Bundle and asset concerns

**Step 1: Invoke code-reviewer agent for performance analysis**

Prompt for agent:

```
Analyze the PERFORMANCE of this codebase. Focus on:

1. Render performance and unnecessary re-renders
2. Memory leaks and cleanup patterns (useEffect cleanup)
3. Bundle size concerns (large imports, tree-shaking)
4. Expensive computations without memoization
5. Network request patterns
6. Asset optimization
7. State update batching
8. Virtual list usage for large datasets

Key areas to examine:
- src/components/ (React render patterns)
- src/hooks/ (custom hook dependencies)
- src/store/ (Zustand selectors and subscriptions)
- src/App.tsx (top-level rendering)
- Large components like LearningPaths.tsx, Terminal.tsx

Look specifically for:
- Missing useMemo/useCallback where expensive
- useEffect without proper dependency arrays
- useEffect without cleanup for timers/subscriptions
- Components re-rendering on every parent update
- Large inline objects/arrays in JSX
- Unoptimized images or assets

For each finding:
- **Issue**: Clear description
- **Location**: Specific files and line numbers
- **Impact**: Performance cost (render time, memory, bundle size)
- **Fix**: Concrete optimization steps
- **Effort**: S/M/L estimate

Output a structured report with Critical/High/Medium/Low priority sections.
```

**Step 2: Save output**

Save the agent's output to `docs/analysis/performance-findings.md`

**Step 3: Commit**

```bash
git add docs/analysis/performance-findings.md
git commit -m "docs: add performance analysis findings"
```

---

### Task 5: Testing Analysis

**Files to analyze:**

- All `__tests__/` directories
- Test coverage and quality
- Missing test categories

**Step 1: Invoke code-reviewer agent for testing analysis**

Prompt for agent:

```
Analyze the TESTING of this codebase. Focus on:

1. Test coverage gaps (files without tests, untested branches)
2. Test quality (weak assertions, false positives)
3. Missing test categories (unit, integration, e2e)
4. Test maintainability and flakiness risks
5. Mocking patterns and test isolation
6. Test organization and naming

Examine all test directories:
- src/__tests__/
- src/components/__tests__/
- src/hooks/__tests__/
- src/simulators/__tests__/
- src/store/__tests__/
- src/utils/__tests__/
- src/tests/soundness/
- src/tests/generator/

Compare against source files:
- src/components/*.tsx
- src/simulators/*.ts
- src/utils/*.ts
- src/hooks/*.ts
- src/store/*.ts

Look specifically for:
- Source files without corresponding test files
- Tests using toBeDefined() without further assertions
- Tests with commented-out assertions
- Mock implementations that don't match real behavior
- Tests that test implementation instead of behavior
- Flaky patterns (timing, random data without seeds)

For each finding:
- **Issue**: Clear description
- **Location**: Specific files and line numbers (or missing file)
- **Impact**: Risk of bugs escaping to production
- **Fix**: Concrete test to add or improve
- **Effort**: S/M/L estimate

Output a structured report with Critical/High/Medium/Low priority sections.
```

**Step 2: Save output**

Save the agent's output to `docs/analysis/testing-findings.md`

**Step 3: Commit**

```bash
git add docs/analysis/testing-findings.md
git commit -m "docs: add testing analysis findings"
```

---

### Task 6: Accessibility Analysis

**Files to analyze:**

- All React components
- Interactive elements
- Forms and inputs

**Step 1: Invoke code-reviewer agent for accessibility analysis**

Prompt for agent:

```
Analyze the ACCESSIBILITY of this codebase. Focus on:

1. WCAG 2.1 Level A and AA compliance issues
2. Keyboard navigation gaps
3. Screen reader compatibility
4. Color contrast and visual accessibility
5. Focus management
6. ARIA usage (missing, incorrect, or redundant)
7. Form labels and error messages
8. Image alt text

Examine all components:
- src/components/*.tsx

Look specifically for:
- Interactive elements without keyboard access
- onClick without onKeyDown/onKeyPress
- Missing aria-label on icon buttons
- Missing form labels or htmlFor attributes
- tabIndex misuse (positive values, missing on custom controls)
- Focus traps or lost focus after interactions
- Color-only indicators without text alternatives
- Motion/animation without prefers-reduced-motion
- Missing skip links or landmark regions

For each finding:
- **Issue**: Clear description with WCAG criterion reference
- **Location**: Specific files and line numbers
- **Impact**: Who is affected and how
- **Fix**: Concrete remediation with code example
- **Effort**: S/M/L estimate

Output a structured report with Critical/High/Medium/Low priority sections.
```

**Step 2: Save output**

Save the agent's output to `docs/analysis/accessibility-findings.md`

**Step 3: Commit**

```bash
git add docs/analysis/accessibility-findings.md
git commit -m "docs: add accessibility analysis findings"
```

---

### Task 7: Maintainability Analysis

**Files to analyze:**

- Documentation files
- Configuration files
- Build setup
- Code organization

**Step 1: Invoke code-reviewer agent for maintainability analysis**

Prompt for agent:

```
Analyze the MAINTAINABILITY of this codebase. Focus on:

1. Documentation gaps (inline comments, README, API docs)
2. Onboarding friction for new developers
3. Configuration complexity
4. Build and deployment concerns
5. Technical debt accumulation patterns
6. Code organization and discoverability
7. Dependency management

Examine:
- README.md and docs/ directory
- package.json (scripts, dependencies)
- vite.config.ts, tsconfig.json, tailwind.config.js
- .eslintrc, .prettierrc (if exist)
- src/ directory structure

Look specifically for:
- Complex functions without explanatory comments
- Missing or outdated README sections
- Undocumented environment variables
- Scripts without descriptions
- Circular dependencies
- Inconsistent file/folder organization
- Outdated dependencies
- Missing contribution guidelines
- No changelog or version tracking

For each finding:
- **Issue**: Clear description
- **Location**: Specific files or missing documentation
- **Impact**: Developer productivity cost
- **Fix**: Concrete documentation or refactoring to add
- **Effort**: S/M/L estimate

Output a structured report with Critical/High/Medium/Low priority sections.
```

**Step 2: Save output**

Save the agent's output to `docs/analysis/maintainability-findings.md`

**Step 3: Commit**

```bash
git add docs/analysis/maintainability-findings.md
git commit -m "docs: add maintainability analysis findings"
```

---

### Task 8: Synthesize Final Report

**Files to read:**

- `docs/analysis/architecture-findings.md`
- `docs/analysis/code-quality-findings.md`
- `docs/analysis/security-findings.md`
- `docs/analysis/performance-findings.md`
- `docs/analysis/testing-findings.md`
- `docs/analysis/accessibility-findings.md`
- `docs/analysis/maintainability-findings.md`

**Step 1: Create consolidated report**

Read all 7 analysis files and synthesize into a single prioritized report.

**Step 2: Write final report**

Create `docs/analysis/COMPREHENSIVE-CODEBASE-ANALYSIS.md` with:

```markdown
# Comprehensive Codebase Analysis Report

**Project:** NVIDIA Certification Simulator
**Date:** 2026-02-02
**Analyzed by:** Claude Code Review Agent

---

## Executive Summary

[3-5 sentence overview of codebase health]

### Top 3 Strengths

1. [Strength]
2. [Strength]
3. [Strength]

### Top 3 Critical Concerns

1. [Concern]
2. [Concern]
3. [Concern]

---

## Critical Issues (Fix Immediately)

[Consolidated critical issues from all 7 dimensions, deduplicated]

---

## High Priority Issues (Fix Soon)

[Consolidated high priority issues]

---

## Medium Priority Issues (Plan to Address)

[Consolidated medium priority issues]

---

## Low Priority / Nice-to-Have

[Consolidated low priority issues]

---

## Quick Wins

[High-impact, low-effort improvements that can be done in < 30 minutes each]

---

## Architectural Recommendations

[Strategic improvements with migration paths]

---

## Metrics Summary

| Dimension       | Critical | High | Medium | Low |
| --------------- | -------- | ---- | ------ | --- |
| Architecture    | X        | X    | X      | X   |
| Code Quality    | X        | X    | X      | X   |
| Security        | X        | X    | X      | X   |
| Performance     | X        | X    | X      | X   |
| Testing         | X        | X    | X      | X   |
| Accessibility   | X        | X    | X      | X   |
| Maintainability | X        | X    | X      | X   |
| **Total**       | X        | X    | X      | X   |

---

## Appendix: Individual Analysis Reports

- [Architecture Analysis](./architecture-findings.md)
- [Code Quality Analysis](./code-quality-findings.md)
- [Security Analysis](./security-findings.md)
- [Performance Analysis](./performance-findings.md)
- [Testing Analysis](./testing-findings.md)
- [Accessibility Analysis](./accessibility-findings.md)
- [Maintainability Analysis](./maintainability-findings.md)
```

**Step 3: Commit final report**

```bash
git add docs/analysis/COMPREHENSIVE-CODEBASE-ANALYSIS.md
git commit -m "docs: add comprehensive codebase analysis report"
```

---

## Execution Notes

- Tasks 1-7 can be run in parallel (use `superpowers:dispatching-parallel-agents`)
- Each task uses the `feature-dev:code-reviewer` agent
- Task 8 must wait for Tasks 1-7 to complete
- Create `docs/analysis/` directory before starting

**Pre-flight command:**

```bash
mkdir -p docs/analysis
```

---

## Estimated Duration

| Task                 | Estimated Time |
| -------------------- | -------------- |
| Tasks 1-7 (parallel) | 10-15 minutes  |
| Task 8 (synthesis)   | 5-10 minutes   |
| **Total**            | 15-25 minutes  |
