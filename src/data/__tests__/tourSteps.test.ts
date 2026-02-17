import { describe, it, expect } from "vitest";
import {
  SIMULATOR_TOUR_STEPS,
  LABS_TOUR_STEPS,
  DOCS_TOUR_STEPS,
  EXAMS_TOUR_STEPS,
  ABOUT_TOUR_STEPS,
  TOUR_STEPS,
  type TourStep,
  type TourId,
} from "../tourSteps";

function validateSteps(steps: TourStep[]) {
  for (const step of steps) {
    expect(step.selector).toBeTruthy();
    expect(step.title).toBeTruthy();
    expect(step.description.length).toBeGreaterThan(10);
    expect(["top", "bottom", "left", "right"]).toContain(step.placement);
  }
}

describe("tourSteps", () => {
  it("SIMULATOR_TOUR_STEPS has 8 steps with valid structure", () => {
    expect(SIMULATOR_TOUR_STEPS).toHaveLength(8);
    validateSteps(SIMULATOR_TOUR_STEPS);
  });

  it("LABS_TOUR_STEPS has 4 steps with valid structure", () => {
    expect(LABS_TOUR_STEPS).toHaveLength(4);
    validateSteps(LABS_TOUR_STEPS);
  });

  it("DOCS_TOUR_STEPS has 7 steps with valid structure", () => {
    expect(DOCS_TOUR_STEPS).toHaveLength(7);
    validateSteps(DOCS_TOUR_STEPS);
  });

  it("EXAMS_TOUR_STEPS has 4 steps with valid structure", () => {
    expect(EXAMS_TOUR_STEPS).toHaveLength(4);
    validateSteps(EXAMS_TOUR_STEPS);
  });

  it("ABOUT_TOUR_STEPS has 5 steps with valid structure", () => {
    expect(ABOUT_TOUR_STEPS).toHaveLength(5);
    validateSteps(ABOUT_TOUR_STEPS);
  });

  it("TOUR_STEPS maps all tour IDs", () => {
    const ids: TourId[] = ["simulator", "labs", "docs", "exams", "about"];
    for (const id of ids) {
      expect(TOUR_STEPS[id]).toBeDefined();
      expect(TOUR_STEPS[id].length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate selectors within each tour", () => {
    const allTours = [
      SIMULATOR_TOUR_STEPS,
      LABS_TOUR_STEPS,
      DOCS_TOUR_STEPS,
      EXAMS_TOUR_STEPS,
      ABOUT_TOUR_STEPS,
    ];
    for (const steps of allTours) {
      const selectors = steps.map((s) => s.selector);
      expect(new Set(selectors).size).toBe(selectors.length);
    }
  });

  it("all selectors are valid CSS selectors", () => {
    const allSteps = [
      ...SIMULATOR_TOUR_STEPS,
      ...LABS_TOUR_STEPS,
      ...DOCS_TOUR_STEPS,
      ...EXAMS_TOUR_STEPS,
      ...ABOUT_TOUR_STEPS,
    ];
    for (const step of allSteps) {
      // Should not throw when used with querySelector
      expect(() => document.querySelector(step.selector)).not.toThrow();
    }
  });
});
