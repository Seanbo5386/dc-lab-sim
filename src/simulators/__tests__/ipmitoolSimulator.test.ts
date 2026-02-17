import { describe, it, expect, beforeEach, vi } from "vitest";
import { IpmitoolSimulator } from "../ipmitoolSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";
import { useSimulationStore } from "@/store/simulationStore";

// Mock the store
vi.mock("@/store/simulationStore");

describe("IpmitoolSimulator", () => {
  let simulator: IpmitoolSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new IpmitoolSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };

    // Setup default mock with BMC data
    vi.mocked(useSimulationStore.getState).mockReturnValue({
      cluster: {
        nodes: [
          {
            id: "dgx-00",
            hostname: "dgx-node01",
            systemType: "H100",
            healthStatus: "OK",
            nvidiaDriverVersion: "535.129.03",
            cudaVersion: "12.2",
            gpus: [
              {
                id: 0,
                name: "NVIDIA H100 80GB HBM3",
                type: "H100-SXM",
                uuid: "GPU-12345678-1234-1234-1234-123456789012",
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
                nvlinks: [],
                healthStatus: "OK",
                xidErrors: [],
                persistenceMode: true,
              },
            ],
            hcas: [],
            bmc: {
              powerState: "On",
              sensors: [
                {
                  name: "CPU Temp",
                  type: "Temperature",
                  reading: 45,
                  unit: "degrees C",
                  status: "ok",
                  lowerCritical: 0,
                  lowerNonCritical: 10,
                  upperNonCritical: 80,
                  upperCritical: 95,
                },
                {
                  name: "Fan1",
                  type: "Fan",
                  reading: 5000,
                  unit: "RPM",
                  status: "ok",
                  lowerCritical: 1000,
                  lowerNonCritical: 2000,
                  upperNonCritical: 10000,
                  upperCritical: 12000,
                },
              ],
              systemPower: "on",
              chassisStatus: {
                powerOn: true,
                powerFault: false,
                interlock: false,
                overload: false,
                cooling: "ok",
              },
              sel: [],
              fru: {
                chassisType: "Rack Mount Chassis",
                chassisSerial: "DGX-001",
                boardMfg: "NVIDIA",
                boardProduct: "DGX H100",
                boardSerial: "PGX001234",
                productMfg: "NVIDIA",
                productName: "DGX H100",
                productSerial: "DGX-H100-001",
              },
            },
          },
        ],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  describe("Basic Commands", () => {
    it("should show help with --help", () => {
      const parsed = parse("ipmitool --help");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ipmitool");
      expect(result.output).toContain("sensor");
    });

    it("should show version with --version", () => {
      const parsed = parse("ipmitool --version");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ipmitool version");
    });

    it("should handle sensor list command", () => {
      const parsed = parse("ipmitool sensor list");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
    });
  });

  describe("CommandDefinitionRegistry Integration", () => {
    it("should have definition registry initialized after construction", async () => {
      // Await the registry initialization directly
      await simulator["initializeDefinitionRegistry"]();
      expect(simulator["definitionRegistry"]).not.toBeNull();
    });

    it("should validate flags using registry", () => {
      const parsed = parse("ipmitool sensor list");
      const result = simulator.execute(parsed, context);

      // Valid command should succeed
      expect(result.exitCode).toBe(0);
    });
  });

  describe("Help from JSON definitions", () => {
    it("ipmitool help should return registry-based help", async () => {
      await simulator["initializeDefinitionRegistry"]();

      const parsed = parse("ipmitool help");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ipmitool");
    });
  });

  describe("Power command", () => {
    it("ipmitool power status should return chassis power state", () => {
      const parsed = parse("ipmitool power status");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toBe("Chassis Power is on");
    });

    it("ipmitool power on should return power control message", () => {
      const parsed = parse("ipmitool power on");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toBe("Chassis Power Control: On");
    });

    it("ipmitool power cycle should return power control message", () => {
      const parsed = parse("ipmitool power cycle");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toBe("Chassis Power Control: Cycle");
    });

    it("ipmitool power with no args should default to status", () => {
      const parsed = parse("ipmitool power");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toBe("Chassis Power is on");
    });
  });
});
