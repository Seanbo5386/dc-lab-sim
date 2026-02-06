import { describe, it, expect } from "vitest";
import type { NarrativeScenario } from "../scenarios";
import narrativeData from "../../data/narrativeScenarios.json";

describe("NarrativeScenario types", () => {
  const scenarios = narrativeData.scenarios as NarrativeScenario[];

  it("should have valid scenario structure for all scenarios", () => {
    for (const scenario of scenarios) {
      expect(scenario.id).toBeTruthy();
      expect(scenario.domain).toBeGreaterThanOrEqual(1);
      expect(scenario.domain).toBeLessThanOrEqual(5);
      expect(scenario.title).toBeTruthy();
      expect(scenario.narrative.hook).toBeTruthy();
      expect(scenario.narrative.setting).toBeTruthy();
      expect(scenario.narrative.resolution).toBeTruthy();
      expect(scenario.commandFamilies.length).toBeGreaterThan(0);
      expect(scenario.estimatedMinutes).toBeGreaterThan(0);
      expect(scenario.steps.length).toBeGreaterThan(0);
    }
  });

  it("should have valid step structure for all steps", () => {
    for (const scenario of scenarios) {
      for (const step of scenario.steps) {
        expect(step.id).toBeTruthy();
        expect(step.situation).toBeTruthy();
        expect(step.task).toBeTruthy();
        expect(step.expectedCommands.length).toBeGreaterThan(0);
        expect(step.hints.length).toBeGreaterThan(0);
        expect(step.validation.type).toMatch(/^(command|output|state)$/);
      }
    }
  });

  it("should have valid quiz structure when present", () => {
    let quizCount = 0;
    for (const scenario of scenarios) {
      for (const step of scenario.steps) {
        if (step.quiz) {
          quizCount++;
          expect(step.quiz.question).toBeTruthy();
          expect(step.quiz.options.length).toBe(4);
          expect(step.quiz.correctIndex).toBeGreaterThanOrEqual(0);
          expect(step.quiz.correctIndex).toBeLessThan(4);
          expect(step.quiz.explanation).toBeTruthy();
        }
      }
    }
    expect(quizCount).toBeGreaterThan(0);
  });
});
