import { describe, it, expect, beforeEach, vi } from "vitest";
import { MellanoxSimulator } from "../mellanoxSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";
import { useSimulationStore } from "@/store/simulationStore";

vi.mock("@/store/simulationStore");

describe("MellanoxSimulator", () => {
  let simulator: MellanoxSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new MellanoxSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };

    vi.mocked(useSimulationStore.getState).mockReturnValue({
      cluster: {
        nodes: [
          {
            id: "dgx-00",
            dpus: [
              {
                id: 0,
                pciAddress: "0000:a0:00.0",
                devicePath: "/dev/mst/mt41692_pciconf0",
                firmwareVersion: "24.35.2000",
                mode: {
                  mode: "DPU",
                  internalCpuModel: 1,
                  description: "DPU mode - Arm cores own NIC resources",
                },
                armOS: "Ubuntu 22.04",
                ovsConfigured: true,
                rshimAvailable: true,
              },
            ],
            hcas: [
              {
                id: 0,
                devicePath: "/dev/mst/mt4129_pciconf0",
                caType: "ConnectX-7 HCA",
                firmwareVersion: "28.39.1002",
                ports: [],
              },
            ],
          },
        ],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  describe("mlxconfig -d <device> q", () => {
    it("resolves an HCA by its exact device path, not a DPU with a coincidentally matching digit id", () => {
      const result = simulator.execute(
        parse("mlxconfig -d /dev/mst/mt4129_pciconf0 q"),
        context,
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Device type:    ConnectX");
      expect(result.output).toContain(
        "Device:         /dev/mst/mt4129_pciconf0",
      );
    });

    it("resolves a DPU by its exact device path", () => {
      const result = simulator.execute(
        parse("mlxconfig -d /dev/mst/mt41692_pciconf0 q"),
        context,
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Device type:    BlueField2");
      expect(result.output).toContain(
        "Device:         /dev/mst/mt41692_pciconf0",
      );
    });

    it("errors when the device path matches neither a DPU nor an HCA", () => {
      const result = simulator.execute(
        parse("mlxconfig -d /dev/mst/mt9999_pciconf9 q"),
        context,
      );

      expect(result.exitCode).toBe(2);
      expect(result.output).toContain("Device not found");
    });
  });
});
