import { describe, it, expect, vi, beforeEach } from "vitest";
import { SlurmSimulator } from "../slurmSimulator";
import type { CommandContext } from "@/types/commands";
import { createDefaultCluster } from "@/utils/clusterFactory";
import { parse as parseCommand } from "@/utils/commandParser";

// Mock logger
vi.mock("@/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the simulation store (required by BaseSimulator)
vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: {
    getState: vi.fn(() => ({
      cluster: createDefaultCluster(),
      trackToolUsage: vi.fn(),
    })),
  },
}));

function createTestContext(): CommandContext {
  const cluster = createDefaultCluster();
  return {
    currentNode: cluster.nodes[0].id,
    currentPath: "/root",
    environment: { PATH: "/usr/bin", HOME: "/root", USER: "root" },
    history: [],
    cluster,
  };
}

describe("SlurmSimulator Job Injection", () => {
  let sim: SlurmSimulator;
  let context: CommandContext;

  beforeEach(() => {
    sim = new SlurmSimulator();
    context = createTestContext();
  });

  describe("injectJob", () => {
    it("should add a RUNNING job visible in squeue", () => {
      sim.injectJob({
        jobName: "train-llm",
        nodeIds: ["dgx-00", "dgx-01"],
        gpusPerNode: 8,
        runtime: "2:30:00",
        user: "researcher",
        partition: "gpu",
        state: "RUNNING",
      });

      const result = sim.executeSqueue(parseCommand("squeue"), context);
      expect(result.output).toContain("train-llm");
      expect(result.output).toContain("dgx-00");
      expect(result.output).toContain("R ");
    });

    it("should add a PENDING job with reason", () => {
      sim.injectJob({
        jobName: "waiting-job",
        nodeIds: [],
        gpusPerNode: 8,
        runtime: "0:00:00",
        user: "user2",
        partition: "gpu",
        state: "PENDING",
        reasonPending: "Resources",
      });

      const result = sim.executeSqueue(parseCommand("squeue"), context);
      expect(result.output).toContain("waiting-job");
      expect(result.output).toContain("PD");
      expect(result.output).toContain("Resources");
    });

    it("should add a FAILED job visible in squeue", () => {
      sim.injectJob({
        jobName: "crashed-job",
        nodeIds: ["dgx-02"],
        gpusPerNode: 4,
        runtime: "0:05:30",
        user: "mlteam",
        partition: "gpu",
        state: "FAILED",
      });

      const result = sim.executeSqueue(parseCommand("squeue"), context);
      expect(result.output).toContain("crashed-job");
      expect(result.output).toContain("F ");
    });

    it("should increment job IDs for multiple injected jobs", () => {
      sim.injectJob({
        jobName: "job-1",
        nodeIds: ["dgx-00"],
        gpusPerNode: 8,
        runtime: "1:00:00",
        user: "user1",
        partition: "gpu",
        state: "RUNNING",
      });
      sim.injectJob({
        jobName: "job-2",
        nodeIds: ["dgx-01"],
        gpusPerNode: 8,
        runtime: "2:00:00",
        user: "user2",
        partition: "gpu",
        state: "RUNNING",
      });

      const result = sim.executeSqueue(parseCommand("squeue"), context);
      expect(result.output).toContain("job-1");
      expect(result.output).toContain("job-2");
    });
  });

  describe("clearJobs", () => {
    it("should remove all injected jobs", () => {
      sim.injectJob({
        jobName: "will-be-cleared",
        nodeIds: ["dgx-00"],
        gpusPerNode: 8,
        runtime: "1:00:00",
        user: "user1",
        partition: "gpu",
        state: "RUNNING",
      });

      sim.clearJobs();

      const result = sim.executeSqueue(parseCommand("squeue"), context);
      expect(result.output).not.toContain("will-be-cleared");
    });

    it("should reset job ID counter", () => {
      sim.injectJob({
        jobName: "old-job",
        nodeIds: ["dgx-00"],
        gpusPerNode: 8,
        runtime: "1:00:00",
        user: "user1",
        partition: "gpu",
        state: "RUNNING",
      });

      sim.clearJobs();

      sim.injectJob({
        jobName: "new-job",
        nodeIds: ["dgx-00"],
        gpusPerNode: 8,
        runtime: "1:00:00",
        user: "user1",
        partition: "gpu",
        state: "RUNNING",
      });

      const result = sim.executeSqueue(parseCommand("squeue"), context);
      expect(result.output).toContain("1000");
    });
  });
});
