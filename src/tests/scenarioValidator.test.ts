import { describe, it, expect, beforeEach } from "vitest";
import { useSimulationStore } from "../store/simulationStore";
import { NvidiaSmiSimulator } from "../simulators/nvidiaSmiSimulator";
import { DcgmiSimulator } from "../simulators/dcgmiSimulator";
import { parse } from "../utils/commandParser";
import type { CommandContext } from "../simulators/BaseSimulator";

describe("Scenario Logic Validation", () => {
  let store: ReturnType<typeof useSimulationStore.getState>;
  let nvidiaSmi: NvidiaSmiSimulator;
  let dcgmi: DcgmiSimulator;
  let context: CommandContext;

  beforeEach(() => {
    // Reset store
    store = useSimulationStore.getState();
    store.resetSimulation();

    // Initialize simulators
    nvidiaSmi = new NvidiaSmiSimulator();
    dcgmi = new DcgmiSimulator();

    // Create context with valid node
    const currentNode = store.cluster.nodes[0]?.id || "dgx-00";
    context = {
      cluster: store.cluster,
      currentNode,
    };
  });

  describe("Critical: XID 79 Error Handling", () => {
    beforeEach(() => {
      // Manually inject XID 79 error for testing
      store.addXIDError("dgx-00", 0, {
        code: 79,
        timestamp: new Date(),
        description: "GPU has fallen off the bus",
        severity: "Critical",
      });

      // Refresh context after store update
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: context.currentNode,
      };
    });

    it("should make GPU invisible in nvidia-smi when XID 79 occurs", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi"), context);
      expect(result.output).toContain("WARNING");
      expect(result.output).toContain(
        "GPU(s) not shown due to critical errors",
      );
      expect(result.output).toContain("XID 79");
    });

    it("should fail GPU reset for XID 79", () => {
      const result = nvidiaSmi.execute(
        parse("nvidia-smi --gpu-reset -i 0"),
        context,
      );
      expect(result.output).toContain("Unable to reset GPU");
      expect(result.output.toLowerCase()).toContain("off the bus");
      expect(result.output).not.toContain("Successfully reset");
    });

    it("should fail DCGM diagnostics for GPU with XID 79", () => {
      const result = dcgmi.execute(parse("dcgmi diag -r 3 -i 0"), context);
      expect(result.output).toContain("Error");
      expect(result.output).toContain("not accessible");
      expect(result.output).not.toContain("All tests passed");
    });
  });

  describe("GPU ID Validation", () => {
    it("should reject negative GPU IDs in reset command", () => {
      // The command parser treats -i -0 as -i with value "-0"
      // which then becomes unrecognized as a separate option
      const result = nvidiaSmi.execute(
        parse("nvidia-smi --gpu-reset -i -0"),
        context,
      );
      // Either should show error about invalid option or invalid GPU ID
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle valid GPU ID in reset command", () => {
      const result = nvidiaSmi.execute(
        parse("nvidia-smi --gpu-reset -i 0"),
        context,
      );
      // Should either succeed or fail due to GPU state, but not due to parsing
      expect(result.output).toBeDefined();
    });
  });

  describe("High Priority: Thermal Throttling", () => {
    beforeEach(() => {
      // Inject thermal issue
      store.updateGPU("dgx-00", 0, {
        temperature: 95,
      });

      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: context.currentNode,
      };
    });

    it("should query GPU temperature correctly", () => {
      const result = nvidiaSmi.execute(
        parse("nvidia-smi --query-gpu=temperature.gpu --format=csv"),
        context,
      );
      expect(result.output).toBeDefined();
      expect(result.exitCode).toBe(0);
    });

    it("should show temperature in detailed query", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -q -i 0"), context);
      expect(result.output).toBeDefined();
      // Temperature should be in the output
      expect(result.output.toLowerCase()).toMatch(/temperature|temp/);
    });
  });

  describe("High Priority: MIG Configuration", () => {
    it("should enable MIG mode and show reset message", () => {
      const result = nvidiaSmi.execute(
        parse("nvidia-smi -mig 1 -i 0"),
        context,
      );
      // Should mention that reboot/reset is required
      expect(result.output.toLowerCase()).toMatch(/reboot|reset/);
    });

    it("should query MIG mode status", () => {
      const result = nvidiaSmi.execute(
        parse("nvidia-smi --query-gpu=mig.mode.current --format=csv"),
        context,
      );
      expect(result.output).toBeDefined();
      expect(result.exitCode).toBe(0);
    });

    it("should reset GPU successfully when no critical errors", () => {
      const result = nvidiaSmi.execute(
        parse("nvidia-smi --gpu-reset -i 0"),
        context,
      );
      expect(result.output).toContain("reset successfully");
    });
  });

  describe("Medium Priority: Command Validation", () => {
    it("should handle ECC error queries", () => {
      // Inject ECC errors
      store.updateGPU("dgx-00", 0, {
        eccErrors: {
          singleBit: 10,
          doubleBit: 2,
          aggregated: { singleBit: 10, doubleBit: 2 },
        },
      });

      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: context.currentNode,
      };

      const result = nvidiaSmi.execute(
        parse(
          "nvidia-smi --query-gpu=ecc.errors.corrected.aggregate.total,ecc.errors.uncorrected.aggregate.total --format=csv",
        ),
        context,
      );
      expect(result.output).toBeDefined();
      expect(result.exitCode).toBe(0);
    });
  });

  describe("Fault Injection Effects", () => {
    it("should show NVLink status", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi nvlink -s"), context);
      expect(result.output).toBeDefined();
      expect(result.output.toLowerCase()).toContain("link");
    });

    it("should query PCIe link information", () => {
      const result = nvidiaSmi.execute(
        parse("nvidia-smi --query-gpu=pci.link.gen.current --format=csv"),
        context,
      );
      expect(result).toBeDefined();
      expect(result.output).toBeDefined();
    });
  });

  describe("Basic Command Execution", () => {
    it("should execute nvidia-smi without arguments", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi"), context);
      expect(result.output).toBeDefined();
      expect(result.exitCode).toBe(0);
    });

    it("should execute dcgmi discovery", () => {
      const result = dcgmi.execute(parse("dcgmi discovery -l"), context);
      expect(result.output).toBeDefined();
      expect(result.exitCode).toBe(0);
    });

    it("should execute dcgmi health check", () => {
      const result = dcgmi.execute(parse("dcgmi health -c"), context);
      expect(result.output).toBeDefined();
      expect(result.exitCode).toBe(0);
    });
  });
});
