import type {
  NarrativeScenario,
  NarrativeStep,
  Scenario,
  ScenarioStep,
  ValidationRule,
  ScenarioDomainId,
} from "../types/scenarios";

/**
 * Convert a NarrativeScenario to the standard Scenario format
 * used by the store, LabWorkspace, and progress tracking.
 */
export function narrativeToScenario(narrative: NarrativeScenario): Scenario {
  const domainStr = `domain${narrative.domain}` as ScenarioDomainId;
  const avgStepTime = Math.max(
    1,
    Math.round(narrative.estimatedMinutes / narrative.steps.length),
  );

  return {
    id: narrative.id,
    title: narrative.title,
    domain: domainStr,
    difficulty: narrative.difficulty || "intermediate",
    description: narrative.narrative.setting,
    learningObjectives: extractLearningObjectives(narrative),
    faults: narrative.faults || [],
    steps: narrative.steps.map((step) =>
      narrativeStepToScenarioStep(step, avgStepTime),
    ),
    successCriteria: [`Complete all ${narrative.steps.length} steps`],
    estimatedTime: narrative.estimatedMinutes,
    commandFamilies: narrative.commandFamilies,
    tier: narrative.tier,
    toolHints: narrative.tier === 1,
    tags: [`domain${narrative.domain}`, "narrative"],

    // Preserve narrative metadata for immersive UI
    narrative: narrative.narrative,
  };
}

/**
 * Convert a NarrativeStep to the standard ScenarioStep format.
 */
export function narrativeStepToScenarioStep(
  step: NarrativeStep,
  avgStepTime: number = 3,
): ScenarioStep {
  const stepType = step.type || "command";
  const isConcept = stepType === "concept";
  const isObserve = stepType === "observe";

  // Observe steps with an observeCommand require the user to type it
  const observeRequiresCLI = isObserve && !!step.observeCommand;
  const effectiveExpectedCommands = observeRequiresCLI
    ? [step.observeCommand!, ...step.expectedCommands]
    : step.expectedCommands;

  const validationRules = isConcept
    ? []
    : observeRequiresCLI
      ? convertValidation({ type: "command", command: step.observeCommand! }, [
          step.observeCommand!,
        ])
      : convertValidation(step.validation, step.expectedCommands);

  return {
    id: step.id,
    stepType: step.type,
    title: step.task,
    description: step.situation,
    objectives: isConcept ? ["Read and understand the concept"] : [step.task],
    expectedCommands: effectiveExpectedCommands,
    validationRules,
    hints: step.hints,
    estimatedDuration: avgStepTime,
    conceptContent: step.conceptContent,
    tips: step.tips,
    observeCommand: step.observeCommand,

    // Preserve quiz for narrative UI
    narrativeQuiz: step.quiz,

    // Pass through auto-faults for sandbox injection
    autoFaults: step.autoFaults,
  };
}

/**
 * Convert the simple narrative validation to ValidationRule[].
 */
function convertValidation(
  validation: NarrativeStep["validation"],
  expectedCommands: string[],
): ValidationRule[] {
  if (validation.type === "none") {
    return [];
  }

  const rules: ValidationRule[] = [];

  if (validation.type === "command") {
    rules.push({
      type: "command-executed",
      description: `Run ${validation.command || expectedCommands[0]}`,
      expectedCommands,
      outputPattern: validation.pattern,
      requireAllCommands: expectedCommands.length > 1,
    });
  } else if (validation.type === "output" && validation.pattern) {
    rules.push({
      type: "output-match",
      description: `Verify output matches expected pattern`,
      expectedCommands,
      outputPattern: validation.pattern,
    });
  } else if (validation.type === "state") {
    rules.push({
      type: "state-check",
      description: `Verify system state`,
      expectedCommands,
    });
  }

  return rules;
}

/**
 * Extract learning objectives from scenario steps.
 */
function extractLearningObjectives(narrative: NarrativeScenario): string[] {
  const familyNames: Record<string, string> = {
    "bmc-hardware": "BMC and hardware management with ipmitool",
    "gpu-monitoring": "GPU monitoring with nvidia-smi and DCGM",
    "infiniband-tools": "InfiniBand fabric diagnostics",
    "cluster-tools": "Slurm cluster management",
    "container-tools": "Container orchestration with Docker and Enroot",
    diagnostics: "System diagnostics and troubleshooting",
    "linux-basics": "Essential Linux terminal skills",
  };

  const objectives: string[] = [];
  for (const family of narrative.commandFamilies) {
    if (familyNames[family]) {
      objectives.push(familyNames[family]);
    }
  }

  return objectives;
}
