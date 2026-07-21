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

describe("SlurmSimulator scontrol show/update node state", () => {
  let simulator: SlurmSimulator;
  let mockSetSlurmState: ReturnType<typeof vi.fn>;
  const context = {
    currentNode: "dgx-00",
    currentPath: "/root",
    environment: {},
    history: [],
  };

  beforeEach(() => {
    simulator = new SlurmSimulator();
    mockSetSlurmState = vi.fn();
    vi.mocked(useSimulationStore.getState).mockReturnValue({
      cluster: {
        nodes: [
          makeNode("dgx-00", "idle"),
          makeNode("dgx-01", "alloc"),
          makeNode("dgx-02", "drain"),
          makeNode("dgx-03", "down"),
        ],
      },
      setSlurmState: mockSetSlurmState,
      allocateGPUsForJob: vi.fn(),
      deallocateGPUsForJob: vi.fn(),
    } as unknown as ReturnType<typeof useSimulationStore.getState>);
  });

  it("shows State=IDLE for an idle node (SIM-5)", () => {
    const result = simulator.executeScontrol(
      parse("scontrol show node dgx-00"),
      context,
    );
    expect(result.output).toContain("State=IDLE ");
  });

  it("shows State=ALLOCATED, not ALLOC, for an allocated node (SIM-5)", () => {
    const result = simulator.executeScontrol(
      parse("scontrol show node dgx-01"),
      context,
    );
    expect(result.output).toContain("State=ALLOCATED ");
    expect(result.output).not.toContain("State=ALLOC ");
  });

  it("shows State=IDLE+DRAIN, not DRAIN+DRAIN, for a draining node (SIM-5)", () => {
    const result = simulator.executeScontrol(
      parse("scontrol show node dgx-02"),
      context,
    );
    expect(result.output).toContain("State=IDLE+DRAIN ");
    expect(result.output).not.toContain("DRAIN+DRAIN");
  });

  it("shows State=DOWN for a down node", () => {
    const result = simulator.executeScontrol(
      parse("scontrol show node dgx-03"),
      context,
    );
    expect(result.output).toContain("State=DOWN ");
  });
});
