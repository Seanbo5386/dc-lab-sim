import { describe, it, expect } from "vitest";
import {
  narrativeToScenario,
  narrativeStepToScenarioStep,
} from "../narrativeAdapter";
import type { NarrativeScenario, NarrativeStep } from "../../types/scenarios";

const mockNarrativeStep: NarrativeStep = {
  id: "step-1",
  situation: "The server rack is humming. BMC LEDs are amber.",
  task: "Use ipmitool to check the System Event Log for hardware alerts.",
  expectedCommands: ["ipmitool sel list", "ipmitool sel elist"],
  hints: ["Try ipmitool sel list", "Look for critical events"],
  validation: { type: "command", command: "ipmitool", pattern: "sel" },
  quiz: {
    question: "What does SEL stand for?",
    options: [
      "System Event Log",
      "Serial Error Log",
      "Sensor Entry List",
      "Server Event Ledger",
    ],
    correctIndex: 0,
    explanation: "SEL = System Event Log, the BMC's hardware event journal.",
  },
};

const mockNarrative: NarrativeScenario = {
  id: "test-scenario",
  domain: 1,
  title: "Test Narrative",
  difficulty: "intermediate",
  narrative: {
    hook: "Something has gone wrong.",
    setting: "You're the on-call engineer.",
    resolution: "You fixed it. Well done.",
  },
  commandFamilies: ["bmc-hardware", "gpu-monitoring"],
  estimatedMinutes: 20,
  steps: [mockNarrativeStep],
};

describe("narrativeToScenario", () => {
  it("should convert domain number to domain string", () => {
    const result = narrativeToScenario(mockNarrative);
    expect(result.domain).toBe("domain1");
  });

  it("should preserve id and title", () => {
    const result = narrativeToScenario(mockNarrative);
    expect(result.id).toBe("test-scenario");
    expect(result.title).toBe("Test Narrative");
  });

  it("should map narrative.setting to description", () => {
    const result = narrativeToScenario(mockNarrative);
    expect(result.description).toBe(mockNarrative.narrative.setting);
  });

  it("should map estimatedMinutes to estimatedTime", () => {
    const result = narrativeToScenario(mockNarrative);
    expect(result.estimatedTime).toBe(20);
  });

  it("should generate learningObjectives from commandFamilies", () => {
    const result = narrativeToScenario(mockNarrative);
    expect(result.learningObjectives.length).toBeGreaterThan(0);
  });

  it("should pass through commandFamilies", () => {
    const result = narrativeToScenario(mockNarrative);
    expect(result.commandFamilies).toEqual(["bmc-hardware", "gpu-monitoring"]);
  });

  it("should default faults to empty array", () => {
    const result = narrativeToScenario(mockNarrative);
    expect(result.faults).toEqual([]);
  });

  it("should store narrative metadata on the scenario", () => {
    const result = narrativeToScenario(mockNarrative);
    expect(result.narrative).toBeDefined();
    expect(result.narrative!.hook).toBe("Something has gone wrong.");
  });
});

describe("narrativeStepToScenarioStep", () => {
  it("should use task as title", () => {
    const result = narrativeStepToScenarioStep(mockNarrativeStep);
    expect(result.title).toContain("ipmitool");
  });

  it("should use situation as description", () => {
    const result = narrativeStepToScenarioStep(mockNarrativeStep);
    expect(result.description).toBe(mockNarrativeStep.situation);
  });

  it("should convert task into objectives array", () => {
    const result = narrativeStepToScenarioStep(mockNarrativeStep);
    expect(result.objectives.length).toBeGreaterThan(0);
  });

  it("should pass through expectedCommands", () => {
    const result = narrativeStepToScenarioStep(mockNarrativeStep);
    expect(result.expectedCommands).toEqual([
      "ipmitool sel list",
      "ipmitool sel elist",
    ]);
  });

  it("should pass through hints", () => {
    const result = narrativeStepToScenarioStep(mockNarrativeStep);
    expect(result.hints).toEqual(mockNarrativeStep.hints);
  });

  it("should convert validation to validationRules", () => {
    const result = narrativeStepToScenarioStep(mockNarrativeStep);
    expect(result.validationRules).toBeDefined();
    expect(result.validationRules!.length).toBeGreaterThan(0);
  });

  it("should set estimatedDuration from scenario average", () => {
    const result = narrativeStepToScenarioStep(mockNarrativeStep);
    expect(result.estimatedDuration).toBeGreaterThan(0);
  });

  it("should preserve quiz data in narrativeQuiz field", () => {
    const result = narrativeStepToScenarioStep(mockNarrativeStep);
    expect(result.narrativeQuiz).toBeDefined();
    expect(result.narrativeQuiz!.question).toBe("What does SEL stand for?");
  });

  it("should produce empty validationRules for concept steps", () => {
    const conceptStep: NarrativeStep = {
      ...mockNarrativeStep,
      type: "concept",
      expectedCommands: [],
      hints: [],
      validation: { type: "none" },
      conceptContent: "Concept explanation here.",
      tips: ["Tip 1"],
    };
    const result = narrativeStepToScenarioStep(conceptStep);
    expect(result.validationRules).toEqual([]);
    expect(result.stepType).toBe("concept");
    expect(result.conceptContent).toBe("Concept explanation here.");
    expect(result.tips).toEqual(["Tip 1"]);
    expect(result.objectives).toEqual(["Read and understand the concept"]);
  });

  it("should produce validation rules for observe steps with observeCommand", () => {
    const observeStep: NarrativeStep = {
      ...mockNarrativeStep,
      type: "observe",
      expectedCommands: [],
      hints: [],
      validation: { type: "none" },
      observeCommand: "nvidia-smi -q",
    };
    const result = narrativeStepToScenarioStep(observeStep);
    expect(result.validationRules).toHaveLength(1);
    expect(result.validationRules[0].type).toBe("command-executed");
    expect(result.validationRules[0].expectedCommands).toEqual([
      "nvidia-smi -q",
    ]);
    expect(result.expectedCommands).toContain("nvidia-smi -q");
    expect(result.stepType).toBe("observe");
    expect(result.observeCommand).toBe("nvidia-smi -q");
  });

  it("should produce empty validationRules for observe steps without observeCommand", () => {
    const observeStep: NarrativeStep = {
      ...mockNarrativeStep,
      type: "observe",
      expectedCommands: [],
      hints: [],
      validation: { type: "none" },
    };
    const result = narrativeStepToScenarioStep(observeStep);
    expect(result.validationRules).toEqual([]);
    expect(result.stepType).toBe("observe");
  });

  it("should handle validation.type === 'none' and return empty rules", () => {
    const noneStep: NarrativeStep = {
      ...mockNarrativeStep,
      validation: { type: "none" },
    };
    const result = narrativeStepToScenarioStep(noneStep);
    expect(result.validationRules).toEqual([]);
  });
});
