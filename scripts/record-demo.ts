/**
 * Record a demo GIF of the simulator using Playwright.
 *
 * Prerequisites: dev server running (npm run dev)
 * Usage: npx tsx scripts/record-demo.ts
 * Output: docs/demo.gif
 */

import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = "http://localhost:5173";
const DOCS_DIR = path.resolve(__dirname, "..", "docs");
const VIDEO_DIR = path.resolve(__dirname, "..", "tmp-video");

// Record at 1920×1080 so nvidia-smi's 79-column table fits in the split view
const WIDTH = 1920;
const HEIGHT = 1080;

// GIF output width — 1280 keeps terminal text readable
const GIF_WIDTH = 1280;

async function typeSlowly(
  page: import("@playwright/test").Page,
  text: string,
  delay = 55,
) {
  for (const char of text) {
    await page.keyboard.type(char, { delay });
  }
}

async function main() {
  // Ensure output dirs exist
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  fs.mkdirSync(VIDEO_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    recordVideo: { dir: VIDEO_DIR, size: { width: WIDTH, height: HEIGHT } },
  });
  const page = await context.newPage();

  // ── Load simulator ──────────────────────────────────
  await page.goto(BASE);

  // Dismiss welcome screen if it appears (shown on first visit)
  const welcomeBtn = page.locator(
    'button:has-text("Enter Virtual Datacenter")',
  );
  try {
    await welcomeBtn.waitFor({ timeout: 5_000 });
    await page.waitForTimeout(1500);
    await welcomeBtn.click();
  } catch {
    // Welcome screen already dismissed (localStorage)
  }

  await page.waitForSelector('[data-testid="terminal"]', { timeout: 15_000 });
  await page.waitForTimeout(2000);

  // ── Terminal commands ──────────────────────────────
  const terminal = page.locator('[data-testid="terminal"]');
  await terminal.click();
  await page.waitForTimeout(400);

  // nvidia-smi — the signature GPU management command
  await typeSlowly(page, "nvidia-smi");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(3000);

  // sinfo — Slurm cluster status
  await typeSlowly(page, "sinfo");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2000);

  // ibstat — InfiniBand status
  await typeSlowly(page, "ibstat");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2500);

  // cd + ls — show shell builtins work
  await typeSlowly(page, "cd /etc/slurm");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  await typeSlowly(page, "ls -la");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  await typeSlowly(page, "cd ~");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);

  // ── Navigate to Labs & Scenarios ───────────────────
  await page.click('[data-testid="nav-labs"]');
  await page.waitForSelector('[data-testid="labs-list"]', { timeout: 10_000 });
  await page.waitForTimeout(2500);

  // Click on a mission to show the NarrativeIntro
  const card = page.locator("text=The Midnight Deployment").first();
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await page.waitForTimeout(3500);

  // ── Back to Simulator tab ──────────────────────────
  await page.click("#tab-simulator");
  await page.waitForTimeout(3000);

  // Done — close to finalize the video
  await page.close();
  await context.close();
  await browser.close();

  // ── Convert to GIF ─────────────────────────────────
  // Find the recorded webm
  const videoFiles = fs
    .readdirSync(VIDEO_DIR)
    .filter((f) => f.endsWith(".webm"));
  if (videoFiles.length === 0) {
    console.error("No video file found!");
    process.exit(1);
  }

  const videoPath = path.join(
    VIDEO_DIR,
    videoFiles.sort(
      (a, b) =>
        fs.statSync(path.join(VIDEO_DIR, b)).mtimeMs -
        fs.statSync(path.join(VIDEO_DIR, a)).mtimeMs,
    )[0],
  );
  const gifPath = path.join(DOCS_DIR, "demo.gif");

  console.log(`Converting ${videoPath} → ${gifPath}`);

  // Two-pass ffmpeg: generate palette then use it for high-quality GIF
  const palettePath = path.join(VIDEO_DIR, "palette.png");
  execSync(
    `ffmpeg -y -i "${videoPath}" -vf "fps=12,scale=${GIF_WIDTH}:-1:flags=lanczos,palettegen=stats_mode=diff" "${palettePath}"`,
    { stdio: "inherit" },
  );
  execSync(
    `ffmpeg -y -i "${videoPath}" -i "${palettePath}" -lavfi "fps=12,scale=${GIF_WIDTH}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" "${gifPath}"`,
    { stdio: "inherit" },
  );

  // Clean up temp video dir
  fs.rmSync(VIDEO_DIR, { recursive: true, force: true });

  const stats = fs.statSync(gifPath);
  console.log(
    `\nDemo GIF saved: ${gifPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
