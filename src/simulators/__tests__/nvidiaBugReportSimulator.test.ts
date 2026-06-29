import { describe, it, expect, beforeEach, vi } from "vitest";
import { NvidiaBugReportSimulator } from "../nvidiaBugReportSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";
import { useSimulationStore } from "@/store/simulationStore";

// Mock the store
vi.mock("@/store/simulationStore");

describe("NvidiaBugReportSimulator", () => {
  let simulator: NvidiaBugReportSimulator;
  let context: CommandContext;

  const makeGpu = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    name: "NVIDIA H100 80GB HBM3",
    type: "H100-SXM",
    uuid: `GPU-12345678-1234-1234-1234-12345678901${id}`,
    pciAddress: `0000:${(0x17 + id).toString(16)}:00.0`,
    temperature: 45,
    powerDraw: 250,
    powerLimit: 700,
    memoryTotal: 81920,
    memoryUsed: 1024,
    utilization: 10,
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
        status: "Active",
        speed: 50,
        txErrors: 0,
        rxErrors: 0,
        replayErrors: 0,
      },
      {
        linkId: 1,
        status: "Active",
        speed: 50,
        txErrors: 0,
        rxErrors: 0,
        replayErrors: 0,
      },
    ],
    healthStatus: "OK",
    xidErrors: [],
    persistenceMode: true,
    ...overrides,
  });

  const makeNode = (overrides: Record<string, unknown> = {}) => ({
    id: "dgx-00",
    hostname: "dgx-node01",
    systemType: "DGX-H100",
    healthStatus: "OK",
    nvidiaDriverVersion: "535.129.03",
    cudaVersion: "12.2",
    osVersion: "Ubuntu 22.04",
    kernelVersion: "5.15.0-91-generic",
    cpuModel: "AMD EPYC 9654",
    cpuCount: 128,
    ramTotal: 2048,
    ramUsed: 512,
    slurmState: "idle",
    gpus: Array.from({ length: 8 }, (_, i) => makeGpu(i)),
    hcas: [],
    dpus: [],
    bmc: {
      ipAddress: "10.0.1.1",
      macAddress: "AA:BB:CC:DD:EE:FF",
      firmwareVersion: "1.0",
      manufacturer: "NVIDIA",
      sensors: [],
      powerState: "On",
    },
    ...overrides,
  });

  beforeEach(() => {
    simulator = new NvidiaBugReportSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };

    vi.mocked(useSimulationStore.getState).mockReturnValue({
      cluster: {
        name: "test-cluster",
        nodes: [makeNode()],
        fabricTopology: "FatTree",
        bcmHA: {
          enabled: true,
          primary: "dgx-headnode01",
          secondary: "dgx-headnode02",
          state: "Active",
        },
        slurmConfig: { controlMachine: "dgx-headnode01", partitions: ["gpu"] },
      },
      setBugReportCollected: vi.fn(),
    } as ReturnType<typeof useSimulationStore.getState>);
  });

  // ============================
  // Basic report generation
  // ============================
  describe("basic report", () => {
    it("should produce a structured report from nvidia-bug-report.sh", () => {
      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NVIDIA Bug Report Generator");
      expect(result.output).toContain("completed successfully");
    });

    it("should include System Information section", () => {
      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("System Information");
      expect(result.output).toContain("dgx-node01");
      expect(result.output).toContain("DGX-H100");
    });

    it("should include GPU Info section", () => {
      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("GPU Summary");
      expect(result.output).toContain("Total GPUs:");
      expect(result.output).toContain("8");
    });

    it("should include Driver Info section", () => {
      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("Driver Information");
      expect(result.output).toContain("535.129.03");
      expect(result.output).toContain("CUDA Version");
    });

    it("should include XID Summary section", () => {
      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("XID Error History");
    });

    it("should show no XID errors when GPUs are healthy", () => {
      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("No XID errors recorded");
    });
  });

  // ============================
  // Output filename flag
  // ============================
  describe("output filename (-o)", () => {
    it("should mention custom output filename in output", () => {
      const parsed = parse(
        "nvidia-bug-report.sh -o /home/user/my-report.log.gz",
      );
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("/home/user/my-report.log.gz");
    });

    it("should use default filename when -o not provided", () => {
      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("/tmp/nvidia-bug-report.log.gz");
    });
  });

  // ============================
  // Verbose flag (-v)
  // ============================
  describe("verbose mode (-v)", () => {
    it("should show numbered collection steps in verbose mode", () => {
      const parsed = parse("nvidia-bug-report.sh -v");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      // Verbose mode uses numbered format: [1/12] nvidia-smi...
      expect(result.output).toMatch(/\[\d+\/\d+\]/);
    });

    it("should show bullet points without verbose", () => {
      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      // Non-verbose uses "  - section" format
      expect(result.output).toContain("  - nvidia-smi");
    });
  });

  // ============================
  // No-compress flag
  // ============================
  describe("no-compress flag", () => {
    it("should remove .gz extension in uncompressed mode", () => {
      const parsed = parse("nvidia-bug-report.sh --no-compress");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("/tmp/nvidia-bug-report.log");
      // Should show file size in MB, not KB
      expect(result.output).toContain("MB");
    });

    it("should show compressed size in default mode", () => {
      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("Compressed size:");
      expect(result.output).toContain("KB");
    });
  });

  // ============================
  // Extra system data flag
  // ============================
  describe("extra-system-data flag", () => {
    it("should collect additional system information with --extra-system-data", () => {
      const parsed = parse("nvidia-bug-report.sh --extra-system-data");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("lspci verbose");
      expect(result.output).toContain("dmidecode");
      expect(result.output).toContain("kernel modules");
    });

    it("should not include extra sections without the flag", () => {
      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).not.toContain("lspci verbose");
      expect(result.output).not.toContain("boot parameters");
    });
  });

  // ============================
  // Report sections
  // ============================
  describe("report sections", () => {
    it("should include NVLink Summary section", () => {
      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("NVLink Summary");
      expect(result.output).toContain("Total Links");
      expect(result.output).toContain("Active");
    });

    it("should include ECC Memory Status section", () => {
      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("ECC Memory Status");
      expect(result.output).toContain("Single-Bit Errors");
      expect(result.output).toContain("Double-Bit Errors");
    });

    it("should include Recommendations section", () => {
      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("Recommendations");
    });

    it("should show GPU Details section with per-GPU info", () => {
      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("GPU Details");
      expect(result.output).toContain("GPU 0:");
      expect(result.output).toContain("UUID:");
      expect(result.output).toContain("PCI Bus:");
    });
  });

  // ============================
  // XID database coverage
  // ============================
  describe("XID database", () => {
    it("should have description for XID 79 (GPU fallen off bus)", () => {
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          name: "test-cluster",
          nodes: [
            makeNode({
              gpus: [
                makeGpu(0, {
                  xidErrors: [
                    {
                      code: 79,
                      timestamp: new Date(),
                      description: "GPU fallen off bus",
                      severity: "Critical",
                    },
                  ],
                }),
              ],
            }),
          ],
          fabricTopology: "FatTree",
          bcmHA: {
            enabled: true,
            primary: "h01",
            secondary: "h02",
            state: "Active",
          },
          slurmConfig: { controlMachine: "h01", partitions: ["gpu"] },
        },
        setBugReportCollected: vi.fn(),
      } as ReturnType<typeof useSimulationStore.getState>);

      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("79");
      expect(result.output).toContain("GPU has fallen off the bus");
    });

    it("should have description for XID 74 (NVLink error)", () => {
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          name: "test-cluster",
          nodes: [
            makeNode({
              gpus: [
                makeGpu(0, {
                  xidErrors: [
                    {
                      code: 74,
                      timestamp: new Date(),
                      description: "NVLink error",
                      severity: "Critical",
                    },
                  ],
                }),
              ],
            }),
          ],
          fabricTopology: "FatTree",
          bcmHA: {
            enabled: true,
            primary: "h01",
            secondary: "h02",
            state: "Active",
          },
          slurmConfig: { controlMachine: "h01", partitions: ["gpu"] },
        },
        setBugReportCollected: vi.fn(),
      } as ReturnType<typeof useSimulationStore.getState>);

      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("NVLink");
    });

    it("should have description for XID 48 (Double Bit ECC Error)", () => {
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          name: "test-cluster",
          nodes: [
            makeNode({
              gpus: [
                makeGpu(0, {
                  xidErrors: [
                    {
                      code: 48,
                      timestamp: new Date(),
                      description: "DBE",
                      severity: "Critical",
                    },
                  ],
                }),
              ],
            }),
          ],
          fabricTopology: "FatTree",
          bcmHA: {
            enabled: true,
            primary: "h01",
            secondary: "h02",
            state: "Active",
          },
          slurmConfig: { controlMachine: "h01", partitions: ["gpu"] },
        },
        setBugReportCollected: vi.fn(),
      } as ReturnType<typeof useSimulationStore.getState>);

      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("Double Bit ECC");
    });

    it("should have description for XID 63 (ECC page retirement)", () => {
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          name: "test-cluster",
          nodes: [
            makeNode({
              gpus: [
                makeGpu(0, {
                  xidErrors: [
                    {
                      code: 63,
                      timestamp: new Date(),
                      description: "ECC retirement",
                      severity: "Warning",
                    },
                  ],
                }),
              ],
            }),
          ],
          fabricTopology: "FatTree",
          bcmHA: {
            enabled: true,
            primary: "h01",
            secondary: "h02",
            state: "Active",
          },
          slurmConfig: { controlMachine: "h01", partitions: ["gpu"] },
        },
        setBugReportCollected: vi.fn(),
      } as ReturnType<typeof useSimulationStore.getState>);

      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("ECC page retirement");
    });

    it("should have description for XID 43 (GPU stopped processing)", () => {
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          name: "test-cluster",
          nodes: [
            makeNode({
              gpus: [
                makeGpu(0, {
                  xidErrors: [
                    {
                      code: 43,
                      timestamp: new Date(),
                      description: "GPU stopped",
                      severity: "Critical",
                    },
                  ],
                }),
              ],
            }),
          ],
          fabricTopology: "FatTree",
          bcmHA: {
            enabled: true,
            primary: "h01",
            secondary: "h02",
            state: "Active",
          },
          slurmConfig: { controlMachine: "h01", partitions: ["gpu"] },
        },
        setBugReportCollected: vi.fn(),
      } as ReturnType<typeof useSimulationStore.getState>);

      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("GPU stopped processing");
    });

    it("should have description for XID 8 (GSP error)", () => {
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          name: "test-cluster",
          nodes: [
            makeNode({
              gpus: [
                makeGpu(0, {
                  xidErrors: [
                    {
                      code: 8,
                      timestamp: new Date(),
                      description: "GSP error",
                      severity: "Critical",
                    },
                  ],
                }),
              ],
            }),
          ],
          fabricTopology: "FatTree",
          bcmHA: {
            enabled: true,
            primary: "h01",
            secondary: "h02",
            state: "Active",
          },
          slurmConfig: { controlMachine: "h01", partitions: ["gpu"] },
        },
        setBugReportCollected: vi.fn(),
      } as ReturnType<typeof useSimulationStore.getState>);

      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("GSP error");
    });

    it("should have description for XID 14 (Thermal violation)", () => {
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          name: "test-cluster",
          nodes: [
            makeNode({
              gpus: [
                makeGpu(0, {
                  xidErrors: [
                    {
                      code: 14,
                      timestamp: new Date(),
                      description: "Thermal",
                      severity: "Warning",
                    },
                  ],
                }),
              ],
            }),
          ],
          fabricTopology: "FatTree",
          bcmHA: {
            enabled: true,
            primary: "h01",
            secondary: "h02",
            state: "Active",
          },
          slurmConfig: { controlMachine: "h01", partitions: ["gpu"] },
        },
        setBugReportCollected: vi.fn(),
      } as ReturnType<typeof useSimulationStore.getState>);

      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("Thermal violation");
    });

    it("should have descriptions for XID 94 and 95 (ECC errors)", () => {
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          name: "test-cluster",
          nodes: [
            makeNode({
              gpus: [
                makeGpu(0, {
                  xidErrors: [
                    {
                      code: 94,
                      timestamp: new Date(),
                      description: "Contained",
                      severity: "Critical",
                    },
                    {
                      code: 95,
                      timestamp: new Date(),
                      description: "Uncontained",
                      severity: "Critical",
                    },
                  ],
                }),
              ],
            }),
          ],
          fabricTopology: "FatTree",
          bcmHA: {
            enabled: true,
            primary: "h01",
            secondary: "h02",
            state: "Active",
          },
          slurmConfig: { controlMachine: "h01", partitions: ["gpu"] },
        },
        setBugReportCollected: vi.fn(),
      } as ReturnType<typeof useSimulationStore.getState>);

      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("Contained ECC error");
      expect(result.output).toContain("Uncontained ECC error");
    });
  });

  // ============================
  // Fault-aware recommendations
  // ============================
  describe("fault-aware recommendations", () => {
    it("should recommend action when GPU has faults", () => {
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          name: "test-cluster",
          nodes: [
            makeNode({
              gpus: [makeGpu(0, { healthStatus: "Critical" })],
            }),
          ],
          fabricTopology: "FatTree",
          bcmHA: {
            enabled: true,
            primary: "h01",
            secondary: "h02",
            state: "Active",
          },
          slurmConfig: { controlMachine: "h01", partitions: ["gpu"] },
        },
        setBugReportCollected: vi.fn(),
      } as ReturnType<typeof useSimulationStore.getState>);

      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("Recommendations");
      expect(result.output).toContain("non-OK state");
      expect(result.output).toContain("dcgmi diag");
    });

    it("should report no issues when system is healthy", () => {
      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("No issues detected");
    });

    it("should warn about ECC double-bit errors", () => {
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          name: "test-cluster",
          nodes: [
            makeNode({
              gpus: [
                makeGpu(0, {
                  eccErrors: {
                    singleBit: 5,
                    doubleBit: 2,
                    aggregated: { singleBit: 5, doubleBit: 2 },
                  },
                }),
              ],
            }),
          ],
          fabricTopology: "FatTree",
          bcmHA: {
            enabled: true,
            primary: "h01",
            secondary: "h02",
            state: "Active",
          },
          slurmConfig: { controlMachine: "h01", partitions: ["gpu"] },
        },
        setBugReportCollected: vi.fn(),
      } as ReturnType<typeof useSimulationStore.getState>);

      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("Uncorrectable ECC errors");
    });

    it("should warn about inactive NVLinks", () => {
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          name: "test-cluster",
          nodes: [
            makeNode({
              gpus: [
                makeGpu(0, {
                  nvlinks: [
                    {
                      linkId: 0,
                      status: "Active",
                      speed: 50,
                      txErrors: 0,
                      rxErrors: 0,
                      replayErrors: 0,
                    },
                    {
                      linkId: 1,
                      status: "Down",
                      speed: 50,
                      txErrors: 0,
                      rxErrors: 0,
                      replayErrors: 0,
                    },
                  ],
                }),
              ],
            }),
          ],
          fabricTopology: "FatTree",
          bcmHA: {
            enabled: true,
            primary: "h01",
            secondary: "h02",
            state: "Active",
          },
          slurmConfig: { controlMachine: "h01", partitions: ["gpu"] },
        },
        setBugReportCollected: vi.fn(),
      } as ReturnType<typeof useSimulationStore.getState>);

      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("Inactive NVLinks");
    });
  });

  // ============================
  // Power limit warnings
  // ============================
  describe("power limit warnings", () => {
    it("should warn for GPUs near power limit", () => {
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          name: "test-cluster",
          nodes: [
            makeNode({
              gpus: [makeGpu(0, { powerDraw: 690, powerLimit: 700 })],
            }),
          ],
          fabricTopology: "FatTree",
          bcmHA: {
            enabled: true,
            primary: "h01",
            secondary: "h02",
            state: "Active",
          },
          slurmConfig: { controlMachine: "h01", partitions: ["gpu"] },
        },
        setBugReportCollected: vi.fn(),
      } as ReturnType<typeof useSimulationStore.getState>);

      const parsed = parse("nvidia-bug-report.sh");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("near power limit");
    });
  });

  // ============================
  // Bug report collection flag
  // ============================
  describe("bug report collection flag", () => {
    it("marks the node bugReportCollected after running", () => {
      const setBugReportCollected = vi.fn();
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: {
          name: "test-cluster",
          nodes: [makeNode()],
          fabricTopology: "FatTree",
          bcmHA: {
            enabled: true,
            primary: "dgx-headnode01",
            secondary: "dgx-headnode02",
            state: "Active",
          },
          slurmConfig: {
            controlMachine: "dgx-headnode01",
            partitions: ["gpu"],
          },
        },
        setBugReportCollected,
      } as ReturnType<typeof useSimulationStore.getState>);

      const sim = new NvidiaBugReportSimulator();
      const ctx: CommandContext = {
        currentNode: "dgx-00",
        currentPath: "/root",
        environment: {},
        history: [],
      };
      const result = sim.execute(parse("nvidia-bug-report.sh"), ctx);
      expect(result.exitCode).toBe(0);
      expect(setBugReportCollected).toHaveBeenCalledWith("dgx-00", true);
    });
  });

  // ============================
  // Help and version
  // ============================
  describe("help and version", () => {
    it("should show help with --help flag", () => {
      const parsed = parse("nvidia-bug-report.sh --help");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nvidia-bug-report.sh");
      expect(result.output).toContain("Usage");
      expect(result.output).toContain("--output-file");
      expect(result.output).toContain("--verbose");
      expect(result.output).toContain("--no-compress");
    });

    it("should show version with --version flag", () => {
      const parsed = parse("nvidia-bug-report.sh --version");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nvidia-bug-report.sh");
      expect(result.output).toContain("535.129.03");
    });
  });
});
