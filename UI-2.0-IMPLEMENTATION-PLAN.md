# UI 2.0 Implementation Plan
## AI Infrastructure Simulator - Design System Overhaul

---

## Executive Summary

This document outlines a comprehensive UI overhaul plan to create a consistent, aesthetic, and user-friendly interface for the NVIDIA AI Infrastructure Simulator. The plan addresses inconsistencies identified in the current UI and establishes a cohesive design system.

---

## 1. Current UI Analysis

### 1.1 Identified Issues

#### **Inconsistent Page Layouts**
- **Simulator View**: Has a clean split-screen layout but lacks a consistent page header
- **Labs & Scenarios Tab**: Uses a free-flowing page layout with cards, no consistent header structure
- **Documentation Tab**: Has its own internal tab system without matching the main navigation style
- **State Management Tab**: Uses a different card/panel layout than other pages

#### **Typography Inconsistencies**
- Mixed font sizes across components (text-2xl, text-xl, text-lg used inconsistently)
- Section headers vary in style between pages
- Code/monospace text lacks consistent styling

#### **Color Usage Inconsistencies**
- `nvidia-green` accent used inconsistently (sometimes as text, sometimes as backgrounds)
- Status indicators use different shades of the same colors across components
- Border colors vary between `border-gray-700`, `border-gray-800`, and custom colors

#### **Spacing/Padding Inconsistencies**
- Main content padding varies: `p-4` (SimulatorView), `p-6` (Labs, State), different patterns in Documentation
- Card padding is inconsistent: `p-4`, `p-6` used interchangeably
- Gap/margin values vary without clear pattern

#### **Component Style Inconsistencies**
- Cards have different border-radius values
- Buttons have different padding, sizing, and hover states
- Form inputs lack unified styling

#### **Navigation Issues**
- Main nav tabs lack visual hierarchy
- Documentation has nested tabs that don't match the main navigation style
- No breadcrumb or context indicators

### 1.2 What Works Well
- NVIDIA green accent color is distinctive and professional
- Dark theme provides good contrast for data-heavy displays
- Terminal component is well-styled
- Welcome screen has excellent visual design (use as reference)
- GPU cards on Dashboard have good information density

---

## 2. Design System Specification

### 2.1 Color Palette

```css
/* Primary Colors */
--nvidia-green: #76B900;
--nvidia-green-dark: #5a8f00;
--nvidia-green-light: #8dd61c;

/* Background Colors */
--bg-primary: #0a0a0a;       /* Darkest - main app background */
--bg-secondary: #111111;     /* Cards, elevated surfaces */
--bg-tertiary: #1a1a1a;      /* Nested elements, inputs */
--bg-elevated: #222222;      /* Hover states, active items */

/* Border Colors */
--border-subtle: #2a2a2a;    /* Default borders */
--border-default: #333333;   /* Card borders */
--border-emphasis: #444444;  /* Focused/active borders */

/* Text Colors */
--text-primary: #f5f5f5;     /* Primary text */
--text-secondary: #a0a0a0;   /* Secondary/muted text */
--text-tertiary: #666666;    /* Disabled/placeholder */

/* Status Colors */
--status-success: #22c55e;
--status-warning: #eab308;
--status-error: #ef4444;
--status-info: #3b82f6;
```

### 2.2 Typography Scale

```css
/* Headings */
--heading-1: 2rem (32px) / 600 weight   /* Page titles */
--heading-2: 1.5rem (24px) / 600 weight /* Section headers */
--heading-3: 1.25rem (20px) / 500 weight /* Card titles */
--heading-4: 1rem (16px) / 500 weight   /* Subsection headers */

/* Body */
--body-lg: 1rem (16px) / 400 weight     /* Primary body text */
--body-md: 0.875rem (14px) / 400 weight /* Default body text */
--body-sm: 0.75rem (12px) / 400 weight  /* Captions, labels */

/* Monospace */
--mono: JetBrains Mono, monospace
```

### 2.3 Spacing Scale

```css
--space-1: 0.25rem (4px)
--space-2: 0.5rem (8px)
--space-3: 0.75rem (12px)
--space-4: 1rem (16px)
--space-5: 1.25rem (20px)
--space-6: 1.5rem (24px)
--space-8: 2rem (32px)
--space-10: 2.5rem (40px)
--space-12: 3rem (48px)
```

### 2.4 Border Radius

```css
--radius-sm: 0.25rem (4px)   /* Small elements (badges, chips) */
--radius-md: 0.5rem (8px)    /* Buttons, inputs */
--radius-lg: 0.75rem (12px)  /* Cards, panels */
--radius-xl: 1rem (16px)     /* Large containers, modals */
```

---

## 3. Component Library Specification

### 3.1 Page Layout Component

Every page should follow this consistent structure:

```tsx
// PageLayout.tsx
<div className="h-full flex flex-col bg-bg-primary">
  {/* Page Header - Consistent across all views */}
  <header className="flex-shrink-0 px-6 py-4 border-b border-border-subtle bg-bg-secondary">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-heading-2 text-text-primary font-semibold">{title}</h1>
        <p className="text-body-sm text-text-secondary mt-1">{subtitle}</p>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  </header>

  {/* Page Content */}
  <main className="flex-1 overflow-auto p-6">
    {children}
  </main>
</div>
```

### 3.2 Card Component

```tsx
// Unified Card Component
<div className="bg-bg-secondary rounded-lg border border-border-default p-5 hover:border-border-emphasis transition-colors">
  <header className="flex items-center justify-between mb-4">
    <h3 className="text-heading-4 text-text-primary font-medium">{title}</h3>
    {badge && <Badge>{badge}</Badge>}
  </header>
  <div className="text-body-md text-text-secondary">
    {children}
  </div>
</div>
```

### 3.3 Button Variants

```tsx
// Primary Button
<button className="px-4 py-2 bg-nvidia-green text-black font-medium rounded-md hover:bg-nvidia-green-dark transition-colors">
  {children}
</button>

// Secondary Button
<button className="px-4 py-2 bg-bg-tertiary text-text-primary font-medium rounded-md border border-border-default hover:bg-bg-elevated hover:border-border-emphasis transition-colors">
  {children}
</button>

// Ghost Button
<button className="px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-md transition-colors">
  {children}
</button>

// Danger Button
<button className="px-4 py-2 bg-status-error/10 text-status-error border border-status-error/30 rounded-md hover:bg-status-error/20 transition-colors">
  {children}
</button>
```

### 3.4 Input Components

```tsx
// Text Input
<input className="w-full px-3 py-2 bg-bg-tertiary text-text-primary rounded-md border border-border-default focus:border-nvidia-green focus:outline-none focus:ring-1 focus:ring-nvidia-green/50 placeholder:text-text-tertiary" />

// Select
<select className="w-full px-3 py-2 bg-bg-tertiary text-text-primary rounded-md border border-border-default focus:border-nvidia-green focus:outline-none appearance-none">
  {options}
</select>
```

### 3.5 Status Badge Component

```tsx
// Status Badge
<span className={cn(
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-body-sm font-medium",
  status === 'success' && "bg-status-success/10 text-status-success",
  status === 'warning' && "bg-status-warning/10 text-status-warning",
  status === 'error' && "bg-status-error/10 text-status-error",
  status === 'info' && "bg-status-info/10 text-status-info",
)}>
  <StatusIcon className="w-3.5 h-3.5" />
  {label}
</span>
```

---

## 4. Navigation Redesign

### 4.1 Primary Navigation Bar

```tsx
// Unified navigation with consistent styling
<nav className="flex items-center gap-1 px-6 py-2 bg-bg-secondary border-b border-border-subtle">
  {tabs.map(tab => (
    <button
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-md font-medium text-body-md transition-colors",
        isActive
          ? "bg-nvidia-green/10 text-nvidia-green"
          : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  ))}
</nav>
```

### 4.2 Secondary Navigation (Documentation Sub-tabs)

```tsx
// Sub-navigation for pages with internal sections
<div className="flex items-center gap-1 px-4 py-2 bg-bg-tertiary border-b border-border-subtle">
  {subtabs.map(tab => (
    <button
      className={cn(
        "px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors",
        isActive
          ? "bg-bg-elevated text-nvidia-green"
          : "text-text-secondary hover:text-text-primary"
      )}
    >
      {label}
    </button>
  ))}
</div>
```

---

## 5. Page-Specific Implementations

### 5.1 Simulator View (Dashboard + Terminal)

**Changes Required:**
- Add a consistent page header above the split view
- Standardize the Dashboard panel's internal spacing
- Ensure Terminal panel matches the same visual weight
- Keep the current split functionality (working well)

```
+------------------------------------------------------------------+
| Header: "Simulator" | Node: dgx-00 v | Status Indicator | Actions |
+------------------------------------------------------------------+
|                        |                                          |
|     Dashboard          |              Terminal                    |
|     (50%)              |              (50%)                       |
|                        |                                          |
+------------------------------------------------------------------+
```

### 5.2 Labs & Scenarios Page

**Changes Required:**
- Add consistent page header: "Labs & Scenarios" with description
- Reorganize fault injection into collapsible section
- Standardize domain cards to use unified Card component
- Add filtering/search capability for scenarios

```
+------------------------------------------------------------------+
| Header: "Labs & Scenarios" | "Practice troubleshooting scenarios" |
+------------------------------------------------------------------+
| [Filters: Domain v] [Difficulty v] [Search...]         [Start Lab]|
+------------------------------------------------------------------+
|                                                                   |
| > Fault Injection (Collapsible)                                   |
|   [XID] [ECC] [Thermal] [NVLink] [Power] [Clear]                  |
|                                                                   |
| Domain Cards Grid (3-col)                                         |
| +------------------+ +------------------+ +------------------+     |
| | Domain 1 (31%)   | | Domain 2 (5%)    | | Domain 3 (19%)   |    |
| | ...              | | ...              | | ...              |    |
| +------------------+ +------------------+ +------------------+     |
+------------------------------------------------------------------+
```

### 5.3 Documentation Page

**Changes Required:**
- Replace horizontal overflow tabs with sidebar navigation
- Use consistent page header
- Improve content organization with better visual hierarchy

```
+------------------------------------------------------------------+
| Header: "Documentation" | "Reference guides and exam preparation"  |
+------------------------------------------------------------------+
| Sidebar      |  Content Area                                      |
| +----------+ |  +----------------------------------------------+  |
| | Quick    | |  | Quick Start                                  |  |
| | Start    | |  |                                              |  |
| +----------+ |  | Welcome to the NCP-AII...                    |  |
| | Commands | |  |                                              |  |
| +----------+ |  | [Stats Cards]                                |  |
| | ...      | |  |                                              |  |
| +----------+ |  +----------------------------------------------+  |
+------------------------------------------------------------------+
```

### 5.4 State Management Page

**Changes Required:**
- Add consistent page header
- Improve snapshot cards with better visual hierarchy
- Add timeline/history view option

```
+------------------------------------------------------------------+
| Header: "State Management" | "Save and restore cluster states"     |
+------------------------------------------------------------------+
| Instructions Panel (Collapsible by default)                        |
+------------------------------------------------------------------+
| Actions: [Create Snapshot] [Set Baseline] [Reset to Baseline]     |
+------------------------------------------------------------------+
| Snapshots List                                                    |
| +--------------------------------------------------------------+ |
| | Snapshot Name            | Created      | Actions             | |
| | "Before XID test"        | 2 min ago    | [Restore] [Delete]  | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1)
1. Create design tokens in Tailwind config (colors, typography, spacing)
2. Create shared UI components library:
   - `PageLayout.tsx`
   - `Card.tsx`
   - `Button.tsx`
   - `Badge.tsx`
   - `Input.tsx`
   - `NavigationTabs.tsx`
3. Create `cn()` utility for conditional classes

### Phase 2: Navigation Overhaul (Week 1-2)
1. Redesign primary navigation in App.tsx
2. Update header with consistent styling
3. Implement new navigation component

### Phase 3: Page Updates (Week 2-3)
1. **Simulator View** - Apply PageLayout, update Dashboard styling
2. **Labs & Scenarios** - Apply PageLayout, reorganize content, update cards
3. **Documentation** - Convert to sidebar navigation, apply PageLayout
4. **State Management** - Apply PageLayout, update panel styling

### Phase 4: Component Updates (Week 3-4)
1. Update all existing cards to use unified Card component
2. Standardize all buttons across the application
3. Update form inputs for consistency
4. Update status indicators and badges

### Phase 5: Polish & Testing (Week 4)
1. Review all pages for visual consistency
2. Test responsive behavior
3. Verify accessibility (contrast, focus states)
4. Performance optimization

---

## 7. New Tailwind Configuration

```javascript
// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        nvidia: {
          green: '#76B900',
          'green-dark': '#5a8f00',
          'green-light': '#8dd61c',
        },
        bg: {
          primary: '#0a0a0a',
          secondary: '#111111',
          tertiary: '#1a1a1a',
          elevated: '#222222',
        },
        border: {
          subtle: '#2a2a2a',
          default: '#333333',
          emphasis: '#444444',
        },
        text: {
          primary: '#f5f5f5',
          secondary: '#a0a0a0',
          tertiary: '#666666',
        },
        status: {
          success: '#22c55e',
          warning: '#eab308',
          error: '#ef4444',
          info: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
      },
      fontSize: {
        'heading-1': ['2rem', { lineHeight: '2.5rem', fontWeight: '600' }],
        'heading-2': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
        'heading-3': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '500' }],
        'heading-4': ['1rem', { lineHeight: '1.5rem', fontWeight: '500' }],
        'body-lg': ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        'body-md': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'body-sm': ['0.75rem', { lineHeight: '1rem', fontWeight: '400' }],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      spacing: {
        // Uses Tailwind defaults, reference for consistency
      },
    },
  },
  plugins: [],
}
```

---

## 8. File Structure for New Components

```
src/
├── components/
│   ├── ui/                    # NEW: Shared UI primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   └── index.ts
│   ├── layout/                # NEW: Layout components
│   │   ├── PageLayout.tsx
│   │   ├── PageHeader.tsx
│   │   ├── Navigation.tsx
│   │   └── Sidebar.tsx
│   └── [existing components]
├── lib/
│   └── utils.ts               # NEW: cn() utility and helpers
└── styles/
    └── index.css              # Updated with design tokens
```

---

## 9. Migration Checklist

### Pre-Migration
- [x] Back up current UI state
- [x] Create design token configuration
- [x] Build component library

### Component Migration
- [x] PageLayout component created and tested
- [x] Card component created and tested
- [x] Button variants created and tested
- [x] Badge component created and tested
- [x] Input components created and tested
- [x] Navigation component created and tested

### Page Migration
- [x] App.tsx header and navigation updated
- [x] SimulatorView updated with design system
- [x] Labs & Scenarios page updated with PageLayout
- [x] Documentation page updated with PageHeader
- [x] State Management page updated with PageLayout
- [x] FaultInjection component updated with design tokens
- [x] LabWorkspace overlay updated with design tokens
- [x] ExamWorkspace overlay updated with design tokens
- [x] StateManagementPanel updated with design tokens
- [x] WelcomeScreen verified (already well-designed)

### Final Verification
- [x] All pages visually consistent (main pages)
- [x] All interactive states working
- [x] No TypeScript errors
- [x] Build passes
- [ ] Responsive design verified
- [ ] Accessibility verified

---

## 10. Success Criteria

1. **Visual Consistency**: All pages share the same header structure, typography, and spacing
2. **Component Reusability**: Common patterns extracted into shared components
3. **Maintainability**: Design tokens centralized in Tailwind config
4. **User Experience**: Improved navigation clarity and visual hierarchy
5. **Performance**: No regression in load times or interaction responsiveness
6. **Accessibility**: WCAG 2.1 AA compliance for contrast and focus states

---

## Appendix A: Current vs. Proposed Screenshots

### Header Comparison
**Current**: Different styling per page, inconsistent spacing
**Proposed**: Unified header with title, subtitle, and action area

### Card Comparison
**Current**: Mixed padding (p-4, p-6), different border radius values
**Proposed**: Consistent p-5 padding, rounded-lg borders, standardized hover states

### Navigation Comparison
**Current**: Tab-style with underline indicator, Documentation has nested horizontal tabs
**Proposed**: Pill-style buttons with background indicator, Documentation uses sidebar

---

## Appendix B: Component Examples

See the `src/components/ui/` directory after Phase 1 implementation for live examples of all shared components.

---

*Document Version: 1.0*
*Created: January 2026*
*Last Updated: January 2026*
