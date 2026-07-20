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
    expect(specs.gpu.model).toContain("B200");
    expect(specs.gpu.count).toBe(8);
    expect(specs.gpu.memoryGB).toBe(180);
    expect(specs.gpu.memoryMiB).toBe(184320);
    expect(specs.gpu.memoryType).toBe("HBM3e");
  });

  it("should have correct GB200 NVLink specs", () => {
    const specs = HARDWARE_SPECS["DGX-GB200"];
    expect(specs.nvlink.version).toBe("5.0");
    expect(specs.nvlink.linksPerGpu).toBe(18);
    expect(specs.nvlink.totalBandwidthGBs).toBe(1800);
    expect(specs.nvlink.nvSwitchCount).toBe(4);
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
    expect(specs.system.generation).toBe("Blackwell");
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
    expect(getGenerationName("DGX-GB200")).toBe("Blackwell");
  });

  it("all specs should have 8 GPUs", () => {
    for (const type of ALL_SYSTEM_TYPES) {
      expect(HARDWARE_SPECS[type].gpu.count).toBe(8);
    }
  });

  it("all specs include sxmVersion field", () => {
    for (const type of ALL_SYSTEM_TYPES) {
      const specs = getHardwareSpecs(type);
      expect(specs.gpu.sxmVersion).toBeDefined();
      expect(typeof specs.gpu.sxmVersion).toBe("string");
    }
  });

  it("all specs include interNodeBandwidthGBs field", () => {
    for (const type of ALL_SYSTEM_TYPES) {
      const specs = getHardwareSpecs(type);
      expect(specs.network.interNodeBandwidthGBs).toBeDefined();
      expect(specs.network.interNodeBandwidthGBs).toBeGreaterThan(0);
    }
  });

  describe("DGX-VR200 (Vera Rubin)", () => {
    it("exists in ALL_SYSTEM_TYPES", () => {
      expect(ALL_SYSTEM_TYPES).toContain("DGX-VR200");
    });

    it("has correct GPU specs", () => {
      const specs = getHardwareSpecs("DGX-VR200");
      expect(specs.gpu.model).toContain("R200");
      expect(specs.gpu.memoryGB).toBe(288);
      expect(specs.gpu.memoryType).toBe("HBM4");
      expect(specs.gpu.count).toBe(8);
    });

    it("has NVLink 6.0", () => {
      const specs = getHardwareSpecs("DGX-VR200");
      expect(specs.nvlink.version).toBe("6.0");
      expect(specs.nvlink.totalBandwidthGBs).toBe(3600);
    });

    it("has Vera CPU", () => {
      const specs = getHardwareSpecs("DGX-VR200");
      expect(specs.system.cpu.model).toContain("Vera");
      expect(specs.system.generation).toBe("Rubin");
    });

    it("has ConnectX-9 networking", () => {
      const specs = getHardwareSpecs("DGX-VR200");
      expect(specs.network.hcaModel).toBe("ConnectX-9");
      expect(specs.network.portRateGbs).toBe(800);
    });
  });

  describe("FP throughput fields use a consistent dense Tensor-Core basis (PHYS-13)", () => {
    it("H100's fp64Tflops matches its published dense FP64 Tensor-Core rate (67), not its non-Tensor CUDA-core rate (34)", () => {
      expect(HARDWARE_SPECS["DGX-H100"].gpu.fp64Tflops).toBe(67);
    });

    it("H100's fp16Tflops matches its published DENSE Tensor-Core rate (989.4 -> rounded 989), not the sparse rate (1979)", () => {
      expect(HARDWARE_SPECS["DGX-H100"].gpu.fp16Tflops).toBe(989);
    });

    it("H100's tf32Tflops matches its published DENSE Tensor-Core rate (494.7 -> rounded 495), not the sparse rate (989)", () => {
      expect(HARDWARE_SPECS["DGX-H100"].gpu.tf32Tflops).toBe(495);
    });

    it("H200 (same GH100 die as H100) mirrors H100's corrected compute rates exactly", () => {
      expect(HARDWARE_SPECS["DGX-H200"].gpu.fp64Tflops).toBe(67);
      expect(HARDWARE_SPECS["DGX-H200"].gpu.fp16Tflops).toBe(989);
      expect(HARDWARE_SPECS["DGX-H200"].gpu.tf32Tflops).toBe(495);
    });

    it("every architecture's fp16:tf32 ratio is ~2:1 (the dense Tensor-Core ratio), guarding against a future sparse-value regression", () => {
      for (const spec of Object.values(HARDWARE_SPECS)) {
        const ratio = spec.gpu.fp16Tflops / spec.gpu.tf32Tflops;
        expect(ratio).toBeGreaterThan(1.7);
        expect(ratio).toBeLessThan(2.3);
      }
    });
  });

  describe("power-limit bounds", () => {
    it("has a positive min below max, and max equal to the rated TDP, for every architecture", () => {
      for (const [systemType, spec] of Object.entries(HARDWARE_SPECS)) {
        expect(
          spec.gpu.minPowerLimitW,
          `${systemType} minPowerLimitW`,
        ).toBeGreaterThan(0);
        expect(
          spec.gpu.minPowerLimitW,
          `${systemType} minPowerLimitW < maxPowerLimitW`,
        ).toBeLessThan(spec.gpu.maxPowerLimitW);
        expect(
          spec.gpu.maxPowerLimitW,
          `${systemType} maxPowerLimitW === tdpWatts`,
        ).toBe(spec.gpu.tdpWatts);
      }
    });
  });
});
