import { describe, it, expect, beforeEach } from "vitest";
import { SlurmSimulator } from "../slurmSimulator";
import { useSimulationStore } from "@/store/simulationStore";
import { parse } from "@/utils/commandParser";
import { vi } from "vitest";

vi.mock("@/store/simulationStore");

function makeNode(
  id: string,
  slurmState: "idle" | "alloc" | "drain" | "down",
  gpuCount = 8,
) {
  return {
    id,
    hostname: `${id}.cluster.local`,
    systemType: "DGX-H100",
    gpus: Array(gpuCount)
      .fill(null)
      .map((_, i) => ({ id: i, name: "NVIDIA H100 80GB HBM3" })),
    cpuCount: 2,
    ramTotal: 2048,
    ramUsed: 512,
    slurmState,
    slurmReason: undefined,
  };
}

describe("SlurmSimulator srun scheduling (SIM-21)", () => {
  let simulator: SlurmSimulator;
  const context = {
    currentNode: "dgx-00",
    currentPath: "/root",
    environment: {},
    history: [],
  };

  function mockCluster(nodes: ReturnType<typeof makeNode>[]) {
    vi.mocked(useSimulationStore.getState).mockReturnValue({
      cluster: { nodes },
      setSlurmState: vi.fn(),
      allocateGPUsForJob: vi.fn(),
      deallocateGPUsForJob: vi.fn(),
    } as unknown as ReturnType<typeof useSimulationStore.getState>);
  }

  beforeEach(() => {
    simulator = new SlurmSimulator();
  });

  it("fails with a non-zero exit code when no node is idle", () => {
    mockCluster([makeNode("dgx-00", "alloc"), makeNode("dgx-01", "down")]);
    const result = simulator.executeSrun(parse("srun nvidia-smi"), context);
    expect(result.exitCode).toBe(1);
    expect(result.output).toMatch(/Unable to allocate resources/);
  });

  it("fails when the requested GPU count exceeds every idle node's GPU count", () => {
    mockCluster([makeNode("dgx-00", "idle", 8)]);
    const result = simulator.executeSrun(
      parse("srun --gpus 16 nvidia-smi"),
      context,
    );
    expect(result.exitCode).toBe(1);
  });

  it("succeeds against an idle node and records a completed job visible in squeue", () => {
    mockCluster([makeNode("dgx-00", "idle", 8)]);
    const result = simulator.executeSrun(
      parse("srun --gpus 2 nvidia-smi"),
      context,
    );
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Allocated 2 GPU(s) from dgx-00");

    const squeueResult = simulator.executeSqueue(parse("squeue"), context);
    expect(squeueResult.output).toContain("dgx-00");
    expect(squeueResult.output).toMatch(/CD/);
  });

  it("shows a generic completion message for a non-nvidia-smi command", () => {
    mockCluster([makeNode("dgx-00", "idle", 8)]);
    const result = simulator.executeSrun(
      parse("srun --gpus 1 my_script.sh"),
      context,
    );
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Executing: my_script.sh");
    expect(result.output).toContain("Job completed successfully");
  });

  it("only schedules onto a genuinely idle node, skipping an already-allocated one", () => {
    mockCluster([
      makeNode("dgx-00", "alloc", 8),
      makeNode("dgx-01", "idle", 8),
    ]);
    const result = simulator.executeSrun(
      parse("srun --gpus 1 nvidia-smi"),
      context,
    );
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("from dgx-01");
    expect(result.output).not.toContain("from dgx-00");
  });
});

describe("SlurmSimulator srun multi-node allocation (bot review P2)", () => {
  let simulator: SlurmSimulator;
  const context = {
    currentNode: "dgx-00",
    currentPath: "/root",
    environment: {},
    history: [],
  };

  interface RecordedJob {
    jobId: number;
    nodes: number;
    nodelist: string;
    gpus: number;
  }

  function recordedJobs(sim: SlurmSimulator): RecordedJob[] {
    return (sim as unknown as { jobs: RecordedJob[] }).jobs;
  }

  function mockCluster(nodes: ReturnType<typeof makeNode>[]) {
    vi.mocked(useSimulationStore.getState).mockReturnValue({
      cluster: { nodes },
      setSlurmState: vi.fn(),
      allocateGPUsForJob: vi.fn(),
      deallocateGPUsForJob: vi.fn(),
    } as unknown as ReturnType<typeof useSimulationStore.getState>);
  }

  beforeEach(() => {
    simulator = new SlurmSimulator();
  });

  it("honors -N and --gpus-per-node: records a 2-node, 16-GPU job", () => {
    mockCluster([makeNode("dgx-00", "idle", 8), makeNode("dgx-01", "idle", 8)]);
    const result = simulator.executeSrun(
      parse("srun -N 2 --gpus-per-node=8 nvidia-smi"),
      context,
    );
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("16 GPU(s)");
    expect(result.output).toContain("2 nodes");
    expect(result.output).toContain("dgx-[00-01]");

    const jobs = recordedJobs(simulator);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].nodes).toBe(2);
    expect(jobs[0].gpus).toBe(16);
    expect(jobs[0].nodelist).toBe("dgx-[00-01]");
  });

  it("satisfies -N 2 --gpus=16 across two 8-GPU idle nodes instead of rejecting it", () => {
    mockCluster([makeNode("dgx-00", "idle", 8), makeNode("dgx-01", "idle", 8)]);
    const result = simulator.executeSrun(
      parse("srun -N 2 --gpus=16 nvidia-smi"),
      context,
    );
    expect(result.exitCode).toBe(0);
    const jobs = recordedJobs(simulator);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].nodes).toBe(2);
    expect(jobs[0].gpus).toBe(16);
  });

  it("still fails when aggregate GPU capacity is genuinely insufficient", () => {
    mockCluster([makeNode("dgx-00", "idle", 8), makeNode("dgx-01", "idle", 8)]);
    const result = simulator.executeSrun(
      parse("srun -N 2 --gpus=32 nvidia-smi"),
      context,
    );
    expect(result.exitCode).toBe(1);
    expect(result.output).toMatch(/Unable to allocate resources/);
    expect(recordedJobs(simulator)).toHaveLength(0);

    // nextJobId must not have been consumed by the failed attempt
    const followUp = simulator.executeSrun(parse("srun nvidia-smi"), context);
    expect(followUp.exitCode).toBe(0);
    expect(followUp.output).toContain("job 1000");
  });

  it("fails when fewer idle nodes exist than -N requests", () => {
    mockCluster([
      makeNode("dgx-00", "idle", 8),
      makeNode("dgx-01", "alloc", 8),
    ]);
    const result = simulator.executeSrun(
      parse("srun -N 2 --gpus=8 nvidia-smi"),
      context,
    );
    expect(result.exitCode).toBe(1);
    expect(result.output).toMatch(/Unable to allocate resources/);
    expect(recordedJobs(simulator)).toHaveLength(0);
  });

  it("honors --gpus-per-task with -n like sbatch does", () => {
    mockCluster([makeNode("dgx-00", "idle", 8)]);
    const result = simulator.executeSrun(
      parse("srun -n 4 --gpus-per-task=2 nvidia-smi"),
      context,
    );
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Allocated 8 GPU(s) from dgx-00");
    const jobs = recordedJobs(simulator);
    expect(jobs[0].gpus).toBe(8);
    expect(jobs[0].nodes).toBe(1);
  });
});
