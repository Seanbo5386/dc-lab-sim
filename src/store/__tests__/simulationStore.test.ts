import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSimulationStore } from "../simulationStore";
import { useLearningProgressStore } from "../learningProgressStore";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("simulationStore.trackToolUsage - Multi-family mapping", () => {
  let markToolUsedSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    useSimulationStore.getState().resetSimulation();
    localStorageMock.clear();
    markToolUsedSpy = vi.spyOn(
      useLearningProgressStore.getState(),
      "markToolUsed",
    );
  });

  it("should credit both gpu-monitoring and xid-diagnostics for nvidia-smi", () => {
    useSimulationStore.getState().trackToolUsage("nvidia-smi");

    expect(markToolUsedSpy).toHaveBeenCalledTimes(2);
    expect(markToolUsedSpy).toHaveBeenCalledWith(
      "gpu-monitoring",
      "nvidia-smi",
    );
    expect(markToolUsedSpy).toHaveBeenCalledWith(
      "xid-diagnostics",
      "nvidia-smi",
    );
  });

  it("should credit xid-diagnostics for dmesg", () => {
    useSimulationStore.getState().trackToolUsage("dmesg");

    expect(markToolUsedSpy).toHaveBeenCalledTimes(1);
    expect(markToolUsedSpy).toHaveBeenCalledWith("xid-diagnostics", "dmesg");
  });

  it("should credit only infiniband-tools for ibstat (single-family)", () => {
    useSimulationStore.getState().trackToolUsage("ibstat");

    expect(markToolUsedSpy).toHaveBeenCalledTimes(1);
    expect(markToolUsedSpy).toHaveBeenCalledWith("infiniband-tools", "ibstat");
  });

  it("should credit both gpu-monitoring and xid-diagnostics for dcgmi", () => {
    useSimulationStore.getState().trackToolUsage("dcgmi diag -r 1");

    expect(markToolUsedSpy).toHaveBeenCalledTimes(2);
    expect(markToolUsedSpy).toHaveBeenCalledWith("gpu-monitoring", "dcgmi");
    expect(markToolUsedSpy).toHaveBeenCalledWith("xid-diagnostics", "dcgmi");
  });

  it("should credit both diagnostics and xid-diagnostics for dcgmi-diag", () => {
    useSimulationStore.getState().trackToolUsage("dcgmi-diag");

    expect(markToolUsedSpy).toHaveBeenCalledTimes(2);
    expect(markToolUsedSpy).toHaveBeenCalledWith("diagnostics", "dcgmi-diag");
    expect(markToolUsedSpy).toHaveBeenCalledWith(
      "xid-diagnostics",
      "dcgmi-diag",
    );
  });

  it("should not call markToolUsed for unknown commands", () => {
    useSimulationStore.getState().trackToolUsage("unknowncmd --flag");

    expect(markToolUsedSpy).not.toHaveBeenCalled();
  });
});
