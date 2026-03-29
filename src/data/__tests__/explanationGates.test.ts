import { describe, it, expect } from "vitest";
import explanationGatesData from "../explanationGates.json";

interface ExplanationGate {
  id: string;
  scenarioId: string;
  familyId: string;
  triggerCondition?: {
    toolsUsed?: string[];
    toolsNotUsed?: string[];
  };
  question: string;
  choices: string[];
  correctAnswer: number;
  explanation: string;
}

interface ExplanationGatesFile {
  explanationGates: ExplanationGate[];
}

const validFamilyIds = [
  "gpu-monitoring",
  "infiniband-tools",
  "bmc-hardware",
  "cluster-tools",
  "container-tools",
  "diagnostics",
  "xid-diagnostics",
];

// All expected gate IDs from scenarios
const expectedGateIds = [
  // Domain 1
  "gate-domain1-bmc-config",
  "gate-domain1-bmc-security",
  "gate-domain1-firmware-verification",
  "gate-domain1-driver-troubleshoot",
  "gate-domain1-gpu-discovery",
  "gate-domain1-uefi-validation",
  // Domain 2
  "gate-domain2-nvlink-topo",
  "gate-domain2-nvlink-recovery",
  "gate-domain2-mig-setup",
  "gate-domain2-advanced-mig",
  "gate-domain2-gpu-power",
  "gate-domain2-bluefield-dpu",
  // Domain 3
  "gate-domain3-storage",
  "gate-domain3-slurm-config",
  "gate-domain3-slurm-gres",
  "gate-domain3-containers",
  "gate-domain3-nfs-tuning",
  "gate-domain3-dcgm-policy",
  "gate-domain3-k8s-gpu-operator",
  "gate-domain3-mixed-gpu-gres",
  "gate-domain3-slurm-full-setup",
  "gate-domain3-lustre-validation",
  "gate-domain3-bcm-ha",
  "gate-domain3-ngc-pipeline",
  "gate-domain3-pyxis-advanced",
  // Domain 4
  "gate-domain4-perf-baseline",
  "gate-domain4-gpu-reset",
  "gate-domain4-clusterkit",
  "gate-domain4-burn-in",
  "gate-domain4-ecc-investigation",
  "gate-domain4-dcgmi-diag",
  "gate-domain4-ai-validation",
  "gate-domain4-cluster-health",
  "gate-domain4-gpu-bandwidth",
  "gate-domain4-nccl-tuning",
  "gate-domain4-ib-stress",
  "gate-domain4-nccl-test",
  "gate-domain4-nccl-multinode",
  "gate-domain4-multinode-nccl",
  "gate-domain4-gpudirect-rdma",
  "gate-domain4-hpl-optimization",
  "gate-domain4-hpl-workflow",
  // Domain 5
  "gate-domain5-physical-inspection",
  "gate-domain5-cable-diagnostics",
  "gate-domain5-container-gpu",
  "gate-domain5-memory-leak",
  "gate-domain5-pcie-diagnosis",
  "gate-domain5-xid-hardware",
  "gate-domain5-xid-nvlink",
  "gate-domain5-xid-triage",
  "gate-domain5-ib-partitioning",
  "gate-domain5-driver-mismatch",
  "gate-domain5-critical-xid",
  "gate-domain5-xid-errors",
  "gate-domain5-sel-analysis",
  "gate-domain5-thermal",
  // XID Diagnostics family
  "gate-xid-diagnostics",
];

describe("explanationGates.json", () => {
  const data = explanationGatesData as ExplanationGatesFile;
  const gates = data.explanationGates;

  describe("file structure", () => {
    it("should have explanationGates array", () => {
      expect(data).toHaveProperty("explanationGates");
      expect(Array.isArray(gates)).toBe(true);
    });

    it("should have the expected number of gates (57)", () => {
      expect(gates.length).toBe(57);
    });
  });

  describe("gate IDs", () => {
    it("should have all expected gate IDs", () => {
      const actualIds = gates.map((g) => g.id);
      expectedGateIds.forEach((expectedId) => {
        expect(actualIds).toContain(expectedId);
      });
    });

    it("should have unique IDs", () => {
      const ids = gates.map((g) => g.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have IDs matching pattern gate-domain#-* or gate-<familyId>", () => {
      const idPattern = /^gate-(domain[1-5]-[\w-]+|[\w-]+)$/;
      gates.forEach((gate) => {
        expect(gate.id).toMatch(idPattern);
      });
    });
  });

  describe("gate structure", () => {
    it("each gate should have required properties", () => {
      gates.forEach((gate) => {
        expect(gate).toHaveProperty("id");
        expect(gate).toHaveProperty("scenarioId");
        expect(gate).toHaveProperty("familyId");
        expect(gate).toHaveProperty("question");
        expect(gate).toHaveProperty("choices");
        expect(gate).toHaveProperty("correctAnswer");
        expect(gate).toHaveProperty("explanation");
      });
    });

    it("each gate should have exactly 4 choices", () => {
      gates.forEach((gate) => {
        expect(gate.choices).toHaveLength(4);
      });
    });

    it("correctAnswer should be a valid index (0-3)", () => {
      gates.forEach((gate) => {
        expect(gate.correctAnswer).toBeGreaterThanOrEqual(0);
        expect(gate.correctAnswer).toBeLessThanOrEqual(3);
        expect(Number.isInteger(gate.correctAnswer)).toBe(true);
      });
    });

    it("each gate should have a valid familyId", () => {
      gates.forEach((gate) => {
        expect(validFamilyIds).toContain(gate.familyId);
      });
    });

    it("questions should be non-empty strings", () => {
      gates.forEach((gate) => {
        expect(typeof gate.question).toBe("string");
        expect(gate.question.length).toBeGreaterThan(10);
      });
    });

    it("explanations should be non-empty strings", () => {
      gates.forEach((gate) => {
        expect(typeof gate.explanation).toBe("string");
        expect(gate.explanation.length).toBeGreaterThan(20);
      });
    });

    it("all choices should be non-empty strings", () => {
      gates.forEach((gate) => {
        gate.choices.forEach((choice) => {
          expect(typeof choice).toBe("string");
          expect(choice.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("triggerCondition (optional)", () => {
    it("triggerCondition should have valid structure when present", () => {
      gates.forEach((gate) => {
        if (gate.triggerCondition) {
          const { toolsUsed, toolsNotUsed } = gate.triggerCondition;
          if (toolsUsed) {
            expect(Array.isArray(toolsUsed)).toBe(true);
            toolsUsed.forEach((tool) => {
              expect(typeof tool).toBe("string");
            });
          }
          if (toolsNotUsed) {
            expect(Array.isArray(toolsNotUsed)).toBe(true);
            toolsNotUsed.forEach((tool) => {
              expect(typeof tool).toBe("string");
            });
          }
        }
      });
    });
  });

  describe("scenarioId consistency", () => {
    it("scenarioId should match gate ID pattern or be empty for family-level gates", () => {
      gates.forEach((gate) => {
        if (gate.scenarioId === "") {
          // Family-level gates (not tied to a specific scenario) may have empty scenarioId
          return;
        }
        // gate-domain1-foo -> domain1-foo
        const expectedScenarioPrefix = gate.id.replace("gate-", "");
        expect(gate.scenarioId).toBe(expectedScenarioPrefix);
      });
    });
  });

  describe("domain distribution", () => {
    it("should have gates for all 5 domains", () => {
      const domainCounts = {
        domain1: 0,
        domain2: 0,
        domain3: 0,
        domain4: 0,
        domain5: 0,
      };

      gates.forEach((gate) => {
        const match = gate.id.match(/gate-(domain\d)/);
        if (match && match[1] in domainCounts) {
          domainCounts[match[1] as keyof typeof domainCounts]++;
        }
      });

      expect(domainCounts.domain1).toBeGreaterThan(0);
      expect(domainCounts.domain2).toBeGreaterThan(0);
      expect(domainCounts.domain3).toBeGreaterThan(0);
      expect(domainCounts.domain4).toBeGreaterThan(0);
      expect(domainCounts.domain5).toBeGreaterThan(0);
    });
  });

  describe("content quality", () => {
    it("questions should end with question mark", () => {
      gates.forEach((gate) => {
        expect(gate.question.trim()).toMatch(/\?$/);
      });
    });

    it("explanations should not be duplicated", () => {
      const explanations = gates.map((g) => g.explanation);
      const uniqueExplanations = new Set(explanations);
      expect(uniqueExplanations.size).toBe(explanations.length);
    });

    it("questions should not be duplicated", () => {
      const questions = gates.map((g) => g.question);
      const uniqueQuestions = new Set(questions);
      expect(uniqueQuestions.size).toBe(questions.length);
    });
  });

  describe("familyId distribution", () => {
    it("should use all command families", () => {
      const usedFamilies = new Set(gates.map((g) => g.familyId));
      validFamilyIds.forEach((family) => {
        expect(usedFamilies.has(family)).toBe(true);
      });
    });
  });
});
