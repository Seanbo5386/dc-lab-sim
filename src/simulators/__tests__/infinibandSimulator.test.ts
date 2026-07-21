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
                    xmitDataBytes: 500000000,
                    rcvDataBytes: 450000000,
                    xmitPkts: 5000000,
                    rcvPkts: 4800000,
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

    it("ibswitches and ibnetdiscover report identical switch GUIDs (SIM-7/SIM-12)", () => {
      const switchesResult = simulator.executeIbswitches(
        parse("ibswitches"),
        context,
      );
      const discoverResult = simulator.executeIbnetdiscover(
        parse("ibnetdiscover -S"),
        context,
      );

      expect(switchesResult.exitCode).toBe(0);
      expect(discoverResult.exitCode).toBe(0);

      const guidPattern = /0x[0-9a-f]{16}/g;
      const switchesGuids = new Set(
        switchesResult.output.match(guidPattern) ?? [],
      );
      const discoverGuids = new Set(
        discoverResult.output.match(guidPattern) ?? [],
      );

      expect(switchesGuids.size).toBeGreaterThan(0);
      expect(discoverGuids).toEqual(switchesGuids);
      // Canonical scheme: Mellanox OUI prefix (e4:1d:2d), spine base
      // 0x...030010 and leaf base 0x...030020
      expect(switchesResult.output).toContain("0x0000e41d2d030010");
      expect(discoverResult.output).toContain("0x0000e41d2d030020");
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
      // LID 20 is the first leaf switch in the derived fabric topology --
      // ibping now validates its target against real fabric LIDs, and the
      // old bare-`ibping` default target (LID 1) no longer exists anywhere,
      // so it reports unreachable (covered by its own SIM-13 test below).
      const parsed = parse("ibping 20");
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

  describe("IB/RDMA commands (PR #77)", () => {
    beforeEach(() => {
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });
    });

    it("ibstatus should report active port status", () => {
      const result = simulator.executeIbstatus(parse("ibstatus"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain(
        "Infiniband device 'mlx5_0' port 1 status:",
      );
      expect(result.output).toContain("state:\t\t 4: ACTIVE");
      expect(result.output).toContain("rate:\t\t 400 Gb/sec (4X NDR)");
    });

    it("ibstatus --version should report the tool version", () => {
      const result = simulator.executeIbstatus(
        parse("ibstatus --version"),
        context,
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toBe("ibstatus 5.9-0");
    });

    it("ibstatus should error when no HCAs are present", () => {
      vi.mocked(useSimulationStore.getState).mockReturnValueOnce({
        cluster: { nodes: [{ id: "dgx-00", hcas: [] }] },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = simulator.executeIbstatus(parse("ibstatus"), context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("No InfiniBand HCAs found");
    });

    it("ibv_devinfo should report HCA details by default", () => {
      const result = simulator.executeIbvDevinfo(parse("ibv_devinfo"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("hca_id:\tmlx5_0");
      expect(result.output).toContain("fw_ver:\t\t\t\t20.35.1012");
      expect(result.output).toContain("vendor_part_id:\t\t\t4123");
    });

    it("ibv_devinfo -l should list device names only", () => {
      const result = simulator.executeIbvDevinfo(
        parse("ibv_devinfo -l"),
        context,
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("0: mlx5_0");
    });

    it("ibv_devinfo should error when no RDMA devices are present", () => {
      vi.mocked(useSimulationStore.getState).mockReturnValueOnce({
        cluster: { nodes: [{ id: "dgx-00", hcas: [] }] },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = simulator.executeIbvDevinfo(parse("ibv_devinfo"), context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("No RDMA devices found");
    });

    it("show_gids should list GIDs for each HCA port", () => {
      const result = simulator.executeShowGids(parse("show_gids"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("DEV     PORT  INDEX  GID");
      expect(result.output).toContain("mlx5_0");
      expect(result.output).toContain("192.168.1.1");
    });

    it("rdma dev should list RDMA devices", () => {
      const result = simulator.executeRdma(parse("rdma dev"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("mlx5_0");
      expect(result.output).toContain("fw 20.35.1012");
    });

    it("rdma link should list link state", () => {
      const result = simulator.executeRdma(parse("rdma link"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("state ACTIVE");
      expect(result.output).toContain("netdev eth1");
    });

    it("rdma resource should list per-HCA resource counts", () => {
      const result = simulator.executeRdma(parse("rdma resource"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("mlx5_0: qp 4 cq 8 mr 16 pd 4");
    });

    it("rdma with no object should print usage", () => {
      const result = simulator.executeRdma(parse("rdma"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain(
        "Usage: rdma [ OPTIONS ] OBJECT { COMMAND | help }",
      );
    });

    it("rdma should error when no RDMA devices are present", () => {
      vi.mocked(useSimulationStore.getState).mockReturnValueOnce({
        cluster: { nodes: [{ id: "dgx-00", hcas: [] }] },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = simulator.executeRdma(parse("rdma dev"), context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("No RDMA devices found");
    });

    it("ib_write_lat should print a write latency report", () => {
      const result = simulator.executeIbWriteLat(
        parse("ib_write_lat"),
        context,
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("InfiniBand Write Latency Test");
      expect(result.output).toContain("local address: LID 123");
    });

    it("ib_read_lat should print a read latency report", () => {
      const result = simulator.executeIbReadLat(parse("ib_read_lat"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("InfiniBand Read Latency Test");
    });

    it("ib_send_lat should print a send latency report", () => {
      const result = simulator.executeIbSendLat(parse("ib_send_lat"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("InfiniBand Send Latency Test");
    });

    it("ib_send_bw should print a send bandwidth report", () => {
      const result = simulator.executeIbSendBw(parse("ib_send_bw"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("InfiniBand Send BW Test");
      expect(result.output).toContain("Send bandwidth:");
    });

    describe("dynamic state resolution (review fixes)", () => {
      const mockNodeWithPortState = (
        state: string,
        physicalState: string,
      ): void => {
        vi.mocked(useSimulationStore.getState).mockReturnValue({
          cluster: {
            nodes: [
              {
                id: "dgx-00",
                hostname: "dgx-node01",
                systemType: "H100",
                healthStatus: "Degraded",
                nvidiaDriverVersion: "535.129.03",
                cudaVersion: "12.2",
                gpus: [],
                hcas: [
                  {
                    caType: "mlx5_1",
                    firmwareVersion: "20.35.1012",
                    ports: [
                      {
                        portNumber: 1,
                        state,
                        physicalState,
                        rate: 400,
                        lid: 123,
                        guid: "0x506b4b0300ab1234",
                        linkLayer: "InfiniBand",
                        errors: {
                          symbolErrors: 0,
                          linkDowned: 1,
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        });
      };

      beforeEach(() => {
        mockNodeWithPortState("Down", "LinkDown");
      });

      it("ibstatus reports Disabled for an administratively-down link (LinkDown), distinct from Polling", () => {
        const result = simulator.executeIbstatus(parse("ibstatus"), context);

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("state:\t\t 1: DOWN");
        expect(result.output).toContain("phys state:\t 3: Disabled");
      });

      it("ibstatus reports Polling (not Disabled) for a port with no active peer/cable", () => {
        // Fixture: physicalState "Polling" -- a cabled port waiting to link up,
        // NOT the same as a link that's down or a port an admin disabled.
        mockNodeWithPortState("Down", "Polling");

        const result = simulator.executeIbstatus(parse("ibstatus"), context);

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("state:\t\t 1: DOWN");
        expect(result.output).toContain("phys state:\t 2: Polling");
      });

      it("ibstatus reports Sleep for a port in power-save state", () => {
        mockNodeWithPortState("Down", "Sleep");

        const result = simulator.executeIbstatus(parse("ibstatus"), context);

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("phys state:\t 1: Sleep");
      });

      it("ibv_devinfo reports PORT_POLLING for a port in Polling logical state", () => {
        mockNodeWithPortState("Polling", "Polling");

        const result = simulator.executeIbvDevinfo(
          parse("ibv_devinfo"),
          context,
        );

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("state:\t\t\tPORT_POLLING (2)");
      });

      it("ibv_devinfo should report PORT_DOWN for a non-active port", () => {
        const result = simulator.executeIbvDevinfo(
          parse("ibv_devinfo"),
          context,
        );

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("state:\t\t\tPORT_DOWN (1)");
      });

      it("rdma link should report DOWN/LINK_DOWN for a non-active port", () => {
        const result = simulator.executeRdma(parse("rdma link"), context);

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("state DOWN");
        expect(result.output).toContain("physical_state LINK_DOWN");
      });

      it("show_gids should use the HCA's actual device name, not a hardcoded one", () => {
        const result = simulator.executeShowGids(parse("show_gids"), context);

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("mlx5_1");
        expect(result.output).not.toContain("mlx5_0");
      });
    });
  });

  describe("Device-argument resolution (SIM-13/LIVE-9)", () => {
    const makeHca = (
      id: number,
      caType: string,
      guid: string,
      lid: number,
    ) => ({
      id,
      devicePath: `/dev/mst/mt4129_pciconf${id}`,
      caType,
      model: "ConnectX-7",
      firmwareVersion: "28.39.1002",
      ports: [
        {
          portNumber: 1,
          state: "Active",
          physicalState: "LinkUp",
          rate: 400,
          lid,
          guid,
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
    });

    beforeEach(() => {
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          nodes: [
            {
              id: "dgx-00",
              hostname: "dgx-node01",
              systemType: "DGX-H100",
              healthStatus: "OK",
              gpus: [],
              hcas: [
                makeHca(0, "mlx5_0", "0x506b4b0300aa0001", 101),
                makeHca(1, "mlx5_1", "0x506b4b0300aa0002", 102),
              ],
            },
          ],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    });

    it("ibstat <device> shows only the named HCA, not every HCA on the node", () => {
      const result = simulator.executeIbstat(parse("ibstat mlx5_1"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("CA 'mlx5_1'");
      expect(result.output).not.toContain("CA 'mlx5_0'");
    });

    it("ibstat with no device argument still shows every HCA (unchanged default behavior)", () => {
      const result = simulator.executeIbstat(parse("ibstat"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("CA 'mlx5_0'");
      expect(result.output).toContain("CA 'mlx5_1'");
    });

    it("ibstat <unknown-device> falls back to showing every HCA rather than silently printing nothing", () => {
      const result = simulator.executeIbstat(parse("ibstat mlx5_99"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("CA 'mlx5_0'");
      expect(result.output).toContain("CA 'mlx5_1'");
    });

    it("ibv_devinfo -d <device> shows only the named HCA", () => {
      const result = simulator.executeIbvDevinfo(
        parse("ibv_devinfo -d mlx5_1"),
        context,
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("hca_id:\tmlx5_1");
      expect(result.output).not.toContain("hca_id:\tmlx5_0");
    });

    it("ibv_devinfo with no -d still shows every HCA", () => {
      const result = simulator.executeIbvDevinfo(parse("ibv_devinfo"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("hca_id:\tmlx5_0");
      expect(result.output).toContain("hca_id:\tmlx5_1");
    });

    it("ibv_devinfo -l always lists every device, even alongside -d", () => {
      const result = simulator.executeIbvDevinfo(
        parse("ibv_devinfo -l -d mlx5_1"),
        context,
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("mlx5_0");
      expect(result.output).toContain("mlx5_1");
    });

    it("ibdev2netdev <device> shows only the named HCA with its stable netdev index", () => {
      const result = simulator.executeIbdev2netdev(
        parse("ibdev2netdev mlx5_1"),
        context,
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("mlx5_1 port 1 ==> ib1 (Up)");
      expect(result.output).not.toContain("mlx5_0");
    });

    it("ibdev2netdev with no argument still maps every HCA", () => {
      const result = simulator.executeIbdev2netdev(
        parse("ibdev2netdev"),
        context,
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("mlx5_0 port 1 ==> ib0 (Up)");
      expect(result.output).toContain("mlx5_1 port 1 ==> ib1 (Up)");
    });

    it("show_gids <device> shows only the named HCA's GIDs", () => {
      const result = simulator.executeShowGids(
        parse("show_gids mlx5_1"),
        context,
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("mlx5_1");
      expect(result.output).not.toContain("mlx5_0");
    });

    it("show_gids with no argument still shows every HCA's GIDs", () => {
      const result = simulator.executeShowGids(parse("show_gids"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("mlx5_0");
      expect(result.output).toContain("mlx5_1");
    });

    it("rdma dev show <device> shows only the named device, keeping its real index", () => {
      const result = simulator.executeRdma(
        parse("rdma dev show mlx5_1"),
        context,
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("2: mlx5_1:");
      expect(result.output).not.toContain("mlx5_0");
    });

    it("rdma link show <device>/<port> shows only the named device's links", () => {
      const result = simulator.executeRdma(
        parse("rdma link show mlx5_1/1"),
        context,
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("link mlx5_1/1");
      expect(result.output).not.toContain("mlx5_0");
    });

    it("rdma dev with no device still lists every device", () => {
      const result = simulator.executeRdma(parse("rdma dev"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("1: mlx5_0:");
      expect(result.output).toContain("2: mlx5_1:");
    });
  });

  describe("perfquery targeting flags (SIM-13)", () => {
    const makePort = (portNumber: number, lid: number, guid: string) => ({
      portNumber,
      state: "Active",
      physicalState: "LinkUp",
      rate: 400,
      lid,
      guid,
      linkLayer: "InfiniBand",
      xmitDataBytes: 500000000 + ((lid * 7919) % 500000000),
      rcvDataBytes: 450000000 + ((lid * 7919 * 3) % 500000000),
      xmitPkts: 5000000 + ((lid * 7919) % 5000000),
      rcvPkts: 4800000 + ((lid * 7919 * 3) % 5000000),
      errors: {
        symbolErrors: 0,
        linkDowned: 0,
        portRcvErrors: 0,
        portXmitDiscards: 0,
        portXmitWait: 0,
      },
    });

    beforeEach(() => {
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          nodes: [
            {
              id: "dgx-00",
              hostname: "dgx-node01",
              systemType: "DGX-H100",
              healthStatus: "OK",
              gpus: [],
              hcas: [
                {
                  id: 0,
                  caType: "mlx5_0",
                  model: "ConnectX-7",
                  firmwareVersion: "28.39.1002",
                  ports: [makePort(1, 101, "0x506b4b0300aa0001")],
                },
                {
                  id: 1,
                  caType: "mlx5_1",
                  model: "ConnectX-7",
                  firmwareVersion: "28.39.1002",
                  ports: [
                    makePort(1, 102, "0x506b4b0300aa0002"),
                    makePort(2, 103, "0x506b4b0300aa0003"),
                  ],
                },
              ],
            },
          ],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    });

    it("perfquery -C <ca> queries the named HCA's port, not always hcas[0]", () => {
      const result = simulator.executePerfquery(
        parse("perfquery -C mlx5_1"),
        context,
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("# Port counters: Lid 102 port 1");
      expect(result.output).not.toContain("Lid 101");
    });

    it("perfquery -C <ca> -P <port> selects the named port on that HCA", () => {
      const result = simulator.executePerfquery(
        parse("perfquery -C mlx5_1 -P 2"),
        context,
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("# Port counters: Lid 103 port 2");
    });

    it("perfquery with no targeting flags still queries the first HCA's first port", () => {
      const result = simulator.executePerfquery(parse("perfquery"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("# Port counters: Lid 101 port 1");
    });

    it("perfquery -C <unknown-ca> falls back to the first HCA", () => {
      const result = simulator.executePerfquery(
        parse("perfquery -C mlx5_99"),
        context,
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("# Port counters: Lid 101 port 1");
    });
  });

  describe("perfquery counters reflect stored port state, not a frozen LID-derived formula (PHYS-7)", () => {
    const makeTrafficPort = () => ({
      portNumber: 1,
      state: "Active",
      physicalState: "LinkUp",
      rate: 400,
      lid: 150,
      guid: "0x506b4b0300bb0001",
      linkLayer: "InfiniBand",
      xmitDataBytes: 750000000,
      rcvDataBytes: 700000000,
      xmitPkts: 6000000,
      rcvPkts: 5500000,
      errors: {
        symbolErrors: 0,
        linkDowned: 0,
        portRcvErrors: 0,
        portXmitDiscards: 0,
        portXmitWait: 0,
      },
    });

    let port: ReturnType<typeof makeTrafficPort>;

    beforeEach(() => {
      port = makeTrafficPort();
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          nodes: [
            {
              id: "dgx-00",
              hostname: "dgx-node01",
              systemType: "DGX-H100",
              healthStatus: "OK",
              gpus: [],
              hcas: [
                {
                  id: 0,
                  caType: "mlx5_0",
                  model: "ConnectX-7",
                  firmwareVersion: "28.39.1002",
                  ports: [port],
                },
              ],
            },
          ],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    });

    it("prints the stored traffic counters, not values recomputed from the LID", () => {
      const result = simulator.executePerfquery(parse("perfquery"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/PortXmitData:\.+750000000\n/);
      expect(result.output).toMatch(/PortRcvData:\.+700000000\n/);
      expect(result.output).toMatch(/PortXmitPkts:\.+6000000\n/);
      expect(result.output).toMatch(/PortRcvPkts:\.+5500000\n/);
    });

    it("two perfquery calls on the same port show a nonzero delta after simulated traffic advances the counters", () => {
      const first = simulator.executePerfquery(parse("perfquery"), context);
      expect(first.output).toMatch(/PortXmitData:\.+750000000\n/);

      // Simulate what one metrics tick under load does: advance the stored
      // counters in place (same mutate-the-fixture-then-reinvoke pattern the
      // GPU-fault tests use).
      port.xmitDataBytes += 12500000;
      port.rcvDataBytes += 11000000;
      port.xmitPkts += 8500;
      port.rcvPkts += 7800;

      const second = simulator.executePerfquery(parse("perfquery"), context);
      expect(second.output).toMatch(/PortXmitData:\.+762500000\n/);
      expect(second.output).toMatch(/PortRcvData:\.+711000000\n/);
      expect(second.output).toMatch(/PortXmitPkts:\.+6008500\n/);
      expect(second.output).toMatch(/PortRcvPkts:\.+5507800\n/);
      expect(second.output).not.toBe(first.output);
    });
  });

  describe("iblinkinfo shows real peer/switch info, not just local ports (SIM-7)", () => {
    it("each HCA port's line includes the leaf switch it connects to", () => {
      const result = simulator.executeIblinkinfo(parse("iblinkinfo"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/leaf-\d+|Rail-\d+/);
      // Distinct from a bare local-port dump: a switch/peer identifier appears.
      expect(result.output).toMatch(/QM97\d\d|QM87\d\d/);
    });
  });

  describe("ibdiagnet reads real fabric state (SIM-12)", () => {
    const mockNodeWithErrors = (overrides: {
      symbolErrors?: number;
      linkDowned?: number;
      portRcvErrors?: number;
      healthStatus?: string;
    }) => {
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          nodes: [
            {
              id: "dgx-00",
              hostname: "dgx-node01",
              systemType: "DGX-H100",
              healthStatus: overrides.healthStatus ?? "OK",
              gpus: [],
              hcas: [
                {
                  caType: "mlx5_0",
                  firmwareVersion: "28.39.1002",
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
                        symbolErrors: overrides.symbolErrors ?? 0,
                        linkDowned: overrides.linkDowned ?? 0,
                        portRcvErrors: overrides.portRcvErrors ?? 0,
                        portXmitDiscards: 0,
                        portXmitWait: 0,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    };

    it("reports the real switch count from the shared fabric topology, not a hardcoded 0", () => {
      const result = simulator.executeIbdiagnet(parse("ibdiagnet"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).not.toContain("# of switches: 0");
      expect(result.output).toMatch(/# of switches: \d+/);
      // Default fixture: 1 HCA -> 4 spine + 1 leaf from deriveFabricTopology.
      expect(result.output).toContain("# of switches: 5");
    });

    it("reports errors found when a port has a nonzero error counter, not an unconditional 'No errors found'", () => {
      mockNodeWithErrors({ symbolErrors: 100, portRcvErrors: 5 });

      const result = simulator.executeIbdiagnet(parse("ibdiagnet"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).not.toContain("No errors found");
      expect(result.output.toLowerCase()).toMatch(/error|degraded|warning/);
    });

    it("reports errors found when the node's health status is not OK, even with zero port error counters", () => {
      mockNodeWithErrors({ healthStatus: "Critical" });

      const result = simulator.executeIbdiagnet(parse("ibdiagnet"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).not.toContain("No errors found");
      expect(result.output.toLowerCase()).toMatch(/error|degraded|warning/);
    });

    it("reports a clean summary for a genuinely healthy fabric (no regression for the common case)", () => {
      const result = simulator.executeIbdiagnet(parse("ibdiagnet"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("No errors found");
    });
  });

  describe("ibping resolves a real fabric peer (SIM-13)", () => {
    // Uses the default single-HCA fixture from the outer beforeEach:
    // HCA port LID 123; deriveFabricTopology gives spine LIDs 10-13 and
    // one leaf switch at LID 20 (leaf count = HCA count = 1).
    it("ibping <lid> reports success against a switch LID that actually exists in the fabric topology", () => {
      const result = simulator.executeIbping(parse("ibping 20"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Pong from lid 20");
      expect(result.output).toContain("0% packet loss");
    });

    it("ibping <lid> reports success against a real HCA port LID", () => {
      const result = simulator.executeIbping(parse("ibping 123"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Pong from lid 123");
    });

    it("ibping <lid> reports the target as unreachable for a LID with no matching switch/port anywhere in the fabric", () => {
      const result = simulator.executeIbping(parse("ibping 9999"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output.toLowerCase()).toMatch(
        /unreachable|no route|not found/,
      );
      expect(result.output).not.toContain("Pong");
    });
  });

  describe("ibstat/ibstatus real output formats (SIM-14)", () => {
    it("ibstat's Rate field is a bare number, no Gb/s suffix or standard-name parenthetical", () => {
      const result = simulator.executeIbstat(parse("ibstat"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/Rate: \d+\n/);
      expect(result.output).not.toMatch(/Rate: \d+ Gb\/s/);
    });

    it("ibstatus's default gid is a colon-grouped fe80:: link-local GID, not the bare hex GUID", () => {
      const result = simulator.executeIbstatus(parse("ibstatus"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(
        /default gid:\t fe80:0000:0000:0000:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}/,
      );
    });

    it("ibstatus's base lid and sm lid are printed in hex (0x-prefixed), not decimal", () => {
      const result = simulator.executeIbstatus(parse("ibstatus"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/base lid:\t 0x[0-9a-f]+/);
      expect(result.output).toMatch(/sm lid:\t\t 0x1/);
    });
  });
});
