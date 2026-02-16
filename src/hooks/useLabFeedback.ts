import { useEffect, useRef } from "react";
import type { Terminal as XTerm } from "xterm";
import { useSimulationStore } from "@/store/simulationStore";

/** Word-wrap text to fit within a given width */
function wrapText(text: string, width: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (test.length > width) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

/**
 * Custom hook for lab start and completion feedback
 *
 * Displays terminal messages when:
 * - A new lab scenario starts
 * - A lab scenario is completed
 *
 * @param term - XTerm terminal instance
 * @param isReady - Whether the terminal is ready for output
 * @param selectedNode - Currently selected node name
 */
export function useLabFeedback(
  term: XTerm | null,
  isReady: boolean,
  selectedNode: string,
) {
  const activeScenario = useSimulationStore((state) => state.activeScenario);
  const scenarioProgress = useSimulationStore(
    (state) => state.scenarioProgress,
  );
  const previousScenarioId = useRef<string | null>(null);
  const completedScenariosRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!term || !isReady) return;

    const cols = term.cols || 80;
    // Box inner width adapts to terminal; cap at 60, min 30
    const inner = Math.max(30, Math.min(cols - 2, 60));

    // Detect Lab Start
    if (activeScenario && activeScenario.id !== previousScenarioId.current) {
      // New scenario started
      previousScenarioId.current = activeScenario.id;

      const prefix = "  STARTING LAB: ";
      const titleSpace = inner - prefix.length;
      const titleText = activeScenario.title
        .padEnd(titleSpace)
        .slice(0, titleSpace);

      // Print welcome header
      term.writeln("");
      term.writeln(`\x1b[1;32m╔${"═".repeat(inner)}╗\x1b[0m`);
      term.writeln(`\x1b[1;32m║${prefix}${titleText}║\x1b[0m`);
      term.writeln(`\x1b[1;32m╚${"═".repeat(inner)}╝\x1b[0m`);

      // Word-wrap description to terminal width
      const desc = activeScenario.description || "";
      for (const line of wrapText(desc, cols - 1)) {
        term.writeln(`\x1b[36m${line}\x1b[0m`);
      }
      term.writeln("");
      term.writeln(
        'Type "help" for commands. Follow the instructions in the side panel.',
      );

      const node = selectedNode || "dgx-00";
      term.write(`\n\x1b[1;32mroot@${node}\x1b[0m:\x1b[1;34m~\x1b[0m# `);
      return;
    }

    // Detect Lab Completion
    if (activeScenario) {
      const progress = scenarioProgress[activeScenario.id];
      if (
        progress?.completed &&
        !completedScenariosRef.current.has(activeScenario.id)
      ) {
        completedScenariosRef.current.add(activeScenario.id);

        const completeText = "  LAB COMPLETED SUCCESSFULLY!";
        const padded = completeText.padEnd(inner);

        term.writeln("");
        term.writeln("");
        term.writeln(`\x1b[1;32m╔${"═".repeat(inner)}╗\x1b[0m`);
        term.writeln(`\x1b[1;32m║${padded}║\x1b[0m`);
        term.writeln(`\x1b[1;32m╚${"═".repeat(inner)}╝\x1b[0m`);
        term.writeln("");
        term.writeln("\x1b[1;33mAccomplishments:\x1b[0m");
        activeScenario.learningObjectives.forEach((obj) => {
          for (const line of wrapText(`  ✓ ${obj}`, cols - 1)) {
            term.writeln(`\x1b[32m${line}\x1b[0m`);
          }
        });
        term.writeln("");
        term.writeln(
          "\x1b[36mYou may now exit successfully or continue exploring.\x1b[0m",
        );

        const node = selectedNode || "dgx-00";
        term.write(`\n\x1b[1;32mroot@${node}\x1b[0m:\x1b[1;34m~\x1b[0m# `);
      }
    } else {
      previousScenarioId.current = null;
    }
  }, [activeScenario, scenarioProgress, isReady, selectedNode, term]);
}
