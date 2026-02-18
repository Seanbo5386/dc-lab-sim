import { describe, it, expect } from "vitest";
import scenariosData from "../narrativeScenarios.json";

interface NarrativeScenario {
  id: string;
  domain: 0 | 1 | 2 | 3 | 4 | 5;
  title: string;
  difficulty: string;
  narrative: {
    hook: string;
    setting: string;
    resolution: string;
  };
  commandFamilies: string[];
  estimatedMinutes: number;
  steps: NarrativeStep[];
}

interface AutoFault {
  nodeId: string;
  gpuId?: number;
  type: string;
  severity: string;
  parameters?: Record<string, unknown>;
}

interface NarrativeStep {
  id: string;
  type?: string;
  situation: string;
  task: string;
  expectedCommands?: string[];
  hints: string[];
  validation: {
    type: string;
    command?: string;
    pattern?: string;
  };
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  autoFaults?: AutoFault[];
  conceptContent?: string;
  tips?: string[];
  observeCommand?: string;
}

const scenarios = scenariosData.scenarios as NarrativeScenario[];

const validFamilyIds = [
  "gpu-monitoring",
  "infiniband-tools",
  "bmc-hardware",
  "cluster-tools",
  "container-tools",
  "diagnostics",
  "linux-basics",
];

// Separate domain 0 (Linux basics) from exam domains (1-5)
const examScenarios = scenarios.filter((s) => s.domain >= 1);
const domain0Scenarios = scenarios.filter((s) => s.domain === 0);

describe("narrativeScenarios.json", () => {
  it("should have scenarios array", () => {
    expect(scenariosData).toHaveProperty("scenarios");
    expect(Array.isArray(scenarios)).toBe(true);
  });

  it("should have 32 total narrative scenarios", () => {
    expect(scenarios.length).toBe(32);
  });

  it("should have 30 exam-domain scenarios (domains 1-5)", () => {
    expect(examScenarios.length).toBe(30);
  });

  it("should have 2 foundational scenarios (domain 0)", () => {
    expect(domain0Scenarios.length).toBe(2);
  });

  it("should cover all 6 domains (0-5)", () => {
    const domains = new Set(scenarios.map((s) => s.domain));
    expect(domains.size).toBe(6);
    [0, 1, 2, 3, 4, 5].forEach((d) =>
      expect(domains.has(d as 0 | 1 | 2 | 3 | 4 | 5)).toBe(true),
    );
  });

  describe("domain distribution", () => {
    it("should have 7 scenarios for Domain 1 (Systems & Bring-Up, 31%)", () => {
      const domain1 = scenarios.filter((s) => s.domain === 1);
      expect(domain1.length).toBe(7);
    });

    it("should have 4 scenarios for Domain 2 (Physical Layer, 5%)", () => {
      const domain2 = scenarios.filter((s) => s.domain === 2);
      expect(domain2.length).toBe(4);
    });

    it("should have 6 scenarios for Domain 3 (Control Plane, 19%)", () => {
      const domain3 = scenarios.filter((s) => s.domain === 3);
      expect(domain3.length).toBe(6);
    });

    it("should have 9 scenarios for Domain 4 (Cluster Test, 33%)", () => {
      const domain4 = scenarios.filter((s) => s.domain === 4);
      expect(domain4.length).toBe(9);
    });

    it("should have 4 scenarios for Domain 5 (Troubleshooting, 12%)", () => {
      const domain5 = scenarios.filter((s) => s.domain === 5);
      expect(domain5.length).toBe(4);
    });
  });

  describe("scenario structure", () => {
    it("exam scenarios should have required narrative fields with strict constraints", () => {
      examScenarios.forEach((s) => {
        expect(s).toHaveProperty("id");
        expect(s).toHaveProperty("domain");
        expect(s).toHaveProperty("title");
        expect(s).toHaveProperty("narrative");
        expect(s.narrative).toHaveProperty("hook");
        expect(s.narrative).toHaveProperty("setting");
        expect(s.narrative).toHaveProperty("resolution");
        expect(s).toHaveProperty("commandFamilies");
        expect(s.commandFamilies.length).toBeGreaterThanOrEqual(3);
        expect(s).toHaveProperty("estimatedMinutes");
        expect(s.estimatedMinutes).toBeGreaterThanOrEqual(15);
        expect(s.estimatedMinutes).toBeLessThanOrEqual(30);
        expect(s).toHaveProperty("steps");
        expect(s.steps.length).toBeGreaterThanOrEqual(8);
      });
    });

    it("domain 0 scenarios should have required narrative fields", () => {
      domain0Scenarios.forEach((s) => {
        expect(s).toHaveProperty("id");
        expect(s.domain).toBe(0);
        expect(s).toHaveProperty("narrative");
        expect(s.narrative).toHaveProperty("hook");
        expect(s.narrative).toHaveProperty("setting");
        expect(s.narrative).toHaveProperty("resolution");
        expect(s).toHaveProperty("commandFamilies");
        expect(s.commandFamilies.length).toBeGreaterThanOrEqual(1);
        expect(s.steps.length).toBeGreaterThanOrEqual(8);
      });
    });

    it("each scenario should have unique ID", () => {
      const ids = scenarios.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("scenario IDs should follow domain-based pattern", () => {
      scenarios.forEach((s) => {
        expect(s.id).toMatch(/^domain[0-5]-[\w-]+$/);
        // ID domain number should match domain field
        const idDomain = parseInt(s.id.match(/^domain(\d)/)?.[1] || "0");
        expect(idDomain).toBe(s.domain);
      });
    });

    it("commandFamilies should only contain valid family IDs", () => {
      scenarios.forEach((s) => {
        s.commandFamilies.forEach((family) => {
          expect(validFamilyIds).toContain(family);
        });
      });
    });
  });

  describe("step structure", () => {
    it("each step should have required fields", () => {
      scenarios.forEach((s) => {
        s.steps.forEach((step) => {
          expect(step).toHaveProperty("id");
          expect(step).toHaveProperty("situation");
          expect(step).toHaveProperty("task");
          expect(step).toHaveProperty("hints");
          expect(step).toHaveProperty("validation");
          // Command steps require hints; concept/observe may have empty hints
          const stepType = step.type || "command";
          if (stepType === "command") {
            expect(step.hints.length).toBeGreaterThanOrEqual(1);
          }
        });
      });
    });

    it("step IDs should be unique within each scenario", () => {
      scenarios.forEach((s) => {
        const stepIds = s.steps.map((step) => step.id);
        const uniqueStepIds = new Set(stepIds);
        expect(uniqueStepIds.size).toBe(stepIds.length);
      });
    });

    it("validation should have required type field", () => {
      scenarios.forEach((s) => {
        s.steps.forEach((step) => {
          expect(step.validation).toHaveProperty("type");
          expect(typeof step.validation.type).toBe("string");
        });
      });
    });
  });

  describe("quiz integration", () => {
    it("scenarios should have 2-3 integrated quizzes each", () => {
      scenarios.forEach((s) => {
        const quizCount = s.steps.filter((step) => step.quiz).length;
        expect(quizCount).toBeGreaterThanOrEqual(2);
        expect(quizCount).toBeLessThanOrEqual(4);
      });
    });

    it("quiz objects should have required fields", () => {
      scenarios.forEach((s) => {
        s.steps.forEach((step) => {
          if (step.quiz) {
            expect(step.quiz).toHaveProperty("question");
            expect(step.quiz).toHaveProperty("options");
            expect(step.quiz).toHaveProperty("correctIndex");
            expect(step.quiz).toHaveProperty("explanation");
            expect(step.quiz.options.length).toBe(4);
            expect(step.quiz.correctIndex).toBeGreaterThanOrEqual(0);
            expect(step.quiz.correctIndex).toBeLessThanOrEqual(3);
          }
        });
      });
    });

    it("quiz questions should end with question mark", () => {
      scenarios.forEach((s) => {
        s.steps.forEach((step) => {
          if (step.quiz) {
            expect(step.quiz.question.trim()).toMatch(/\?$/);
          }
        });
      });
    });
  });

  describe("content quality", () => {
    it("scenario titles should be unique and descriptive", () => {
      const titles = scenarios.map((s) => s.title);
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(titles.length);
    });

    it("narrative hooks should be non-empty", () => {
      scenarios.forEach((s) => {
        expect(s.narrative.hook.length).toBeGreaterThan(20);
      });
    });

    it("narrative settings should be non-empty", () => {
      scenarios.forEach((s) => {
        expect(s.narrative.setting.length).toBeGreaterThan(20);
      });
    });

    it("narrative resolutions should be non-empty", () => {
      scenarios.forEach((s) => {
        expect(s.narrative.resolution.length).toBeGreaterThan(20);
      });
    });

    it("step situations and tasks should be descriptive", () => {
      scenarios.forEach((s) => {
        s.steps.forEach((step) => {
          expect(step.situation.length).toBeGreaterThan(10);
          // Concept/observe step titles can be short (e.g. "cat in Action")
          expect(step.task.length).toBeGreaterThan(5);
        });
      });
    });
  });

  describe("autoFaults validation", () => {
    const validFaultTypes = [
      "xid-error",
      "thermal",
      "ecc-error",
      "nvlink-failure",
      "gpu-hang",
      "power",
      "memory-full",
      "driver-error",
      "pcie-error",
      "add-node",
    ];

    const allAutoFaults = scenarios.flatMap((s) =>
      s.steps.flatMap((step) =>
        (step.autoFaults || []).map((fault) => ({
          scenarioId: s.id,
          stepId: step.id,
          ...fault,
        })),
      ),
    );

    it("all autoFaults entries should have valid fault types", () => {
      expect(allAutoFaults.length).toBeGreaterThan(0);
      allAutoFaults.forEach((fault) => {
        expect(validFaultTypes).toContain(fault.type);
      });
    });

    it("autoFaults should have valid nodeId (non-empty string) and gpuId (number >= 0)", () => {
      allAutoFaults.forEach((fault) => {
        expect(typeof fault.nodeId).toBe("string");
        expect(fault.nodeId.length).toBeGreaterThan(0);
        if (fault.gpuId !== undefined) {
          expect(typeof fault.gpuId).toBe("number");
          expect(fault.gpuId).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it("no autoFaults should reference gpuId > 7 (max 8 GPUs per DGX node, 0-indexed)", () => {
      allAutoFaults.forEach((fault) => {
        if (fault.gpuId !== undefined) {
          expect(fault.gpuId).toBeLessThanOrEqual(7);
        }
      });
    });

    it("autoFaults parameters should have correct fields for their type", () => {
      allAutoFaults.forEach((fault) => {
        if (fault.type === "xid-error" && fault.parameters) {
          expect(fault.parameters).toHaveProperty("xid");
          expect(typeof fault.parameters.xid).toBe("number");
        }
        if (fault.type === "thermal" && fault.parameters) {
          expect(fault.parameters).toHaveProperty("targetTemp");
          expect(typeof fault.parameters.targetTemp).toBe("number");
        }
        if (fault.type === "ecc-error" && fault.parameters) {
          expect(fault.parameters).toHaveProperty("singleBit");
          expect(typeof fault.parameters.singleBit).toBe("number");
        }
        if (fault.type === "memory-full" && fault.parameters) {
          expect(fault.parameters).toHaveProperty("memoryUsed");
          expect(typeof fault.parameters.memoryUsed).toBe("number");
        }
      });
    });

    it("autoFaults should have valid severity values", () => {
      allAutoFaults.forEach((fault) => {
        expect(["warning", "critical"]).toContain(fault.severity);
      });
    });
  });

  describe("scenario coverage and completeness", () => {
    it("should have all 32 scenarios present with at least 2 steps each", () => {
      expect(scenarios.length).toBe(32);
      scenarios.forEach((s) => {
        expect(s.steps.length).toBeGreaterThanOrEqual(2);
      });
    });

    it("all scenario difficulty levels should be valid", () => {
      const validDifficulties = ["beginner", "intermediate", "advanced"];
      scenarios.forEach((s) => {
        expect(validDifficulties).toContain(s.difficulty);
      });
    });

    it("step validation types should be valid", () => {
      const validValidationTypes = [
        "command",
        "output",
        "state",
        "multi-command",
        "quiz",
        "none",
      ];
      scenarios.forEach((s) => {
        s.steps.forEach((step) => {
          expect(validValidationTypes).toContain(step.validation.type);
        });
      });
    });

    it("all expectedCommands should reference known simulator commands", () => {
      const knownCommandPrefixes = [
        "nvidia-smi",
        "nvidia-bug-report",
        "nvidia-bug-report.sh",
        "dcgmi",
        "nvsm",
        "nvtop",
        "nvcc",
        "ipmitool",
        "sensors",
        "dmidecode",
        "ibstat",
        "ibdiagnet",
        "iblinkinfo",
        "ibhosts",
        "ibswitches",
        "ibnetdiscover",
        "ibping",
        "ibtracert",
        "ibcableerrors",
        "ibporterrors",
        "perfquery",
        "sinfo",
        "squeue",
        "scontrol",
        "sacct",
        "sacctmgr",
        "sbatch",
        "srun",
        "docker",
        "enroot",
        "nvidia-container-cli",
        "gpu-burn",
        "all_reduce_perf",
        "ib_write_bw",
        "ib_read_bw",
        "cat",
        "dmesg",
        "lspci",
        "lsmod",
        "lscpu",
        "modinfo",
        "uname",
        "hostname",
        "systemctl",
        "journalctl",
        "ip",
        "free",
        "df",
        "iostat",
        "mount",
        "dpkg",
        "apt",
        "ldconfig",
        "efibootmgr",
        "ssh",
        "mpirun",
        "numactl",
        "taskset",
        "ofed_info",
        "mlxfwmanager",
        "mlxconfig",
        "mlxlink",
        "mlxcables",
        "mst",
        "sminfo",
        "smpquery",
        "env",
        "nfsstat",
        "lfs",
        "pwd",
        "cd",
        "tail",
        "NCCL_DEBUG=INFO",
        "NCCL_IB_DISABLE=0",
        "NCCL_P2P_DISABLE=0",
      ];
      scenarios.forEach((s) => {
        s.steps.forEach((step) => {
          if (step.expectedCommands) {
            step.expectedCommands.forEach((cmd) => {
              const cmdRoot = cmd.split(" ")[0].split("/")[0];
              expect(knownCommandPrefixes).toContain(cmdRoot);
            });
          }
        });
      });
    });

    it("validation pattern fields should be valid regex strings", () => {
      scenarios.forEach((s) => {
        s.steps.forEach((step) => {
          if (step.validation.pattern) {
            expect(() => new RegExp(step.validation.pattern!)).not.toThrow();
          }
        });
      });
    });
  });
});
