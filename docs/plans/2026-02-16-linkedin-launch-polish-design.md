# LinkedIn Launch Polish — Pre-Launch Review Design

**Date:** 2026-02-16
**Purpose:** Identify and fix blind spots before sharing the publicly deployed NVIDIA AI Infrastructure Certification Simulator on LinkedIn.

## Audit Findings

### Critical

1. **Version mismatch** — README says v0.9.2, About tab says v0.10.0, package.json says v0.11.0
2. **No OG meta tags** — LinkedIn link preview will show generic text instead of a compelling card
3. **1 flaky test** — `ipmitoolSimulator.test.ts` has intermittent async failure
4. **Untracked screenshots** — 30+ loose PNGs/GIFs in the repo root from development

### Important

5. **Missing package.json metadata** — No author, license, homepage, or repository fields
6. **Internal planning docs** — `docs/plans/` and `docs/analysis/` expose internal process

## Approved Design (7 Items)

### 1. OG/Meta Tags (~10 min)

Add to `index.html`:

```html
<meta
  property="og:title"
  content="NVIDIA AI Infrastructure Certification Simulator"
/>
<meta
  property="og:description"
  content="Browser-based NCP-AII exam prep with 28 guided scenarios, 60+ simulated datacenter commands, and a full learning progression system."
/>
<meta property="og:image" content="/og-image.png" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
```

### 2. Staged OG Screenshot (~15 min)

Capture a simulator screenshot showing:

- A GPU with an injected fault (e.g., temperature warning)
- Terminal showing a troubleshooting command with realistic output
- Save as `public/og-image.png` (1200x630 recommended for LinkedIn)

### 3. Version Sync (~5 min)

Align all version references to `0.11.0`:

- `README.md` header/badge
- `src/components/About.tsx` version display
- `package.json` already correct

### 4. Package.json Metadata (~5 min)

Add fields:

- `author`: user's name
- `license`: "MIT"
- `homepage`: deployed URL
- `repository`: GitHub URL

Add `LICENSE` file with MIT template.

### 5. Gitignore Internal Docs (~10 min)

- Add `docs/plans/` and `docs/analysis/` to `.gitignore`
- Remove from git tracking (files stay local)
- These are internal process docs, not for public consumption

### 6. Fix Flaky Test (~15-30 min)

Investigate `ipmitoolSimulator.test.ts` async timing issue and stabilize.

### 7. Git Cleanup (~10 min)

- Add patterns for loose screenshots (`*.png`, `*.gif` at root) to `.gitignore`
- Add `test-results/`, `playwright-report/` to `.gitignore`
- Remove untracked artifacts

## Out of Scope

- Content changes to scenarios or questions
- New features or UI redesign
- Performance optimization
- SEO beyond OG tags
