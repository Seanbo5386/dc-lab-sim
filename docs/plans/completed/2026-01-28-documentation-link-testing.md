# Documentation Link Testing & Maintenance Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a Playwright test that validates all external documentation links in the Documentation page, identifies broken links, and updates them with correct URLs.

**Architecture:** Install Playwright, create a link extractor utility, build a test that navigates to the Documentation page, extracts all external links, validates each one, and reports broken links with suggested fixes. Maintain a mapping file for link updates.

**Tech Stack:** Playwright, TypeScript, Node.js fetch API

---

## Current Links Inventory

The Documentation page (`src/components/Documentation.tsx`) contains the following external links in the `ExamGuideContent` component:

### Official NVIDIA Resources

| Link Title                           | Current URL                                              | Section            |
| ------------------------------------ | -------------------------------------------------------- | ------------------ |
| NCP-AII Certification Page           | https://www.nvidia.com/en-us/training/certification/     | Official Resources |
| NVIDIA Deep Learning Institute (DLI) | https://www.nvidia.com/en-us/training/                   | Official Resources |
| DGX System Documentation             | https://docs.nvidia.com/dgx/                             | Official Resources |
| Base Command Manager Docs            | https://docs.nvidia.com/base-command-manager/            | Official Resources |
| DCGM Documentation                   | https://docs.nvidia.com/datacenter/dcgm/latest/          | Official Resources |
| NVIDIA Driver Documentation          | https://docs.nvidia.com/cuda/cuda-toolkit-release-notes/ | Official Resources |
| NVSM User Guide                      | https://docs.nvidia.com/datacenter/nvsm/                 | Official Resources |
| XID Error Reference                  | https://docs.nvidia.com/deploy/xid-errors/               | Official Resources |

### Additional Study Resources

| Link Title                        | Current URL                                                                       | Section              |
| --------------------------------- | --------------------------------------------------------------------------------- | -------------------- |
| NVIDIA Networking (Mellanox) Docs | https://docs.nvidia.com/networking/                                               | Additional Resources |
| Slurm Workload Manager            | https://slurm.schedmd.com/documentation.html                                      | Additional Resources |
| NVIDIA GPU Operator               | https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/                     | Additional Resources |
| NCCL Documentation                | https://docs.nvidia.com/deeplearning/nccl/                                        | Additional Resources |
| MIG User Guide                    | https://docs.nvidia.com/datacenter/tesla/mig-user-guide/                          | Additional Resources |
| IPMI Specification                | https://www.intel.com/content/www/us/en/products/docs/servers/ipmi/ipmi-home.html | Additional Resources |

**Total Links: 14**

---

## Task 1: Install Playwright

**Files:**

- Modify: `package.json`

**Step 1: Install Playwright as dev dependency**

```bash
npm install -D @playwright/test
```

**Step 2: Initialize Playwright configuration**

```bash
npx playwright install chromium
```

**Step 3: Verify installation**

```bash
npx playwright --version
```

Expected: Playwright version number displayed

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install Playwright for e2e testing"
```

---

## Task 2: Create Playwright Configuration

**Files:**

- Create: `playwright.config.ts`

**Step 1: Write configuration file**

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

**Step 2: Create e2e directory**

```bash
mkdir e2e
```

**Step 3: Commit**

```bash
git add playwright.config.ts
git commit -m "chore: add Playwright configuration"
```

---

## Task 3: Create Link Definitions File

**Files:**

- Create: `src/data/documentationLinks.ts`

**Step 1: Write link definitions**

```typescript
/**
 * Documentation Links Registry
 *
 * Central registry of all external documentation links used in the application.
 * This file is used by:
 * 1. The Documentation component for rendering links
 * 2. Playwright tests for validating link health
 * 3. Maintenance scripts for updating broken links
 */

export interface DocumentationLink {
  id: string;
  title: string;
  url: string;
  description: string;
  category: "official" | "additional";
  section: string;
  lastValidated?: string;
  fallbackUrl?: string;
}

export const DOCUMENTATION_LINKS: DocumentationLink[] = [
  // Official NVIDIA Resources
  {
    id: "ncp-aii-certification",
    title: "NCP-AII Certification Page",
    url: "https://www.nvidia.com/en-us/training/certification/",
    description:
      "Official certification overview, registration, and exam details",
    category: "official",
    section: "Official NVIDIA Resources",
  },
  {
    id: "nvidia-dli",
    title: "NVIDIA Deep Learning Institute (DLI)",
    url: "https://www.nvidia.com/en-us/training/",
    description: "Official training courses and learning paths",
    category: "official",
    section: "Official NVIDIA Resources",
  },
  {
    id: "dgx-docs",
    title: "DGX System Documentation",
    url: "https://docs.nvidia.com/dgx/",
    description: "Complete DGX A100/H100 user guides and admin manuals",
    category: "official",
    section: "Official NVIDIA Resources",
  },
  {
    id: "bcm-docs",
    title: "Base Command Manager Docs",
    url: "https://docs.nvidia.com/base-command-manager/",
    description: "BCM installation, configuration, and administration",
    category: "official",
    section: "Official NVIDIA Resources",
  },
  {
    id: "dcgm-docs",
    title: "DCGM Documentation",
    url: "https://docs.nvidia.com/datacenter/dcgm/latest/",
    description: "Data Center GPU Manager user guide and API reference",
    category: "official",
    section: "Official NVIDIA Resources",
  },
  {
    id: "cuda-driver-docs",
    title: "NVIDIA Driver Documentation",
    url: "https://docs.nvidia.com/cuda/cuda-toolkit-release-notes/",
    description: "CUDA toolkit and driver compatibility matrices",
    category: "official",
    section: "Official NVIDIA Resources",
  },
  {
    id: "nvsm-docs",
    title: "NVSM User Guide",
    url: "https://docs.nvidia.com/datacenter/nvsm/",
    description: "NVIDIA System Management Interface documentation",
    category: "official",
    section: "Official NVIDIA Resources",
  },
  {
    id: "xid-errors-docs",
    title: "XID Error Reference",
    url: "https://docs.nvidia.com/deploy/xid-errors/",
    description: "Official XID error codes and troubleshooting guide",
    category: "official",
    section: "Official NVIDIA Resources",
  },

  // Additional Study Resources
  {
    id: "networking-docs",
    title: "NVIDIA Networking (Mellanox) Docs",
    url: "https://docs.nvidia.com/networking/",
    description: "InfiniBand, ConnectX, and BlueField documentation",
    category: "additional",
    section: "Additional Study Resources",
  },
  {
    id: "slurm-docs",
    title: "Slurm Workload Manager",
    url: "https://slurm.schedmd.com/documentation.html",
    description: "Slurm configuration, GRES, and GPU scheduling",
    category: "additional",
    section: "Additional Study Resources",
  },
  {
    id: "gpu-operator-docs",
    title: "NVIDIA GPU Operator",
    url: "https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/",
    description: "Kubernetes GPU operator deployment and config",
    category: "additional",
    section: "Additional Study Resources",
  },
  {
    id: "nccl-docs",
    title: "NCCL Documentation",
    url: "https://docs.nvidia.com/deeplearning/nccl/",
    description: "Collective communications library for multi-GPU",
    category: "additional",
    section: "Additional Study Resources",
  },
  {
    id: "mig-docs",
    title: "MIG User Guide",
    url: "https://docs.nvidia.com/datacenter/tesla/mig-user-guide/",
    description: "Multi-Instance GPU configuration and management",
    category: "additional",
    section: "Additional Study Resources",
  },
  {
    id: "ipmi-spec",
    title: "IPMI Specification",
    url: "https://www.intel.com/content/www/us/en/products/docs/servers/ipmi/ipmi-home.html",
    description: "IPMI protocol reference for BMC management",
    category: "additional",
    section: "Additional Study Resources",
  },
];

/**
 * Get links by category
 */
export function getLinksByCategory(
  category: "official" | "additional",
): DocumentationLink[] {
  return DOCUMENTATION_LINKS.filter((link) => link.category === category);
}

/**
 * Get link by ID
 */
export function getLinkById(id: string): DocumentationLink | undefined {
  return DOCUMENTATION_LINKS.find((link) => link.id === id);
}

/**
 * Update link URL (for maintenance)
 */
export function getUpdatedUrl(id: string): string | undefined {
  const link = getLinkById(id);
  return link?.fallbackUrl || link?.url;
}
```

**Step 2: Commit**

```bash
git add src/data/documentationLinks.ts
git commit -m "feat: create centralized documentation links registry"
```

---

## Task 4: Create Link Validation Test

**Files:**

- Create: `e2e/documentation-links.spec.ts`

**Step 1: Write the Playwright test**

```typescript
import { test, expect } from "@playwright/test";
import {
  DOCUMENTATION_LINKS,
  DocumentationLink,
} from "../src/data/documentationLinks";

interface LinkValidationResult {
  link: DocumentationLink;
  status: number | "error";
  ok: boolean;
  error?: string;
  redirectUrl?: string;
  suggestedFix?: string;
}

/**
 * Validates a URL by making a HEAD request
 * Falls back to GET if HEAD is not supported
 */
async function validateUrl(url: string): Promise<{
  status: number | "error";
  ok: boolean;
  error?: string;
  redirectUrl?: string;
}> {
  try {
    // First try HEAD request (faster)
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    // Some servers don't support HEAD, fall back to GET
    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
    }

    return {
      status: response.status,
      ok: response.ok,
      redirectUrl: response.url !== url ? response.url : undefined,
    };
  } catch (error) {
    return {
      status: "error",
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Suggest alternative URLs for common broken link patterns
 */
function suggestFix(
  link: DocumentationLink,
  error: string,
): string | undefined {
  const { url, id } = link;

  // Common URL pattern fixes
  const suggestions: Record<string, string> = {
    // NVIDIA docs often move to versioned paths
    "docs.nvidia.com/datacenter/nvsm/":
      "https://docs.nvidia.com/datacenter/nvsm/latest/",
    "docs.nvidia.com/deploy/xid-errors/":
      "https://docs.nvidia.com/deploy/xid-errors/index.html",
    // Intel IPMI page moved
    "intel.com/content/www/us/en/products/docs/servers/ipmi/":
      "https://www.intel.com/content/www/us/en/servers/ipmi/ipmi-technical-resources.html",
  };

  for (const [pattern, fix] of Object.entries(suggestions)) {
    if (url.includes(pattern)) {
      return fix;
    }
  }

  return undefined;
}

test.describe("Documentation Links Validation", () => {
  test.setTimeout(120000); // 2 minutes for all link checks

  test("all documentation links should be accessible", async () => {
    const results: LinkValidationResult[] = [];
    const brokenLinks: LinkValidationResult[] = [];

    console.log(
      `\n🔗 Validating ${DOCUMENTATION_LINKS.length} documentation links...\n`,
    );

    for (const link of DOCUMENTATION_LINKS) {
      const validation = await validateUrl(link.url);

      const result: LinkValidationResult = {
        link,
        ...validation,
      };

      if (!validation.ok) {
        result.suggestedFix = suggestFix(
          link,
          validation.error || `HTTP ${validation.status}`,
        );
        brokenLinks.push(result);
        console.log(`❌ [${validation.status}] ${link.title}`);
        console.log(`   URL: ${link.url}`);
        if (result.suggestedFix) {
          console.log(`   💡 Suggested fix: ${result.suggestedFix}`);
        }
      } else {
        console.log(`✅ [${validation.status}] ${link.title}`);
        if (validation.redirectUrl) {
          console.log(`   ↪ Redirected to: ${validation.redirectUrl}`);
        }
      }

      results.push(result);
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total links: ${results.length}`);
    console.log(`✅ Valid: ${results.filter((r) => r.ok).length}`);
    console.log(`❌ Broken: ${brokenLinks.length}`);

    if (brokenLinks.length > 0) {
      console.log("\n📋 BROKEN LINKS REPORT:");
      console.log("-".repeat(60));

      for (const broken of brokenLinks) {
        console.log(`\nLink ID: ${broken.link.id}`);
        console.log(`Title: ${broken.link.title}`);
        console.log(`Current URL: ${broken.link.url}`);
        console.log(`Status: ${broken.status}`);
        if (broken.error) console.log(`Error: ${broken.error}`);
        if (broken.suggestedFix) {
          console.log(`Suggested Fix: ${broken.suggestedFix}`);
        }
      }

      // Generate fix commands
      console.log("\n📝 TO FIX BROKEN LINKS:");
      console.log("-".repeat(60));
      console.log("Update the URLs in src/data/documentationLinks.ts:");

      for (const broken of brokenLinks) {
        if (broken.suggestedFix) {
          console.log(`\n// ${broken.link.id}`);
          console.log(`// OLD: ${broken.link.url}`);
          console.log(`// NEW: ${broken.suggestedFix}`);
        }
      }
    }

    // Assert no broken links
    expect(
      brokenLinks.length,
      `Found ${brokenLinks.length} broken link(s)`,
    ).toBe(0);
  });

  test("documentation page renders all resource links", async ({ page }) => {
    await page.goto("/");

    // Navigate to Documentation tab
    await page.click("text=Documentation");

    // Wait for content to load
    await page.waitForSelector("text=Documentation & Reference");

    // Click on Exam Guide tab
    await page.click("text=Exam Guide");

    // Wait for exam guide content
    await page.waitForSelector("text=Official NVIDIA Resources");

    // Verify all official resource links are rendered
    const officialLinks = DOCUMENTATION_LINKS.filter(
      (l) => l.category === "official",
    );
    for (const link of officialLinks) {
      const linkElement = page.locator(`a[href="${link.url}"]`);
      await expect(linkElement).toBeVisible();
    }

    // Verify all additional resource links are rendered
    const additionalLinks = DOCUMENTATION_LINKS.filter(
      (l) => l.category === "additional",
    );
    for (const link of additionalLinks) {
      const linkElement = page.locator(`a[href="${link.url}"]`);
      await expect(linkElement).toBeVisible();
    }
  });
});
```

**Step 2: Add test script to package.json**

Add to scripts section:

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:links": "playwright test documentation-links"
```

**Step 3: Commit**

```bash
git add e2e/documentation-links.spec.ts package.json
git commit -m "feat: add Playwright test for documentation link validation"
```

---

## Task 5: Run Link Validation and Identify Broken Links

**Step 1: Run the link validation test**

```bash
npm run test:links
```

**Step 2: Review the test output**

The test will output:

- Status of each link (✅ or ❌)
- Redirect information
- Suggested fixes for broken links

**Step 3: Document findings**

Create a report of any broken links found.

---

## Task 6: Update Broken Links

**Files:**

- Modify: `src/data/documentationLinks.ts`
- Modify: `src/components/Documentation.tsx`

**Step 1: Update documentationLinks.ts with corrected URLs**

Based on test results, update any broken URLs in the `DOCUMENTATION_LINKS` array.

**Step 2: Update Documentation.tsx to use the centralized link registry**

Refactor the `ResourceLink` usages in `ExamGuideContent` to use the imported links:

```typescript
import { DOCUMENTATION_LINKS, getLinksByCategory } from '@/data/documentationLinks';

// In ExamGuideContent component:
const officialLinks = getLinksByCategory('official');
const additionalLinks = getLinksByCategory('additional');

// Then map over these in the JSX:
{officialLinks.map(link => (
  <ResourceLink
    key={link.id}
    title={link.title}
    url={link.url}
    description={link.description}
    icon={getIconForLink(link.id)}
  />
))}
```

**Step 3: Run tests again to verify fixes**

```bash
npm run test:links
```

**Step 4: Commit**

```bash
git add src/data/documentationLinks.ts src/components/Documentation.tsx
git commit -m "fix: update broken documentation links"
```

---

## Task 7: Add CI Integration (Optional)

**Files:**

- Create: `.github/workflows/link-check.yml` (if using GitHub Actions)

**Step 1: Create GitHub Action for weekly link checking**

```yaml
name: Documentation Link Check

on:
  schedule:
    # Run weekly on Sundays at midnight
    - cron: "0 0 * * 0"
  workflow_dispatch: # Allow manual trigger

jobs:
  link-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install chromium

      - name: Run link validation
        run: npm run test:links

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: link-check-results
          path: playwright-report/
```

**Step 2: Commit**

```bash
git add .github/workflows/link-check.yml
git commit -m "ci: add weekly documentation link check workflow"
```

---

## Phase Summary

| Task | Files                           | Description                      |
| ---- | ------------------------------- | -------------------------------- |
| 1    | package.json                    | Install Playwright               |
| 2    | playwright.config.ts            | Configure Playwright             |
| 3    | src/data/documentationLinks.ts  | Create centralized link registry |
| 4    | e2e/documentation-links.spec.ts | Write link validation test       |
| 5    | (run tests)                     | Identify broken links            |
| 6    | Multiple                        | Update broken links              |
| 7    | .github/workflows/              | Add CI for weekly checks         |

**Expected Outcomes:**

- Playwright installed and configured
- Centralized link registry for maintainability
- Automated test that validates all 14 documentation links
- Clear reporting of broken links with suggested fixes
- Optional CI integration for ongoing monitoring

**Test Commands:**

```bash
# Run just the link validation
npm run test:links

# Run with UI for debugging
npm run test:e2e:ui

# Run all e2e tests
npm run test:e2e
```
