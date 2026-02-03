import type { GPU, InfiniBandHCA } from "@/types/hardware";

export interface MetricsUpdate {
  gpus: GPU[];
  hcas: InfiniBandHCA[];
}

export class MetricsSimulator {
  private intervalId: number | null = null;
  private isRunning: boolean = false;

  start(
    updateCallback: (
      updater: (data: { gpus: GPU[]; hcas: InfiniBandHCA[] }) => MetricsUpdate,
    ) => void,
    interval: number = 1000,
  ) {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = window.setInterval(() => {
      updateCallback((data) => this.updateMetrics(data));
    }, interval);
  }

  // Legacy method for backwards compatibility
  startGpuOnly(
    updateCallback: (updater: (gpus: GPU[]) => GPU[]) => void,
    interval: number = 1000,
  ) {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = window.setInterval(() => {
      updateCallback((gpus) => this.updateGpuMetrics(gpus));
    }, interval);
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  private updateMetrics(data: {
    gpus: GPU[];
    hcas: InfiniBandHCA[];
  }): MetricsUpdate {
    return {
      gpus: this.updateGpuMetrics(data.gpus),
      hcas: this.updateHcaMetrics(data.hcas),
    };
  }

  private updateHcaMetrics(hcas: InfiniBandHCA[]): InfiniBandHCA[] {
    // HCA metrics remain stable during normal operation.
    // Errors should only be injected through explicit fault scenarios,
    // not accumulated randomly during regular simulation ticks.
    return hcas;
  }

  private updateGpuMetrics(gpus: GPU[]): GPU[] {
    return gpus.map((gpu) => {
      // Simulate realistic GPU utilization changes
      const utilizationChange = (Math.random() - 0.5) * 10;
      const newUtilization = Math.max(
        0,
        Math.min(100, gpu.utilization + utilizationChange),
      );

      // Memory usage tends to be more stable
      const memoryChange = (Math.random() - 0.5) * 512; // MB
      const newMemoryUsed = Math.max(
        0,
        Math.min(gpu.memoryTotal, gpu.memoryUsed + memoryChange),
      );

      // Temperature correlates with utilization
      const targetTemp = 30 + (newUtilization / 100) * 50; // 30-80°C range
      const tempChange = (targetTemp - gpu.temperature) * 0.1; // Gradual change
      const newTemp = gpu.temperature + tempChange;

      // Power draw correlates with utilization
      const targetPower = 100 + (newUtilization / 100) * (gpu.powerLimit - 100);
      const powerChange = (targetPower - gpu.powerDraw) * 0.15;
      const newPower = Math.max(
        50,
        Math.min(gpu.powerLimit, gpu.powerDraw + powerChange),
      );

      // Clock speeds adjust based on load
      const targetSMClock = 1410 - (newTemp > 70 ? (newTemp - 70) * 10 : 0); // Thermal throttling
      const smClockChange = (targetSMClock - gpu.clocksSM) * 0.2;
      const newSMClock = Math.round(
        Math.max(300, gpu.clocksSM + smClockChange),
      );

      // Occasionally increment ECC errors (very rarely)
      const eccSingleBitIncrement = Math.random() < 0.001 ? 1 : 0;
      const eccDoubleBitIncrement = Math.random() < 0.00001 ? 1 : 0;

      return {
        ...gpu,
        utilization: Math.round(newUtilization * 10) / 10,
        memoryUsed: Math.round(newMemoryUsed),
        temperature: Math.round(newTemp * 10) / 10,
        powerDraw: Math.round(newPower * 10) / 10,
        clocksSM: newSMClock,
        eccErrors: {
          ...gpu.eccErrors,
          singleBit: gpu.eccErrors.singleBit + eccSingleBitIncrement,
          doubleBit: gpu.eccErrors.doubleBit + eccDoubleBitIncrement,
          aggregated: {
            singleBit:
              gpu.eccErrors.aggregated.singleBit + eccSingleBitIncrement,
            doubleBit:
              gpu.eccErrors.aggregated.doubleBit + eccDoubleBitIncrement,
          },
        },
      };
    });
  }

  // Simulate a specific workload pattern
  simulateWorkload(
    gpus: GPU[],
    pattern: "idle" | "training" | "inference" | "stress",
  ): GPU[] {
    const utilizationTarget = {
      idle: 5,
      training: 95,
      inference: 60,
      stress: 100,
    }[pattern];

    return gpus.map((gpu) => ({
      ...gpu,
      utilization: utilizationTarget + (Math.random() - 0.5) * 10,
      memoryUsed:
        pattern === "idle"
          ? gpu.memoryTotal * 0.01
          : pattern === "training"
            ? gpu.memoryTotal * 0.9
            : gpu.memoryTotal * 0.6,
    }));
  }

  // Inject a fault for troubleshooting practice
  injectFault(
    gpu: GPU,
    faultType: "xid" | "ecc" | "thermal" | "nvlink" | "power" | "pcie",
  ): GPU {
    switch (faultType) {
      case "xid":
        return {
          ...gpu,
          xidErrors: [
            ...gpu.xidErrors,
            {
              code: 48,
              timestamp: new Date(),
              description: "Double-bit ECC error",
              severity: "Critical",
            },
          ],
          healthStatus: "Critical",
        };

      case "ecc":
        return {
          ...gpu,
          eccErrors: {
            ...gpu.eccErrors,
            doubleBit: gpu.eccErrors.doubleBit + 1,
          },
          healthStatus: "Critical",
        };

      case "thermal": {
        // Apply thermal throttling immediately - same formula as updateMetrics
        const thermalTemp = 85;
        const throttledClocks = Math.round(1410 - (thermalTemp - 70) * 10); // 1260 MHz
        return {
          ...gpu,
          temperature: thermalTemp,
          clocksSM: throttledClocks,
          healthStatus: "Warning",
        };
      }

      case "nvlink":
        return {
          ...gpu,
          nvlinks: gpu.nvlinks.map((link, idx) =>
            idx === 0
              ? { ...link, status: "Down" as const, txErrors: 100 }
              : link,
          ),
          healthStatus: "Warning",
        };

      case "power":
        return {
          ...gpu,
          powerDraw: gpu.powerLimit * 0.95,
          healthStatus: "Warning",
        };

      case "pcie":
        return {
          ...gpu,
          xidErrors: [
            ...gpu.xidErrors,
            {
              code: 62,
              timestamp: new Date(),
              description: "PCIe Internal error - GPU hardware or software",
              severity: "Critical",
            },
          ],
          healthStatus: "Critical",
        };

      default:
        return gpu;
    }
  }
}
