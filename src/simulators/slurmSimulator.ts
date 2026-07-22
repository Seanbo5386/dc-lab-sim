import type { CommandResult, CommandContext } from "@/types/commands";
import type { ParsedCommand } from "@/utils/commandParser";
import {
  BaseSimulator,
  type SimulatorMetadata,
} from "@/simulators/BaseSimulator";
import type { DGXNode } from "@/types/hardware";
import type { SeedJob } from "@/types/scenarios";
import { getHardwareSpecs, type SystemType } from "@/data/hardwareSpecs";
import { compressHostlist } from "@/simulation/compressHostlist";

function getGresGpuType(systemType: SystemType): string {
  const gpuModelMap: Record<SystemType, string> = {
    "DGX-A100": "a100",
    "DGX-H100": "h100",
    "DGX-H200": "h200",
    "DGX-B200": "b200",
    "DGX-GB200": "b200",
    "DGX-VR200": "r200",
  };
  return gpuModelMap[systemType] ?? "gpu";
}

interface SlurmJob {
  jobId: number;
  partition: string;
  name: string;
  user: string;
  state: "RUNNING" | "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  time: string;
  timeLimit: string;
  nodes: number;
  nodelist: string;
  cpus: number;
  gpus: number;
  memory: string;
  submitTime: Date;
  startTime?: Date;
  endTime?: Date;
  priority: number;
  account: string;
  qos: string;
  workDir: string;
  command: string;
  dependency?: string;
  arrayTaskId?: number;
  reasonPending?: string;
}

/**
 * Slurm Simulator
 *
 * Handles multiple Slurm commands: sinfo, squeue, scontrol, sbatch, srun, scancel, sacct
 * Each command is a separate entry point from Terminal.tsx.
 */
export class SlurmSimulator extends BaseSimulator {
  private jobs: SlurmJob[] = [];
  private nextJobId = 1000;
  private currentCommand = "slurm";

  constructor() {
    super();
    this.initializeDefinitionRegistry();
  }

  /**
   * Inject a pre-existing job into the simulator.
   * Used by scenario initialization to populate squeue/scontrol output.
   * Node slurmState and GPU allocation are handled separately by applyFaultsToContext.
   */
  injectJob(seed: SeedJob): void {
    const job: SlurmJob = {
      jobId: this.nextJobId++,
      partition: seed.partition,
      name: seed.jobName,
      user: seed.user,
      state: seed.state,
      time: seed.runtime,
      timeLimit: "infinite",
      nodes: seed.state === "PENDING" ? 0 : seed.nodeIds.length,
      nodelist:
        seed.state === "PENDING"
          ? `(${seed.reasonPending ?? "Resources"})`
          : seed.nodeIds.join(","),
      cpus: seed.nodeIds.length * 128,
      gpus: seed.nodeIds.length * seed.gpusPerNode,
      memory: "512G",
      submitTime: new Date(Date.now() - this.parseRuntime(seed.runtime)),
      startTime:
        seed.state === "RUNNING"
          ? new Date(Date.now() - this.parseRuntime(seed.runtime))
          : undefined,
      endTime: seed.state === "FAILED" ? new Date() : undefined,
      priority: 1000 + Math.floor(Math.random() * 100),
      account: "default",
      qos: "normal",
      workDir: `/home/${seed.user}`,
      command: `${seed.jobName}.sh`,
      reasonPending: seed.reasonPending,
    };
    this.jobs.push(job);
  }

  /**
   * Read seed jobs from a ScenarioContext and populate internal job state.
   */
  syncFromContext(context: CommandContext): void {
    const sc = context.scenarioContext;
    if (!sc) return;
    const seeds = sc.getSeedJobs();
    for (const seed of seeds) {
      this.injectJob(seed);
    }
  }

  /**
   * Clear all jobs and reset the job ID counter.
   * Called when exiting a scenario or loading a new one.
   */
  clearJobs(): void {
    this.jobs = [];
    this.nextJobId = 1000;
  }

  /** Parse "H:MM:SS" runtime string to milliseconds */
  private parseRuntime(runtime: string): number {
    const parts = runtime.split(":").map(Number);
    if (parts.length === 3) {
      return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
    }
    return 0;
  }

  getMetadata(): SimulatorMetadata {
    return {
      name: this.currentCommand,
      version: "23.02.6",
      description: "Slurm Workload Manager",
      commands: [],
    };
  }

  execute(_parsed: ParsedCommand, _context: CommandContext): CommandResult {
    return this.createError(
      "Use specific Slurm commands: sinfo, squeue, scontrol, sbatch, srun, scancel, sacct",
    );
  }

  // Note: a private getNode() wrapper used to live here; its only caller was
  // the old always-succeeds executeSrun (removed in SIM-21), so it was deleted
  // to keep the noUnusedLocals typecheck clean.

  private getAllNodes(context: CommandContext) {
    return this.resolveAllNodes(context);
  }

  /**
   * Sort nodes based on Slurm sort specification
   * Format: [+|-]field[,[+|-]field]...
   * + = ascending (default), - = descending
   * Fields: n=name, t=state, P=partition, c=cpus, m=memory, G=gres
   */
  private sortNodes(nodes: DGXNode[], sortSpec: string) {
    const sortFields = sortSpec.split(",");

    return [...nodes].sort((a, b) => {
      for (const field of sortFields) {
        const descending = field.startsWith("-");
        const fieldName = field.replace(/^[+-]/, "");

        let comparison = 0;
        switch (fieldName.toLowerCase()) {
          case "n": // node name
            comparison = a.id.localeCompare(b.id);
            break;
          case "t": // state
            comparison = a.slurmState.localeCompare(b.slurmState);
            break;
          case "p": // partition (all same in our sim)
            comparison = 0;
            break;
          case "c": // cpus
            comparison = a.cpuCount - b.cpuCount;
            break;
          case "m": // memory
            comparison = a.ramTotal - b.ramTotal;
            break;
          case "g": // gres (GPUs)
            comparison = a.gpus.length - b.gpus.length;
            break;
          default:
            comparison = 0;
        }

        if (comparison !== 0) {
          return descending ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  // sinfo - Show partition and node information
  executeSinfo(parsed: ParsedCommand, context: CommandContext): CommandResult {
    parsed = this.parseWithSchema(parsed.raw);
    // Handle --help
    if (this.hasAnyFlag(parsed, ["help"])) {
      return (
        this.getHelpFromRegistry("sinfo", parsed) ||
        this.createError("Help not available")
      );
    }

    // Handle --version / -V
    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("slurm 23.02.6");
    }

    // Validate flags using registry (after help/version)
    const flagError = this.validateFlagsWithRegistry(parsed, "sinfo");
    if (flagError) return flagError;

    let nodes = [...this.resolveAllNodes(context)];

    // Handle --sort / -S flag
    const sortSpec = this.getFlagString(parsed, ["S", "sort"]);
    if (sortSpec) {
      nodes = this.sortNodes(nodes, sortSpec);
    }

    // Handle --states / -t flag to filter by state
    const statesFilter = this.getFlagString(parsed, ["t", "states"]);
    if (statesFilter) {
      const allowedStates = statesFilter.toLowerCase().split(",");
      nodes = nodes.filter((n) => allowedStates.includes(n.slurmState));
    }

    // Handle --partition / -p flag to filter by partition
    const partitionFilter = this.getFlagString(parsed, ["p", "partition"]);
    if (partitionFilter) {
      // In our simulation, all nodes are in 'gpu' partition
      if (partitionFilter.toLowerCase() !== "gpu") {
        return { output: "", exitCode: 0 }; // No matching partition
      }
    }

    // Handle --nodes / -n flag to filter by node name
    const nodeFilter = this.getFlagString(parsed, ["n", "nodes"]);
    if (nodeFilter) {
      const nodeNames = nodeFilter.split(",");
      nodes = nodes.filter((n) => nodeNames.includes(n.id));
    }
    const detailed = this.hasAnyFlag(parsed, ["Nel", "N", "l", "long", "Node"]);

    // Handle -R flag for node state reasons
    if (this.hasAnyFlag(parsed, ["R", "list-reasons"])) {
      // Show reasons why nodes are unavailable
      const unavailableNodes = nodes.filter(
        (n) => n.slurmState === "drain" || n.slurmState === "down",
      );

      if (unavailableNodes.length === 0) {
        // No unavailable nodes - return empty output (normal behavior)
        return { output: "", exitCode: 0 };
      }

      let output =
        "REASON               USER      TIMESTAMP           NODELIST\n";
      unavailableNodes.forEach((node) => {
        const reason = node.slurmReason || "Not specified";
        const timestamp = new Date().toISOString().split("T")[0];
        output += `${reason.padEnd(20)} root      ${timestamp}         ${node.id}\n`;
      });

      return { output, exitCode: 0 };
    }

    // Handle custom output format with -o or --output-format
    const outputFormat = this.getFlagString(parsed, ["o", "output-format"]);
    if (outputFormat) {
      // Parse format string like "%n %G"
      let output = "";

      // Handle common format strings
      if (outputFormat.includes("%n") && outputFormat.includes("%G")) {
        // Show nodes and their GRES
        output = "NODE                 GRES\n";
        nodes.forEach((node) => {
          const gpuCount = node.gpus.length;
          const gpuType = getGresGpuType(node.systemType);
          const gres = gpuCount > 0 ? `gpu:${gpuType}:${gpuCount}` : "(null)";
          output += `${node.id.padEnd(20)} ${gres}\n`;
        });
      } else if (
        outputFormat.includes("%20n") &&
        outputFormat.includes("%10G")
      ) {
        // Show nodes and their GRES with specific column widths
        output = "NODE                 GRES      \n";
        nodes.forEach((node) => {
          const gpuCount = node.gpus.length;
          const gpuType = getGresGpuType(node.systemType);
          const gres = gpuCount > 0 ? `gpu:${gpuType}:${gpuCount}` : "(null)";
          output += `${node.id.padEnd(20)} ${gres.padEnd(10)}\n`;
        });
      } else {
        // Default format if we don't recognize it
        output = "PARTITION AVAIL  TIMELIMIT  NODES  STATE NODELIST\n";
        output += "gpu       up     infinite   8      idle  dgx-[00-07]\n";
      }

      return { output, exitCode: 0 };
    }

    if (detailed) {
      // SOURCE OF TRUTH: Column widths for detailed output
      const COL_NODELIST = 16;
      const COL_NODES = 6;
      const COL_PARTITION = 16;
      const COL_STATE = 10;
      const COL_CPUS = 8;
      const COL_SCT = 7;
      const COL_MEMORY = 7;
      const COL_TMPDISK = 9;
      const COL_WEIGHT = 7;
      const COL_AVAILFE = 9;

      let output =
        "NODELIST".padEnd(COL_NODELIST) +
        "NODES".padEnd(COL_NODES) +
        "PARTITION".padEnd(COL_PARTITION) +
        "STATE".padEnd(COL_STATE) +
        "CPUS".padEnd(COL_CPUS) +
        "S:C:T".padEnd(COL_SCT) +
        "MEMORY".padEnd(COL_MEMORY) +
        "TMP_DISK".padEnd(COL_TMPDISK) +
        "WEIGHT".padEnd(COL_WEIGHT) +
        "AVAIL_FE".padEnd(COL_AVAILFE) +
        "REASON\n";

      nodes.forEach((node) => {
        const state =
          node.slurmState === "idle"
            ? "idle"
            : node.slurmState === "alloc"
              ? "allocated"
              : node.slurmState === "drain"
                ? "drained"
                : "down";
        const cpus = node.cpuCount;
        const memory = node.ramTotal * 1024;
        const reason = node.slurmReason || "none";

        output +=
          node.id.padEnd(COL_NODELIST) +
          "1".padEnd(COL_NODES) +
          "gpu".padEnd(COL_PARTITION) +
          state.padEnd(COL_STATE) +
          cpus.toString().padEnd(COL_CPUS) +
          "2:64:1".padEnd(COL_SCT) +
          memory.toString().padEnd(COL_MEMORY) +
          "0".padEnd(COL_TMPDISK) +
          "1".padEnd(COL_WEIGHT) +
          "(null)".padEnd(COL_AVAILFE) +
          reason +
          "\n";
      });

      return { output, exitCode: 0 };
    }

    // SOURCE OF TRUTH: Column widths for default output
    const COL_PARTITION = 10;
    const COL_AVAIL = 7;
    const COL_TIMELIMIT = 11;
    const COL_NODES = 7;
    const COL_STATE = 6;

    let output =
      "PARTITION".padEnd(COL_PARTITION) +
      "AVAIL".padEnd(COL_AVAIL) +
      "TIMELIMIT".padEnd(COL_TIMELIMIT) +
      "NODES".padEnd(COL_NODES) +
      "STATE".padEnd(COL_STATE) +
      "NODELIST\n";

    const stateRows: Array<{ state: "idle" | "alloc" | "drain" | "down" }> = [
      { state: "idle" },
      { state: "alloc" },
      { state: "drain" },
      { state: "down" },
    ];

    stateRows.forEach(({ state }) => {
      const stateNodes = nodes.filter((n) => n.slurmState === state);
      if (stateNodes.length === 0) return;
      const nodelist = compressHostlist(stateNodes.map((n) => n.id));
      output +=
        "gpu".padEnd(COL_PARTITION) +
        "up".padEnd(COL_AVAIL) +
        "infinite".padEnd(COL_TIMELIMIT) +
        stateNodes.length.toString().padEnd(COL_NODES) +
        state.padEnd(COL_STATE) +
        nodelist +
        "\n";
    });

    return { output, exitCode: 0 };
  }

  // squeue - Show job queue
  executeSqueue(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    parsed = this.parseWithSchema(parsed.raw);
    // Handle --help
    if (this.hasAnyFlag(parsed, ["help"])) {
      return (
        this.getHelpFromRegistry("squeue", parsed) ||
        this.createError("Help not available")
      );
    }

    // Handle --version / -V
    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("slurm 23.02.6");
    }

    // Validate flags using registry (after help/version)
    const flagError = this.validateFlagsWithRegistry(parsed, "squeue");
    if (flagError) return flagError;

    const user = this.getFlagString(parsed, ["u", "user"]);
    const jobIdFilter = this.getFlagString(parsed, ["j", "jobs"]);
    const statesFilter = this.getFlagString(parsed, ["t", "states"]);
    const nodelistFilter = this.getFlagString(parsed, ["w", "nodelist"]);
    const longFormat = this.hasAnyFlag(parsed, ["l", "long"]);
    const customFormat = this.getFlagString(parsed, ["O", "Format"]);
    const sortSpec = this.getFlagString(parsed, ["S", "sort"]);
    const noHeader = this.hasAnyFlag(parsed, ["h", "noheader"]);

    let filteredJobs = [...this.jobs];

    // Apply filters
    if (user) {
      filteredJobs = filteredJobs.filter((j) => j.user === user);
    }
    if (jobIdFilter) {
      const jobIds = jobIdFilter.split(",").map((id) => parseInt(id));
      filteredJobs = filteredJobs.filter((j) => jobIds.includes(j.jobId));
    }
    if (statesFilter) {
      const states = statesFilter.toUpperCase().split(",");
      filteredJobs = filteredJobs.filter((j) => states.includes(j.state));
    }
    if (nodelistFilter) {
      const filterNodes = nodelistFilter.split(",");
      filteredJobs = filteredJobs.filter((j) => {
        const jobNodes = j.nodelist.split(",");
        return filterNodes.some((n) => jobNodes.includes(n));
      });
    }

    // Apply sorting
    if (sortSpec) {
      filteredJobs = this.sortJobs(filteredJobs, sortSpec);
    }

    // Handle --Format (long format with custom fields)
    if (customFormat) {
      return this.formatSqueueCustom(filteredJobs, customFormat, noHeader);
    }

    // Handle --long format
    if (longFormat) {
      return this.formatSqueueLong(filteredJobs, noHeader);
    }

    // Default format
    const COL_JOBID = 10;
    const COL_PARTITION = 13;
    const COL_NAME = 12;
    const COL_USER = 9;
    const COL_ST = 3;
    const COL_TIME = 11;
    const COL_NODES = 6;

    let output = "";
    if (!noHeader) {
      output =
        "JOBID".padEnd(COL_JOBID) +
        "PARTITION".padEnd(COL_PARTITION) +
        "NAME".padEnd(COL_NAME) +
        "USER".padEnd(COL_USER) +
        "ST".padEnd(COL_ST) +
        "TIME".padEnd(COL_TIME) +
        "NODES".padEnd(COL_NODES) +
        "NODELIST(REASON)\n";
    }

    if (filteredJobs.length === 0) {
      return { output, exitCode: 0 };
    }

    filteredJobs.forEach((job) => {
      const state =
        job.state === "RUNNING"
          ? "R"
          : job.state === "PENDING"
            ? "PD"
            : job.state === "COMPLETED"
              ? "CD"
              : job.state === "CANCELLED"
                ? "CA"
                : "F";

      const nodelistOrReason =
        job.state === "PENDING"
          ? `(${job.reasonPending || "Priority"})`
          : job.nodelist;

      output +=
        job.jobId.toString().padEnd(COL_JOBID) +
        job.partition.padEnd(COL_PARTITION) +
        job.name.substring(0, 11).padEnd(COL_NAME) +
        job.user.padEnd(COL_USER) +
        state.padEnd(COL_ST) +
        job.time.padEnd(COL_TIME) +
        job.nodes.toString().padEnd(COL_NODES) +
        nodelistOrReason +
        "\n";
    });

    return { output, exitCode: 0 };
  }

  /**
   * Sort jobs based on Slurm sort specification
   * Format: [+|-]field[,[+|-]field]...
   * Fields: i=jobid, j=name, u=user, t=time, S=starttime, p=priority
   */
  private sortJobs(jobs: SlurmJob[], sortSpec: string): SlurmJob[] {
    const sortFields = sortSpec.split(",");

    return [...jobs].sort((a, b) => {
      for (const field of sortFields) {
        const descending = field.startsWith("-");
        const fieldName = field.replace(/^[+-]/, "");

        let comparison = 0;
        switch (fieldName.toLowerCase()) {
          case "i": // job id
            comparison = a.jobId - b.jobId;
            break;
          case "j": // job name
            comparison = a.name.localeCompare(b.name);
            break;
          case "u": // user
            comparison = a.user.localeCompare(b.user);
            break;
          case "t": // time used
            comparison = a.time.localeCompare(b.time);
            break;
          case "s": {
            // start time
            const aStart = a.startTime?.getTime() || 0;
            const bStart = b.startTime?.getTime() || 0;
            comparison = aStart - bStart;
            break;
          }
          case "p": // priority
            comparison = a.priority - b.priority;
            break;
          default:
            comparison = 0;
        }

        if (comparison !== 0) {
          return descending ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  /**
   * Format squeue output with custom --Format specification
   * Supports fields like: JobID, Name, User, Partition, State, TimeUsed, NumNodes, etc.
   */
  private formatSqueueCustom(
    jobs: SlurmJob[],
    formatSpec: string,
    noHeader: boolean,
  ): CommandResult {
    // Parse format spec (e.g., "JobID:10,Name:15,User:8,State:8")
    const fields = formatSpec.split(",").map((f) => {
      const parts = f.split(":");
      return {
        name: parts[0],
        width: parts[1] ? parseInt(parts[1]) : 12,
      };
    });

    let output = "";

    // Header
    if (!noHeader) {
      fields.forEach((f) => {
        output += f.name.toUpperCase().padEnd(f.width);
      });
      output += "\n";
    }

    // Data rows
    jobs.forEach((job) => {
      fields.forEach((f) => {
        const value = this.getJobFieldValue(job, f.name);
        output += value.substring(0, f.width - 1).padEnd(f.width);
      });
      output += "\n";
    });

    return { output, exitCode: 0 };
  }

  /**
   * Format squeue output in long format (-l)
   */
  private formatSqueueLong(jobs: SlurmJob[], noHeader: boolean): CommandResult {
    const COL_JOBID = 10;
    const COL_PARTITION = 10;
    const COL_NAME = 12;
    const COL_USER = 9;
    const COL_STATE = 10;
    const COL_TIME = 11;
    const COL_TIMELIMIT = 11;
    const COL_NODES = 6;
    const COL_CPUS = 5;

    let output = "";
    if (!noHeader) {
      output =
        "JOBID".padEnd(COL_JOBID) +
        "PARTITION".padEnd(COL_PARTITION) +
        "NAME".padEnd(COL_NAME) +
        "USER".padEnd(COL_USER) +
        "STATE".padEnd(COL_STATE) +
        "TIME".padEnd(COL_TIME) +
        "TIME_LIMI".padEnd(COL_TIMELIMIT) +
        "NODES".padEnd(COL_NODES) +
        "CPUS".padEnd(COL_CPUS) +
        "NODELIST(REASON)\n";
    }

    jobs.forEach((job) => {
      const nodelistOrReason =
        job.state === "PENDING"
          ? `(${job.reasonPending || "Priority"})`
          : job.nodelist;

      output +=
        job.jobId.toString().padEnd(COL_JOBID) +
        job.partition.padEnd(COL_PARTITION) +
        job.name.substring(0, 11).padEnd(COL_NAME) +
        job.user.padEnd(COL_USER) +
        job.state.padEnd(COL_STATE) +
        job.time.padEnd(COL_TIME) +
        job.timeLimit.padEnd(COL_TIMELIMIT) +
        job.nodes.toString().padEnd(COL_NODES) +
        job.cpus.toString().padEnd(COL_CPUS) +
        nodelistOrReason +
        "\n";
    });

    return { output, exitCode: 0 };
  }

  /**
   * Get a field value from a job for custom format output
   */
  private getJobFieldValue(job: SlurmJob, field: string): string {
    switch (field.toLowerCase()) {
      case "jobid":
        return job.jobId.toString();
      case "name":
        return job.name;
      case "user":
        return job.user;
      case "partition":
        return job.partition;
      case "state":
        return job.state;
      case "statecompact":
        return job.state === "RUNNING"
          ? "R"
          : job.state === "PENDING"
            ? "PD"
            : job.state === "COMPLETED"
              ? "CD"
              : job.state === "CANCELLED"
                ? "CA"
                : "F";
      case "timeused":
      case "time":
        return job.time;
      case "timelimit":
        return job.timeLimit;
      case "numnodes":
      case "nodes":
        return job.nodes.toString();
      case "numcpus":
      case "cpus":
        return job.cpus.toString();
      case "numgpus":
      case "gpus":
        return job.gpus.toString();
      case "memory":
      case "minmemory":
        return job.memory;
      case "nodelist":
        return job.nodelist;
      case "account":
        return job.account;
      case "qos":
        return job.qos;
      case "priority":
        return job.priority.toString();
      case "submittime":
        return job.submitTime.toISOString().split("T")[0];
      case "starttime":
        return job.startTime
          ? job.startTime.toISOString().split("T")[0]
          : "N/A";
      case "endtime":
        return job.endTime ? job.endTime.toISOString().split("T")[0] : "N/A";
      case "workdir":
        return job.workDir;
      case "command":
        return job.command;
      case "dependency":
        return job.dependency || "";
      case "reason":
        return job.state === "PENDING" ? job.reasonPending || "Priority" : "";
      default:
        return "";
    }
  }

  // scontrol - Show/modify node and job information
  executeScontrol(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    parsed = this.parseWithSchema(parsed.raw);
    // Handle --help
    if (this.hasAnyFlag(parsed, ["help"])) {
      return (
        this.getHelpFromRegistry("scontrol", parsed) ||
        this.createError("Help not available")
      );
    }

    // Handle --version / -V
    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("slurm 23.02.6");
    }

    // Validate flags using registry (after help/version)
    const flagError = this.validateFlagsWithRegistry(parsed, "scontrol");
    if (flagError) return flagError;

    const command = parsed.subcommands[0];

    if (command === "show") {
      const what = parsed.subcommands[1];

      if (what === "nodes" || what === "node") {
        // Check if specific node requested
        const nodeNameArg =
          parsed.subcommands[2] ||
          parsed.positionalArgs.find((a) => !a.includes("="));
        let nodes = this.getAllNodes(context);

        if (nodeNameArg) {
          nodes = nodes.filter((n) => n.id === nodeNameArg);
          if (nodes.length === 0) {
            return this.createError(`Node ${nodeNameArg} not found`);
          }
        }

        let output = "";

        nodes.forEach((node, idx) => {
          if (idx > 0) output += "\n";

          const specs = getHardwareSpecs(node.systemType);
          const sockets = specs.system.cpu.sockets;
          const coresPerSocket = specs.system.cpu.coresPerSocket;
          const allocCpus =
            node.slurmState === "alloc" ? Math.floor(node.cpuCount / 2) : 0;
          const allocMem =
            node.slurmState === "alloc"
              ? Math.round(node.ramTotal * 0.5 * 1024)
              : 0;

          output += `NodeName=${node.id} Arch=x86_64 CoresPerSocket=${coresPerSocket}\n`;
          output += `   CPUAlloc=${allocCpus} CPUEfctv=${node.cpuCount} CPUTot=${node.cpuCount} CPULoad=0.50\n`;
          output += `   AvailableFeatures=(null)\n`;
          output += `   ActiveFeatures=(null)\n`;
          const gpuType = getGresGpuType(node.systemType);
          output += `   Gres=gpu:${gpuType}:${node.gpus.length}\n`;
          output += `   GresUsed=gpu:${gpuType}:${node.slurmState === "alloc" ? Math.min(4, node.gpus.length) : 0}(IDX:${node.slurmState === "alloc" ? "0-3" : "N/A"})\n`;
          output += `   NodeAddr=${node.id} NodeHostName=${node.hostname} Version=23.02.6\n`;
          output += `   OS=Linux 5.15.0-91-generic #101-Ubuntu SMP x86_64\n`;
          output += `   RealMemory=${node.ramTotal * 1024} AllocMem=${allocMem} FreeMem=${(node.ramTotal - node.ramUsed) * 1024} Sockets=${sockets} Boards=1\n`;
          // Real Slurm reports a base state (IDLE/ALLOCATED/DOWN) plus an
          // orthogonal DRAIN flag (e.g. "IDLE+DRAIN"), never a bare state
          // name doubled as its own flag. This sim's node model only
          // tracks a single slurmState value where "drain" already means
          // the node has no running jobs, so the base word for a draining
          // node is always IDLE here (ALLOCATED+DRAIN cannot occur in
          // this data model).
          const scontrolStateWord: Record<DGXNode["slurmState"], string> = {
            idle: "IDLE",
            alloc: "ALLOCATED",
            drain: "IDLE",
            down: "DOWN",
          };
          const scontrolState = `${scontrolStateWord[node.slurmState]}${node.slurmState === "drain" ? "+DRAIN" : ""}`;
          output += `   State=${scontrolState} ThreadsPerCore=1 TmpDisk=0 Weight=1 Owner=N/A MCS_label=N/A\n`;
          output += `   Partitions=gpu\n`;
          const now = new Date();
          // Boot time between 10 and 40 days ago
          const bootTime = new Date(
            now.getTime() - (10 + Math.random() * 30) * 24 * 60 * 60 * 1000,
          );
          const bootStr = bootTime.toISOString().slice(0, 19);
          const slurmdStr = new Date(
            bootTime.getTime() + (5 + Math.random() * 5) * 60 * 1000,
          )
            .toISOString()
            .slice(0, 19);
          output += `   BootTime=${bootStr} SlurmdStartTime=${slurmdStr}\n`;
          output += `   LastBusyTime=2024-01-11T14:30:00\n`;
          output += `   CfgTRES=cpu=${node.cpuCount},mem=${node.ramTotal * 1024}M,billing=${node.cpuCount},gres/gpu=${node.gpus.length}\n`;
          output += `   AllocTRES=${node.slurmState === "alloc" ? `cpu=${allocCpus},mem=${allocMem}M,gres/gpu=4` : ""}\n`;
          output += `   CurrentWatts=0 AveWatts=0\n`;
          output += `   ExtSensorsJoules=n/s ExtSensorsWatts=0 ExtSensorsTemp=n/s\n`;

          if (node.slurmReason) {
            output += `   Reason=${node.slurmReason} [root@2024-01-11T10:00:00]\n`;
          }
        });

        return { output, exitCode: 0 };
      }

      if (what === "job" || what === "jobs") {
        // Check if specific job requested
        const jobIdArg =
          parsed.subcommands[2] ||
          parsed.positionalArgs.find((a) => !a.includes("="));

        let jobsToShow = this.jobs;
        if (jobIdArg) {
          const jobId = parseInt(jobIdArg);
          jobsToShow = this.jobs.filter((j) => j.jobId === jobId);
          if (jobsToShow.length === 0) {
            return this.createError(`Job ${jobIdArg} not found`);
          }
        }

        if (jobsToShow.length === 0) {
          return { output: "No jobs in the system\n", exitCode: 0 };
        }

        let output = "";
        jobsToShow.forEach((job, idx) => {
          if (idx > 0) output += "\n";

          const submitTimeStr = job.submitTime
            .toISOString()
            .replace("T", " ")
            .split(".")[0];
          const startTimeStr = job.startTime
            ? job.startTime.toISOString().replace("T", " ").split(".")[0]
            : "Unknown";
          const endTimeStr = job.endTime
            ? job.endTime.toISOString().replace("T", " ").split(".")[0]
            : "Unknown";

          output += `JobId=${job.jobId} JobName=${job.name}\n`;
          output += `   UserId=${job.user}(1000) GroupId=${job.user}(1000) MCS_label=N/A\n`;
          output += `   Priority=${job.priority} Nice=0 Account=${job.account} QOS=${job.qos}\n`;
          output += `   JobState=${job.state} Reason=${job.state === "PENDING" ? job.reasonPending || "Priority" : "None"} Dependency=${job.dependency || "(null)"}\n`;
          output += `   Requeue=1 Restarts=0 BatchFlag=1 Reboot=0 ExitCode=0:0\n`;
          output += `   RunTime=${job.time} TimeLimit=${job.timeLimit} TimeMin=N/A\n`;
          output += `   SubmitTime=${submitTimeStr} EligibleTime=${submitTimeStr}\n`;
          output += `   AccrueTime=${submitTimeStr}\n`;
          output += `   StartTime=${startTimeStr} EndTime=${endTimeStr} Deadline=N/A\n`;
          output += `   SuspendTime=None SecsPreSuspend=0 LastSchedEval=${submitTimeStr}\n`;
          output += `   Scheduler=Main\n`;
          output += `   Partition=${job.partition} AllocNode:Sid=${job.nodelist}:${job.jobId}\n`;
          output += `   ReqNodeList=(null) ExcNodeList=(null)\n`;
          output += `   NodeList=${job.state === "RUNNING" ? job.nodelist : ""}\n`;
          output += `   BatchHost=${job.state === "RUNNING" ? job.nodelist : ""}\n`;
          output += `   NumNodes=${job.nodes} NumCPUs=${job.cpus} NumTasks=${job.cpus} CPUs/Task=1 ReqB:S:C:T=0:0:*:*\n`;
          output += `   TRES=cpu=${job.cpus},mem=${job.memory},node=${job.nodes},billing=${job.cpus},gres/gpu=${job.gpus}\n`;
          output += `   Socks/Node=* NtasksPerN:B:S:C=0:0:*:* CoreSpec=*\n`;
          output += `   MinCPUsNode=1 MinMemoryNode=${job.memory} MinTmpDiskNode=0\n`;
          output += `   Features=(null) DelayBoot=00:00:00\n`;
          output += `   OverSubscribe=OK Contiguous=0 Licenses=(null) Network=(null)\n`;
          output += `   Command=${job.command}\n`;
          output += `   WorkDir=${job.workDir}\n`;
          output += `   StdErr=${job.workDir}/slurm-${job.jobId}.err\n`;
          output += `   StdIn=/dev/null\n`;
          output += `   StdOut=${job.workDir}/slurm-${job.jobId}.out\n`;
          output += `   Power=\n`;
        });

        return { output, exitCode: 0 };
      }

      if (what === "partition" || what === "partitions") {
        const nodes = this.getAllNodes(context);
        const totalCpus = nodes.reduce((sum, n) => sum + n.cpuCount, 0);
        const totalMem = nodes.reduce((sum, n) => sum + n.ramTotal * 1024, 0);
        const totalGpus = nodes.reduce((sum, n) => sum + n.gpus.length, 0);

        let output = "PartitionName=gpu\n";
        output += "   AllowGroups=ALL AllowAccounts=ALL AllowQos=ALL\n";
        output += "   AllocNodes=ALL Default=YES QoS=N/A\n";
        output +=
          "   DefaultTime=NONE DisableRootJobs=NO ExclusiveUser=NO GraceTime=0 Hidden=NO\n";
        output +=
          "   MaxNodes=UNLIMITED MaxTime=UNLIMITED MinNodes=0 LLN=NO MaxCPUsPerNode=UNLIMITED MaxCPUsPerSocket=UNLIMITED\n";
        output += `   Nodes=${compressHostlist(nodes.map((n) => n.id))}\n`;
        output +=
          "   PriorityJobFactor=1 PriorityTier=1 RootOnly=NO ReqResv=NO OverSubscribe=NO\n";
        output += "   OverTimeLimit=NONE PreemptMode=OFF\n";
        output += `   State=UP TotalCPUs=${totalCpus} TotalNodes=${nodes.length} SelectTypeParameters=NONE\n`;
        output += `   JobDefaults=(null)\n`;
        output += `   DefMemPerCPU=1024 MaxMemPerNode=UNLIMITED\n`;
        output += `   TRES=cpu=${totalCpus},mem=${totalMem}M,node=${nodes.length},billing=${totalCpus},gres/gpu=${totalGpus}\n`;

        return { output, exitCode: 0 };
      }

      if (what === "config" || what === "configuration") {
        let output = "Configuration data as of 2024-01-11T12:00:00\n";
        output += "AccountingStorageBackupHost = (null)\n";
        output += "AccountingStorageEnforce = associations,limits,qos,safe\n";
        output += "AccountingStorageHost = localhost\n";
        output += "AccountingStorageParameters = (null)\n";
        output += "AccountingStoragePort = 6819\n";
        output += "AccountingStorageType = accounting_storage/slurmdbd\n";
        output += "AccountingStoreFlags = job_comment,job_env,job_script\n";
        output += "ClusterName = dgx-cluster\n";
        output += "ControlMachine = dgx-00\n";
        output += "DefMemPerCPU = 1024\n";
        output += "GresTypes = gpu\n";
        output += "MaxJobCount = 10000\n";
        output += "MaxStepCount = 40000\n";
        output += "PriorityType = priority/multifactor\n";
        output += "ProctrackType = proctrack/cgroup\n";
        output += "SchedulerType = sched/backfill\n";
        output += "SelectType = select/cons_tres\n";
        output += "SelectTypeParameters = CR_Core_Memory\n";
        output += "SlurmUser = slurm\n";
        output += "SLURM_CONF = /etc/slurm/slurm.conf\n";
        output += "SLURM_VERSION = 23.02.6\n";
        output += "StateSaveLocation = /var/spool/slurmctld\n";
        output += "TaskPlugin = task/affinity,task/cgroup\n";
        return { output, exitCode: 0 };
      }
    }

    if (command === "update") {
      // Find NodeName= in positional args or subcommands
      const nodeArg = parsed.positionalArgs.find((a) =>
        a.toLowerCase().startsWith("nodename="),
      );
      const stateArg = parsed.positionalArgs.find((a) =>
        a.toLowerCase().startsWith("state="),
      );
      const reasonArg = parsed.positionalArgs.find((a) =>
        a.toLowerCase().startsWith("reason="),
      );

      if (!nodeArg) {
        return this.createError("Error: NodeName not specified");
      }

      const nodeName = nodeArg.split("=")[1];
      const state = stateArg ? stateArg.split("=")[1].toLowerCase() : null;
      const reason = reasonArg
        ? reasonArg.split("=")[1].replace(/"/g, "")
        : undefined;

      const validStates = ["idle", "drain", "resume", "down"];
      if (state && !validStates.includes(state)) {
        return this.createError(
          `Error: Invalid state "${state}". Valid: ${validStates.join(", ")}`,
        );
      }

      if ((state === "drain" || state === "down") && !reason) {
        return this.createError(
          'Error: A Reason must be specified when setting State=DRAIN or State=DOWN (e.g. Reason="Scheduled maintenance")',
        );
      }

      const nodes = this.resolveAllNodes(context);
      const node = nodes.find((n) => n.id === nodeName);

      if (!node) {
        return this.createError(`Error: Node ${nodeName} not found`);
      }

      if (state) {
        // Map scontrol states to store-compatible states
        const stateMap: Record<string, "idle" | "alloc" | "drain" | "down"> = {
          resume: "idle",
          idle: "idle",
          allocated: "alloc",
          mixed: "alloc",
          down: "down",
          drain: "drain",
          maint: "drain",
        };
        const mappedState = stateMap[state] || "idle";
        this.resolveMutator(context).setSlurmState(
          nodeName,
          mappedState,
          reason,
        );
      }

      return this.createSuccess(`Node ${nodeName} updated successfully`);
    }

    return this.createError(
      "Usage: scontrol <show|update> <nodes|node|partition> [options]",
    );
  }

  // sbatch - Submit batch job
  executeSbatch(parsed: ParsedCommand, context: CommandContext): CommandResult {
    parsed = this.parseWithSchema(parsed.raw);
    // Handle --help or bare "help" argument
    if (
      this.hasAnyFlag(parsed, ["help"]) ||
      parsed.positionalArgs[0] === "help" ||
      parsed.subcommands[0] === "help"
    ) {
      return (
        this.getHelpFromRegistry("sbatch", parsed) ||
        this.createError("Help not available")
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("slurm 23.02.6");
    }

    // Validate flags using registry (after help/version)
    const flagError = this.validateFlagsWithRegistry(parsed, "sbatch");
    if (flagError) return flagError;

    if (parsed.positionalArgs.length === 0 && parsed.subcommands.length === 0) {
      return this.createError("Error: Batch script not specified");
    }

    const scriptPath = parsed.positionalArgs[0] || parsed.subcommands[0];
    const jobId = this.nextJobId++;

    // Parse all job options
    const jobName =
      this.getFlagString(parsed, ["J", "job-name"]) ||
      scriptPath.split("/").pop()?.replace(".sh", "") ||
      "job";
    const partition = this.getFlagString(parsed, ["p", "partition"]) || "gpu";
    const timeLimit = this.getFlagString(parsed, ["t", "time"]) || "infinite";
    const nodesCount = this.getFlagNumber(parsed, ["N", "nodes"], 1);
    const ntasks = this.getFlagNumber(parsed, ["n", "ntasks"], 1);
    const cpusPerTask = this.getFlagNumber(parsed, ["c", "cpus-per-task"], 1);
    const memorySpec = this.getFlagString(parsed, ["mem"]) || "16G";
    const account = this.getFlagString(parsed, ["A", "account"]) || "default";
    const qos = this.getFlagString(parsed, ["qos"]) || "normal";
    const dependency = this.getFlagString(parsed, ["d", "dependency"]);
    const arraySpec = this.getFlagString(parsed, ["array"]);

    // Parse GPU count from gres or gpus flag
    const gresValue = this.getFlagString(parsed, ["gres"]);
    let gpuCount = 0;
    if (gresValue && gresValue.includes("gpu")) {
      // Handle formats: gpu:4, gpu:h100:4, gpu:h100:8(S:0-1)
      const match = gresValue.match(/gpu(?::[a-z0-9]+)?:(\d+)/i);
      if (match) gpuCount = parseInt(match[1]);
    }
    const gpusFlagValue = this.getFlagNumber(parsed, ["gpus"], 0);
    const gpusPerNode = this.getFlagNumber(parsed, ["gpus-per-node"], 0);
    const gpusPerTask = this.getFlagNumber(parsed, ["gpus-per-task"], 0);
    if (gpusFlagValue > 0) gpuCount = gpusFlagValue;
    if (gpusPerNode > 0) gpuCount = gpusPerNode * nodesCount;
    if (gpusPerTask > 0) gpuCount = gpusPerTask * ntasks;
    if (gpuCount === 0) gpuCount = 1; // Default to 1 GPU

    // Validate dependency if specified
    let dependencyValid = true;
    let reasonPending = "Resources";
    if (dependency) {
      const depMatch = dependency.match(
        /^(after|afterok|afternotok|afterany|singleton)(?::(\d+))?$/,
      );
      if (!depMatch) {
        return this.createError(
          `Error: Invalid dependency specification: ${dependency}`,
        );
      }
      const depType = depMatch[1];
      const depJobId = depMatch[2] ? parseInt(depMatch[2]) : null;

      if (depType !== "singleton" && depJobId) {
        const depJob = this.jobs.find((j) => j.jobId === depJobId);
        if (!depJob) {
          return this.createError(
            `Error: Dependency job ${depJobId} not found`,
          );
        }
        reasonPending = `Dependency`;
        // Check if dependency is satisfied
        if (depType === "afterok" && depJob.state !== "COMPLETED") {
          dependencyValid = false;
        } else if (depType === "afternotok" && depJob.state !== "FAILED") {
          dependencyValid = false;
        } else if (
          (depType === "after" || depType === "afterany") &&
          depJob.state !== "RUNNING" &&
          depJob.state !== "COMPLETED" &&
          depJob.state !== "FAILED"
        ) {
          dependencyValid = false;
        }
      } else if (depType === "singleton") {
        // Check if any job with same name is running
        const runningWithSameName = this.jobs.find(
          (j) => j.name === jobName && j.state === "RUNNING",
        );
        if (runningWithSameName) {
          dependencyValid = false;
          reasonPending = "DependencyNeverSatisfied";
        }
      }
    }

    const job: SlurmJob = {
      jobId,
      partition,
      name: jobName,
      user: "root",
      state: "PENDING",
      time: "0:00",
      timeLimit,
      nodes: nodesCount,
      nodelist: "",
      cpus: ntasks * cpusPerTask,
      gpus: gpuCount,
      memory: memorySpec,
      submitTime: new Date(),
      priority: 1000 + Math.floor(Math.random() * 100),
      account,
      qos,
      workDir: "/home/root",
      command: scriptPath,
      dependency,
      reasonPending,
    };

    // Handle array jobs
    if (arraySpec) {
      const arrayMatch = arraySpec.match(/^(\d+)-(\d+)(?:%(\d+))?$/);
      if (arrayMatch) {
        const start = parseInt(arrayMatch[1]);
        const end = parseInt(arrayMatch[2]);
        // Create array master job
        job.name = `${jobName}_[${start}-${end}]`;
        // For simulation, we'll just note it's an array job
      }
    }

    this.jobs.push(job);

    // Schedule job to run (if no blocking dependency)
    if (dependencyValid || !dependency) {
      setTimeout(() => {
        const currentJob = this.jobs.find((j) => j.jobId === jobId);
        if (!currentJob || currentJob.state !== "PENDING") return;

        const cluster = this.resolveCluster(context);
        if (!cluster?.nodes) return;
        const nodes = cluster.nodes;
        const availableNode = nodes.find((n) => n.slurmState === "idle");

        if (availableNode) {
          currentJob.state = "RUNNING";
          currentJob.nodelist = availableNode.id;
          currentJob.startTime = new Date();
          currentJob.reasonPending = undefined;

          // Allocate GPUs with utilization update (cross-tool sync via StateMutator)
          const mutator = this.resolveMutator(context);
          const gpuIds = availableNode.gpus.slice(0, gpuCount).map((g) => g.id);
          mutator.allocateGPUsForJob(availableNode.id, gpuIds, jobId, 85);
          mutator.setSlurmState(availableNode.id, "alloc");
        } else {
          currentJob.reasonPending = "Resources";
        }
      }, 100);
    }

    let output = `Submitted batch job ${jobId}`;
    if (dependency) {
      output += ` with dependency ${dependency}`;
    }
    output += "\n";

    return this.createSuccess(output);
  }

  // srun - Run job interactively
  executeSrun(parsed: ParsedCommand, context: CommandContext): CommandResult {
    parsed = this.parseWithSchema(parsed.raw);
    // Handle --help or bare "help" argument
    if (
      this.hasAnyFlag(parsed, ["help"]) ||
      parsed.positionalArgs[0] === "help" ||
      parsed.subcommands[0] === "help"
    ) {
      return (
        this.getHelpFromRegistry("srun", parsed) ||
        this.createError("Help not available")
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("slurm 23.02.6");
    }

    // Validate flags using registry (after help/version)
    const flagError = this.validateFlagsWithRegistry(parsed, "srun");
    if (flagError) return flagError;

    // Mirror sbatch's GPU-count precedence: --gpus, then --gpus-per-node
    // (scaled by -N/--nodes), then --gpus-per-task (scaled by -n/--ntasks).
    const nodesRequested = this.getFlagNumber(parsed, ["N", "nodes"], 1);
    const ntasks = this.getFlagNumber(parsed, ["n", "ntasks"], 1);
    const gpusFlagValue = this.getFlagNumber(parsed, ["gpus"], 0);
    const gpusPerNode = this.getFlagNumber(parsed, ["gpus-per-node"], 0);
    const gpusPerTask = this.getFlagNumber(parsed, ["gpus-per-task"], 0);
    let gpuCount = 1;
    if (gpusFlagValue > 0) gpuCount = gpusFlagValue;
    if (gpusPerNode > 0) gpuCount = gpusPerNode * nodesRequested;
    if (gpusPerTask > 0) gpuCount = gpusPerTask * ntasks;
    const containerImage = this.getFlagString(parsed, ["container-image"]);

    const nodes = this.resolveAllNodes(context);
    let chosenNodes: DGXNode[];
    if (nodesRequested <= 1) {
      const availableNode = nodes.find(
        (n) => n.slurmState === "idle" && n.gpus.length >= gpuCount,
      );
      chosenNodes = availableNode ? [availableNode] : [];
    } else {
      const idleNodes = nodes
        .filter((n) => n.slurmState === "idle")
        .slice(0, nodesRequested);
      const combinedGpus = idleNodes.reduce((sum, n) => sum + n.gpus.length, 0);
      chosenNodes =
        idleNodes.length >= nodesRequested && combinedGpus >= gpuCount
          ? idleNodes
          : [];
    }

    if (chosenNodes.length === 0) {
      return {
        output:
          "srun: error: Unable to allocate resources: Requested node configuration is not available\n",
        exitCode: 1,
      };
    }
    const firstNode = chosenNodes[0];

    const jobId = this.nextJobId++;
    let output = "";

    if (containerImage) {
      output += `srun: Pulling container image ${containerImage}...\n`;
      output += `srun: Container ready\n`;
    }

    output += `srun: job ${jobId} queued and waiting for resources\n`;
    output += `srun: job ${jobId} has been allocated resources\n`;

    const command = parsed.positionalArgs.join(" ");

    if (command.includes("nvidia-smi")) {
      output += "\n";
      if (chosenNodes.length > 1) {
        output += `Allocated ${gpuCount} GPU(s) across ${chosenNodes.length} nodes: ${compressHostlist(chosenNodes.map((n) => n.id))}\n`;
      } else {
        output += `Allocated ${gpuCount} GPU(s) from ${firstNode.id}\n`;
      }
      output += `GPU 0: ${firstNode.gpus[0].name}\n`;
    } else if (command) {
      output += `\nExecuting: ${command}\n`;
      output += `Job completed successfully\n`;
    }

    // srun blocks in the foreground and releases its node the moment the
    // command finishes -- there's no later point at which anything else
    // in this sim would observe it as still running. It's recorded here
    // so a subsequent squeue in the same session shows real job history
    // instead of nothing at all (SIM-21).
    const job: SlurmJob = {
      jobId,
      partition: this.getFlagString(parsed, ["p", "partition"]) || "gpu",
      name: command.split(" ")[0] || "interactive",
      user: "root",
      state: "COMPLETED",
      time: "0:00",
      timeLimit: "infinite",
      nodes: chosenNodes.length,
      nodelist: compressHostlist(chosenNodes.map((n) => n.id)),
      cpus: this.getFlagNumber(parsed, ["c", "cpus-per-task"], 1),
      gpus: gpuCount,
      memory: this.getFlagString(parsed, ["mem"]) || "16G",
      submitTime: new Date(),
      startTime: new Date(),
      endTime: new Date(),
      priority: 1000 + Math.floor(Math.random() * 100),
      account: "default",
      qos: "normal",
      workDir: "/home/root",
      command: command || "(interactive)",
    };
    this.jobs.push(job);

    return { output, exitCode: 0 };
  }

  // scancel - Cancel job
  executeScancel(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    // Pass "scancel" explicitly: this simulator's metadata name is
    // "slurm", which has no registry definition, so without the override
    // the heuristic parser would let boolean flags like -v swallow the
    // job ID as their value ("scancel -v 2001" -> no job ID).
    parsed = this.parseWithSchema(parsed.raw, "scancel");
    // Handle --help or bare "help" argument
    if (
      this.hasAnyFlag(parsed, ["help"]) ||
      parsed.positionalArgs[0] === "help" ||
      parsed.subcommands[0] === "help"
    ) {
      return (
        this.getHelpFromRegistry("scancel", parsed) ||
        this.createError("Help not available")
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("slurm 23.02.6");
    }

    // Validate flags using registry (after help/version)
    const flagError = this.validateFlagsWithRegistry(parsed, "scancel");
    if (flagError) return flagError;

    if (parsed.positionalArgs.length === 0 && parsed.subcommands.length === 0) {
      return this.createError("Error: Job ID not specified");
    }

    const jobId = parseInt(parsed.positionalArgs[0] || parsed.subcommands[0]);
    const jobIdx = this.jobs.findIndex((j) => j.jobId === jobId);

    if (jobIdx === -1) {
      return this.createError(
        `scancel: error: Kill job error on job id ${jobId}: Invalid job id specified`,
      );
    }

    const job = this.jobs[jobIdx];

    if (job.state === "RUNNING" && job.nodelist !== "(Resources)") {
      // Deallocate GPUs (cross-tool sync via StateMutator)
      const mutator = this.resolveMutator(context);
      mutator.deallocateGPUsForJob(job.jobId);
      mutator.setSlurmState(job.nodelist, "idle");
    }

    this.jobs.splice(jobIdx, 1);

    // Real scancel is silent on success; the confirmation line only
    // appears with -v/--verbose (SIM-28).
    const verbose = this.hasAnyFlag(parsed, ["v", "verbose"]);
    return verbose
      ? this.createSuccess(`scancel: Terminating job ${jobId}`)
      : { output: "", exitCode: 0 };
  }

  // sacctmgr - Accounting management
  executeSacctmgr(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    parsed = this.parseWithSchema(parsed.raw);
    // Handle --help
    if (this.hasAnyFlag(parsed, ["help"])) {
      let output = "Usage: sacctmgr [COMMAND] [OPTIONS]\n\n";
      output += "Commands:\n";
      output += "  show    Display accounting information\n";
      output += "  add     Add accounting entities\n";
      output += "  modify  Modify accounting entities\n";
      output += "  delete  Delete accounting entities\n\n";
      output += "Entities:\n";
      output += "  assoc|associations  Account/user associations\n";
      output += "  account             Accounts\n";
      output += "  cluster             Clusters\n";
      output += "  qos                 Quality of Service\n";
      output += "  user                Users\n";
      return this.createSuccess(output);
    }

    // Handle --version / -V
    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("slurm 23.02.6");
    }

    const command = parsed.subcommands[0];

    if (command === "show") {
      const entity = parsed.subcommands[1] || parsed.positionalArgs[0];

      if (entity === "assoc" || entity === "associations") {
        return this.showAssociations();
      }

      if (entity === "account" || entity === "accounts") {
        return this.showAccounts();
      }

      if (entity === "qos") {
        return this.showQos();
      }

      if (entity === "cluster" || entity === "clusters") {
        return this.showClusters();
      }

      return this.createError(
        "Usage: sacctmgr show <assoc|account|qos|cluster>",
      );
    }

    if (!command) {
      return this.createError(
        "Usage: sacctmgr <show|add|modify|delete> <entity> [options]",
      );
    }

    // add/modify/delete stubs
    if (command === "add" || command === "modify" || command === "delete") {
      const entity = parsed.subcommands[1] || parsed.positionalArgs[0] || "";
      return this.createSuccess(
        `sacctmgr: ${command} ${entity} - operation completed successfully`,
      );
    }

    return this.createError(
      `sacctmgr: unknown command '${command}'. Try 'sacctmgr --help'.`,
    );
  }

  private showAssociations(): CommandResult {
    const COL_CLUSTER = 11;
    const COL_ACCOUNT = 11;
    const COL_USER = 11;
    const COL_PARTITION = 11;
    const COL_SHARE = 10;
    const COL_GRPTRES = 14;
    const COL_GRPJOBS = 8;
    const COL_GRPSUBMIT = 10;
    const COL_MAXTRES = 14;
    const COL_MAXJOBS = 8;
    const COL_MAXSUBMIT = 10;

    let output =
      "Cluster".padEnd(COL_CLUSTER) +
      "Account".padEnd(COL_ACCOUNT) +
      "User".padEnd(COL_USER) +
      "Partition".padEnd(COL_PARTITION) +
      "Share".padEnd(COL_SHARE) +
      "GrpTRES".padEnd(COL_GRPTRES) +
      "GrpJobs".padEnd(COL_GRPJOBS) +
      "GrpSubmit".padEnd(COL_GRPSUBMIT) +
      "MaxTRES".padEnd(COL_MAXTRES) +
      "MaxJobs".padEnd(COL_MAXJOBS) +
      "MaxSubmit".padEnd(COL_MAXSUBMIT) +
      "QOS\n";

    output +=
      "-".repeat(COL_CLUSTER - 1) +
      " " +
      "-".repeat(COL_ACCOUNT - 1) +
      " " +
      "-".repeat(COL_USER - 1) +
      " " +
      "-".repeat(COL_PARTITION - 1) +
      " " +
      "-".repeat(COL_SHARE - 1) +
      " " +
      "-".repeat(COL_GRPTRES - 1) +
      " " +
      "-".repeat(COL_GRPJOBS - 1) +
      " " +
      "-".repeat(COL_GRPSUBMIT - 1) +
      " " +
      "-".repeat(COL_MAXTRES - 1) +
      " " +
      "-".repeat(COL_MAXJOBS - 1) +
      " " +
      "-".repeat(COL_MAXSUBMIT - 1) +
      " " +
      "-".repeat(9) +
      "\n";

    // Root account
    output +=
      "dgx-clus".padEnd(COL_CLUSTER) +
      "root".padEnd(COL_ACCOUNT) +
      "".padEnd(COL_USER) +
      "".padEnd(COL_PARTITION) +
      "1".padEnd(COL_SHARE) +
      "".padEnd(COL_GRPTRES) +
      "".padEnd(COL_GRPJOBS) +
      "".padEnd(COL_GRPSUBMIT) +
      "".padEnd(COL_MAXTRES) +
      "".padEnd(COL_MAXJOBS) +
      "".padEnd(COL_MAXSUBMIT) +
      "normal\n";

    // Root user
    output +=
      "dgx-clus".padEnd(COL_CLUSTER) +
      "root".padEnd(COL_ACCOUNT) +
      "root".padEnd(COL_USER) +
      "".padEnd(COL_PARTITION) +
      "1".padEnd(COL_SHARE) +
      "".padEnd(COL_GRPTRES) +
      "".padEnd(COL_GRPJOBS) +
      "".padEnd(COL_GRPSUBMIT) +
      "".padEnd(COL_MAXTRES) +
      "".padEnd(COL_MAXJOBS) +
      "".padEnd(COL_MAXSUBMIT) +
      "normal\n";

    // Compute account
    output +=
      "dgx-clus".padEnd(COL_CLUSTER) +
      "compute".padEnd(COL_ACCOUNT) +
      "".padEnd(COL_USER) +
      "".padEnd(COL_PARTITION) +
      "1".padEnd(COL_SHARE) +
      "gpu=64".padEnd(COL_GRPTRES) +
      "".padEnd(COL_GRPJOBS) +
      "".padEnd(COL_GRPSUBMIT) +
      "gpu=16".padEnd(COL_MAXTRES) +
      "".padEnd(COL_MAXJOBS) +
      "".padEnd(COL_MAXSUBMIT) +
      "normal\n";

    // Admin user in compute account
    output +=
      "dgx-clus".padEnd(COL_CLUSTER) +
      "compute".padEnd(COL_ACCOUNT) +
      "admin".padEnd(COL_USER) +
      "gpu-batch".padEnd(COL_PARTITION) +
      "1".padEnd(COL_SHARE) +
      "gpu=16".padEnd(COL_GRPTRES) +
      "".padEnd(COL_GRPJOBS) +
      "".padEnd(COL_GRPSUBMIT) +
      "gpu=8".padEnd(COL_MAXTRES) +
      "".padEnd(COL_MAXJOBS) +
      "".padEnd(COL_MAXSUBMIT) +
      "normal,high\n";

    return { output, exitCode: 0 };
  }

  private showAccounts(): CommandResult {
    let output = "Account                Descr                  Org\n";
    output += "---------- -------------------- --------------------\n";
    output += "root       root account          root\n";
    output += "compute    GPU compute account   engineering\n";
    output += "research   Research team          research\n";
    output += "training   ML training account   engineering\n";
    return { output, exitCode: 0 };
  }

  private showQos(): CommandResult {
    let output =
      "Name           Priority GraceTime   Preempt PreemptExemptTime PreemptMode MaxTRES     MaxTRESPerUser MaxJobsPU MaxSubmitPU MaxWall\n";
    output +=
      "-------------- -------- --------- --------- ----------------- ----------- ----------- -------------- --------- ----------- -----------\n";
    output +=
      "normal                0  00:00:00                               cluster                                                    7-00:00:00\n";
    output +=
      "high               100  00:00:00                               cluster     gpu=32                          10          20  1-00:00:00\n";
    output +=
      "low                  0  00:00:00                               cluster                                     5          10  3-00:00:00\n";
    return { output, exitCode: 0 };
  }

  private showClusters(): CommandResult {
    let output =
      "Cluster    ControlHost  ControlPort   RPC     Share GrpJobs       GrpTRES GrpSubmit MaxJobs       MaxTRES MaxSubmit     MaxWall                  QOS   Def QOS\n";
    output +=
      "---------- ------------ ------------ ----- --------- ------- ------------- --------- ------- ------------- --------- ----------- -------------------- ---------\n";
    output +=
      "dgx-clus   10.0.0.1             6817  9728         1                                                                                         normal    normal\n";
    return { output, exitCode: 0 };
  }

  // sacct - Job accounting
  executeSacct(parsed: ParsedCommand, _context: CommandContext): CommandResult {
    parsed = this.parseWithSchema(parsed.raw);
    // Handle --help
    if (this.hasAnyFlag(parsed, ["help"])) {
      return (
        this.getHelpFromRegistry("sacct", parsed) ||
        this.createError("Help not available")
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("slurm 23.02.6");
    }

    // Validate flags using registry (after help/version)
    const flagError = this.validateFlagsWithRegistry(parsed, "sacct");
    if (flagError) return flagError;

    // SOURCE OF TRUTH: Column widths
    const COL_JOBID = 13;
    const COL_JOBNAME = 11;
    const COL_PARTITION = 11;
    const COL_ACCOUNT = 11;
    const COL_ALLOCCPUS = 11;
    const COL_STATE = 11;
    const COL_EXITCODE = 9;

    const jobId = this.getFlagNumber(parsed, ["j", "jobs"], 0);

    let output =
      "JobID".padEnd(COL_JOBID) +
      "JobName".padEnd(COL_JOBNAME) +
      "Partition".padEnd(COL_PARTITION) +
      "Account".padEnd(COL_ACCOUNT) +
      "AllocCPUS".padEnd(COL_ALLOCCPUS) +
      "State".padEnd(COL_STATE) +
      "ExitCode\n";

    output +=
      "-".repeat(COL_JOBID - 1) +
      " " +
      "-".repeat(COL_JOBNAME - 1) +
      " " +
      "-".repeat(COL_PARTITION - 1) +
      " " +
      "-".repeat(COL_ACCOUNT - 1) +
      " " +
      "-".repeat(COL_ALLOCCPUS - 1) +
      " " +
      "-".repeat(COL_STATE - 1) +
      " " +
      "-".repeat(COL_EXITCODE - 1) +
      "\n";

    const jobsToShow =
      jobId !== 0
        ? this.jobs.filter((j) => j.jobId === jobId)
        : this.jobs.slice(-10);

    jobsToShow.forEach((job) => {
      const exitCode =
        job.state === "COMPLETED" ? "0:0" : job.state === "FAILED" ? "1:0" : "";
      output +=
        job.jobId.toString().padEnd(COL_JOBID) +
        job.name.padEnd(COL_JOBNAME) +
        job.partition.padEnd(COL_PARTITION) +
        "root".padEnd(COL_ACCOUNT) +
        (job.nodes * 128).toString().padEnd(COL_ALLOCCPUS) +
        job.state.padEnd(COL_STATE) +
        exitCode +
        "\n";
    });

    return { output, exitCode: 0 };
  }
}
