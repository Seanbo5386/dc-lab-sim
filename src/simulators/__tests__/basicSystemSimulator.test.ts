import { describe, it, expect, vi } from "vitest";
import { BasicSystemSimulator } from "../basicSystemSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";
import { useSimulationStore } from "@/store/simulationStore";

vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: { getState: vi.fn() },
}));

describe("systemctl restart nvidia-fabricmanager", () => {
  it("restores downed NVLinks on the current node", () => {
    const updateGPU = vi.fn();
    const gpu = {
      id: 0,
      uuid: "x",
      name: "NVIDIA H100 80GB HBM3",
      type: "H100-SXM",
      pciAddress: "0000:17:00.0",
      temperature: 45,
      powerDraw: 250,
      powerLimit: 700,
      memoryTotal: 81920,
      memoryUsed: 1024,
      utilization: 0,
      clocksSM: 1980,
      clocksMem: 2619,
      eccEnabled: true,
      eccErrors: {
        singleBit: 0,
        doubleBit: 0,
        aggregated: { singleBit: 0, doubleBit: 0 },
      },
      migMode: false,
      migInstances: [],
      nvlinks: [
        {
          linkId: 0,
          status: "Down",
          speed: 400,
          txErrors: 100,
          rxErrors: 0,
          replayErrors: 0,
        },
      ],
      healthStatus: "Warning",
      xidErrors: [],
      persistenceMode: true,
    };
    vi.mocked(useSimulationStore.getState).mockReturnValue({
      cluster: {
        nodes: [
          {
            id: "dgx-00",
            hostname: "n",
            systemType: "DGX-H100",
            healthStatus: "OK",
            slurmState: "idle",
            gpus: [gpu],
            hcas: [],
          },
        ],
      },
      updateGPU,
    } as never);

    const sim = new BasicSystemSimulator();
    const context: CommandContext = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };
    const result = sim.execute(
      parse("systemctl restart nvidia-fabricmanager"),
      context,
    );

    expect(result.exitCode).toBe(0);
    expect(updateGPU).toHaveBeenCalledWith(
      "dgx-00",
      0,
      expect.objectContaining({
        healthStatus: "OK",
        nvlinks: [expect.objectContaining({ status: "Active", txErrors: 0 })],
      }),
    );
  });
});
