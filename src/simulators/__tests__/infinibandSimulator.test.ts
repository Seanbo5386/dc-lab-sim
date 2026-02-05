import { describe, it, expect, beforeEach, vi } from "vitest";
import { InfiniBandSimulator } from "../infinibandSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";
import { useSimulationStore } from "@/store/simulationStore";

// Mock the store
vi.mock("@/store/simulationStore");

describe("InfiniBandSimulator", () => {
  let simulator: InfiniBandSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new InfiniBandSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };

    // Setup default mock with HCA data
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
            gpus: [],
            hcas: [
              {
                caType: "mlx5_0",
                firmwareVersion: "20.35.1012",
                ports: [
                  {
                    portNumber: 1,
                    state: "Active",
                    physicalState: "LinkUp",
                    rate: "200",
                    lid: 123,
                    guid: "0x506b4b0300ab1234",
                    linkLayer: "InfiniBand",
                    errors: {
                      symbolErrors: 0,
                      linkDowned: 0,
                      portRcvErrors: 0,
                      portXmitDiscards: 0,
                      portXmitWait: 0,
                    },
                  },
                ],
              },
            ],
            bmc: {
              sensors: [],
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
    it("ibstat should return HCA information", () => {
      const parsed = parse("ibstat");
      const result = simulator.executeIbstat(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("mlx5_0");
      expect(result.output).toContain("Active");
    });

    it("ibstat --version should return version", () => {
      const parsed = parse("ibstat --version");
      const result = simulator.executeIbstat(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibstat");
    });

    it("ibportstate should return port state", () => {
      const parsed = parse("ibportstate 123 1");
      const result = simulator.executeIbportstate(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Port");
      expect(result.output).toContain("State");
    });

    it("ibporterrors should return error counters", () => {
      const parsed = parse("ibporterrors");
      const result = simulator.executeIbporterrors(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Errors");
    });

    it("iblinkinfo should return link information", () => {
      const parsed = parse("iblinkinfo");
      const result = simulator.executeIblinkinfo(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("InfiniBand Link Information");
    });

    it("perfquery should return performance counters", () => {
      const parsed = parse("perfquery");
      const result = simulator.executePerfquery(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Port counters");
    });

    it("ibdiagnet should return diagnostic information", () => {
      const parsed = parse("ibdiagnet");
      const result = simulator.executeIbdiagnet(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Discovering");
    });

    it("ibnetdiscover should return fabric topology", () => {
      const parsed = parse("ibnetdiscover");
      const result = simulator.executeIbnetdiscover(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Topology");
    });

    it("ibdev2netdev should return device mapping", () => {
      const parsed = parse("ibdev2netdev");
      const result = simulator.executeIbdev2netdev(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("mlx5_0");
    });
  });

  describe("CommandDefinitionRegistry Integration", () => {
    it("should have definition registry initialized after construction", async () => {
      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(simulator["definitionRegistry"]).not.toBeNull();
    });
  });

  describe("Help from JSON definitions", () => {
    it("ibstat --help should return registry-based help", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const parsed = parse("ibstat --help");
      const result = simulator.executeIbstat(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibstat");
    });

    it("ibportstate --help should return help", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const parsed = parse("ibportstate --help");
      const result = simulator.executeIbportstate(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibportstate");
    });

    it("ibporterrors --help should return help", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const parsed = parse("ibporterrors --help");
      const result = simulator.executeIbporterrors(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibporterrors");
    });

    it("iblinkinfo --help should return help", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const parsed = parse("iblinkinfo --help");
      const result = simulator.executeIblinkinfo(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("iblinkinfo");
    });

    it("perfquery --help should return help", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const parsed = parse("perfquery --help");
      const result = simulator.executePerfquery(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("perfquery");
    });

    it("ibdiagnet --help should return help", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const parsed = parse("ibdiagnet --help");
      const result = simulator.executeIbdiagnet(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibdiagnet");
    });

    it("ibnetdiscover --help should return help", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const parsed = parse("ibnetdiscover --help");
      const result = simulator.executeIbnetdiscover(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibnetdiscover");
    });

    it("ibdev2netdev --help should return help", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const parsed = parse("ibdev2netdev --help");
      const result = simulator.executeIbdev2netdev(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibdev2netdev");
    });
  });
});
