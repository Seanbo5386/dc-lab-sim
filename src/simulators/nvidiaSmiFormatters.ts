import type { GPU, DGXNode } from "@/types/hardware";
import { getHardwareSpecs } from "@/data/hardwareSpecs";

export type DisplayFormatter = (gpu: GPU, node?: DGXNode) => string;

export function formatDisplayMemory(gpu: GPU, node?: DGXNode): string {
  const specs = getHardwareSpecs(node?.systemType || "DGX-A100");
  const bar1Total = specs.gpu.bar1MemoryMiB;
  let output = `    FB Memory Usage\n`;
  output += `        Total                             : ${gpu.memoryTotal} MiB\n`;
  output += `        Reserved                          : ${Math.round(gpu.memoryTotal * 0.02)} MiB\n`;
  output += `        Used                              : ${gpu.memoryUsed} MiB\n`;
  output += `        Free                              : ${gpu.memoryTotal - gpu.memoryUsed} MiB\n`;
  output += `    BAR1 Memory Usage\n`;
  output += `        Total                             : ${bar1Total} MiB\n`;
  output += `        Used                              : 1 MiB\n`;
  output += `        Free                              : ${bar1Total - 1} MiB\n`;
  output += `    Conf Compute Protected Memory Usage\n`;
  output += `        Total                             : 0 MiB\n`;
  output += `        Used                              : 0 MiB\n`;
  output += `        Free                              : 0 MiB\n`;
  return output;
}

export function formatDisplayUtilization(gpu: GPU, _node?: DGXNode): string {
  const memUtil = Math.round((gpu.memoryUsed / gpu.memoryTotal) * 100);
  let output = `    Utilization\n`;
  output += `        Gpu                               : ${Math.round(gpu.utilization)} %\n`;
  output += `        Memory                            : ${memUtil} %\n`;
  output += `        Encoder                           : ${Math.floor(Math.random() * 5)} %\n`;
  output += `        Decoder                           : ${Math.floor(Math.random() * 3)} %\n`;
  output += `        JPEG                              : 0 %\n`;
  output += `        OFA                               : 0 %\n`;
  return output;
}

export function formatDisplayECC(gpu: GPU, _node?: DGXNode): string {
  let output = `    ECC Mode\n`;
  output += `        Current                           : ${gpu.eccEnabled ? "Enabled" : "Disabled"}\n`;
  output += `        Pending                           : ${gpu.eccEnabled ? "Enabled" : "Disabled"}\n`;
  output += `    ECC Errors\n`;
  output += `        Volatile\n`;
  output += `            SRAM Correctable              : 0\n`;
  output += `            SRAM Uncorrectable            : 0\n`;
  output += `            DRAM Correctable              : ${gpu.eccErrors.singleBit}\n`;
  output += `            DRAM Uncorrectable            : ${gpu.eccErrors.doubleBit}\n`;
  output += `        Aggregate\n`;
  output += `            SRAM Correctable              : 0\n`;
  output += `            SRAM Uncorrectable            : 0\n`;
  output += `            DRAM Correctable              : ${gpu.eccErrors.aggregated.singleBit}\n`;
  output += `            DRAM Uncorrectable            : ${gpu.eccErrors.aggregated.doubleBit}\n`;
  return output;
}

export function formatDisplayTemperature(gpu: GPU, _node?: DGXNode): string {
  const currentTemp = Math.round(gpu.temperature);
  const memTemp = Math.round(gpu.temperature + 5);
  let output = `    Temperature\n`;
  output += `        GPU Current Temp                  : ${currentTemp} C\n`;
  output += `        GPU T.Limit Temp                  : 83 C\n`;
  output += `        GPU Shutdown Temp                 : 90 C\n`;
  output += `        GPU Slowdown Temp                 : 85 C\n`;
  output += `        GPU Max Operating Temp            : 83 C\n`;
  output += `        GPU Target Temperature            : N/A\n`;
  output += `        Memory Current Temp               : ${memTemp} C\n`;
  output += `        Memory Max Operating Temp         : 95 C\n`;
  return output;
}

export function formatDisplayPower(gpu: GPU, _node?: DGXNode): string {
  const powerDraw = Math.round(gpu.powerDraw);
  const powerLimit = Math.round(gpu.powerLimit);
  const minLimit = Math.round(gpu.powerLimit * 0.5);
  const isSXM = gpu.type?.includes("SXM") || false;
  const maxLimit = isSXM ? powerLimit : Math.round(gpu.powerLimit * 1.05);
  let output = `    GPU Power Readings\n`;
  output += `        Power Management                  : Supported\n`;
  output += `        Power Draw                        : ${powerDraw}.00 W\n`;
  output += `        Current Power Limit               : ${powerLimit}.00 W\n`;
  output += `        Requested Power Limit             : ${powerLimit}.00 W\n`;
  output += `        Default Power Limit               : ${powerLimit}.00 W\n`;
  output += `        Min Power Limit                   : ${minLimit}.00 W\n`;
  output += `        Max Power Limit                   : ${maxLimit}.00 W\n`;
  output += `    Module Power Readings\n`;
  output += `        Power Draw                        : N/A\n`;
  output += `        Current Power Limit               : N/A\n`;
  output += `        Requested Power Limit             : N/A\n`;
  output += `        Default Power Limit               : N/A\n`;
  output += `        Min Power Limit                   : N/A\n`;
  output += `        Max Power Limit                   : N/A\n`;
  return output;
}

export function formatDisplayClocks(gpu: GPU, _node?: DGXNode): string {
  let output = `    Clocks\n`;
  output += `        Graphics                          : ${gpu.clocksSM} MHz\n`;
  output += `        SM                                : ${gpu.clocksSM} MHz\n`;
  output += `        Memory                            : ${gpu.clocksMem} MHz\n`;
  output += `        Video                             : ${Math.round(gpu.clocksSM * 0.9)} MHz\n`;
  output += `    Applications Clocks\n`;
  output += `        Graphics                          : ${gpu.clocksSM} MHz\n`;
  output += `        Memory                            : ${gpu.clocksMem} MHz\n`;
  output += `    Default Applications Clocks\n`;
  output += `        Graphics                          : ${gpu.clocksSM} MHz\n`;
  output += `        Memory                            : ${gpu.clocksMem} MHz\n`;
  output += `    Deferred Clocks\n`;
  output += `        Memory                            : N/A\n`;
  output += `    Max Clocks\n`;
  output += `        Graphics                          : ${Math.round(gpu.clocksSM * 1.2)} MHz\n`;
  output += `        SM                                : ${Math.round(gpu.clocksSM * 1.2)} MHz\n`;
  output += `        Memory                            : ${Math.round(gpu.clocksMem * 1.1)} MHz\n`;
  output += `        Video                             : ${Math.round(gpu.clocksSM * 1.1)} MHz\n`;
  output += `    Max Customer Boost Clocks\n`;
  output += `        Graphics                          : ${Math.round(gpu.clocksSM * 1.15)} MHz\n`;
  output += `    Clock Policy\n`;
  output += `        Auto Boost                        : N/A\n`;
  output += `        Auto Boost Default                : N/A\n`;
  return output;
}

export function formatDisplayCompute(gpu: GPU, _node?: DGXNode): string {
  let output = `    Compute Mode                          : Default\n`;
  output += `    MIG Mode\n`;
  output += `        Current                           : ${gpu.migMode ? "Enabled" : "Disabled"}\n`;
  output += `        Pending                           : ${gpu.migMode ? "Enabled" : "Disabled"}\n`;
  return output;
}

export function formatDisplayPids(_gpu: GPU, _node?: DGXNode): string {
  const output = `    Processes                             : None\n`;
  return output;
}

export function formatDisplayPerformance(gpu: GPU, _node?: DGXNode): string {
  const pstate =
    gpu.utilization > 50 ? "P0" : gpu.utilization > 10 ? "P2" : "P8";
  let output = `    Performance State                     : ${pstate}\n`;
  output += `    Clocks Throttle Reasons\n`;
  output += `        Idle                              : ${gpu.utilization < 5 ? "Active" : "Not Active"}\n`;
  output += `        Applications Clocks Setting       : Not Active\n`;
  output += `        SW Power Cap                      : ${gpu.powerDraw > gpu.powerLimit * 0.95 ? "Active" : "Not Active"}\n`;
  output += `        HW Slowdown                       : Not Active\n`;
  output += `            HW Thermal Slowdown           : ${gpu.temperature > 80 ? "Active" : "Not Active"}\n`;
  output += `            HW Power Brake Slowdown       : Not Active\n`;
  output += `        Sync Boost                        : Not Active\n`;
  output += `        SW Thermal Slowdown               : Not Active\n`;
  output += `        Display Clock Setting             : Not Active\n`;
  return output;
}

export function formatDisplaySupportedClocks(
  gpu: GPU,
  _node?: DGXNode,
): string {
  const maxMem = Math.round(gpu.clocksMem * 1.1);
  const maxGfx = Math.round(gpu.clocksSM * 1.2);
  let output = `    Supported Clocks\n`;
  output += `        Memory                            : ${maxMem} MHz\n`;
  output += `            Graphics                      : ${maxGfx} MHz\n`;
  output += `            Graphics                      : ${Math.round(maxGfx * 0.95)} MHz\n`;
  output += `            Graphics                      : ${Math.round(maxGfx * 0.9)} MHz\n`;
  output += `            Graphics                      : ${Math.round(maxGfx * 0.85)} MHz\n`;
  output += `            Graphics                      : ${Math.round(maxGfx * 0.8)} MHz\n`;
  output += `        Memory                            : ${Math.round(maxMem * 0.9)} MHz\n`;
  output += `            Graphics                      : ${Math.round(maxGfx * 0.75)} MHz\n`;
  output += `            Graphics                      : ${Math.round(maxGfx * 0.7)} MHz\n`;
  output += `        Memory                            : ${Math.round(maxMem * 0.8)} MHz\n`;
  output += `            Graphics                      : ${Math.round(maxGfx * 0.65)} MHz\n`;
  output += `            Graphics                      : ${Math.round(maxGfx * 0.6)} MHz\n`;
  return output;
}

export function formatDisplayPageRetirement(
  gpu: GPU,
  _node?: DGXNode,
): string {
  const sbePagesRetired = Math.floor(gpu.eccErrors.aggregated.singleBit / 10);
  const dbePagesRetired = gpu.eccErrors.aggregated.doubleBit;
  const pendingRetirement = gpu.eccErrors.doubleBit > 0 ? "Yes" : "No";
  let output = `    Retired Pages\n`;
  output += `        Single Bit ECC                    : ${sbePagesRetired}\n`;
  output += `        Double Bit ECC                    : ${dbePagesRetired}\n`;
  output += `        Pending Page Blacklist            : ${pendingRetirement}\n`;
  return output;
}

export function formatDisplayAccounting(_gpu: GPU, _node?: DGXNode): string {
  let output = `    Accounting Mode                       : Disabled\n`;
  output += `    Accounting Mode Buffer Size           : 4000\n`;
  return output;
}

export function formatDisplayEncoderStats(_gpu: GPU, _node?: DGXNode): string {
  let output = `    Encoder Stats\n`;
  output += `        Active Sessions                   : 0\n`;
  output += `        Average FPS                       : 0\n`;
  output += `        Average Latency                   : 0\n`;
  return output;
}

export function formatDisplayTargetTemp(_gpu: GPU, _node?: DGXNode): string {
  let output = `    Supported GPU Target Temp\n`;
  output += `        GPU Target Temp Min               : 65 C\n`;
  output += `        GPU Target Temp Max               : 83 C\n`;
  return output;
}

export function formatDisplayVoltage(_gpu: GPU, _node?: DGXNode): string {
  let output = `    Voltage\n`;
  output += `        Graphics                          : 856.250 mV\n`;
  return output;
}

export function formatDisplayFBCStats(_gpu: GPU, _node?: DGXNode): string {
  let output = `    FBC Stats\n`;
  output += `        Active Sessions                   : 0\n`;
  output += `        Average FPS                       : 0\n`;
  output += `        Average Latency                   : 0\n`;
  return output;
}

export function formatDisplayRowRemapper(gpu: GPU, _node?: DGXNode): string {
  const rowsRemapped = gpu.eccErrors.aggregated.doubleBit > 0;
  let output = `    Row Remapper\n`;
  output += `        Correctable Error                 : ${rowsRemapped ? "true" : "false"}\n`;
  output += `        Uncorrectable Error               : ${gpu.eccErrors.doubleBit > 0 ? "true" : "false"}\n`;
  output += `        Pending                           : ${gpu.eccErrors.doubleBit > 0 ? "true" : "false"}\n`;
  output += `        Remapping Failure Occurred        : false\n`;
  output += `        Bank Remap Availability Histogram\n`;
  output += `            Max                           : 640 bank(s)\n`;
  output += `            High                          : 0 bank(s)\n`;
  output += `            Partial                       : 0 bank(s)\n`;
  output += `            Low                           : 0 bank(s)\n`;
  output += `            None                          : 0 bank(s)\n`;
  return output;
}

export function formatDisplayResetStatus(gpu: GPU, _node?: DGXNode): string {
  const hasXidErrors = gpu.xidErrors.length > 0;
  let output = `    Reset Status\n`;
  output += `        Reset Required                    : ${hasXidErrors ? "Yes" : "No"}\n`;
  output += `        Drain and Reset Recommended       : ${hasXidErrors ? "Yes" : "No"}\n`;
  return output;
}

export const DISPLAY_FORMATTERS: Record<string, DisplayFormatter> = {
  MEMORY: formatDisplayMemory,
  UTILIZATION: formatDisplayUtilization,
  ECC: formatDisplayECC,
  TEMPERATURE: formatDisplayTemperature,
  POWER: formatDisplayPower,
  CLOCKS: formatDisplayClocks,
  COMPUTE: formatDisplayCompute,
  PIDS: formatDisplayPids,
  PERFORMANCE: formatDisplayPerformance,
  SUPPORTED_CLOCKS: formatDisplaySupportedClocks,
  PAGE_RETIREMENT: formatDisplayPageRetirement,
  ACCOUNTING: formatDisplayAccounting,
  ENCODER_STATS: formatDisplayEncoderStats,
  SUPPORTED_GPU_TARGET_TEMP: formatDisplayTargetTemp,
  VOLTAGE: formatDisplayVoltage,
  FBC_STATS: formatDisplayFBCStats,
  ROW_REMAPPER: formatDisplayRowRemapper,
  RESET_STATUS: formatDisplayResetStatus,
};
