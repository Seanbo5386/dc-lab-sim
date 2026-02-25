# Mission Card UX Redesign

**Date:** 2026-02-25
**Status:** Approved
**Problem:** Excessive sidebar scrolling + attention ping-pong between sidebar and terminal during missions

## Problem Statement

During missions, the LabWorkspace sidebar occupies the left third of the screen. Users must:
1. Scroll extensively through step content, objectives, validation, hints, ALL STEPS list, and WHAT YOU'LL LEARN
2. Constantly shift attention left (read suggested command) → right (type in terminal) → left (check progress) → right (execute next command)

The red-arrow eye-tracking pattern across the screen is the core UX failure.

## Solution: Inline Terminal Header

Replace the sidebar with a compact **MissionCard** that renders inside the terminal panel column, directly above the xterm.js terminal. The dashboard gets full width back. The user's eyes stay in one vertical column.

### Layout Change

**Before (current):**
```
[LabWorkspace sidebar 340-560px] [Dashboard + Terminal with margin-left shift]
```

**After:**
```
[Dashboard (full width)] [Terminal panel]
                          ┌─ Tab Bar ────────┐
                          │ MissionCard       │
                          │ xterm.js terminal │
                          └──────────────────┘
```

## MissionCard Component

Fixed-height (~100-120px), non-scrolling panel with four rows:

### Row 1 — Header
- Mission title (truncated if long) + tier badge
- `Step N of M` with dot indicators (filled/hollow/ring)
- `ℹ` info icon → popover with learning objectives, narrative context

### Row 2 — Current Step Task
- Step description/situation text, 2-3 lines max
- Truncated with "more..." if longer

### Row 3 — Suggested Commands (click-to-paste)
- Horizontal row of command chips from `expectedCommands`
- Monospace text, dark bg, border
- States: `○` pending → `✓` executed (green, dimmed)
- **Click** pastes command into terminal input (no auto-execute)
- Brief flash animation on click + terminal input highlight

### Row 4 — Status Footer
- `N/M objectives complete` progress text
- Hint button (right side) → dropdown with progressive hint reveal
- When complete: green bar, "Step complete! Click Next →"

### Step Type Variants
- **Concept steps:** Row 3 shows concept text instead of command chips. Continue button in footer.
- **Observe steps:** Row 3 shows the observe command. Continue button in footer.
- **Quiz:** Card temporarily expands to show multiple-choice question, collapses after answer.

## Click-to-Paste Mechanism

1. `MissionCard` receives `onPasteCommand: (cmd: string) => void` prop
2. `SimulatorView` passes a callback that writes to xterm buffer via Terminal ref (no newline — user presses Enter)
3. Visual feedback: chip flashes green border, terminal input highlights briefly

## Content Migration

| Current Sidebar Content | New Location |
|---|---|
| Mission title + metadata | MissionCard header row |
| ALL STEPS list | Dot indicators in header |
| Current step description | MissionCard task row |
| Suggested commands | Clickable command chips |
| Objectives + validation | Footer compact count |
| Hints | Footer hint dropdown |
| WHAT YOU'LL LEARN | Behind ℹ info popover |
| "Use the Terminal" note | Removed (self-evident) |
| NarrativeIntro | Stays as standalone modal |
| NarrativeResolution | Stays as standalone modal |
| InlineQuiz | Temporarily expands MissionCard |
| Tier badge | MissionCard header |

## What Changes

- **LabWorkspace:** No longer renders during active scenarios. Component file remains for potential future use.
- **App.tsx:** `xl:ml-[clamp(...)]` margin shifts removed for `showLabWorkspace` during active scenarios.
- **SimulatorView:** Terminal panel gains MissionCard between tab bar and xterm content.
- **Terminal component:** Exposes ref method to write text to input buffer (paste without execute).

## What Stays the Same

- NarrativeIntro/NarrativeResolution modals
- Scenario state management (simulationStore, learningProgressStore)
- Step validation logic (validateCommandExecuted, validation rules)
- Enhanced hint system logic (progressive unlock)
- Terminal command processing
- Dashboard layout and all visualizations
