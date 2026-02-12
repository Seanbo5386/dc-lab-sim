import { describe, it, expect } from "vitest";
import {
  BASIC_FAULT_DESCRIPTIONS,
  COMPLEX_SCENARIO_DESCRIPTIONS,
  WORKLOAD_DESCRIPTIONS,
  getBasicFaultDescription,
  getComplexScenarioDescription,
  getWorkloadDescription,
} from "../faultDescriptions";

describe("faultDescriptions", () => {
  describe("BASIC_FAULT_DESCRIPTIONS", () => {
    const expectedTypes = ["xid", "ecc", "thermal", "nvlink", "power", "pcie"];

    it("has an entry for every basic fault type", () => {
      const actualTypes = BASIC_FAULT_DESCRIPTIONS.map((d) => d.type);
      for (const type of expectedTypes) {
        expect(actualTypes).toContain(type);
      }
    });

    it("has exactly 6 entries", () => {
      expect(BASIC_FAULT_DESCRIPTIONS).toHaveLength(6);
    });

    it.each(BASIC_FAULT_DESCRIPTIONS)(
      "$type has all required fields populated",
      (fault) => {
        expect(fault.type).toBeTruthy();
        expect(fault.title).toBeTruthy();
        expect(fault.whatHappens).toBeTruthy();
        expect(fault.whyItMatters).toBeTruthy();
        expect(fault.dashboardIndicators.length).toBeGreaterThan(0);
        expect(fault.suggestedCommands.length).toBeGreaterThan(0);
        expect(Array.isArray(fault.relatedXIDCodes)).toBe(true);
      },
    );
  });

  describe("COMPLEX_SCENARIO_DESCRIPTIONS", () => {
    const expectedTypes = [
      "gpu-hang",
      "bus-reset",
      "thermal-alert",
      "severe-ecc",
    ];

    it("has an entry for every complex scenario type", () => {
      const actualTypes = COMPLEX_SCENARIO_DESCRIPTIONS.map((d) => d.type);
      for (const type of expectedTypes) {
        expect(actualTypes).toContain(type);
      }
    });

    it("has exactly 4 entries", () => {
      expect(COMPLEX_SCENARIO_DESCRIPTIONS).toHaveLength(4);
    });

    it.each(COMPLEX_SCENARIO_DESCRIPTIONS)(
      "$type has all required fields populated",
      (scenario) => {
        expect(scenario.type).toBeTruthy();
        expect(scenario.title).toBeTruthy();
        expect(scenario.whatHappens).toBeTruthy();
        expect(scenario.whyItMatters).toBeTruthy();
        expect(scenario.dashboardIndicators.length).toBeGreaterThan(0);
        expect(scenario.suggestedCommands.length).toBeGreaterThan(0);
      },
    );
  });

  describe("WORKLOAD_DESCRIPTIONS", () => {
    const expectedPatterns = ["idle", "inference", "training", "stress"];

    it("has an entry for every workload pattern", () => {
      const actualPatterns = WORKLOAD_DESCRIPTIONS.map((d) => d.pattern);
      for (const pattern of expectedPatterns) {
        expect(actualPatterns).toContain(pattern);
      }
    });

    it("has exactly 4 entries", () => {
      expect(WORKLOAD_DESCRIPTIONS).toHaveLength(4);
    });

    it.each(WORKLOAD_DESCRIPTIONS)(
      "$pattern has all required fields populated",
      (workload) => {
        expect(workload.pattern).toBeTruthy();
        expect(workload.title).toBeTruthy();
        expect(workload.description).toBeTruthy();
        expect(workload.dashboardChanges.length).toBeGreaterThan(0);
      },
    );
  });

  describe("lookup helpers", () => {
    it("getBasicFaultDescription returns matching entry", () => {
      const desc = getBasicFaultDescription("xid");
      expect(desc).toBeDefined();
      expect(desc!.type).toBe("xid");
    });

    it("getBasicFaultDescription returns undefined for unknown type", () => {
      expect(getBasicFaultDescription("unknown")).toBeUndefined();
    });

    it("getComplexScenarioDescription returns matching entry", () => {
      const desc = getComplexScenarioDescription("gpu-hang");
      expect(desc).toBeDefined();
      expect(desc!.type).toBe("gpu-hang");
    });

    it("getComplexScenarioDescription returns undefined for unknown type", () => {
      expect(getComplexScenarioDescription("unknown")).toBeUndefined();
    });

    it("getWorkloadDescription returns matching entry", () => {
      const desc = getWorkloadDescription("training");
      expect(desc).toBeDefined();
      expect(desc!.pattern).toBe("training");
    });

    it("getWorkloadDescription returns undefined for unknown pattern", () => {
      expect(getWorkloadDescription("unknown")).toBeUndefined();
    });
  });
});
