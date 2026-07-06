import type { Page } from "@playwright/test";

/**
 * Seed localStorage so first-run overlays (WelcomeScreen, Spotlight Tour,
 * Sandbox intro) don't block test interactions.
 * MUST be called via addInitScript semantics BEFORE page.goto().
 * Pass { keepWelcome: true } for specs that exercise the welcome flow
 * themselves (e.g. MissionRunner.enterSimulator clicks through it).
 */
export async function seedUiFlags(
  page: Page,
  opts: { keepWelcome?: boolean } = {},
): Promise<void> {
  const keepWelcome = !!opts.keepWelcome;
  await page.addInitScript((keep: boolean) => {
    // Mark the simulator tour as already seen so it doesn't block input
    localStorage.setItem("ncp-aii-tour-simulator-seen", "true");
    // Mark the sandbox intro as already seen to avoid the dismiss button
    const learning = {
      state: { sandboxIntroSeen: true },
      version: 0,
    };
    localStorage.setItem(
      "ncp-aii-learning-progress-v2",
      JSON.stringify(learning),
    );
    if (!keep) {
      localStorage.setItem("ncp-aii-welcome-dismissed", "true");
    }
  }, keepWelcome);
}
