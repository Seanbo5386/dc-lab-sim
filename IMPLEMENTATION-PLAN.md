# Implementation Plan: UI Enhancements for DC-Sim

## Overview

This plan covers two major enhancements:
1. **Splitscreen Simulator View** - Unify Dashboard and Terminal into a side-by-side view
2. **Enhanced Documentation** - Comprehensive NCP-AII certification reference

---

## Part 1: Splitscreen Simulator View

### Current State
- `SimulatorView.tsx` already exists with a working resizable split-screen implementation
- Dashboard and Terminal are currently separate tabs in `App.tsx`
- App.tsx has 4 tabs: Dashboard, Terminal, Labs & Scenarios, Documentation

### Goal
Replace separate Dashboard/Terminal tabs with a unified "Simulator" tab that shows both side-by-side, allowing instant visual feedback when running terminal commands.

### Implementation Steps

#### Step 1.1: Update App.tsx Navigation
**File:** `src/App.tsx`

Changes:
- Replace `'dashboard' | 'terminal'` views with single `'simulator'` view
- Remove Dashboard and Terminal separate tab buttons
- Add single "Simulator" tab that uses `SimulatorView` component
- Import `SimulatorView` component

```tsx
// Change View type
type View = 'simulator' | 'labs' | 'docs';

// Update navigation to show single Simulator tab
<button onClick={() => setCurrentView('simulator')}>
  <Monitor /> Simulator
</button>
```

#### Step 1.2: Update Main Content Rendering
**File:** `src/App.tsx`

Replace:
```tsx
{currentView === 'dashboard' && <Dashboard />}
{currentView === 'terminal' && <Terminal />}
```

With:
```tsx
{currentView === 'simulator' && (
  <div className="h-full">
    <SimulatorView />
  </div>
)}
```

#### Step 1.3: Enhance SimulatorView Component
**File:** `src/components/SimulatorView.tsx`

Improvements:
- Add keyboard shortcut (e.g., Ctrl+\) to quickly swap panel positions
- Add collapse buttons to maximize either panel
- Persist split ratio to localStorage
- Add mobile responsive behavior (stack vertically on small screens)

```tsx
// Add state for collapsed panels and persisted ratio
const [leftCollapsed, setLeftCollapsed] = useState(false);
const [rightCollapsed, setRightCollapsed] = useState(false);

// Load/save ratio from localStorage
useEffect(() => {
  const saved = localStorage.getItem('simulator-split-ratio');
  if (saved) setSplitRatio(Number(saved));
}, []);

useEffect(() => {
  localStorage.setItem('simulator-split-ratio', String(splitRatio));
}, [splitRatio]);

// Add responsive breakpoint handling
const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
```

#### Step 1.4: Update Lab Workspace Integration
**File:** `src/App.tsx`

When starting a lab, ensure it opens the Simulator view:
```tsx
const handleStartLab = async (domain: string) => {
  // ... existing code ...
  if (success) {
    setCurrentView('simulator'); // Changed from 'terminal'
    setShowLabWorkspace(true);
  }
};
```

#### Step 1.5: Update Default View
**File:** `src/App.tsx`

Change initial view state:
```tsx
const [currentView, setCurrentView] = useState<View>('simulator');
```

---

## Part 2: Enhanced Documentation for NCP-AII Certification

### Current State
Documentation.tsx has 5 tabs: Architecture, Commands, Troubleshooting, Exam Alignment, State Management

### Goal
Transform the Documentation page into the most comprehensive NCP-AII certification study reference with:
- Complete XID error code reference
- Full command syntax reference with examples
- Study guides organized by exam domain
- Interactive checklists and progress tracking
- Quick reference cards

### Implementation Steps

#### Step 2.1: Add New Tab - "XID Reference"
**File:** `src/components/Documentation.tsx`

Add comprehensive XID error code documentation:

```tsx
type DocTab = 'architecture' | 'commands' | 'troubleshooting' | 'exam' | 'xid' | 'quickref' | 'state';
```

Content for XID tab:
- Full list of XID error codes (1-120+)
- Severity categorization (Critical, Warning, Informational)
- Root cause explanations
- Recommended actions for each
- Links to related troubleshooting scenarios

#### Step 2.2: Add "Quick Reference" Tab
**File:** `src/components/Documentation.tsx`

Printable quick reference cards:
- GPU Health Check Checklist
- InfiniBand Troubleshooting Flowchart
- MIG Configuration Quick Guide
- Common Command Cheat Sheet
- Thermal Management Guidelines

#### Step 2.3: Enhance Exam Alignment Tab
**File:** `src/components/Documentation.tsx`

Add for each domain:
- Detailed learning objectives
- Key concepts to memorize
- Practice questions hints
- Related lab scenarios (with links)
- Study tips and exam strategies

```tsx
const ExamDomainDetailed: React.FC<{...}> = ({...}) => (
  <div>
    <h3>Domain X: {title}</h3>
    <div>Weight: {percentage}%</div>

    {/* Learning Objectives */}
    <section>
      <h4>Learning Objectives</h4>
      <ul>{objectives.map(obj => <li key={obj}>{obj}</li>)}</ul>
    </section>

    {/* Key Concepts */}
    <section>
      <h4>Key Concepts</h4>
      {concepts.map(concept => (
        <ConceptCard key={concept.name} {...concept} />
      ))}
    </section>

    {/* Related Labs */}
    <section>
      <h4>Practice Labs</h4>
      {relatedLabs.map(lab => (
        <LabLink key={lab.id} {...lab} />
      ))}
    </section>
  </div>
);
```

#### Step 2.4: Enhance Command Reference
**File:** `src/components/Documentation.tsx`

Add for each command:
- Full syntax with all flags
- Real-world usage examples
- Common error messages and solutions
- Related commands
- Output interpretation guide

```tsx
interface CommandDocumentation {
  name: string;
  description: string;
  syntax: string;
  flags: Array<{flag: string; description: string; example?: string}>;
  examples: Array<{command: string; description: string; output?: string}>;
  commonErrors: Array<{error: string; solution: string}>;
  relatedCommands: string[];
  examTips?: string[];
}
```

#### Step 2.5: Add NCP-AII Study Guide Section
**File:** `src/components/Documentation.tsx`

Create dedicated study guide content:
- Exam format overview (question types, time limit, passing score)
- Study schedule recommendations
- Key topics by priority
- Memorization tips
- Practice exam strategies

#### Step 2.6: Add MIG Configuration Deep Dive
**File:** `src/components/Documentation.tsx`

Comprehensive MIG documentation:
- All profile IDs with compute capability
- Memory allocation explanations
- Use case recommendations
- Step-by-step configuration workflows
- Troubleshooting common MIG issues

#### Step 2.7: Add InfiniBand Troubleshooting Guide
**File:** `src/components/Documentation.tsx`

Detailed IB documentation:
- Error counter meanings
- Cable validation procedures
- Fabric discovery commands
- Performance optimization tips
- Common failure scenarios

---

## Testing Checklist

### Splitscreen View
- [ ] Simulator tab shows Dashboard + Terminal side by side
- [ ] Resize handle works smoothly
- [ ] Split ratio persists across page reloads
- [ ] Labs open in Simulator view correctly
- [ ] Mobile view stacks panels vertically
- [ ] Both panels receive proper focus/interaction

### Documentation
- [ ] All new tabs render correctly
- [ ] XID reference includes all codes
- [ ] Command examples are accurate
- [ ] Exam domain content is complete
- [ ] Quick reference is printable
- [ ] Links to labs work correctly
- [ ] Search/filter works (if implemented)
- [ ] Content is scrollable on all screen sizes

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/App.tsx` | Modify | Replace Dashboard/Terminal tabs with Simulator |
| `src/components/SimulatorView.tsx` | Enhance | Add collapse, persist, mobile support |
| `src/components/Documentation.tsx` | Major Rewrite | Add XID, QuickRef tabs; enhance all content |
| `src/data/xidErrors.ts` | Create | Comprehensive XID error database |
| `src/data/ncpAiiStudyGuide.ts` | Create | Exam study guide content |

---

## Priority Order

1. **High Priority - Splitscreen (Part 1)**
   - Step 1.1-1.2: Update App.tsx navigation (core functionality)
   - Step 1.4: Lab workspace integration (existing feature compatibility)

2. **Medium Priority - Documentation Enhancements (Part 2)**
   - Step 2.3: Enhance Exam Alignment (highest study value)
   - Step 2.1: XID Reference (critical troubleshooting reference)
   - Step 2.4: Enhanced Commands (practical exam preparation)

3. **Lower Priority - Polish**
   - Step 1.3: SimulatorView enhancements (UX improvements)
   - Step 2.2: Quick Reference (nice-to-have)
   - Step 2.5-2.7: Additional guides (comprehensive coverage)

---

## Implementation Notes

### Maintaining Existing Functionality
- The LabWorkspace overlay must continue to work with the new Simulator view
- The ExamWorkspace overlay must also work correctly
- Node selection should still affect which node the terminal operates on
- Metrics simulation should continue running in background

### Styling Consistency
- Keep existing gray-700/800/900 color scheme
- Use nvidia-green for highlights and accents
- Maintain existing hover states and transitions
- Ensure responsive behavior on all screen sizes

### Performance Considerations
- Dashboard updates should not affect Terminal responsiveness
- Consider debouncing metrics updates
- Lazy load documentation content where possible
