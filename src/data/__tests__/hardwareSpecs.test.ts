import { describe, it, expect } from "vitest";
import {
  HARDWARE_SPECS,
  ALL_SYSTEM_TYPES,
  getHardwareSpecs,
  getSystemDisplayName,
  getGenerationName,
} from "../hardwareSpecs";

describe("hardwareSpecs", () => {
  it("should have specs for all system types", () => {
    for (const type of ALL_SYSTEM_TYPES) {
      expect(HARDWARE_SPECS[type]).toBeDefined();
      expect(HARDWARE_SPECS[type].system.type).toBe(type);
    }
  });

  it("should include DGX-GB200 in ALL_SYSTEM_TYPES", () => {
    expect(ALL_SYSTEM_TYPES).toContain("DGX-GB200");
  });

  it("should have correct GB200 GPU specs", () => {
    const specs = HARDWARE_SPECS["DGX-GB200"];
    expect(specs.gpu.model).toContain("GB200");
    expect(specs.gpu.count).toBe(8);
    expect(specs.gpu.memoryGB).toBe(192);
    expect(specs.gpu.memoryMiB).toBe(196608);
    expect(specs.gpu.memoryType).toBe("HBM3e");
  });

  it("should have correct GB200 NVLink specs", () => {
    const specs = HARDWARE_SPECS["DGX-GB200"];
    expect(specs.nvlink.version).toBe("5.0");
    expect(specs.nvlink.linksPerGpu).toBe(18);
    expect(specs.nvlink.totalBandwidthGBs).toBe(1800);
    expect(specs.nvlink.nvSwitchCount).toBe(2);
  });

  it("should have correct GB200 network specs with ConnectX-8 XDR", () => {
    const specs = HARDWARE_SPECS["DGX-GB200"];
    expect(specs.network.hcaModel).toBe("ConnectX-8");
    expect(specs.network.protocol).toBe("XDR");
    expect(specs.network.portRateGbs).toBe(800);
  });

  it("should have Grace CPU for GB200", () => {
    const specs = HARDWARE_SPECS["DGX-GB200"];
    expect(specs.system.cpu.model).toContain("Grace");
    expect(specs.system.generation).toBe("Blackwell Ultra");
  });

  it("getHardwareSpecs should return correct specs for each type", () => {
    for (const type of ALL_SYSTEM_TYPES) {
      const specs = getHardwareSpecs(type);
      expect(specs.system.type).toBe(type);
    }
  });

  it("getHardwareSpecs should fall back to A100 for unknown type", () => {
    const specs = getHardwareSpecs("DGX-UNKNOWN");
    expect(specs.system.type).toBe("DGX-A100");
  });

  it("getSystemDisplayName should return correct names", () => {
    expect(getSystemDisplayName("DGX-GB200")).toBe("DGX GB200");
    expect(getSystemDisplayName("DGX-A100")).toBe("DGX A100");
  });

  it("getGenerationName should return generation for GB200", () => {
    expect(getGenerationName("DGX-GB200")).toBe("Blackwell Ultra");
  });

  it("all specs should have 8 GPUs", () => {
    for (const type of ALL_SYSTEM_TYPES) {
      expect(HARDWARE_SPECS[type].gpu.count).toBe(8);
    }
  });
});
