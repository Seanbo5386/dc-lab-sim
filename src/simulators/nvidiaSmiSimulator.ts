import type { CommandResult, CommandContext } from "@/types/commands";
import type { ParsedCommand } from "@/utils/commandParser";
import type { GPU, MIGInstance, DGXNode } from "@/types/hardware";
import {
  BaseSimulator,
  type SimulatorMetadata,
} from "@/simulators/BaseSimulator";
import { useSimulationStore } from "@/store/simulationStore";
import { MIG_PROFILES } from "@/utils/clusterFactory";
import { generateTimestamp } from "@/utils/outputTemplates";

export class NvidiaSmiSimulator extends BaseSimulator {
  constructor() {
    super();
    this.registerCommands();
    this.registerValidFlagsAndSubcommands();
    // Initialize definition registry for enhanced validation (async, but fire-and-forget)
    this.initializeDefinitionRegistry();
  }

  /**
   * Register valid flags and subcommands for fuzzy matching
   */
  private registerValidFlagsAndSubcommands(): void {
    // Register valid root-level flags
    this.registerValidFlags([
      { short: "h", long: "help" },
      { short: "v", long: "version" },
      { short: "L", long: "list-gpus" },
      { short: "B", long: "list-excluded-gpus" },
      { short: "q", long: "query" },
      { short: "i", long: "id" },
      { short: "f", long: "filename" },
      { short: "x", long: "xml-format" },
      { short: "d", long: "display" },
      { short: "l", long: "loop" },
      { long: "dtd" },
      { long: "mig" },
      { long: "pl" },
      { long: "pm" },
      { long: "query-gpu" },
      { long: "query-compute-apps" },
      { long: "format" },
      { short: "e", long: "ecc-config" },
      { short: "p", long: "reset-ecc-errors" },
      { short: "c", long: "compute-mode" },
      { long: "lgc", aliases: ["lock-gpu-clocks"] },
      { long: "rgc", aliases: ["reset-gpu-clocks"] },
      { short: "r", long: "gpu-reset" },
    ]);

    // Register valid subcommands
    this.registerValidSubcommands([
      "nvlink",
      "topo",
      "mig",
      "drain",
      "boost-slider",
      "clocks",
      "pci",
    ]);
  }

  /**
   * Register all nvidia-smi subcommands with metadata
   */
  private registerCommands(): void {
    this.registerCommand("nvlink", this.handleNvlink.bind(this), {
      name: "nvlink",
      description: "Display NVLink status",
      usage: "nvidia-smi nvlink [OPTIONS]",
      flags: [
        { long: "status", short: "s", description: "Display NVLink status" },
      ],
      examples: ["nvidia-smi nvlink --status", "nvidia-smi nvlink -s"],
    });

    this.registerCommand("topo", this.handleTopo.bind(this), {
      name: "topo",
      description: "Display GPU topology",
      usage: "nvidia-smi topo [OPTIONS]",
      flags: [
        { long: "matrix", short: "m", description: "Display topology matrix" },
      ],
      examples: ["nvidia-smi topo -m"],
    });

    this.registerCommand("mig", this.handleMig.bind(this), {
      name: "mig",
      description: "Manage MIG (Multi-Instance GPU) configuration",
      usage: "nvidia-smi mig [OPTIONS]",
      flags: [
        { short: "i", long: "id", description: "GPU ID", takesValue: true },
        { long: "lgip", description: "List GPU instance profiles" },
        { long: "lgi", description: "List GPU instances" },
        { long: "cgi", description: "Create GPU instances", takesValue: true },
        { long: "dgi", description: "Destroy GPU instances" },
        {
          short: "C",
          long: "create-compute",
          description: "Create compute instances",
        },
      ],
      examples: [
        "nvidia-smi mig -lgip",
        "nvidia-smi mig -lgi",
        "nvidia-smi mig -i 0 -cgi 19,19,19 -C",
        "nvidia-smi mig -i 0 -dgi",
      ],
    });
  }

  getMetadata(): SimulatorMetadata {
    return {
      name: "nvidia-smi",
      version: "535.129.03",
      description: "NVIDIA System Management Interface",
      commands: Array.from(this.commandMetadata.values()),
    };
  }

  /**
   * Generate realistic nvidia-smi help output
   */
  protected handleHelp(commandName?: string): CommandResult {
    if (commandName) {
      return super.handleHelp(commandName);
    }

    const node = this.getNode({
      currentNode: "",
      currentPath: "",
      environment: {},
      history: [],
    });
    const driverVersion = node?.nvidiaDriverVersion || "535.129.03";

    let output = `NVIDIA System Management Interface -- v${driverVersion}\n\n`;
    output += `NVSMI provides monitoring information for Tesla and select Quadro devices.\n`;
    output += `The data is presented in either a plain text or an XML format, via stdout or a file.\n`;
    output += `NVSMI also provides several management operations for changing the device state.\n\n`;
    output += `Note that the functionality of NVSMI is exposed through the NVML C-based library.\n`;
    output += `See NVML documentation for more information.\n\n`;

    output += `nvidia-smi [OPTION1 [ARG1]] [OPTION2 [ARG2]] ...\n\n`;

    output += `    -h,   --help                Print usage information and exit.\n\n`;

    output += `  LIST OPTIONS:\n\n`;
    output += `    -L,   --list-gpus           Display a list of GPUs connected to the system.\n`;
    output += `    -B,   --list-excluded-gpus  Display a list of excluded GPUs in the system.\n\n`;

    output += `  SUMMARY OPTIONS:\n\n`;
    output += `    <no arguments>              Show a summary of GPUs connected to the system.\n\n`;

    output += `  QUERY OPTIONS:\n\n`;
    output += `    -q,   --query               Display GPU or Unit info.\n`;
    output += `    -i,   --id=ID               Target a specific GPU.\n`;
    output += `    -f,   --filename=FILE       Log to a specified file, rather than to stdout.\n`;
    output += `    -x,   --xml-format          Produce XML output.\n`;
    output += `          --dtd                 When showing xml output, embed DTD.\n`;
    output += `    -d,   --display=DISPLAY     Display only selected information.\n`;
    output += `                                Valid display arguments: MEMORY, UTILIZATION, ECC,\n`;
    output += `                                TEMPERATURE, POWER, CLOCK, COMPUTE, PIDS, PERFORMANCE,\n`;
    output += `                                SUPPORTED_CLOCKS, PAGE_RETIREMENT, ACCOUNTING,\n`;
    output += `                                ENCODER_STATS, SUPPORTED_GPU_TARGET_TEMP, VOLTAGE,\n`;
    output += `                                FBC_STATS, ROW_REMAPPER, RESET_STATUS\n\n`;

    output += `  SELECTIVE QUERY OPTIONS:\n\n`;
    output += `          --query-gpu           Display specific GPU info.\n`;
    output += `          --query-supported-clocks\n`;
    output += `                                Display list of supported clocks.\n`;
    output += `          --query-compute-apps  Display compute running processes.\n`;
    output += `          --query-accounted-apps\n`;
    output += `                                Display accounted compute processes.\n`;
    output += `          --query-retired-pages Display retired GPU device memory pages.\n\n`;

    output += `  DEVICE MODIFICATION OPTIONS:\n\n`;
    output += `    -pm,  --persistence-mode=MODE\n`;
    output += `                                Set persistence mode: 0/DISABLED, 1/ENABLED\n`;
    output += `    -e,   --ecc-config=ECC_SETTING\n`;
    output += `                                Toggle ECC: 0/DISABLED, 1/ENABLED\n`;
    output += `    -p,   --reset-ecc-errors=RESET_TYPE\n`;
    output += `                                Reset ECC error counts: 0/VOLATILE, 1/AGGREGATE\n`;
    output += `    -c,   --compute-mode=COMPUTE_MODE\n`;
    output += `                                Set compute mode: 0/DEFAULT, 1/EXCLUSIVE_THREAD,\n`;
    output += `                                2/PROHIBITED, 3/EXCLUSIVE_PROCESS\n`;
    output += `    -pl,  --power-limit=POWER_LIMIT\n`;
    output += `                                Specifies maximum power limit in watts.\n`;
    output += `    -lgc, --lock-gpu-clocks=MIN_CLOCK,MAX_CLOCK\n`;
    output += `                                Lock GPU clocks to a specified frequency range.\n`;
    output += `    -rgc, --reset-gpu-clocks    Reset GPU clocks to the default values.\n`;
    output += `    -r,   --gpu-reset           Reset a GPU. Requires -i to specify GPU.\n`;
    output += `    -mig, --mig=MIG_OPTIONS     Toggle MIG mode: 0/DISABLED, 1/ENABLED\n\n`;

    output += `  UNIT MODIFICATION OPTIONS:\n\n`;
    output += `    -t,   --toggle-led=STATE    Set Unit LED state: 0/OFF, 1/GREEN, 2/AMBER\n\n`;

    output += `  SHOW DTD OPTIONS:\n\n`;
    output += `          --dtd                 Print device DTD and exit.\n\n`;

    output += `    -v,   --version             Print version information and exit.\n\n`;

    output += `  SUBCOMMANDS:\n\n`;
    output += `    nvlink                      NVLink information.\n`;
    output += `    topo                        GPU topology.\n`;
    output += `    mig                         MIG management.\n\n`;

    output += `Please see the nvidia-smi documentation for more detailed information.\n`;

    return this.createSuccess(output);
  }

  /**
   * Handle --version flag
   */
  protected handleVersion(): CommandResult {
    const node = this.getNode({
      currentNode: "",
      currentPath: "",
      environment: {},
      history: [],
    });
    const driverVersion = node?.nvidiaDriverVersion || "535.129.03";
    const cudaVersion = node?.cudaVersion || "12.2";

    let output = `NVIDIA-SMI version  : ${driverVersion}\n`;
    output += `NVML version        : ${driverVersion}\n`;
    output += `DRIVER version      : ${driverVersion}\n`;
    output += `CUDA Version        : ${cudaVersion}\n`;

    return this.createSuccess(output);
  }

  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    // Handle root-level flags (--version, --help, -v, -h)
    if (this.hasAnyFlag(parsed, ["version", "v"])) {
      return this.handleVersion();
    }

    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      const subcommand = parsed.subcommands[0];
      return (
        this.getHelpFromRegistry("nvidia-smi") || this.handleHelp(subcommand)
      );
    }

    // Validate flags using registry (with fallback to fuzzy matching)
    if (parsed.subcommands.length === 0) {
      const flagError = this.validateFlagsWithRegistry(parsed, "nvidia-smi");
      if (flagError) {
        return flagError;
      }
    }

    // Handle subcommands
    const subcommand = parsed.subcommands[0];
    if (subcommand) {
      // Check for help on subcommand
      if (this.hasAnyFlag(parsed, ["help", "h"])) {
        return this.handleHelp(subcommand);
      }

      const handler = this.getCommand(subcommand);
      if (handler) {
        return handler(parsed, context) as CommandResult;
      }
    }

    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    // Handle MIG operations via flags (nvidia-smi mig is handled via subcommand)
    if (parsed.flags.has("mig")) {
      return this.handleMigFlag(parsed, context);
    }

    // Handle power limit
    if (parsed.flags.has("pl")) {
      return this.handlePowerLimit(parsed, context);
    }

    // Handle persistence mode
    if (parsed.flags.has("pm")) {
      return this.handlePersistenceMode(parsed, context);
    }

    // Handle GPU reset
    if (this.hasAnyFlag(parsed, ["r", "gpu-reset"])) {
      return this.handleGpuReset(parsed, context);
    }

    // Handle -L (list GPUs)
    if (this.hasAnyFlag(parsed, ["L", "list-gpus"])) {
      return this.handleListGPUs(context);
    }

    // Handle --query-gpu flag (CSV format queries)
    const queryGpuValue = this.getFlagString(parsed, ["query-gpu"]);
    if (queryGpuValue) {
      // Filter out GPUs with XID 79
      const visibleGPUs = node.gpus.filter(
        (gpu) => !this.hasGPUFallenOffBus(gpu),
      );
      const modifiedNode = { ...node, gpus: visibleGPUs };
      return this.handleQueryGpu(queryGpuValue, modifiedNode, parsed);
    }

    // Handle -d/--display flag for selective information display
    const displayValue = this.getFlagString(parsed, ["d", "display"]);
    if (displayValue) {
      const gpuIdStr = this.getFlagString(parsed, ["i", "id"]);
      let targetGpuId: number | undefined = undefined;

      if (gpuIdStr) {
        const validationError = this.validateGpuIndexString(gpuIdStr, node);
        if (validationError) {
          return validationError;
        }
        targetGpuId = parseInt(gpuIdStr);
      }

      const visibleGPUs = node.gpus.filter(
        (gpu) => !this.hasGPUFallenOffBus(gpu),
      );
      const selectedGPUs =
        targetGpuId !== undefined
          ? visibleGPUs.filter((g) => g.id === targetGpuId)
          : visibleGPUs;

      return this.handleDisplayFlag(displayValue, selectedGPUs, node);
    }

    // Handle query operations
    if (this.hasAnyFlag(parsed, ["q", "query"])) {
      const gpuIdStr = this.getFlagString(parsed, ["i", "id"]);
      let targetGpuId: number | undefined = undefined;

      if (gpuIdStr) {
        const validationError = this.validateGpuIndexString(gpuIdStr, node);
        if (validationError) {
          return validationError;
        }
        targetGpuId = parseInt(gpuIdStr);
      }

      // If querying specific GPU, check if it has fallen off the bus
      if (targetGpuId !== undefined) {
        const targetGpu = node.gpus.find((g) => g.id === targetGpuId);
        if (targetGpu && this.hasGPUFallenOffBus(targetGpu)) {
          return this.createError(
            `Unable to query GPU ${targetGpuId}: GPU has fallen off the bus (XID 79).\n` +
              `Check 'dmesg | grep -i xid' for details. GPU reset or system reboot may be required.`,
          );
        }
      }

      // Filter out GPUs with XID 79 for query display
      const visibleGPUs = node.gpus.filter(
        (gpu) => !this.hasGPUFallenOffBus(gpu),
      );
      return {
        output: this.formatQuery(visibleGPUs, targetGpuId),
        exitCode: 0,
      };
    }

    // Default: show basic GPU listing
    // Handle -i flag for filtering specific GPU in default view
    const defaultGpuIdStr = this.getFlagString(parsed, ["i", "id"]);
    if (defaultGpuIdStr) {
      const validationError = this.validateGpuIndexString(
        defaultGpuIdStr,
        node,
      );
      if (validationError) {
        return validationError;
      }
      const targetGpuId = parseInt(defaultGpuIdStr);
      const targetGpu = node.gpus.find((g) => g.id === targetGpuId);
      if (targetGpu && this.hasGPUFallenOffBus(targetGpu)) {
        return this.createError(
          `Unable to query GPU ${targetGpuId}: GPU has fallen off the bus (XID 79).\n` +
            `Check 'dmesg | grep -i xid' for details. GPU reset or system reboot may be required.`,
        );
      }
      // Show just the specified GPU
      const filteredGPUs = node.gpus.filter(
        (g) => g.id === targetGpuId && !this.hasGPUFallenOffBus(g),
      );
      return {
        output: this.formatDefault(filteredGPUs, node.gpus.length),
        exitCode: 0,
      };
    }

    // Filter out GPUs that have fallen off the bus (XID 79)
    const visibleGPUs = node.gpus.filter(
      (gpu) => !this.hasGPUFallenOffBus(gpu),
    );
    return {
      output: this.formatDefault(visibleGPUs, node.gpus.length),
      exitCode: 0,
    };
  }

  private getNode(context: CommandContext) {
    const state = useSimulationStore.getState();
    return (
      state.cluster.nodes.find((n) => n.id === context.currentNode) ||
      state.cluster.nodes[0]
    );
  }

  /**
   * Check if GPU has critical XID error that makes it unavailable (XID 79: GPU fallen off the bus)
   */
  private hasGPUFallenOffBus(gpu: GPU): boolean {
    return gpu.xidErrors.some((xid) => xid.code === 79);
  }

  /**
   * Validate GPU index from -i/--id flag
   * Returns error result if invalid, null if valid
   */
  private validateGpuIndexString(
    gpuIdStr: string,
    node: DGXNode,
  ): CommandResult | null {
    const maxGpuIndex = node.gpus.length - 1;

    // Check for non-numeric input
    if (!/^\d+$/.test(gpuIdStr)) {
      return this.createError(
        `Invalid GPU index '${gpuIdStr}'. Expected numeric value (0-${maxGpuIndex}).`,
      );
    }

    const gpuId = parseInt(gpuIdStr);

    // Check for out-of-range index
    if (gpuId < 0 || gpuId > maxGpuIndex) {
      return this.createError(
        `Unable to query GPU ${gpuId}: GPU not found. Valid GPU indices: 0-${maxGpuIndex}`,
      );
    }

    return null; // Valid
  }

  /**
   * Handle nvidia-smi -L (list GPUs)
   */
  private handleListGPUs(context: CommandContext): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    let output = "";
    const visibleGPUs = node.gpus.filter(
      (gpu) => !this.hasGPUFallenOffBus(gpu),
    );

    if (visibleGPUs.length === 0) {
      output = "No devices were found\n";
    } else {
      visibleGPUs.forEach((gpu) => {
        output += `GPU ${gpu.id}: ${gpu.name} (UUID: ${gpu.uuid})\n`;
      });
    }

    return this.createSuccess(output);
  }

  /**
   * Handle --query-gpu flag for CSV format queries
   * Supports common fields like: mig.mode.current, mig.mode.pending, memory.total, etc.
   */
  private handleQueryGpu(
    fields: string,
    node: { gpus: GPU[] },
    parsed: ParsedCommand,
  ): CommandResult {
    const fieldList = fields.split(",").map((f) => f.trim());
    const formatValue = this.getFlagString(parsed, ["format"]) || "csv";
    const isNoHeader = formatValue.includes("noheader");

    // Validate all fields first - check for invalid metrics
    const invalidFields: string[] = [];
    for (const field of fieldList) {
      if (!this.isValidQueryField(field)) {
        invalidFields.push(field);
      }
    }
    if (invalidFields.length > 0) {
      return this.createError(
        `Invalid or unsupported query field(s): ${invalidFields.join(", ")}\n` +
          `Run 'nvidia-smi --help-query-gpu' for a list of valid fields.`,
      );
    }

    // Build header row
    const headers = fieldList.map((f) => {
      // Convert field name to display header (remove dots, capitalize)
      return f
        .split(".")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    });

    let output = "";
    if (!isNoHeader) {
      output += headers.join(", ") + "\n";
    }

    // Build data rows for each GPU
    for (const gpu of node.gpus) {
      const values = fieldList.map((field) =>
        this.getGpuFieldValue(gpu, field),
      );
      output += values.join(", ") + "\n";
    }

    return this.createSuccess(output);
  }

  /**
   * Check if a query field is valid/supported
   */
  private isValidQueryField(field: string): boolean {
    const validFields = new Set([
      "driver_version",
      "cuda_version",
      "vbios_version",
      "serial",
      "gpu_name",
      "name",
      "gpu_uuid",
      "uuid",
      "index",
      "gpu_bus_id",
      "pci.bus_id",
      "mig.mode.current",
      "mig.mode.pending",
      "memory.total",
      "memory.used",
      "memory.free",
      "memory.reserved",
      "utilization.gpu",
      "utilization.memory",
      "temperature.gpu",
      "temperature.memory",
      "power.draw",
      "power.limit",
      "power.default_limit",
      "power.max_limit",
      "clocks.current.graphics",
      "clocks.current.sm",
      "clocks.current.memory",
      "clocks.max.graphics",
      "clocks.max.sm",
      "clocks.max.memory",
      "pcie.link.gen.current",
      "pcie.link.gen.max",
      "pcie.link.width.current",
      "pcie.link.width.max",
      "fan.speed",
      "pstate",
      "compute_mode",
      "persistence_mode",
      "ecc.mode.current",
      "ecc.errors.corrected.volatile.total",
      "ecc.errors.uncorrected.volatile.total",
      "ecc.errors.corrected.aggregate.total",
      "ecc.errors.uncorrected.aggregate.total",
      "retired_pages.pending",
      "retired_pages.sbe",
      "retired_pages.dbe",
      "timestamp",
      "nvlink.link0.state",
      "nvlink.link1.state",
      "nvlink.link2.state",
      "nvlink.link3.state",
      "nvlink.link4.state",
      "nvlink.link5.state",
    ]);
    return validFields.has(field.toLowerCase());
  }

  /**
   * Get a specific field value from a GPU for --query-gpu output
   */
  private getGpuFieldValue(gpu: GPU, field: string): string {
    const node = this.getNode({
      currentNode: "",
      currentPath: "",
      environment: {},
      history: [],
    });
    const driverVersion = node?.nvidiaDriverVersion || "535.129.03";

    switch (field.toLowerCase()) {
      // Driver & System Info
      case "driver_version":
        return driverVersion;
      case "cuda_version":
        return node?.cudaVersion || "12.2";
      case "vbios_version":
        return "96.00.89.00.01";
      case "serial":
        return gpu.uuid.split("-")[1] || "N/A";

      // GPU Identification
      case "gpu_name":
      case "name":
        return gpu.name;
      case "gpu_uuid":
      case "uuid":
        return gpu.uuid;
      case "index":
        return gpu.id.toString();
      case "gpu_bus_id":
      case "pci.bus_id":
        return gpu.pciAddress;

      // MIG Mode
      case "mig.mode.current":
        return gpu.migMode ? "Enabled" : "Disabled";
      case "mig.mode.pending":
        return gpu.migMode ? "Enabled" : "Disabled";

      // Memory
      case "memory.total":
        return `${gpu.memoryTotal} MiB`;
      case "memory.used":
        return `${gpu.memoryUsed} MiB`;
      case "memory.free":
        return `${gpu.memoryTotal - gpu.memoryUsed} MiB`;
      case "memory.reserved":
        return `${Math.round(gpu.memoryTotal * 0.02)} MiB`;

      // Utilization
      case "utilization.gpu":
        return `${Math.round(gpu.utilization)} %`;
      case "utilization.memory":
        return `${Math.round((gpu.memoryUsed / gpu.memoryTotal) * 100)} %`;
      case "utilization.encoder":
        return `${Math.floor(Math.random() * 10)} %`;
      case "utilization.decoder":
        return `${Math.floor(Math.random() * 5)} %`;

      // Temperature
      case "temperature.gpu":
        return `${Math.round(gpu.temperature)}`;
      case "temperature.memory":
        return `${Math.round(gpu.temperature + 5)}`;
      case "temperature.gpu_tlimit":
        return "83";
      case "temperature.memory_max":
        return "95";

      // Power
      case "power.draw":
        return `${Math.round(gpu.powerDraw)} W`;
      case "power.draw.average":
        return `${Math.round(gpu.powerDraw * 0.95)} W`;
      case "power.draw.instant":
        return `${Math.round(gpu.powerDraw + (Math.random() - 0.5) * 10)} W`;
      case "power.limit":
        return `${Math.round(gpu.powerLimit)} W`;
      case "power.default_limit":
        return `${Math.round(gpu.powerLimit)} W`;
      case "power.min_limit":
        return `${Math.round(gpu.powerLimit * 0.5)} W`;
      case "power.max_limit":
        return `${Math.round(gpu.powerLimit * 1.1)} W`;
      case "power.management":
        return "Supported";
      case "enforced.power.limit":
        return `${Math.round(gpu.powerLimit)} W`;

      // PCIe
      case "pci.domain":
        return "0x0000";
      case "pci.bus":
        return gpu.pciAddress.split(":")[0] || "00";
      case "pci.device":
        return gpu.pciAddress.split(":")[1]?.split(".")[0] || "00";
      case "pci.device_id":
        return "0x233010DE";
      case "pci.sub_device_id":
        return "0x16C110DE";
      case "pci.link.gen.current":
        return "4";
      case "pci.link.gen.max":
        return "4";
      case "pci.link.gen.gpucurrent":
        return "4";
      case "pci.link.gen.gpumax":
        return "4";
      case "pci.link.width.current":
        return "16";
      case "pci.link.width.max":
        return "16";

      // Clocks
      case "clocks.current.graphics":
      case "clocks.current.sm":
      case "clocks.sm":
        return `${gpu.clocksSM} MHz`;
      case "clocks.current.memory":
      case "clocks.mem":
        return `${gpu.clocksMem} MHz`;
      case "clocks.current.video":
        return `${Math.round(gpu.clocksSM * 0.9)} MHz`;
      case "clocks.max.graphics":
      case "clocks.max.sm":
        return `${Math.round(gpu.clocksSM * 1.2)} MHz`;
      case "clocks.max.memory":
      case "clocks.max.mem":
        return `${Math.round(gpu.clocksMem * 1.1)} MHz`;
      case "clocks.applications.graphics":
        return `${gpu.clocksSM} MHz`;
      case "clocks.applications.memory":
        return `${gpu.clocksMem} MHz`;

      // ECC
      case "ecc.mode.current":
        return gpu.eccEnabled ? "Enabled" : "Disabled";
      case "ecc.mode.pending":
        return gpu.eccEnabled ? "Enabled" : "Disabled";
      case "ecc.errors.corrected.volatile.device_memory":
        return gpu.eccErrors.singleBit.toString();
      case "ecc.errors.corrected.volatile.dram":
        return gpu.eccErrors.singleBit.toString();
      case "ecc.errors.corrected.volatile.sram":
        return "0";
      case "ecc.errors.corrected.volatile.total":
        return gpu.eccErrors.singleBit.toString();
      case "ecc.errors.corrected.aggregate.device_memory":
        return gpu.eccErrors.aggregated.singleBit.toString();
      case "ecc.errors.corrected.aggregate.dram":
        return gpu.eccErrors.aggregated.singleBit.toString();
      case "ecc.errors.corrected.aggregate.sram":
        return "0";
      case "ecc.errors.corrected.aggregate.total":
        return gpu.eccErrors.aggregated.singleBit.toString();
      case "ecc.errors.uncorrected.volatile.device_memory":
        return gpu.eccErrors.doubleBit.toString();
      case "ecc.errors.uncorrected.volatile.dram":
        return gpu.eccErrors.doubleBit.toString();
      case "ecc.errors.uncorrected.volatile.sram":
        return "0";
      case "ecc.errors.uncorrected.volatile.total":
        return gpu.eccErrors.doubleBit.toString();
      case "ecc.errors.uncorrected.aggregate.device_memory":
        return gpu.eccErrors.aggregated.doubleBit.toString();
      case "ecc.errors.uncorrected.aggregate.dram":
        return gpu.eccErrors.aggregated.doubleBit.toString();
      case "ecc.errors.uncorrected.aggregate.sram":
        return "0";
      case "ecc.errors.uncorrected.aggregate.total":
        return gpu.eccErrors.aggregated.doubleBit.toString();

      // Retired Pages
      case "retired_pages.single_bit_ecc.count":
      case "retired_pages.sbe":
        return Math.floor(gpu.eccErrors.aggregated.singleBit / 10).toString();
      case "retired_pages.double_bit.count":
      case "retired_pages.dbe":
        return gpu.eccErrors.aggregated.doubleBit.toString();
      case "retired_pages.pending":
        return gpu.eccErrors.doubleBit > 0 ? "Yes" : "No";

      // Compute & Display Mode
      case "compute_mode":
        return "Default";
      case "display_mode":
        return "Disabled";
      case "display_active":
        return "Disabled";
      case "persistence_mode":
        return gpu.persistenceMode ? "Enabled" : "Disabled";

      // Performance State
      case "pstate":
        return gpu.utilization > 50 ? "P0" : gpu.utilization > 10 ? "P2" : "P8";
      case "performance_state":
        return gpu.utilization > 50 ? "P0" : gpu.utilization > 10 ? "P2" : "P8";

      // Fan
      case "fan.speed":
        return `${Math.min(100, Math.round(30 + gpu.temperature * 0.7))} %`;

      // Count/timestamp
      case "count":
        return node?.gpus.length.toString() || "8";
      case "timestamp":
        return new Date().toISOString();

      // NVLink
      case "nvlink.link0.state":
      case "nvlink.link1.state":
      case "nvlink.link2.state":
      case "nvlink.link3.state":
        return gpu.nvlinks.length > 0 ? "Active" : "Inactive";

      // Accounting mode
      case "accounting.mode":
        return "Disabled";
      case "accounting.buffer_size":
        return "4000";

      default:
        return "[Not Supported]";
    }
  }

  /**
   * Handle -d/--display flag for selective information display
   * Supports: MEMORY, UTILIZATION, ECC, TEMPERATURE, POWER, CLOCK, COMPUTE, PIDS,
   * PERFORMANCE, SUPPORTED_CLOCKS, PAGE_RETIREMENT, ACCOUNTING, ENCODER_STATS,
   * SUPPORTED_GPU_TARGET_TEMP, VOLTAGE, FBC_STATS, ROW_REMAPPER, RESET_STATUS
   */
  private handleDisplayFlag(
    displayType: string,
    gpus: GPU[],
    node: DGXNode,
  ): CommandResult {
    const displayTypes = displayType
      .toUpperCase()
      .split(",")
      .map((d) => d.trim());
    const timestamp = new Date().toISOString();
    const driverVersion = node?.nvidiaDriverVersion || "535.129.03";

    let output = `==============NVSMI LOG==============\n\n`;
    output += `Timestamp                                 : ${timestamp}\n`;
    output += `Driver Version                            : ${driverVersion}\n`;
    output += `CUDA Version                              : ${node?.cudaVersion || "12.2"}\n\n`;
    output += `Attached GPUs                             : ${gpus.length}\n`;

    for (const gpu of gpus) {
      output += `\nGPU ${gpu.id.toString().padStart(8, "0")}\n`;

      for (const dtype of displayTypes) {
        switch (dtype) {
          case "MEMORY":
            output += this.formatDisplayMemory(gpu);
            break;
          case "UTILIZATION":
            output += this.formatDisplayUtilization(gpu);
            break;
          case "ECC":
            output += this.formatDisplayECC(gpu);
            break;
          case "TEMPERATURE":
            output += this.formatDisplayTemperature(gpu);
            break;
          case "POWER":
            output += this.formatDisplayPower(gpu);
            break;
          case "CLOCK":
          case "CLOCKS":
            output += this.formatDisplayClocks(gpu);
            break;
          case "COMPUTE":
            output += this.formatDisplayCompute(gpu);
            break;
          case "PIDS":
            output += this.formatDisplayPids(gpu);
            break;
          case "PERFORMANCE":
            output += this.formatDisplayPerformance(gpu);
            break;
          case "SUPPORTED_CLOCKS":
            output += this.formatDisplaySupportedClocks(gpu);
            break;
          case "PAGE_RETIREMENT":
            output += this.formatDisplayPageRetirement(gpu);
            break;
          case "ACCOUNTING":
            output += this.formatDisplayAccounting(gpu);
            break;
          case "ENCODER_STATS":
            output += this.formatDisplayEncoderStats(gpu);
            break;
          case "SUPPORTED_GPU_TARGET_TEMP":
            output += this.formatDisplayTargetTemp(gpu);
            break;
          case "VOLTAGE":
            output += this.formatDisplayVoltage(gpu);
            break;
          case "FBC_STATS":
            output += this.formatDisplayFBCStats(gpu);
            break;
          case "ROW_REMAPPER":
            output += this.formatDisplayRowRemapper(gpu);
            break;
          case "RESET_STATUS":
            output += this.formatDisplayResetStatus(gpu);
            break;
          default:
            output += `    Unknown display type: ${dtype}\n`;
        }
      }
    }

    return this.createSuccess(output);
  }

  private formatDisplayMemory(gpu: GPU): string {
    let output = `    FB Memory Usage\n`;
    output += `        Total                             : ${gpu.memoryTotal} MiB\n`;
    output += `        Reserved                          : ${Math.round(gpu.memoryTotal * 0.02)} MiB\n`;
    output += `        Used                              : ${gpu.memoryUsed} MiB\n`;
    output += `        Free                              : ${gpu.memoryTotal - gpu.memoryUsed} MiB\n`;
    output += `    BAR1 Memory Usage\n`;
    output += `        Total                             : 131072 MiB\n`;
    output += `        Used                              : 1 MiB\n`;
    output += `        Free                              : 131071 MiB\n`;
    output += `    Conf Compute Protected Memory Usage\n`;
    output += `        Total                             : 0 MiB\n`;
    output += `        Used                              : 0 MiB\n`;
    output += `        Free                              : 0 MiB\n`;
    return output;
  }

  private formatDisplayUtilization(gpu: GPU): string {
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

  private formatDisplayECC(gpu: GPU): string {
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

  private formatDisplayTemperature(gpu: GPU): string {
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

  private formatDisplayPower(gpu: GPU): string {
    const powerDraw = Math.round(gpu.powerDraw);
    const powerLimit = Math.round(gpu.powerLimit);
    const minLimit = Math.round(gpu.powerLimit * 0.5);
    const maxLimit = Math.round(gpu.powerLimit * 1.1);
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

  private formatDisplayClocks(gpu: GPU): string {
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

  private formatDisplayCompute(gpu: GPU): string {
    let output = `    Compute Mode                          : Default\n`;
    output += `    MIG Mode\n`;
    output += `        Current                           : ${gpu.migMode ? "Enabled" : "Disabled"}\n`;
    output += `        Pending                           : ${gpu.migMode ? "Enabled" : "Disabled"}\n`;
    return output;
  }

  private formatDisplayPids(_gpu: GPU): string {
    const output = `    Processes                             : None\n`;
    return output;
  }

  private formatDisplayPerformance(gpu: GPU): string {
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

  private formatDisplaySupportedClocks(gpu: GPU): string {
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

  private formatDisplayPageRetirement(gpu: GPU): string {
    const sbePagesRetired = Math.floor(gpu.eccErrors.aggregated.singleBit / 10);
    const dbePagesRetired = gpu.eccErrors.aggregated.doubleBit;
    const pendingRetirement = gpu.eccErrors.doubleBit > 0 ? "Yes" : "No";
    let output = `    Retired Pages\n`;
    output += `        Single Bit ECC                    : ${sbePagesRetired}\n`;
    output += `        Double Bit ECC                    : ${dbePagesRetired}\n`;
    output += `        Pending Page Blacklist            : ${pendingRetirement}\n`;
    return output;
  }

  private formatDisplayAccounting(_gpu: GPU): string {
    let output = `    Accounting Mode                       : Disabled\n`;
    output += `    Accounting Mode Buffer Size           : 4000\n`;
    return output;
  }

  private formatDisplayEncoderStats(_gpu: GPU): string {
    let output = `    Encoder Stats\n`;
    output += `        Active Sessions                   : 0\n`;
    output += `        Average FPS                       : 0\n`;
    output += `        Average Latency                   : 0\n`;
    return output;
  }

  private formatDisplayTargetTemp(_gpu: GPU): string {
    let output = `    Supported GPU Target Temp\n`;
    output += `        GPU Target Temp Min               : 65 C\n`;
    output += `        GPU Target Temp Max               : 83 C\n`;
    return output;
  }

  private formatDisplayVoltage(_gpu: GPU): string {
    let output = `    Voltage\n`;
    output += `        Graphics                          : 856.250 mV\n`;
    return output;
  }

  private formatDisplayFBCStats(_gpu: GPU): string {
    let output = `    FBC Stats\n`;
    output += `        Active Sessions                   : 0\n`;
    output += `        Average FPS                       : 0\n`;
    output += `        Average Latency                   : 0\n`;
    return output;
  }

  private formatDisplayRowRemapper(gpu: GPU): string {
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

  private formatDisplayResetStatus(gpu: GPU): string {
    const hasXidErrors = gpu.xidErrors.length > 0;
    let output = `    Reset Status\n`;
    output += `        Reset Required                    : ${hasXidErrors ? "Yes" : "No"}\n`;
    output += `        Drain and Reset Recommended       : ${hasXidErrors ? "Yes" : "No"}\n`;
    return output;
  }

  /**
   * Handle MIG mode enable/disable via -mig flag
   */
  private handleMigFlag(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    const gpuId = this.getFlagNumber(parsed, ["i", "id"], 0);
    const migValue = parsed.flags.get("mig");
    const enable = migValue === "1" || migValue === true;

    useSimulationStore.getState().setMIGMode(node.id, gpuId, enable);

    if (enable) {
      return this.createSuccess(
        `Enabled MIG mode for GPU ${gpuId}. All GPU applications running on the device will be terminated.\n` +
          `GPU ${gpuId}: Reboot required.\n` +
          `Note: On Ampere or later GPUs, the GPU must be reset for MIG mode to take effect.`,
      );
    }

    return this.createSuccess(`Disabled MIG mode for GPU ${gpuId}.`);
  }

  /**
   * Handle power limit setting via -pl flag
   */
  private handlePowerLimit(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    const gpuId = this.getFlagNumber(parsed, ["i", "id"], 0);
    const powerLimit = this.getFlagNumber(parsed, ["pl"], 0);

    if (powerLimit < 100 || powerLimit > node.gpus[gpuId].powerLimit) {
      return this.createError(
        `Error: Power limit must be between 100 and ${node.gpus[gpuId].powerLimit} W`,
      );
    }

    useSimulationStore.getState().updateGPU(node.id, gpuId, { powerLimit });

    return this.createSuccess(
      `Power limit for GPU ${gpuId} set to ${powerLimit} W`,
    );
  }

  /**
   * Handle persistence mode via -pm flag
   */
  private handlePersistenceMode(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    const gpuId = this.getFlagNumber(parsed, ["i", "id"], 0);
    const enable = parsed.flags.get("pm") === "1";

    useSimulationStore
      .getState()
      .updateGPU(node.id, gpuId, { persistenceMode: enable });

    return this.createSuccess(
      `Persistence mode ${enable ? "enabled" : "disabled"} for GPU ${gpuId}`,
    );
  }

  /**
   * Handle GPU reset via --gpu-reset flag
   */
  private handleGpuReset(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    // Check if -i flag is provided and validate it
    const gpuIdStr = this.getFlagString(parsed, ["i", "id"]);
    if (gpuIdStr === undefined) {
      return this.createError(
        "Error: GPU reset requires -i flag to specify GPU ID\nUsage: nvidia-smi --gpu-reset -i <gpu_id>",
      );
    }

    // Validate GPU ID using centralized validation
    const validationError = this.validateGpuIndexString(gpuIdStr, node);
    if (validationError) {
      return validationError;
    }

    const gpuId = parseInt(gpuIdStr);
    const gpu = node.gpus[gpuId];
    if (!gpu) {
      return this.createError(`Error: GPU ${gpuId} not found`);
    }

    // Check if GPU has fallen off the bus (XID 79)
    if (this.hasGPUFallenOffBus(gpu)) {
      return this.createError(
        `Unable to reset GPU ${gpuId}: GPU has fallen off the bus.\n` +
          `XID 79 indicates a severe PCIe communication failure.\n` +
          `GPU reset will not work in this state. System reboot or hardware intervention required.\n` +
          `Check 'dmesg | grep -i xid' for details.`,
      );
    }

    // Check if GPU has other critical XID errors
    const criticalXIDs = gpu.xidErrors.filter(
      (xid) => xid.severity === "Critical" && xid.code !== 79,
    );
    if (criticalXIDs.length > 0) {
      // GPU reset might work for other XIDs, but warn about it
      const xidCodes = criticalXIDs.map((xid) => xid.code).join(", ");

      // Clear XID errors after reset
      useSimulationStore.getState().updateGPU(node.id, gpuId, {
        xidErrors: [],
        healthStatus: "OK",
        temperature: 45,
        utilization: 0,
      });

      return this.createSuccess(
        `GPU ${gpuId} reset successfully.\n` +
          `Cleared critical XID error(s): ${xidCodes}\n` +
          `All compute applications using GPU ${gpuId} have been terminated.\n` +
          `Monitor 'dmesg' for XID recurrence. If errors persist, hardware RMA may be required.`,
      );
    }

    // Normal GPU reset (no critical errors)
    useSimulationStore.getState().updateGPU(node.id, gpuId, {
      xidErrors: [],
      healthStatus: "OK",
      utilization: 0,
    });

    return this.createSuccess(
      `GPU ${gpuId} reset successfully.\n` +
        `All compute applications using GPU ${gpuId} have been terminated.`,
    );
  }

  /**
   * Handle nvlink subcommand
   */
  private handleNvlink(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.handleHelp("nvlink");
    }

    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    if (this.hasAnyFlag(parsed, ["status", "s"])) {
      let output = `GPU 0: ${node.gpus[0].name}\n`;
      node.gpus[0].nvlinks.forEach((link) => {
        output += `\tLink ${link.linkId}: ${link.status} (${link.speed} GB/s)\n`;
      });
      return this.createSuccess(output);
    }

    return this.createError(
      "nvidia-smi nvlink: Missing required option: --status\nTry 'nvidia-smi nvlink --help' for more information.",
    );
  }

  /**
   * Handle topo subcommand
   */
  private handleTopo(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.handleHelp("topo");
    }

    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    if (this.hasAnyFlag(parsed, ["m", "matrix"])) {
      let output =
        "\tGPU0\tGPU1\tGPU2\tGPU3\tGPU4\tGPU5\tGPU6\tGPU7\tmlx5_0\tmlx5_1\tCPU Affinity\tNUMA Affinity\n";
      node.gpus.forEach((_gpu, i) => {
        output += `GPU${i}\t`;
        for (let j = 0; j < 8; j++) {
          if (i === j) output += " X\t";
          else if (Math.abs(i - j) <= 1) output += "NV12\t";
          else output += "NV6\t";
        }
        output += "SYS\tSYS\t0-63\t0\n";
      });

      return this.createSuccess(output);
    }

    return this.createError(
      "nvidia-smi topo: Missing required option: -m/--matrix\nTry 'nvidia-smi topo --help' for more information.",
    );
  }

  /**
   * Handle mig subcommand
   */
  private handleMig(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.handleHelp("mig");
    }

    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    // Handle -lgip (list GPU instance profiles)
    if (this.hasAnyFlag(parsed, ["lgip"])) {
      return {
        output: this.formatMIGList(node.gpus, "gi-profile"),
        exitCode: 0,
      };
    }

    // Handle -lgi (list GPU instances)
    if (this.hasAnyFlag(parsed, ["lgi"])) {
      return {
        output: this.formatMIGList(node.gpus, "gi"),
        exitCode: 0,
      };
    }

    // Handle -cgi (create GPU instances)
    if (this.hasAnyFlag(parsed, ["cgi"])) {
      const gpuId = this.getFlagNumber(parsed, ["i", "id"], 0);
      const gpu = node.gpus[gpuId];

      if (!gpu.migMode) {
        return this.createError(
          "Error: MIG mode not enabled on this GPU\nUse 'nvidia-smi -i ${gpuId} -mig 1' to enable MIG mode.",
        );
      }

      // Parse profile IDs from the cgi flag value
      const cgiValue = this.getFlagString(parsed, ["cgi"], "");
      const profileIds = cgiValue
        .split(",")
        .map((id) => parseInt(id.trim()))
        .filter((id) => !isNaN(id));

      if (profileIds.length === 0) {
        return this.createError(
          "Error: No valid profile IDs specified.\nUse nvidia-smi mig -lgip to list available profiles.",
        );
      }

      // Create instances
      const createCompute = this.hasAnyFlag(parsed, ["C", "create-compute"]);
      const newInstances: MIGInstance[] = profileIds.map((profileId, idx) => ({
        id: gpu.migInstances.length + idx,
        gpuId: gpuId,
        profileId: profileId,
        uuid: `MIG-GPU-${gpuId}-${gpu.migInstances.length + idx}`,
        computeInstances: createCompute
          ? [
              {
                id: 0,
                giId: gpu.migInstances.length + idx,
                profileId: 0,
                uuid: `MIG-GPU-${gpuId}/CI-${gpu.migInstances.length + idx}/0`,
              },
            ]
          : [],
      }));

      useSimulationStore.getState().updateGPU(node.id, gpuId, {
        migInstances: [...gpu.migInstances, ...newInstances],
      });

      let output = `Successfully created ${profileIds.length} GPU instance(s) on GPU ${gpuId}:\n`;
      newInstances.forEach((gi) => {
        const profile = MIG_PROFILES.find((p) => p.id === gi.profileId);
        output += `  GPU instance ID ${gi.id}: ${profile?.name || "Unknown profile"}\n`;
      });

      return this.createSuccess(output);
    }

    // Handle -dgi (destroy GPU instances)
    if (this.hasAnyFlag(parsed, ["dgi", "dci"])) {
      const gpuId = this.getFlagNumber(parsed, ["i", "id"], 0);
      useSimulationStore.getState().updateGPU(node.id, gpuId, {
        migInstances: [],
      });

      return this.createSuccess(
        `Successfully destroyed all GPU instances on GPU ${gpuId}`,
      );
    }

    return this.createError(
      "nvidia-smi mig: No operation specified.\nTry 'nvidia-smi mig --help' for more information.",
    );
  }

  private formatDefault(gpus: GPU[], totalGPUs?: number): string {
    // SOURCE OF TRUTH: Column widths
    const COL_1 = 31; // GPU Name/Fan info
    const COL_2 = 22; // Bus ID/Memory
    const COL_3 = 22; // ECC/Util
    const TOTAL_WIDTH = COL_1 + COL_2 + COL_3 + 4; // +4 for the | separators

    // Generate borders dynamically from column widths
    const TOP_BORDER = "+" + "-".repeat(TOTAL_WIDTH - 2) + "+";
    const COL_SEPARATOR =
      "+" +
      "-".repeat(COL_1) +
      "+" +
      "-".repeat(COL_2) +
      "+" +
      "-".repeat(COL_3) +
      "+";
    const HEADER_SEP =
      "|" +
      "-".repeat(COL_1) +
      "+" +
      "-".repeat(COL_2) +
      "+" +
      "-".repeat(COL_3) +
      "|";
    const DOUBLE_SEP =
      "|" +
      "=".repeat(COL_1) +
      "+" +
      "=".repeat(COL_2) +
      "+" +
      "=".repeat(COL_3) +
      "|";

    // Helper to pad content to exact column width
    const padCol = (content: string, width: number): string => {
      if (content.length > width) return content.substring(0, width);
      return content.padEnd(width, " ");
    };

    // Use jittered timestamp for realism
    const dateTimeStr = generateTimestamp({
      format: "nvidia-smi",
      jitterMs: 100,
    });

    const node = this.getNode({
      currentNode: "",
      currentPath: "",
      environment: {},
      history: [],
    });
    const driverVersion = node?.nvidiaDriverVersion || "535.129.03";
    const cudaVersion = node?.cudaVersion || "12.2";

    let output = `${dateTimeStr}\n`;

    // Header section
    output += TOP_BORDER + "\n";
    const headerContent = ` NVIDIA-SMI ${driverVersion}   Driver Version: ${driverVersion}   CUDA Version: ${cudaVersion} `;
    output += "|" + padCol(headerContent, TOTAL_WIDTH - 2) + "|\n";
    output += HEADER_SEP + "\n";

    // Column headers
    const hdr1 = " GPU  Name        Persistence-M";
    const hdr2 = " Bus-Id        Disp.A ";
    const hdr3 = " Volatile Uncorr. ECC ";
    output +=
      "|" +
      padCol(hdr1, COL_1) +
      "|" +
      padCol(hdr2, COL_2) +
      "|" +
      padCol(hdr3, COL_3) +
      "|\n";

    const hdr4 = " Fan  Temp  Perf  Pwr:Usage/Cap";
    const hdr5 = "         Memory-Usage ";
    const hdr6 = " GPU-Util  Compute M. ";
    output +=
      "|" +
      padCol(hdr4, COL_1) +
      "|" +
      padCol(hdr5, COL_2) +
      "|" +
      padCol(hdr6, COL_3) +
      "|\n";

    const hdr7 = "";
    const hdr8 = "";
    const hdr9 = "               MIG M. ";
    output +=
      "|" +
      padCol(hdr7, COL_1) +
      "|" +
      padCol(hdr8, COL_2) +
      "|" +
      padCol(hdr9, COL_3) +
      "|\n";

    output += DOUBLE_SEP + "\n";

    // GPU data rows
    gpus.forEach((gpu) => {
      // Row 1: GPU ID, Name, Persistence, Bus ID, ECC
      const gpuName =
        gpu.name.length > 16 ? gpu.name.substring(0, 16) : gpu.name;
      const persist = gpu.persistenceMode ? "On " : "Off";
      const col1_r1 = `   ${gpu.id}  ${gpuName.padEnd(16)} ${persist}`;
      const col2_r1 = ` ${gpu.pciAddress.padEnd(16)} Off `;
      const ecc =
        gpu.eccErrors.doubleBit > 0
          ? gpu.eccErrors.doubleBit.toString()
          : "N/A";
      const col3_r1 = ecc.padStart(COL_3 - 1) + " ";
      output +=
        "|" +
        padCol(col1_r1, COL_1) +
        "|" +
        padCol(col2_r1, COL_2) +
        "|" +
        padCol(col3_r1, COL_3) +
        "|\n";

      // Row 2: Fan, Temp, Perf, Power, Memory, Utilization
      const temp = Math.round(gpu.temperature).toString().padStart(3);
      const pwr = Math.round(gpu.powerDraw).toString().padStart(3);
      const pwrMax = Math.round(gpu.powerLimit).toString().padStart(3);
      const memUsed = Math.round(gpu.memoryUsed / 1024)
        .toString()
        .padStart(5);
      const memTotal = Math.round(gpu.memoryTotal / 1024)
        .toString()
        .padStart(5);
      const util = Math.round(gpu.utilization).toString().padStart(3);

      const col1_r2 = ` N/A   ${temp}C    P0    ${pwr}W / ${pwrMax}W `;
      const col2_r2 = `   ${memUsed}MiB / ${memTotal}MiB `;
      const col3_r2 = `     ${util}%      Default `;
      output +=
        "|" +
        padCol(col1_r2, COL_1) +
        "|" +
        padCol(col2_r2, COL_2) +
        "|" +
        padCol(col3_r2, COL_3) +
        "|\n";

      // Row 3: Empty, Empty, MIG Mode
      const mig = gpu.migMode ? "Enabled" : "N/A";
      const col1_r3 = "";
      const col2_r3 = "";
      const col3_r3 = mig.padStart(COL_3 - 1) + " ";
      output +=
        "|" +
        padCol(col1_r3, COL_1) +
        "|" +
        padCol(col2_r3, COL_2) +
        "|" +
        padCol(col3_r3, COL_3) +
        "|\n";

      output += COL_SEPARATOR + "\n";
    });

    // Processes section
    output += "\n";
    output += TOP_BORDER + "\n";
    const procHeader = " Processes:";
    output += "|" + padCol(procHeader, TOTAL_WIDTH - 2) + "|\n";
    const procCols =
      "  GPU   GI   CI        PID   Type   Process name                  GPU Memory ";
    output += "|" + padCol(procCols, TOTAL_WIDTH - 2) + "|\n";
    const procCols2 =
      "        ID   ID                                                   Usage      ";
    output += "|" + padCol(procCols2, TOTAL_WIDTH - 2) + "|\n";
    output += "|" + "=".repeat(TOTAL_WIDTH - 2) + "|\n";
    const noProc = "  No running processes found";
    output += "|" + padCol(noProc, TOTAL_WIDTH - 2) + "|\n";
    output += TOP_BORDER + "\n";

    // Add warning if some GPUs are not visible due to XID errors
    if (totalGPUs !== undefined && gpus.length < totalGPUs) {
      const missingGPUs = totalGPUs - gpus.length;
      output += `\n\x1b[31mWARNING: ${missingGPUs} GPU(s) not shown due to critical errors (XID 79: GPU fallen off the bus)\x1b[0m\n`;
      output += `\x1b[33mCheck 'dmesg | grep -i xid' for details. GPU reset or system reboot may be required.\x1b[0m\n`;
    }

    return output;
  }

  private formatQuery(gpus: GPU[], gpu?: number): string {
    const selectedGPUs =
      gpu !== undefined ? gpus.filter((g) => g.id === gpu) : gpus;

    let output = "";
    selectedGPUs.forEach((g, idx) => {
      if (idx > 0) output += "\n";

      output += `==============NVSMI LOG==============\n\n`;
      output += `Timestamp                                 : ${new Date().toISOString()}\n`;
      output += `Driver Version                            : ${g.name}\n\n`;
      output += `Attached GPUs                             : ${gpus.length}\n`;
      output += `GPU ${g.id.toString().padStart(8, "0")}\n\n`;

      output += `Product Name                              : ${g.name}\n`;
      output += `Product Brand                             : NVIDIA\n`;
      output += `Product Architecture                      : Ampere\n`;
      output += `Display Mode                              : Disabled\n`;
      output += `Display Active                            : Disabled\n`;
      output += `Persistence Mode                          : ${g.persistenceMode ? "Enabled" : "Disabled"}\n`;
      output += `MIG Mode\n`;
      output += `    Current                               : ${g.migMode ? "Enabled" : "Disabled"}\n`;
      output += `    Pending                               : ${g.migMode ? "Enabled" : "Disabled"}\n`;
      output += `Accounting Mode                           : Disabled\n`;
      output += `Accounting Mode Buffer Size               : 4000\n\n`;

      output += `GPU UUID                                  : ${g.uuid}\n`;
      output += `Minor Number                              : ${g.id}\n`;
      output += `VBIOS Version                             : 92.00.5C.00.01\n`;
      output += `MultiGPU Board                            : No\n`;
      output += `Board ID                                  : 0x${g.id.toString(16).padStart(4, "0")}\n`;
      output += `GPU Part Number                           : 692-2G503-0200-002\n`;
      output += `Module ID                                 : 0\n`;
      output += `Inforom Version\n`;
      output += `    Image Version                         : G503.0200.00.03\n`;
      output += `    OEM Object                            : 2.0\n`;
      output += `    ECC Object                            : 6.16\n`;
      output += `    Power Management Object               : N/A\n\n`;

      output += `GPU Operation Mode\n`;
      output += `    Current GOM                           : N/A\n`;
      output += `    Pending GOM                           : N/A\n\n`;

      output += `GPU Virtualization Mode\n`;
      output += `    Virtualization Mode                   : None\n`;
      output += `    Host VGPU Mode                        : N/A\n\n`;

      output += `PCI\n`;
      output += `    Bus                                   : 0x${g.pciAddress.split(":")[1]}\n`;
      output += `    Device                                : 0x${g.pciAddress.split(":")[2].split(".")[0]}\n`;
      output += `    Domain                                : 0x0000\n`;
      output += `    Device Id                             : 0x20B010DE\n`;
      output += `    Bus Id                                : ${g.pciAddress}\n`;
      output += `    Sub System Id                         : 0x138F10DE\n`;
      output += `    GPU Link Info\n`;
      output += `        PCIe Generation\n`;
      output += `            Max                           : 4\n`;
      output += `            Current                       : 4\n`;
      output += `        Link Width\n`;
      output += `            Max                           : 16x\n`;
      output += `            Current                       : 16x\n\n`;

      output += `Fan Speed                                 : N/A\n`;
      output += `Performance State                         : P0\n`;
      output += `Clocks Throttle Reasons\n`;
      output += `    Idle                                  : Not Active\n`;
      output += `    Applications Clocks Setting           : Not Active\n`;
      output += `    SW Power Cap                          : Not Active\n`;
      output += `    HW Slowdown                           : Not Active\n`;
      output += `    HW Thermal Slowdown                   : Not Active\n`;
      output += `    HW Power Brake Slowdown               : Not Active\n`;
      output += `    Sync Boost                            : Not Active\n`;
      output += `    SW Thermal Slowdown                   : Not Active\n`;
      output += `    Display Clock Setting                 : Not Active\n\n`;

      output += `FB Memory Usage\n`;
      output += `    Total                                 : ${g.memoryTotal} MiB\n`;
      output += `    Reserved                              : 625 MiB\n`;
      output += `    Used                                  : ${g.memoryUsed} MiB\n`;
      output += `    Free                                  : ${g.memoryTotal - g.memoryUsed} MiB\n\n`;

      output += `BAR1 Memory Usage\n`;
      output += `    Total                                 : 131072 MiB\n`;
      output += `    Used                                  : 1 MiB\n`;
      output += `    Free                                  : 131071 MiB\n\n`;

      output += `Compute Mode                              : Default\n\n`;

      output += `Utilization\n`;
      output += `    Gpu                                   : ${g.utilization} %\n`;
      output += `    Memory                                : 0 %\n`;
      output += `    Encoder                               : 0 %\n`;
      output += `    Decoder                               : 0 %\n\n`;

      output += `ECC Mode\n`;
      output += `    Current                               : ${g.eccEnabled ? "Enabled" : "Disabled"}\n`;
      output += `    Pending                               : ${g.eccEnabled ? "Enabled" : "Disabled"}\n\n`;

      output += `ECC Errors\n`;
      output += `    Volatile\n`;
      output += `        SRAM Correctable                  : ${g.eccErrors.singleBit}\n`;
      output += `        SRAM Uncorrectable                : ${g.eccErrors.doubleBit}\n`;
      output += `        DRAM Correctable                  : ${g.eccErrors.singleBit}\n`;
      output += `        DRAM Uncorrectable                : ${g.eccErrors.doubleBit}\n`;
      output += `    Aggregate\n`;
      output += `        SRAM Correctable                  : ${g.eccErrors.aggregated.singleBit}\n`;
      output += `        SRAM Uncorrectable                : ${g.eccErrors.aggregated.doubleBit}\n`;
      output += `        DRAM Correctable                  : ${g.eccErrors.aggregated.singleBit}\n`;
      output += `        DRAM Uncorrectable                : ${g.eccErrors.aggregated.doubleBit}\n\n`;

      output += `Temperature\n`;
      output += `    GPU Current Temp                      : ${Math.round(g.temperature)} C\n`;
      output += `    GPU Shutdown Temp                     : 90 C\n`;
      output += `    GPU Slowdown Temp                     : 85 C\n`;
      output += `    GPU Max Operating Temp                : 83 C\n`;
      output += `    GPU Target Temperature                : N/A\n`;
      output += `    Memory Current Temp                   : ${Math.round(g.temperature - 5)} C\n`;
      output += `    Memory Max Operating Temp             : 95 C\n\n`;

      output += `Power Readings\n`;
      output += `    Power Management                      : Supported\n`;
      output += `    Power Draw                            : ${g.powerDraw.toFixed(2)} W\n`;
      output += `    Power Limit                           : ${g.powerLimit.toFixed(2)} W\n`;
      output += `    Default Power Limit                   : ${g.powerLimit.toFixed(2)} W\n`;
      output += `    Enforced Power Limit                  : ${g.powerLimit.toFixed(2)} W\n`;
      output += `    Min Power Limit                       : 100.00 W\n`;
      output += `    Max Power Limit                       : ${g.powerLimit.toFixed(2)} W\n\n`;

      output += `Clocks\n`;
      output += `    Graphics                              : ${g.clocksSM} MHz\n`;
      output += `    SM                                    : ${g.clocksSM} MHz\n`;
      output += `    Memory                                : ${g.clocksMem} MHz\n`;
      output += `    Video                                 : 1275 MHz\n\n`;

      output += `Applications Clocks\n`;
      output += `    Graphics                              : 1410 MHz\n`;
      output += `    Memory                                : 1215 MHz\n\n`;

      output += `Max Clocks\n`;
      output += `    Graphics                              : 1410 MHz\n`;
      output += `    SM                                    : 1410 MHz\n`;
      output += `    Memory                                : 1215 MHz\n`;
      output += `    Video                                 : 1275 MHz\n\n`;
    });

    return output;
  }

  private formatMIGList(
    gpus: GPU[],
    listType: "gi" | "gi-profile" | "ci-profile",
  ): string {
    if (listType === "gi-profile" || listType === "ci-profile") {
      let output =
        "+-----------------------------------------------------------------------------+\n";
      output +=
        "| GPU instance profiles:                                                       |\n";
      output +=
        "| GPU   Name             ID    Instances   Memory     P2P    SM    DEC   ENC  |\n";
      output +=
        "|                              Free/Total   GiB        CE                      |\n";
      output +=
        "|=============================================================================|\n";

      gpus.forEach((gpu) => {
        if (gpu.migMode) {
          MIG_PROFILES.forEach((profile) => {
            const usedInstances = gpu.migInstances.filter(
              (mi) => mi.profileId === profile.id,
            ).length;
            const freeInstances = profile.maxInstances - usedInstances;
            output += `|   ${gpu.id}  ${profile.name.padEnd(17)} ${profile.id.toString().padStart(2)}     ${freeInstances}/${profile.maxInstances}        ${profile.memory.toFixed(2).padStart(5)}       ${profile.maxInstances === 1 ? "Yes" : "No ".padEnd(3)}     ${profile.computeSlices.toString().padStart(2)}     ${Math.floor(profile.computeSlices / 14)}     0   |\n`;
          });
        }
      });

      output +=
        "+-----------------------------------------------------------------------------+\n";
      return output;
    } else {
      // List GPU instances
      let output =
        "+-----------------------------------------------------------------------+\n";
      output +=
        "| GPU instances:                                                         |\n";
      output += "| GPU   Name          Profile  Instance   Placement  |\n";
      output += "|                       ID       ID       Start:Size  |\n";
      output +=
        "|=======================================================================|\n";

      gpus.forEach((gpu) => {
        if (gpu.migInstances.length > 0) {
          gpu.migInstances.forEach((gi) => {
            const profile = MIG_PROFILES.find((p) => p.id === gi.profileId);
            output += `|   ${gpu.id}  ${profile?.name.padEnd(13)} ${gi.profileId.toString().padStart(2)}        ${gi.id.toString().padStart(2)}          0:${profile?.computeSlices.toString().padStart(2)}     |\n`;
          });
        } else if (gpu.migMode) {
          output += `|   ${gpu.id}  No MIG devices configured                                    |\n`;
        }
      });

      output +=
        "+-----------------------------------------------------------------------+\n";
      return output;
    }
  }
}
