import { describe, it, expect, beforeEach, vi } from "vitest";
import { InfiniBandSimulator, getIBStandardName } from "../infinibandSimulator";
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

  describe("GUID format consistency", () => {
    it("should display all GUIDs with 0x prefix in ibstat output", () => {
      const parsed = parse("ibstat");
      const result = simulator.executeIbstat(parsed, context);

      const guidLines = result.output
        .split("\n")
        .filter((l) => l.includes("GUID"));
      expect(guidLines.length).toBeGreaterThan(0);
      for (const line of guidLines) {
        expect(line).toMatch(/0x[0-9a-f]{16}/i);
        // Should not have double 0x prefix
        expect(line).not.toMatch(/0x0x/);
      }
    });
  });

  describe("CommandDefinitionRegistry Integration", () => {
    it("should have definition registry initialized after construction", async () => {
      // Wait for async initialization (lazy-loaded JSON imports may take longer)
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );
    });
  });

  describe("Help from JSON definitions", () => {
    it("ibstat --help should return registry-based help", async () => {
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const parsed = parse("ibstat --help");
      const result = simulator.executeIbstat(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibstat");
    });

    it("ibportstate --help should return help", async () => {
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const parsed = parse("ibportstate --help");
      const result = simulator.executeIbportstate(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibportstate");
    });

    it("ibporterrors --help should return help", async () => {
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const parsed = parse("ibporterrors --help");
      const result = simulator.executeIbporterrors(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibporterrors");
    });

    it("iblinkinfo --help should return help", async () => {
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const parsed = parse("iblinkinfo --help");
      const result = simulator.executeIblinkinfo(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("iblinkinfo");
    });

    it("perfquery --help should return help", async () => {
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const parsed = parse("perfquery --help");
      const result = simulator.executePerfquery(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("perfquery");
    });

    it("ibdiagnet --help should return help", async () => {
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const parsed = parse("ibdiagnet --help");
      const result = simulator.executeIbdiagnet(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibdiagnet");
    });

    it("ibnetdiscover --help should return help", async () => {
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const parsed = parse("ibnetdiscover --help");
      const result = simulator.executeIbnetdiscover(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibnetdiscover");
    });

    it("ibdev2netdev --help should return help", async () => {
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const parsed = parse("ibdev2netdev --help");
      const result = simulator.executeIbdev2netdev(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibdev2netdev");
    });
  });

  describe("getIBStandardName helper", () => {
    it("should return QDR for rates below 56 Gb/s", () => {
      expect(getIBStandardName(40)).toBe("QDR");
      expect(getIBStandardName(10)).toBe("QDR");
    });

    it("should return FDR for 56 Gb/s", () => {
      expect(getIBStandardName(56)).toBe("FDR");
    });

    it("should return EDR for 100 Gb/s", () => {
      expect(getIBStandardName(100)).toBe("EDR");
    });

    it("should return HDR for 200 Gb/s", () => {
      expect(getIBStandardName(200)).toBe("HDR");
    });

    it("should return NDR for 400 Gb/s", () => {
      expect(getIBStandardName(400)).toBe("NDR");
    });

    it("should return XDR for 800 Gb/s", () => {
      expect(getIBStandardName(800)).toBe("XDR");
    });
  });

  describe("IB speed labeling in ibdiagnet output", () => {
    it("should label 400 Gb/s as NDR (not HDR) in detailed ibdiagnet output", () => {
      // Set up node with 400 Gb/s port rate
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
                      rate: 400,
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

      const parsed = parse("ibdiagnet --detailed");
      const result = simulator.executeIbdiagnet(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("400 Gb/s (NDR)");
      expect(result.output).not.toContain("400 Gb/s (HDR)");
    });

    it("should label 200 Gb/s as HDR in detailed ibdiagnet output", () => {
      // Default mock already has rate: "200" but we need numeric rate
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          nodes: [
            {
              id: "dgx-00",
              hostname: "dgx-node01",
              systemType: "A100",
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
                      rate: 200,
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
                  boardProduct: "DGX A100",
                  boardSerial: "PGX001234",
                  productMfg: "NVIDIA",
                  productName: "DGX A100",
                  productSerial: "DGX-A100-001",
                },
              },
            },
          ],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const parsed = parse("ibdiagnet --detailed");
      const result = simulator.executeIbdiagnet(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("200 Gb/s (HDR)");
      expect(result.output).not.toContain("200 Gb/s (NDR)");
    });

    it("should label 800 Gb/s as XDR in detailed ibdiagnet output", () => {
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
                      rate: 800,
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

      const parsed = parse("ibdiagnet --detailed");
      const result = simulator.executeIbdiagnet(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("800 Gb/s (XDR)");
    });
  });

  describe("Extended IB Commands", () => {
    it("ibhosts should list host nodes with host and discover patterns", () => {
      const parsed = parse("ibhosts");
      const result = simulator.executeIbhosts(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/host|discover/i);
      expect(result.output).toContain("dgx-node01");
      expect(result.output).toContain("Ca");
    });

    it("ibhosts --version should return version", () => {
      const parsed = parse("ibhosts --version");
      const result = simulator.executeIbhosts(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibhosts");
    });

    it("ibswitches should list switch nodes with switch and discover patterns", () => {
      const parsed = parse("ibswitches");
      const result = simulator.executeIbswitches(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/switch|discover/i);
      expect(result.output).toContain("Switch");
    });

    it("ibswitches --version should return version", () => {
      const parsed = parse("ibswitches --version");
      const result = simulator.executeIbswitches(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibswitches");
    });

    it("ibcableerrors should report cable errors", () => {
      const parsed = parse("ibcableerrors");
      const result = simulator.executeIbcableerrors(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/cable|error/i);
      expect(result.output).toContain("Cable Error Report");
    });

    it("ibcableerrors --version should return version", () => {
      const parsed = parse("ibcableerrors --version");
      const result = simulator.executeIbcableerrors(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibcableerrors");
    });

    it("ibping should show ping results with latency", () => {
      const parsed = parse("ibping");
      const result = simulator.executeIbping(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/ping|latency/i);
      expect(result.output).toContain("Pong");
      expect(result.output).toContain("time");
    });

    it("ibping --version should return version", () => {
      const parsed = parse("ibping --version");
      const result = simulator.executeIbping(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibping");
    });

    it("ibping -S should start in server mode", () => {
      const parsed = parse("ibping -S");
      const result = simulator.executeIbping(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Listening");
    });

    it("ibtracert should show route trace with hops", () => {
      const parsed = parse("ibtracert 123 1");
      const result = simulator.executeIbtracert(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/trace|route|hop/i);
      expect(result.output).toContain("hop");
      expect(result.output).toContain("Route complete");
    });

    it("ibtracert --version should return version", () => {
      const parsed = parse("ibtracert --version");
      const result = simulator.executeIbtracert(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ibtracert");
    });

    it("ib_write_bw should show write bandwidth results", () => {
      const parsed = parse("ib_write_bw");
      const result = simulator.executeIbWriteBw(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/write|bandwidth|bw/i);
      expect(result.output).toContain("Write");
      expect(result.output).toContain("BW");
    });

    it("ib_write_bw --version should return version", () => {
      const parsed = parse("ib_write_bw --version");
      const result = simulator.executeIbWriteBw(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ib_write_bw");
    });

    it("ib_read_bw should show read bandwidth results", () => {
      const parsed = parse("ib_read_bw");
      const result = simulator.executeIbReadBw(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/read|bandwidth|bw/i);
      expect(result.output).toContain("Read");
      expect(result.output).toContain("BW");
    });

    it("ib_read_bw --version should return version", () => {
      const parsed = parse("ib_read_bw --version");
      const result = simulator.executeIbReadBw(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ib_read_bw");
    });

    it("sminfo should show Subnet Manager status", () => {
      const parsed = parse("sminfo");
      const result = simulator.executeSminfo(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/SM|master|state/i);
      expect(result.output).toContain("SMINFO_MASTER");
      expect(result.output).toContain("sm lid");
    });

    it("sminfo --version should return version", () => {
      const parsed = parse("sminfo --version");
      const result = simulator.executeSminfo(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("sminfo");
    });

    it("smpquery nodeinfo should show NodeInfo", () => {
      const parsed = parse("smpquery nodeinfo 123");
      const result = simulator.executeSmpquery(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NodeInfo");
      expect(result.output).toContain("Channel Adapter");
    });

    it("smpquery nodedesc should show node description", () => {
      const parsed = parse("smpquery nodedesc 123");
      const result = simulator.executeSmpquery(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NodeDescription");
      expect(result.output).toContain("dgx-node01");
    });

    it("smpquery portinfo should show port information", () => {
      const parsed = parse("smpquery portinfo 123");
      const result = simulator.executeSmpquery(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("PortInfo");
      expect(result.output).toContain("LinkState");
    });

    it("smpquery unknown should return error", () => {
      const parsed = parse("smpquery foobar 123");
      const result = simulator.executeSmpquery(parsed, context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("unknown operation");
    });

    it("smpquery --version should return version", () => {
      const parsed = parse("smpquery --version");
      const result = simulator.executeSmpquery(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("smpquery");
    });

    it("ofed_info should show OFED/MLNX version info", () => {
      const parsed = parse("ofed_info");
      const result = simulator.executeOfedInfo(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/OFED|version|MLNX/i);
      expect(result.output).toContain("MLNX_OFED_LINUX");
      expect(result.output).toContain("Installed Packages");
    });

    it("ofed_info -s should show short version", () => {
      const parsed = parse("ofed_info -s");
      const result = simulator.executeOfedInfo(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("MLNX_OFED_LINUX");
    });

    it("ofed_info -n should show package name only", () => {
      const parsed = parse("ofed_info -n");
      const result = simulator.executeOfedInfo(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toBe("MLNX_OFED_LINUX");
    });
  });
});
