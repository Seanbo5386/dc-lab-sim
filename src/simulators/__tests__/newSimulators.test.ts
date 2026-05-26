import { describe, it, expect, beforeEach, vi } from "vitest";
import { BasicSystemSimulator } from "../basicSystemSimulator";
import { MellanoxSimulator } from "../mellanoxSimulator";
import { NvlinkAuditSimulator } from "../nvlinkAuditSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";

// Mock the store with complete node data
vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: {
    getState: vi.fn(() => ({
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
                nvlinkActive: true,
                healthStatus: "OK",
                xidErrors: [],
                persistenceMode: true,
              },
              {
                id: 1,
                name: "NVIDIA H100 80GB HBM3",
                type: "H100-SXM",
                uuid: "GPU-12345678-1234-1234-1234-123456789013",
                pciAddress: "0000:18:00.0",
                temperature: 46,
                powerDraw: 260,
                powerLimit: 700,
                memoryTotal: 81920,
                memoryUsed: 2048,
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
                nvlinks: [],
                nvlinkActive: true,
                healthStatus: "OK",
                xidErrors: [],
                persistenceMode: true,
              },
            ],
            hcas: [
              {
                id: 0,
                caType: "ConnectX-7",
                firmwareVersion: "28.35.1012",
                devicePath: "/dev/mst/mt4125_pciconf0",
                ports: [
                  {
                    id: 1,
                    state: "Active",
                    physicalState: "LinkUp",
                    rate: 400,
                    lid: 1,
                    guid: "0x1234567890abcdef",
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
            dpus: [
              {
                id: 0,
                name: "BlueField-2",
                firmwareVersion: "24.35.1012",
                devicePath: "/dev/mst/mt41686_pciconf0",
                pciAddress: "0000:b0:00.0",
                ipAddress: "192.168.100.2",
                mode: {
                  mode: "DPU",
                  internalCpuModel: 1,
                  description: "DPU mode - Arm cores own NIC resources",
                },
              },
            ],
            nvswitches: [
              {
                id: 0,
                status: "Healthy",
                firmwareVersion: "2.3.0",
                temperature: 45,
                activePorts: 36,
              },
            ],
          },
        ],
      },
    })),
  },
}));

describe("BasicSystemSimulator - New Commands", () => {
  let simulator: BasicSystemSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new BasicSystemSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };
  });

  describe("hostnamectl", () => {
    it("should display hostname status with no arguments", () => {
      const parsed = parse("hostnamectl");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Static hostname");
      expect(result.output).toContain("dgx-00");
      expect(result.output).toContain("Operating System");
      expect(result.output).toContain("Ubuntu");
    });

    it("should display hostname status with status subcommand", () => {
      const parsed = parse("hostnamectl status");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Static hostname");
      expect(result.output).toContain("Hardware Vendor");
      expect(result.output).toContain("NVIDIA");
    });

    it("should handle set-hostname command", () => {
      const parsed = parse("hostnamectl set-hostname dgx-new");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      // Silent success
    });

    it("should error on set-hostname without argument", () => {
      const parsed = parse("hostnamectl set-hostname");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("missing hostname");
    });

    it("should display help with --help flag", () => {
      const parsed = parse("hostnamectl --help");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("hostnamectl");
    });
  });

  describe("timedatectl", () => {
    it("should display time status with no arguments", () => {
      const parsed = parse("timedatectl");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Local time");
      expect(result.output).toContain("Time zone");
      expect(result.output).toContain("NTP service");
    });

    it("should display time status with status subcommand", () => {
      const parsed = parse("timedatectl status");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Universal time");
      expect(result.output).toContain("synchronized");
    });

    it("should handle set-timezone command", () => {
      const parsed = parse("timedatectl set-timezone UTC");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
    });

    it("should error on set-timezone without argument", () => {
      const parsed = parse("timedatectl set-timezone");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("missing timezone");
    });

    it("should handle set-ntp command", () => {
      const parsed = parse("timedatectl set-ntp true");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
    });

    it("should list timezones", () => {
      const parsed = parse("timedatectl list-timezones");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("UTC");
      expect(result.output).toContain("America/New_York");
    });

    it("should display help with --help flag", () => {
      const parsed = parse("timedatectl --help");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("timedatectl");
    });
  });

  describe("systemctl enable/disable", () => {
    it("should return success and a symlink-creation message when enabling a service", () => {
      const parsed = parse("systemctl enable nvidia-fabricmanager");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nvidia-fabricmanager");
      expect(result.output).toMatch(/Created symlink/);
      expect(result.output).toContain("multi-user.target.wants");
    });

    it("should return success and a removal message when disabling a service", () => {
      const parsed = parse("systemctl disable nvidia-fabricmanager");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nvidia-fabricmanager");
      expect(result.output).toMatch(/Removed/);
    });

    it("should error when enable is called without a service name", () => {
      const parsed = parse("systemctl enable");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("enable");
    });

    it("should error when disable is called without a service name", () => {
      const parsed = parse("systemctl disable");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("disable");
    });

    it("should enable a generic service with realistic symlink output", () => {
      const parsed = parse("systemctl enable nvsm-core");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nvsm-core");
      expect(result.output).toMatch(/Created symlink/);
    });
  });
});

describe("MellanoxSimulator - mlxfwmanager", () => {
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

    // Start MST first (required for mlxfwmanager)
    const mstParsed = parse("mst start");
    simulator.execute(mstParsed, context);
  });

  it("should error when MST not started", () => {
    const freshSimulator = new MellanoxSimulator();
    const parsed = parse("mlxfwmanager --query");
    const result = freshSimulator.execute(parsed, context);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("MST driver not loaded");
  });

  it("should query firmware on all devices", () => {
    const parsed = parse("mlxfwmanager --query");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Querying Mellanox devices");
    expect(result.output).toContain("Device #");
    expect(result.output).toContain("Firmware");
  });

  it("should query firmware with no flags (default query)", () => {
    const parsed = parse("mlxfwmanager");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Querying Mellanox devices");
  });

  it("should query specific device", () => {
    const parsed = parse("mlxfwmanager -d /dev/mst/mt4125_pciconf0 --query");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Querying");
  });

  it("should error on invalid device", () => {
    const parsed = parse("mlxfwmanager -d /dev/mst/invalid_device --query");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("not found");
  });

  it("should check online updates", () => {
    const parsed = parse("mlxfwmanager --online-query");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("online");
    expect(result.output).toContain("Available FW");
  });

  it("should simulate firmware update", () => {
    const parsed = parse("mlxfwmanager -u -y");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("firmware update");
  });

  it("should display help", () => {
    const parsed = parse("mlxfwmanager -h");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("mlxfwmanager");
    // Help output includes the command in the tools list
  });
});

describe("NvlinkAuditSimulator", () => {
  let simulator: NvlinkAuditSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new NvlinkAuditSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };
  });

  it("should run basic audit", () => {
    const parsed = parse("nvlink-audit");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("NVLink Fabric Audit Report");
    expect(result.output).toContain("System Overview");
    expect(result.output).toContain("Total GPUs");
  });

  it("should run verbose audit", () => {
    const parsed = parse("nvlink-audit --verbose");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Link Details");
    expect(result.output).toContain("Link");
    expect(result.output).toContain("Peer");
  });

  it("should run audit for specific GPU", () => {
    const parsed = parse("nvlink-audit -i 0");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("GPU 0");
  });

  it("should error on invalid GPU", () => {
    const parsed = parse("nvlink-audit -i 99");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("not found");
  });

  it("should run comprehensive check", () => {
    const parsed = parse("nvlink-audit --check-all");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Bandwidth Test");
    expect(result.output).toContain("Topology Verification");
  });

  it("should output JSON report", () => {
    const parsed = parse("nvlink-audit --report json");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(0);
    // Output should be valid JSON
    expect(() => JSON.parse(result.output)).not.toThrow();

    const json = JSON.parse(result.output);
    expect(json).toHaveProperty("host");
    expect(json).toHaveProperty("totalGpus");
    expect(json).toHaveProperty("status");
    expect(json).toHaveProperty("gpus");
  });

  it("should show NVSwitch status", () => {
    const parsed = parse("nvlink-audit");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("NVSwitch");
  });

  it("should show topology verification", () => {
    const parsed = parse("nvlink-audit");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Topology Verification");
    expect(result.output).toContain("Full mesh connectivity");
  });

  it("should show audit summary", () => {
    const parsed = parse("nvlink-audit");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Audit Summary");
    expect(result.output).toMatch(/Status:.*HEALTHY|WARNINGS|ERRORS/);
  });

  it("should display help", () => {
    const parsed = parse("nvlink-audit --help");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("nvlink-audit");
  });

  it("should display version", () => {
    const parsed = parse("nvlink-audit --version");
    const result = simulator.execute(parsed, context);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("1.0.0");
  });
});
