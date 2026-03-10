import { describe, it, expect } from "vitest";
import type { GPU } from "@/types/hardware";
import {
  formatDisplayMemory,
  formatDisplayECC,
  formatDisplayTemperature,
  formatDisplayPids,
  DISPLAY_FORMATTERS,
} from "../nvidiaSmiFormatters";

const makeGpu = (overrides?: Partial<GPU>): GPU => ({
  id: 0,
  uuid: "GPU-00000000-0000-0000-0000-000000000000",
  name: "NVIDIA A100-SXM4-80GB",
  type: "A100-80GB",
  pciAddress: "0000:01:00.0",
  memoryTotal: 81920,
  memoryUsed: 40960,
  utilization: 50,
  temperature: 45,
  powerDraw: 300,
  powerLimit: 400,
  clocksSM: 1410,
  clocksMem: 1593,
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
  persistenceMode: false,
  ...overrides,
});

describe("nvidiaSmiFormatters", () => {
  describe("formatDisplayMemory", () => {
    it("includes FB Memory total, used, and free", () => {
      const gpu = makeGpu({ memoryTotal: 81920, memoryUsed: 40960 });
      const output = formatDisplayMemory(gpu);
      expect(output).toContain("FB Memory Usage");
      expect(output).toContain(": 81920 MiB");
      expect(output).toContain(": 40960 MiB");
      expect(output).toContain(": 40960 MiB"); // free = total - used
    });

    it("includes BAR1 memory section", () => {
      const gpu = makeGpu();
      const output = formatDisplayMemory(gpu);
      expect(output).toContain("BAR1 Memory Usage");
    });

    it("includes Conf Compute Protected Memory section", () => {
      const gpu = makeGpu();
      const output = formatDisplayMemory(gpu);
      expect(output).toContain("Conf Compute Protected Memory Usage");
    });
  });

  describe("formatDisplayECC", () => {
    it("shows ECC mode as Enabled when eccEnabled is true", () => {
      const gpu = makeGpu({ eccEnabled: true });
      const output = formatDisplayECC(gpu);
      expect(output).toContain("Current                           : Enabled");
      expect(output).toContain("Pending                           : Enabled");
    });

    it("shows ECC mode as Disabled when eccEnabled is false", () => {
      const gpu = makeGpu({ eccEnabled: false });
      const output = formatDisplayECC(gpu);
      expect(output).toContain("Current                           : Disabled");
    });

    it("shows non-zero DRAM error counts", () => {
      const gpu = makeGpu({
        eccErrors: {
          singleBit: 3,
          doubleBit: 1,
          aggregated: { singleBit: 15, doubleBit: 2 },
        },
      });
      const output = formatDisplayECC(gpu);
      expect(output).toContain("DRAM Correctable              : 3");
      expect(output).toContain("DRAM Uncorrectable            : 1");
      expect(output).toContain("DRAM Correctable              : 15");
      expect(output).toContain("DRAM Uncorrectable            : 2");
    });
  });

  describe("formatDisplayTemperature", () => {
    it("shows current GPU temperature from gpu data", () => {
      const gpu = makeGpu({ temperature: 45 });
      const output = formatDisplayTemperature(gpu);
      expect(output).toContain("GPU Current Temp                  : 45 C");
    });

    it("shows memory temp as GPU temp + 5", () => {
      const gpu = makeGpu({ temperature: 45 });
      const output = formatDisplayTemperature(gpu);
      expect(output).toContain("Memory Current Temp               : 50 C");
    });
  });

  describe("formatDisplayPids", () => {
    it("returns static None output", () => {
      const gpu = makeGpu();
      const output = formatDisplayPids(gpu);
      expect(output).toContain("Processes                             : None");
    });
  });

  describe("DISPLAY_FORMATTERS dispatch map", () => {
    const expectedKeys = [
      "MEMORY",
      "UTILIZATION",
      "ECC",
      "TEMPERATURE",
      "POWER",
      "CLOCKS",
      "CLOCK",
      "COMPUTE",
      "PIDS",
      "PERFORMANCE",
      "SUPPORTED_CLOCKS",
      "PAGE_RETIREMENT",
      "ACCOUNTING",
      "ENCODER_STATS",
      "SUPPORTED_GPU_TARGET_TEMP",
      "VOLTAGE",
      "FBC_STATS",
      "ROW_REMAPPER",
      "RESET_STATUS",
    ];

    it("contains all 19 expected keys (including CLOCK alias)", () => {
      expect(Object.keys(DISPLAY_FORMATTERS)).toHaveLength(19);
      for (const key of expectedKeys) {
        expect(DISPLAY_FORMATTERS).toHaveProperty(key);
      }
    });

    it("all formatters return strings", () => {
      const gpu = makeGpu();
      for (const key of expectedKeys) {
        const result = DISPLAY_FORMATTERS[key](gpu);
        expect(typeof result).toBe("string");
      }
    });
  });
});
