import { describe, it, expect, beforeEach, vi } from "vitest";
import { SlurmSimulator } from "../slurmSimulator";
import { useSimulationStore } from "@/store/simulationStore";
import { parse } from "@/utils/commandParser";

vi.mock("@/store/simulationStore");

function makeNode(id: string, slurmState: "idle" | "alloc" | "drain" | "down") {
  return {
    id,
    hostname: `${id}.cluster.local`,
    systemType: "DGX-H100",
    gpus: Array(8)
      .fill(null)
      .map((_, i) => ({ id: i, name: "NVIDIA H100 80GB HBM3" })),
    cpuCount: 2,
    ramTotal: 2048,
    ramUsed: 512,
    slurmState,
    slurmReason:
      slurmState === "drain" || slurmState === "down"
        ? "maintenance"
        : undefined,
  };
}

describe("SlurmSimulator sinfo/scontrol hostlist output", () => {
  let simulator: SlurmSimulator;
  const context = {
    currentNode: "dgx-00",
    currentPath: "/root",
    environment: {},
    history: [],
  };

  beforeEach(() => {
    simulator = new SlurmSimulator();
    vi.mocked(useSimulationStore.getState).mockReturnValue({
      cluster: {
        nodes: [
          makeNode("dgx-00", "idle"),
          makeNode("dgx-01", "idle"),
          makeNode("dgx-02", "alloc"),
          makeNode("dgx-03", "down"),
          makeNode("dgx-04", "drain"),
          makeNode("dgx-05", "idle"),
        ],
      },
      setSlurmState: vi.fn(),
      allocateGPUsForJob: vi.fn(),
      deallocateGPUsForJob: vi.fn(),
    } as unknown as ReturnType<typeof useSimulationStore.getState>);
  });

  it("sinfo default view includes a down-state row (SIM-4)", () => {
    const result = simulator.executeSinfo(parse("sinfo"), context);
    expect(result.exitCode).toBe(0);
    expect(result.output).toMatch(/down\s+dgx-03/);
  });

  it("sinfo compresses a contiguous run of idle nodes into bracket notation (LIVE-10)", () => {
    const result = simulator.executeSinfo(parse("sinfo"), context);
    // Real Slurm (and Task 1's compressHostlist) joins non-contiguous runs of
    // the same prefix inside one bracket pair: dgx-[00-01,05], not dgx-[00-01],dgx-05.
    expect(result.output).toContain("dgx-[00-01,05]");
  });

  it("sinfo still lists single-node alloc/drain/down rows without brackets", () => {
    const result = simulator.executeSinfo(parse("sinfo"), context);
    expect(result.output).toMatch(/alloc\s+dgx-02/);
    expect(result.output).toMatch(/drain\s+dgx-04/);
    expect(result.output).toMatch(/down\s+dgx-03/);
  });

  it("scontrol show partition uses compressed hostlist notation for all nodes (LIVE-10)", () => {
    const result = simulator.executeScontrol(
      parse("scontrol show partition"),
      context,
    );
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Nodes=dgx-[00-05]");
  });
});
