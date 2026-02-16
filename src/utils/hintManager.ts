import type { Hint, ScenarioStep, StepProgress } from "@/types/scenarios";

/**
 * Result of hint evaluation
 */
export interface HintEvaluation {
  /** Available hints that can be shown now */
  availableHints: Hint[];

  /** Next hint to show (first available, not yet revealed) */
  nextHint: Hint | null;

  /** All hints for the current step */
  allHints: Hint[];

  /** Number of hints already revealed */
  revealedCount: number;

  /** Total number of hints available */
  totalCount: number;
}

/**
 * Hint Manager - Handles intelligent hint triggering and progression
 */
export class HintManager {
  /**
   * Evaluate which hints are currently available for the user
   */
  static getAvailableHints(
    step: ScenarioStep,
    progress: StepProgress,
  ): HintEvaluation {
    // Combine legacy and enhanced hints
    const allHints = this.getAllHints(step);

    // Filter to only available hints based on triggers and conditions
    const availableHints = allHints.filter((hint) =>
      this.isHintAvailable(hint, progress, step),
    );

    // Find the next hint to reveal (first available that hasn't been revealed)
    const nextHint =
      availableHints.find(
        (hint) => !progress.revealedHintIds.includes(hint.id),
      ) || null;

    return {
      availableHints,
      nextHint,
      allHints,
      revealedCount: progress.revealedHintIds.length,
      totalCount: allHints.length,
    };
  }

  /**
   * Get all hints for a step (legacy + enhanced)
   */
  private static getAllHints(step: ScenarioStep): Hint[] {
    const hints: Hint[] = [];

    // Add legacy hints (always manual trigger)
    if (step.hints) {
      step.hints.forEach((message, index) => {
        hints.push({
          id: `legacy-hint-${index}`,
          level: index + 1,
          message,
          trigger: { type: "manual" },
        });
      });
    }

    // Add enhanced hints
    if (step.enhancedHints) {
      hints.push(...step.enhancedHints);
    }

    // Sort by level (easier hints first)
    return hints.sort((a, b) => a.level - b.level);
  }

  /**
   * Check if a hint should be available based on its trigger and conditions
   */
  private static isHintAvailable(
    hint: Hint,
    progress: StepProgress,
    step: ScenarioStep,
  ): boolean {
    // Check trigger conditions
    if (!this.checkTrigger(hint.trigger, progress)) {
      return false;
    }

    // Check additional conditions if specified
    if (hint.condition) {
      if (!this.checkConditions(hint.condition, progress, step)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if trigger conditions are met
   */
  private static checkTrigger(
    trigger: Hint["trigger"],
    progress: StepProgress,
  ): boolean {
    switch (trigger.type) {
      case "manual":
        // Always available for manual request
        return true;

      case "time-based": {
        if (!trigger.timeSeconds || !progress.lastCommandTime) {
          return false;
        }

        const now = Date.now();
        const timeSinceLastCommand = (now - progress.lastCommandTime) / 1000;
        return timeSinceLastCommand >= trigger.timeSeconds;
      }

      case "attempt-based":
        if (!trigger.attemptCount) {
          return false;
        }
        return progress.failedAttempts >= trigger.attemptCount;

      case "command-based": {
        if (!trigger.commandPattern) {
          return false;
        }

        // Check if user ran a command matching this pattern
        const pattern = new RegExp(trigger.commandPattern, "i");
        return progress.commandsExecuted.some((cmd) => pattern.test(cmd));
      }

      default:
        return false;
    }
  }

  /**
   * Check additional conditions for hint availability
   */
  private static checkConditions(
    condition: NonNullable<Hint["condition"]>,
    progress: StepProgress,
    _step: ScenarioStep,
  ): boolean {
    // Check if certain commands haven't been executed
    if (condition.commandsNotExecuted) {
      const hasExecuted = condition.commandsNotExecuted.some((cmd) => {
        const pattern = new RegExp(cmd, "i");
        return progress.commandsExecuted.some((executed) =>
          pattern.test(executed),
        );
      });

      if (hasExecuted) {
        return false; // Don't show hint if they already executed the command
      }
    }

    // Check if validation not passed
    if (condition.validationNotPassed) {
      // If all validations passed, don't show this hint
      if (progress.validationsPassed >= progress.validationsTotal) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get a formatted hint message with styling
   */
  static formatHint(
    hint: Hint,
    index: number,
    total: number,
    cols = 80,
  ): string {
    const levelEmoji = this.getLevelEmoji(hint.level);
    const levelLabel = this.getLevelLabel(hint.level);

    const inner = Math.max(30, Math.min(cols - 2, 63));
    const headerPrefix = `  ${levelEmoji} HINT ${index}/${total} - `;
    const labelSpace = inner - headerPrefix.length;
    const wrapWidth = inner - 4; // "║  " + content + " "

    return `\x1b[1;36m╔${"═".repeat(inner)}╗\x1b[0m
\x1b[1;36m║${headerPrefix}${levelLabel.padEnd(labelSpace).slice(0, labelSpace)}║\x1b[0m
\x1b[1;36m╠${"═".repeat(inner)}╣\x1b[0m
\x1b[1;36m║\x1b[0m  ${this.wrapText(hint.message, wrapWidth).join("\n\x1b[1;36m║\x1b[0m  ")}
\x1b[1;36m╚${"═".repeat(inner)}╝\x1b[0m`;
  }

  /**
   * Get emoji for hint level
   */
  private static getLevelEmoji(level: number): string {
    switch (level) {
      case 1:
        return "💡";
      case 2:
        return "🔍";
      case 3:
        return "🎯";
      default:
        return "💡";
    }
  }

  /**
   * Get label for hint level
   */
  private static getLevelLabel(level: number): string {
    switch (level) {
      case 1:
        return "Gentle Nudge";
      case 2:
        return "More Specific";
      case 3:
        return "Very Specific";
      default:
        return "Helpful Tip";
    }
  }

  /**
   * Wrap text to fit within a specific width
   */
  private static wrapText(text: string, width: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (testLine.length <= width) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine.padEnd(width));
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine.padEnd(width));
    }

    return lines.length > 0 ? lines : ["".padEnd(width)];
  }

  /**
   * Get a summary of hint status
   */
  static getHintStatus(evaluation: HintEvaluation): string {
    if (evaluation.totalCount === 0) {
      return "\x1b[33mNo hints available for this step.\x1b[0m";
    }

    if (evaluation.revealedCount === evaluation.totalCount) {
      return `\x1b[33mAll hints revealed (${evaluation.totalCount}/${evaluation.totalCount}). You've got this!\x1b[0m`;
    }

    if (evaluation.nextHint) {
      return `\x1b[32mHint available! (${evaluation.revealedCount + 1}/${evaluation.totalCount})\x1b[0m Type \x1b[1;36mhint\x1b[0m to see it.`;
    }

    return `\x1b[33mNo new hints available yet. Keep trying!\x1b[0m (${evaluation.revealedCount}/${evaluation.totalCount} revealed)`;
  }

  /**
   * Get a message when user requests hint but none available
   */
  static getNoHintMessage(evaluation: HintEvaluation): string {
    if (evaluation.totalCount === 0) {
      return `\x1b[33mNo hints configured for this step.\x1b[0m

Try exploring the available commands or check the step objectives.`;
    }

    if (evaluation.revealedCount === evaluation.totalCount) {
      return `\x1b[33m📚 You've already revealed all ${evaluation.totalCount} hints!\x1b[0m

Review previous hints by checking your progress or try a different approach.`;
    }

    // Has more hints but not available yet
    const unrevealed = evaluation.totalCount - evaluation.revealedCount;
    return `\x1b[33m⏳ ${unrevealed} more hint${unrevealed > 1 ? "s" : ""} available, but not yet triggered.\x1b[0m

Hints unlock based on:
  • Time spent on the step
  • Failed validation attempts
  • Commands you've tried

Keep working on the step objectives and hints will appear when appropriate.`;
  }

  /**
   * Check if hint button should be highlighted (hint available)
   */
  static shouldHighlightHintButton(evaluation: HintEvaluation): boolean {
    return evaluation.nextHint !== null;
  }

  /**
   * Get hint count badge text
   */
  static getHintBadge(evaluation: HintEvaluation): string {
    return `${evaluation.revealedCount}/${evaluation.totalCount}`;
  }
}
