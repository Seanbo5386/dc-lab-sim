import React, { useState } from "react";
import {
  HARDWARE_SPECS,
  ALL_SYSTEM_TYPES,
  getSystemDisplayName,
  type SystemType,
} from "@/data/hardwareSpecs";

interface SpecRow {
  label: string;
  category: string;
  getValue: (type: SystemType) => string | number;
  unit?: string;
  higherIsBetter?: boolean;
}

const SPEC_ROWS: SpecRow[] = [
  // GPU
  {
    label: "GPU Model",
    category: "GPU",
    getValue: (t) => HARDWARE_SPECS[t].gpu.model.replace("NVIDIA ", ""),
  },
  {
    label: "Architecture",
    category: "GPU",
    getValue: (t) => HARDWARE_SPECS[t].system.generation,
  },
  {
    label: "GPU Count",
    category: "GPU",
    getValue: (t) => HARDWARE_SPECS[t].gpu.count,
  },
  {
    label: "GPU Memory",
    category: "GPU",
    getValue: (t) => HARDWARE_SPECS[t].gpu.memoryGB,
    unit: "GB",
    higherIsBetter: true,
  },
  {
    label: "Memory Type",
    category: "GPU",
    getValue: (t) => HARDWARE_SPECS[t].gpu.memoryType,
  },
  {
    label: "Memory Bandwidth",
    category: "GPU",
    getValue: (t) => HARDWARE_SPECS[t].gpu.memoryBandwidthTBs,
    unit: "TB/s",
    higherIsBetter: true,
  },
  {
    label: "FP16 Performance",
    category: "GPU",
    getValue: (t) => HARDWARE_SPECS[t].gpu.fp16Tflops,
    unit: "TFLOPS",
    higherIsBetter: true,
  },
  {
    label: "TF32 Performance",
    category: "GPU",
    getValue: (t) => HARDWARE_SPECS[t].gpu.tf32Tflops,
    unit: "TFLOPS",
    higherIsBetter: true,
  },
  {
    label: "FP64 Performance",
    category: "GPU",
    getValue: (t) => HARDWARE_SPECS[t].gpu.fp64Tflops,
    unit: "TFLOPS",
    higherIsBetter: true,
  },
  {
    label: "SM Count",
    category: "GPU",
    getValue: (t) => HARDWARE_SPECS[t].gpu.smCount,
    higherIsBetter: true,
  },
  {
    label: "TDP",
    category: "GPU",
    getValue: (t) => HARDWARE_SPECS[t].gpu.tdpWatts,
    unit: "W",
  },
  {
    label: "Compute Capability",
    category: "GPU",
    getValue: (t) => HARDWARE_SPECS[t].gpu.computeCapability,
  },
  // NVLink
  {
    label: "NVLink Version",
    category: "Interconnect",
    getValue: (t) => `NVLink ${HARDWARE_SPECS[t].nvlink.version}`,
  },
  {
    label: "Links per GPU",
    category: "Interconnect",
    getValue: (t) => HARDWARE_SPECS[t].nvlink.linksPerGpu,
    higherIsBetter: true,
  },
  {
    label: "Per-Link Bandwidth",
    category: "Interconnect",
    getValue: (t) => HARDWARE_SPECS[t].nvlink.perLinkBandwidthGBs,
    unit: "GB/s",
    higherIsBetter: true,
  },
  {
    label: "Total GPU Bandwidth",
    category: "Interconnect",
    getValue: (t) => HARDWARE_SPECS[t].nvlink.totalBandwidthGBs,
    unit: "GB/s",
    higherIsBetter: true,
  },
  {
    label: "NVSwitch Count",
    category: "Interconnect",
    getValue: (t) => HARDWARE_SPECS[t].nvlink.nvSwitchCount,
  },
  {
    label: "NVSwitch Generation",
    category: "Interconnect",
    getValue: (t) => HARDWARE_SPECS[t].nvlink.nvSwitchGeneration,
  },
  // Network
  {
    label: "HCA Count",
    category: "Network",
    getValue: (t) => HARDWARE_SPECS[t].network.hcaCount,
  },
  {
    label: "HCA Model",
    category: "Network",
    getValue: (t) => HARDWARE_SPECS[t].network.hcaModel,
  },
  {
    label: "InfiniBand Protocol",
    category: "Network",
    getValue: (t) => HARDWARE_SPECS[t].network.protocol,
  },
  {
    label: "Port Rate",
    category: "Network",
    getValue: (t) => HARDWARE_SPECS[t].network.portRateGbs,
    unit: "Gb/s",
    higherIsBetter: true,
  },
  // System
  {
    label: "CPU",
    category: "System",
    getValue: (t) =>
      `${HARDWARE_SPECS[t].system.cpu.sockets}x ${HARDWARE_SPECS[t].system.cpu.model} (${HARDWARE_SPECS[t].system.cpu.coresPerSocket}-Core)`,
  },
  {
    label: "System Memory",
    category: "System",
    getValue: (t) => HARDWARE_SPECS[t].system.systemMemoryGB,
    unit: "GB",
    higherIsBetter: true,
  },
  {
    label: "Total GPU Memory",
    category: "System",
    getValue: (t) => HARDWARE_SPECS[t].system.totalGpuMemoryGB,
    unit: "GB",
    higherIsBetter: true,
  },
  {
    label: "Storage",
    category: "System",
    getValue: (t) => HARDWARE_SPECS[t].storage.totalCapacityTB,
    unit: "TB NVMe",
    higherIsBetter: true,
  },
];

function getBestValue(
  row: SpecRow,
  types: SystemType[],
): string | number | null {
  if (!row.higherIsBetter) return null;
  const values = types.map((t) => row.getValue(t));
  const numericValues = values.filter((v) => typeof v === "number") as number[];
  if (numericValues.length === 0) return null;
  return Math.max(...numericValues);
}

export const ArchitectureComparison: React.FC = () => {
  const [selectedTypes, setSelectedTypes] = useState<SystemType[]>([
    ...ALL_SYSTEM_TYPES,
  ]);

  const toggleType = (type: SystemType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        if (prev.length <= 2) return prev; // Minimum 2 selected
        return prev.filter((t) => t !== type);
      }
      // Re-add in canonical order (least → most powerful)
      const next = [...prev, type];
      return ALL_SYSTEM_TYPES.filter((t) => next.includes(t));
    });
  };

  const categories = [...new Set(SPEC_ROWS.map((r) => r.category))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-nvidia-green">
          DGX Architecture Comparison
        </h3>
        <div className="flex gap-2">
          {ALL_SYSTEM_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`px-3 py-1 text-sm rounded border transition-colors ${
                selectedTypes.includes(type)
                  ? "bg-nvidia-green/20 border-nvidia-green text-nvidia-green"
                  : "bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500"
              }`}
            >
              {getSystemDisplayName(type)}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-gray-400">
        Compare hardware specifications across NVIDIA DGX generations. Green
        highlights indicate the best value in each row. Select 2-4 systems to
        compare.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-3 text-gray-400 font-medium w-48">
                Specification
              </th>
              {selectedTypes.map((type) => (
                <th
                  key={type}
                  className="text-center py-2 px-3 text-nvidia-green font-semibold"
                >
                  {getSystemDisplayName(type)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <React.Fragment key={category}>
                <tr>
                  <td
                    colSpan={selectedTypes.length + 1}
                    className="pt-4 pb-1 px-3 text-xs font-bold text-gray-500 uppercase tracking-wider"
                  >
                    {category}
                  </td>
                </tr>
                {SPEC_ROWS.filter((r) => r.category === category).map((row) => {
                  const bestValue = getBestValue(row, selectedTypes);
                  return (
                    <tr
                      key={row.label}
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="py-2 px-3 text-gray-300">{row.label}</td>
                      {selectedTypes.map((type) => {
                        const value = row.getValue(type);
                        const isBest =
                          bestValue !== null && value === bestValue;
                        return (
                          <td
                            key={type}
                            className={`py-2 px-3 text-center font-mono ${
                              isBest
                                ? "text-nvidia-green font-semibold"
                                : "text-gray-300"
                            }`}
                          >
                            {value}
                            {row.unit && (
                              <span className="text-gray-500 text-xs ml-1">
                                {row.unit}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
