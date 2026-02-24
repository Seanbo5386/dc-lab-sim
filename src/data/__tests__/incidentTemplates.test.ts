import { describe, it, expect } from "vitest";
import {
  INCIDENT_TEMPLATES,
  type IncidentTemplate,
} from "../incidentTemplates";

describe("incidentTemplates", () => {
  it("should have at least 8 templates", () => {
    expect(INCIDENT_TEMPLATES.length).toBeGreaterThanOrEqual(8);
  });

  it("should have unique IDs", () => {
    const ids = INCIDENT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have valid domain tags (1-5)", () => {
    for (const t of INCIDENT_TEMPLATES) {
      for (const d of t.domains) {
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(5);
      }
    }
  });

  it("should have valid difficulty levels", () => {
    const valid = ["beginner", "intermediate", "advanced"];
    for (const t of INCIDENT_TEMPLATES) {
      expect(valid).toContain(t.difficulty);
    }
  });

  it("should have a non-empty diagnosticPath", () => {
    for (const t of INCIDENT_TEMPLATES) {
      expect(t.diagnosticPath.length).toBeGreaterThan(0);
    }
  });

  it("should have a rootCause description", () => {
    for (const t of INCIDENT_TEMPLATES) {
      expect(t.rootCause.length).toBeGreaterThan(0);
    }
  });

  it("should have at least one primary fault", () => {
    for (const t of INCIDENT_TEMPLATES) {
      expect(t.primaryFaults.length).toBeGreaterThan(0);
    }
  });

  it("should have a situation briefing", () => {
    for (const t of INCIDENT_TEMPLATES) {
      expect(t.situation.length).toBeGreaterThan(10);
    }
  });

  it("should cover all 5 exam domains", () => {
    const allDomains = new Set<number>();
    for (const t of INCIDENT_TEMPLATES) {
      for (const d of t.domains) {
        allDomains.add(d);
      }
    }
    expect(allDomains.size).toBe(5);
    for (let d = 1; d <= 5; d++) {
      expect(allDomains.has(d)).toBe(true);
    }
  });

  it("should cover all 3 difficulty levels", () => {
    const levels = new Set(INCIDENT_TEMPLATES.map((t) => t.difficulty));
    expect(levels.has("beginner")).toBe(true);
    expect(levels.has("intermediate")).toBe(true);
    expect(levels.has("advanced")).toBe(true);
  });

  it("should have rootCauseOptions with at least 3 choices each", () => {
    for (const t of INCIDENT_TEMPLATES) {
      expect(t.rootCauseOptions.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("should have correctRootCause that matches one of the rootCauseOptions", () => {
    for (const t of INCIDENT_TEMPLATES) {
      expect(t.rootCauseOptions).toContain(t.correctRootCause);
    }
  });

  it("should have propagationTrigger that references a known fault rule", () => {
    const knownTriggers = [
      "xid-43",
      "xid-48",
      "xid-79",
      "thermal-runaway",
      "nvlink-failure",
      "ecc-accumulation",
      "power-anomaly",
    ];
    for (const t of INCIDENT_TEMPLATES) {
      // At least the first propagation trigger should be known
      // (combined incidents may have multiple)
      expect(knownTriggers).toContain(
        t.propagationTrigger.split(",")[0].trim(),
      );
    }
  });

  it("should satisfy IncidentTemplate type contract", () => {
    // TypeScript compile-time check: ensure exported type matches usage
    const _check: IncidentTemplate[] = INCIDENT_TEMPLATES;
    expect(_check).toBeDefined();
  });
});
