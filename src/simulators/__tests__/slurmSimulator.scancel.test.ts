import { describe, it, expect, beforeEach, vi } from "vitest";
import { SlurmSimulator } from "../slurmSimulator";
import { useSimulationStore } from "@/store/simulationStore";
import { parse } from "@/utils/commandParser";

vi.mock("@/store/simulationStore");

function makeRunningJob(jobId: number) {
  return {
    jobId,
    name: "train",
    user: "root",
    partition: "gpu",
    state: "RUNNING" as const,
    time: "0:05:00",
    timeLimit: "infinite",
    nodes: 1,
    nodelist: "dgx-00",
    cpus: 8,
    gpus: 4,
    memory: "64G",
    submitTime: new Date(),
    startTime: new Date(),
    priority: 100,
    account: "default",
    qos: "normal",
    workDir: "/home/root",
    command: "train.sh",
  };
}

describe("SlurmSimulator scancel output (SIM-28)", () => {
  let simulator: SlurmSimulator;
  let mockDeallocate: ReturnType<typeof vi.fn>;
  let mockSetSlurmState: ReturnType<typeof vi.fn>;
  const context = {
    currentNode: "dgx-00",
    currentPath: "/root",
    environment: {},
    history: [],
  };

  beforeEach(async () => {
    simulator = new SlurmSimulator();
    mockDeallocate = vi.fn();
    mockSetSlurmState = vi.fn();
    vi.mocked(useSimulationStore.getState).mockReturnValue({
      cluster: { nodes: [{ id: "dgx-00", slurmState: "alloc" }] },
      setSlurmState: mockSetSlurmState,
      allocateGPUsForJob: vi.fn(),
      deallocateGPUsForJob: mockDeallocate,
    } as unknown as ReturnType<typeof useSimulationStore.getState>);
    // initializeDefinitionRegistry() is async fire-and-forget in the
    // constructor; without waiting, parseWithSchema falls back to
    // heuristic parsing where "-v" greedily consumes "2002" as its value
    // (same wait pattern as slurmSimulator.registry.test.ts).
    await vi.waitFor(
      () => {
        expect(simulator["definitionRegistry"]).not.toBeNull();
      },
      { timeout: 5000 },
    );
  });

  it("is silent on success by default (real scancel default behavior)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (simulator as any).jobs = [makeRunningJob(2001)];
    const result = simulator.executeScancel(parse("scancel 2001"), context);
    expect(result.exitCode).toBe(0);
    expect(result.output).toBe("");
  });

  it("prints a confirmation only with -v/--verbose", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (simulator as any).jobs = [makeRunningJob(2002)];
    const result = simulator.executeScancel(parse("scancel -v 2002"), context);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("scancel: Terminating job 2002");
  });

  it("still deallocates GPUs and frees the node even when silent", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (simulator as any).jobs = [makeRunningJob(2003)];
    simulator.executeScancel(parse("scancel 2003"), context);
    expect(mockDeallocate).toHaveBeenCalledWith(2003);
    // resolveMutator's global-store fallback forwards an explicit
    // `undefined` reason as the third argument.
    expect(mockSetSlurmState).toHaveBeenCalledWith("dgx-00", "idle", undefined);
  });

  it("still errors loudly for an invalid job id regardless of verbosity", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (simulator as any).jobs = [];
    const result = simulator.executeScancel(parse("scancel 9999"), context);
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain("Invalid job id specified");
  });
});
