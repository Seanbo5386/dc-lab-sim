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
