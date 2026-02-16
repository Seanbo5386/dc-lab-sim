import React, { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import "xterm/css/xterm.css";
import type { CommandContext } from "@/types/commands";
import { NvidiaSmiSimulator } from "@/simulators/nvidiaSmiSimulator";
import { DcgmiSimulator } from "@/simulators/dcgmiSimulator";
import { IpmitoolSimulator } from "@/simulators/ipmitoolSimulator";
import { InfiniBandSimulator } from "@/simulators/infinibandSimulator";
import { NvsmSimulator } from "@/simulators/nvsmSimulator";
import { MellanoxSimulator } from "@/simulators/mellanoxSimulator";
import { SlurmSimulator } from "@/simulators/slurmSimulator";
import { ContainerSimulator } from "@/simulators/containerSimulator";
import { BcmSimulator } from "@/simulators/bcmSimulator";
import { CmshSimulator } from "@/simulators/cmshSimulator";
import { BasicSystemSimulator } from "@/simulators/basicSystemSimulator";
import { PciToolsSimulator } from "@/simulators/pciToolsSimulator";
import { BenchmarkSimulator } from "@/simulators/benchmarkSimulator";
import { StorageSimulator } from "@/simulators/storageSimulator";
import { NvlinkAuditSimulator } from "@/simulators/nvlinkAuditSimulator";
import { FabricManagerSimulator } from "@/simulators/fabricManagerSimulator";
import { NvidiaBugReportSimulator } from "@/simulators/nvidiaBugReportSimulator";
import { ClusterKitSimulator } from "@/simulators/clusterKitSimulator";
import { NeMoSimulator } from "@/simulators/nemoSimulator";
import { LinuxUtilsSimulator } from "@/simulators/linuxUtilsSimulator";
import { useSimulationStore } from "@/store/simulationStore";
import { scenarioContextManager } from "@/store/scenarioContext";
import { logger } from "@/utils/logger";
import { ScenarioValidator } from "@/utils/scenarioValidator";
import { parse as parseCommand } from "@/utils/commandParser";
import {
  handleInteractiveShellInput,
  shouldEnterInteractiveMode,
  type ShellState,
} from "@/utils/interactiveShellHandler";
import {
  TERMINAL_OPTIONS,
  generateWelcomeMessage,
} from "@/constants/terminalConfig";
import { handleKeyboardInput } from "@/utils/terminalKeyboardHandler";
import { useLabFeedback } from "@/hooks/useLabFeedback";
import { HintManager } from "@/utils/hintManager";
import { getCommandMetadata } from "@/utils/commandMetadata";
import {
  formatCommandHelp,
  formatCommandList,
  getDidYouMeanMessage,
} from "@/utils/commandSuggestions";
import { applyPipeFilters, hasPipes } from "@/utils/pipeHandler";
import { CommandRouter } from "@/cli/commandRouter";

// Helper function to format practice exercises
function formatPracticeExercises(
  exercises: Array<{
    id: string;
    prompt: string;
    expectedCommand: string;
    hints: string[];
    difficulty: string;
    category: string;
    relatedCommand: string;
  }>,
): string {
  if (exercises.length === 0) {
    return "No exercises available.";
  }

  let output =
    "\x1b[1;36m═════════════════════════════════════════════\x1b[0m\n";
  output += "\x1b[1;33m        COMMAND PRACTICE EXERCISES\x1b[0m\n";
  output +=
    "\x1b[1;36m═════════════════════════════════════════════\x1b[0m\n\n";

  exercises.forEach((exercise, index) => {
    const difficultyColor =
      exercise.difficulty === "beginner"
        ? "32"
        : exercise.difficulty === "intermediate"
          ? "33"
          : "31";

    output += `\x1b[1;37m[Exercise ${index + 1}]\x1b[0m \x1b[${difficultyColor}m(${exercise.difficulty})\x1b[0m\n`;
    output += `\x1b[1;34mCategory:\x1b[0m ${exercise.category}\n`;
    output += `\x1b[1;34mRelated Command:\x1b[0m ${exercise.relatedCommand}\n\n`;
    output += `\x1b[1;37mTask:\x1b[0m ${exercise.prompt}\n\n`;
    output += `\x1b[1;33mHints:\x1b[0m\n`;
    exercise.hints.forEach((hint, i) => {
      output += `  ${i + 1}. ${hint}\n`;
    });
    output += `\n\x1b[2mExpected: ${exercise.expectedCommand}\x1b[0m\n`;
    output +=
      "\n\x1b[1;36m─────────────────────────────────────────────\x1b[0m\n\n";
  });

  output +=
    "\x1b[2mUsage: practice [random|beginner|intermediate|advanced|category <cat>|<command>]\x1b[0m\n";

  return output;
}

interface TerminalProps {
  className?: string;
}

export const Terminal: React.FC<TerminalProps> = ({ className = "" }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const [, setCurrentCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const [shellState, setShellState] = useState<ShellState>({
    mode: "bash",
    prompt: "",
  });
  const selectedNode = useSimulationStore((state) => state.selectedNode);
  const cluster = useSimulationStore((state) => state.cluster);
  const initialNode = selectedNode || cluster.nodes[0]?.id || "dgx-00";
  const [connectedNode, setConnectedNode] = useState<string>(initialNode);

  // Ref to store executeCommand for external calls (e.g., auto-SSH on node selection)
  const executeCommandRef = useRef<((cmd: string) => Promise<void>) | null>(
    null,
  );

  // Command simulators
  const nvidiaSmiSimulator = useRef(new NvidiaSmiSimulator());
  const dcgmiSimulator = useRef(new DcgmiSimulator());
  const ipmitoolSimulator = useRef(new IpmitoolSimulator());
  const infinibandSimulator = useRef(new InfiniBandSimulator());
  const nvsmSimulator = useRef(new NvsmSimulator());
  const mellanoxSimulator = useRef(new MellanoxSimulator());
  const slurmSimulator = useRef(new SlurmSimulator());
  const containerSimulator = useRef(new ContainerSimulator());
  const bcmSimulator = useRef(new BcmSimulator());
  const cmshSimulator = useRef(new CmshSimulator());
  const basicSystemSimulator = useRef(new BasicSystemSimulator());
  const pciToolsSimulator = useRef(new PciToolsSimulator());
  const benchmarkSimulator = useRef(new BenchmarkSimulator());
  const storageSimulator = useRef(new StorageSimulator());
  const nvlinkAuditSimulator = useRef(new NvlinkAuditSimulator());
  const fabricManagerSimulator = useRef(new FabricManagerSimulator());
  const nvidiaBugReportSimulator = useRef(new NvidiaBugReportSimulator());
  const clusterKitSimulator = useRef(new ClusterKitSimulator());
  const nemoSimulator = useRef(new NeMoSimulator());
  const linuxUtilsSimulator = useRef(new LinuxUtilsSimulator());

  const currentContext = useRef<CommandContext>({
    currentNode: selectedNode || cluster.nodes[0]?.id || "dgx-00",
    currentPath: "/root",
    environment: {
      PATH: "/usr/local/cuda/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      HOME: "/root",
      USER: "root",
    },
    history: [],
  });

  // Auto-SSH when node selection changes from Dashboard
  useEffect(() => {
    // Only auto-SSH if:
    // 1. Terminal is ready with all refs available
    // 2. Selected node is different from currently connected node
    // 3. We're not in an interactive shell mode
    // Note: We check selectedNode !== connectedNode to allow first click to work
    // (previousNodeRef check removed - it was preventing first click from working)
    if (
      selectedNode &&
      isTerminalReady &&
      xtermRef.current &&
      executeCommandRef.current &&
      selectedNode !== connectedNode &&
      shellState.mode === "bash"
    ) {
      const term = xtermRef.current;
      const sshCommand = `ssh ${selectedNode}`;

      // Display the SSH command being typed
      term.write(sshCommand);
      term.write("\r\n");

      // Execute the SSH command - this will update connectedNode via setConnectedNode
      executeCommandRef.current(sshCommand);
    }
  }, [selectedNode, isTerminalReady, shellState.mode, connectedNode]);

  // Manage scenario context when scenario changes
  useEffect(() => {
    const store = useSimulationStore.getState();
    if (store.activeScenario) {
      // Create or get scenario context
      const context = scenarioContextManager.getOrCreateContext(
        store.activeScenario.id,
        cluster,
      );
      scenarioContextManager.setActiveContext(store.activeScenario.id);

      // Add to command context
      currentContext.current.scenarioContext = context;
      currentContext.current.cluster = context.getCluster();

      logger.debug(
        `Terminal: Using scenario context for ${store.activeScenario.id}`,
      );
    } else {
      // Clear scenario context when no active scenario
      scenarioContextManager.setActiveContext(null);
      currentContext.current.scenarioContext = undefined;
      currentContext.current.cluster = cluster;

      logger.debug("Terminal: Cleared scenario context");
    }
  }, [cluster]);

  useEffect(() => {
    if (!terminalRef.current) return;

    let disposed = false;
    const container = terminalRef.current;

    const term = new XTerm(TERMINAL_OPTIONS);

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Safe fit function that checks container dimensions first
    const safeFit = () => {
      if (disposed || !terminalRef.current) return;
      const { clientWidth, clientHeight } = terminalRef.current;
      if (clientWidth > 0 && clientHeight > 0) {
        try {
          fitAddon.fit();

          // Subtract 1 column as safety margin for subpixel rounding.
          if (term.cols > 2) {
            term.resize(term.cols - 1, term.rows);
          }
        } catch (e) {
          // Ignore fit errors during layout transitions
        }
      }
    };

    // ResizeObserver for container resize — created early so cleanup always works
    const resizeObserver = new ResizeObserver(() => {
      safeFit();
    });

    // Suppress harmless xterm.js viewport errors during React StrictMode's
    // mount→dispose→remount cycle. The disposed terminal's pending RAF
    // accesses _renderService.dimensions which is already cleaned up.
    const handleXtermError = (event: ErrorEvent) => {
      if (
        disposed &&
        event.filename?.includes("xterm") &&
        event.message?.includes("dimensions")
      ) {
        event.preventDefault();
      }
    };
    window.addEventListener("error", handleXtermError);

    // Opens the terminal once the container has non-zero dimensions.
    // xterm's Viewport._innerRefresh accesses _renderService.dimensions
    // immediately after open(), which throws if the container has zero size.
    const openAndInit = () => {
      if (disposed) return;
      term.open(container);

      // Delay writes and resize-observer until xterm's renderer has
      // initialized dimensions (needs one animation frame after open)
      requestAnimationFrame(() => {
        if (disposed) return;
        safeFit();
        resizeObserver.observe(container);
        xtermRef.current = term;
        setIsTerminalReady(true);
        term.write(generateWelcomeMessage(term.cols));
        prompt();
        term.onData((data) => {
          const result = handleKeyboardInput(data, {
            term,
            commandHistory,
            historyIndex,
            currentLine,
            currentNode: currentContext.current.currentNode,
            onExecute: executeCommand,
            onHistoryChange: setHistoryIndex,
            onLineChange: setCurrentCommand,
            onPrompt: prompt,
          });
          if (result) {
            currentLine = result.currentLine;
            setCurrentCommand(result.currentLine);
            setHistoryIndex(result.historyIndex);
          }
        });
      });
    };

    const prompt = () => {
      if (shellState.mode === "nvsm") {
        // Use NVSM's current prompt
        term.write(`\x1b[36m${shellState.prompt || "nvsm> "}\x1b[0m`);
      } else if (shellState.mode === "cmsh") {
        term.write(
          `\x1b[36m${shellState.prompt || "[root@dgx-headnode]% "}\x1b[0m`,
        );
      } else {
        // Normal bash prompt — show ~ for /root, otherwise the full path
        const node = currentContext.current.currentNode;
        const cwd = currentContext.current.currentPath;
        const displayPath = cwd === "/root" ? "~" : cwd;
        term.write(
          `\x1b[1;32mroot@${node}\x1b[0m:\x1b[1;34m${displayPath}\x1b[0m# `,
        );
      }
    };

    // Helper function to render progress bar
    const renderProgressBar = (progress: number): string => {
      const width = 40;
      const filled = Math.round((progress / 100) * width);
      const empty = width - filled;
      const bar = "█".repeat(filled) + "░".repeat(empty);
      return `\x1b[36mProgress: [${bar}] ${progress}%\x1b[0m`;
    };

    let currentLine = "";

    // ----- Build command router (once per mount) -----
    const router = new CommandRouter();

    // Built-in commands
    router.register("help", async (cl) => {
      const args = cl.trim().split(/\s+/).slice(1);
      const cols = term.cols || 80;
      if (args.length === 0) {
        return { output: formatCommandList(cols), exitCode: 0 };
      }
      try {
        const { getCommandDefinitionRegistry, generateHelpOutput } =
          await import("@/cli");
        const registry = await getCommandDefinitionRegistry();
        const learningMeta = getCommandMetadata(args[0]);
        const output = await generateHelpOutput(
          args.join(" "),
          registry,
          {
            includeErrors: true,
            includeExamples: true,
            includePermissions: true,
            cols,
          },
          learningMeta,
        );
        return { output, exitCode: 0 };
      } catch {
        const metadata = getCommandMetadata(args[0]);
        if (metadata) {
          return { output: formatCommandHelp(metadata, cols), exitCode: 0 };
        }
        let output = `\x1b[33mNo help available for '\x1b[36m${args[0]}\x1b[33m'.\x1b[0m`;
        const suggestion = getDidYouMeanMessage(args[0]);
        if (suggestion) output += "\n\n" + suggestion;
        output += `\n\nType \x1b[36mhelp\x1b[0m to see all available commands.`;
        return { output, exitCode: 0 };
      }
    });

    router.register("practice", async (cl) => {
      const args = cl.trim().split(/\s+/).slice(1);
      try {
        const { getCommandDefinitionRegistry, CommandExerciseGenerator } =
          await import("@/cli");
        const registry = await getCommandDefinitionRegistry();
        const generator = new CommandExerciseGenerator(registry);
        const subcommand = args[0];

        if (!subcommand || subcommand === "random") {
          return {
            output: formatPracticeExercises(generator.getRandomExercises(3)),
            exitCode: 0,
          };
        } else if (
          subcommand === "beginner" ||
          subcommand === "intermediate" ||
          subcommand === "advanced"
        ) {
          return {
            output: formatPracticeExercises(
              generator.generateByDifficulty(subcommand, 3),
            ),
            exitCode: 0,
          };
        } else if (subcommand === "category") {
          const category = args[1];
          if (!category) {
            return {
              output: `Usage: practice category <category>\n\nAvailable categories: gpu_management, diagnostics, cluster_management, networking, containers, storage`,
              exitCode: 0,
            };
          }
          return {
            output: formatPracticeExercises(
              generator.generateForCategory(category, 3),
            ),
            exitCode: 0,
          };
        } else {
          const exercises = generator.generateForCommand(subcommand);
          if (exercises.length === 0) {
            return {
              output: `No exercises found for command: ${subcommand}\n\nTry: practice random, practice beginner, or practice category gpu_management`,
              exitCode: 0,
            };
          }
          return {
            output: formatPracticeExercises(exercises.slice(0, 3)),
            exitCode: 0,
          };
        }
      } catch (error) {
        return {
          output: `Error generating exercises: ${error instanceof Error ? error.message : "Unknown error"}`,
          exitCode: 1,
        };
      }
    });

    router.register("ssh", (cl) => {
      const args = cl.trim().split(/\s+/).slice(1);
      if (args.length === 0) {
        return {
          output:
            "\x1b[33mUsage: ssh <hostname>\x1b[0m\n\nAvailable nodes:\n" +
            cluster.nodes
              .map((n) => `  \x1b[36m${n.id}\x1b[0m - ${n.systemType}`)
              .join("\n"),
          exitCode: 0,
        };
      }
      const targetNode = args[0];
      const nodeExists = cluster.nodes.some((n) => n.id === targetNode);
      if (!nodeExists) {
        return {
          output: `\x1b[31mssh: Could not resolve hostname ${targetNode}: Name or service not known\x1b[0m`,
          exitCode: 1,
        };
      }
      if (targetNode === currentContext.current.currentNode) {
        return {
          output: `\x1b[33mAlready connected to ${targetNode}\x1b[0m`,
          exitCode: 0,
        };
      }
      const oldNode = currentContext.current.currentNode;
      currentContext.current.currentNode = targetNode;
      setConnectedNode(targetNode);
      useSimulationStore.getState().selectNode(targetNode);
      return {
        output:
          `\x1b[32mConnecting to ${targetNode}...\x1b[0m\n` +
          `\x1b[90mThe authenticity of host '${targetNode} (10.0.0.${cluster.nodes.findIndex((n) => n.id === targetNode) + 1})' was established.\x1b[0m\n` +
          `\x1b[32mConnection established.\x1b[0m\n` +
          `\x1b[90mLast login: ${new Date().toLocaleString()} from ${oldNode}\x1b[0m`,
        exitCode: 0,
      };
    });

    router.register("hint", () => {
      const store = useSimulationStore.getState();
      const { activeScenario, scenarioProgress, revealHint } = store;
      if (!activeScenario) {
        return {
          output:
            "\x1b[33mNo active lab scenario. Hints are only available during lab exercises.\x1b[0m\n\nStart a lab from the sidebar to access hints.",
          exitCode: 0,
        };
      }
      const progress = scenarioProgress[activeScenario.id];
      if (!progress) {
        return {
          output: "\x1b[31mError: Could not load scenario progress.\x1b[0m",
          exitCode: 1,
        };
      }
      const currentStep = activeScenario.steps[progress.currentStepIndex];
      const stepProgress = progress.steps[progress.currentStepIndex];
      if (!currentStep || !stepProgress) {
        return {
          output: "\x1b[31mError: Could not determine current step.\x1b[0m",
          exitCode: 1,
        };
      }
      const hintEvaluation = HintManager.getAvailableHints(
        currentStep,
        stepProgress,
      );
      if (hintEvaluation.nextHint) {
        const hint = hintEvaluation.nextHint;
        revealHint(activeScenario.id, currentStep.id, hint.id);
        return {
          output: HintManager.formatHint(
            hint,
            hintEvaluation.revealedCount + 1,
            hintEvaluation.totalCount,
            term.cols || 80,
          ),
          exitCode: 0,
        };
      }
      return {
        output: HintManager.getNoHintMessage(hintEvaluation),
        exitCode: 0,
      };
    });

    // Simulator handlers
    const simHandler =
      (sim: {
        execute: (
          parsed: ReturnType<typeof parseCommand>,
          ctx: CommandContext,
        ) => import("@/types/commands").CommandResult;
      }) =>
      (cl: string, ctx: CommandContext) =>
        sim.execute(parseCommand(cl), ctx);

    router.register("nvidia-smi", simHandler(nvidiaSmiSimulator.current));
    router.register("dcgmi", simHandler(dcgmiSimulator.current));
    router.register("ipmitool", simHandler(ipmitoolSimulator.current));

    // nvsm and cmsh need interactive mode checks (handled post-execution below)
    router.register("nvsm", simHandler(nvsmSimulator.current));
    router.register("cmsh", simHandler(cmshSimulator.current));

    // InfiniBand tools
    router.register("ibstat", (cl, ctx) =>
      infinibandSimulator.current.executeIbstat(parseCommand(cl), ctx),
    );
    router.register("ibportstate", (cl, ctx) =>
      infinibandSimulator.current.executeIbportstate(parseCommand(cl), ctx),
    );
    router.register("ibporterrors", (cl, ctx) =>
      infinibandSimulator.current.executeIbporterrors(parseCommand(cl), ctx),
    );
    router.register("iblinkinfo", (cl, ctx) =>
      infinibandSimulator.current.executeIblinkinfo(parseCommand(cl), ctx),
    );
    router.register("perfquery", (cl, ctx) =>
      infinibandSimulator.current.executePerfquery(parseCommand(cl), ctx),
    );
    router.register("ibdiagnet", (cl, ctx) =>
      infinibandSimulator.current.executeIbdiagnet(parseCommand(cl), ctx),
    );
    router.register("ibdev2netdev", (cl, ctx) =>
      infinibandSimulator.current.executeIbdev2netdev(parseCommand(cl), ctx),
    );
    router.register("ibnetdiscover", (cl, ctx) =>
      infinibandSimulator.current.executeIbnetdiscover(parseCommand(cl), ctx),
    );
    router.register("ibhosts", (cl, ctx) =>
      infinibandSimulator.current.executeIbhosts(parseCommand(cl), ctx),
    );
    router.register("ibswitches", (cl, ctx) =>
      infinibandSimulator.current.executeIbswitches(parseCommand(cl), ctx),
    );
    router.register("ibcableerrors", (cl, ctx) =>
      infinibandSimulator.current.executeIbcableerrors(parseCommand(cl), ctx),
    );
    router.register("ibping", (cl, ctx) =>
      infinibandSimulator.current.executeIbping(parseCommand(cl), ctx),
    );
    router.register("ibtracert", (cl, ctx) =>
      infinibandSimulator.current.executeIbtracert(parseCommand(cl), ctx),
    );
    router.register("ib_write_bw", (cl, ctx) =>
      infinibandSimulator.current.executeIbWriteBw(parseCommand(cl), ctx),
    );
    router.register("ib_read_bw", (cl, ctx) =>
      infinibandSimulator.current.executeIbReadBw(parseCommand(cl), ctx),
    );
    router.register("sminfo", (cl, ctx) =>
      infinibandSimulator.current.executeSminfo(parseCommand(cl), ctx),
    );
    router.register("smpquery", (cl, ctx) =>
      infinibandSimulator.current.executeSmpquery(parseCommand(cl), ctx),
    );
    router.register("ofed_info", (cl, ctx) =>
      infinibandSimulator.current.executeOfedInfo(parseCommand(cl), ctx),
    );

    // Slurm tools
    router.register("sinfo", (cl, ctx) =>
      slurmSimulator.current.executeSinfo(parseCommand(cl), ctx),
    );
    router.register("squeue", (cl, ctx) =>
      slurmSimulator.current.executeSqueue(parseCommand(cl), ctx),
    );
    router.register("scontrol", (cl, ctx) =>
      slurmSimulator.current.executeScontrol(parseCommand(cl), ctx),
    );
    router.register("sbatch", (cl, ctx) =>
      slurmSimulator.current.executeSbatch(parseCommand(cl), ctx),
    );
    router.register("srun", (cl, ctx) =>
      slurmSimulator.current.executeSrun(parseCommand(cl), ctx),
    );
    router.register("scancel", (cl, ctx) =>
      slurmSimulator.current.executeScancel(parseCommand(cl), ctx),
    );
    router.register("sacct", (cl, ctx) =>
      slurmSimulator.current.executeSacct(parseCommand(cl), ctx),
    );
    router.register("sacctmgr", (cl, ctx) =>
      slurmSimulator.current.executeSacctmgr(parseCommand(cl), ctx),
    );

    // Container tools
    router.registerMany(
      ["docker", "ngc", "enroot", "nvidia-container-cli"],
      simHandler(containerSimulator.current),
    );

    // Mellanox tools
    router.registerMany(
      ["mst", "mlxconfig", "mlxlink", "mlxcables", "mlxup", "mlxfwmanager"],
      simHandler(mellanoxSimulator.current),
    );

    // BCM tools
    router.registerMany(
      ["bcm", "bcm-node", "crm"],
      simHandler(bcmSimulator.current),
    );

    // Basic Linux commands
    router.registerMany(
      [
        "lscpu",
        "free",
        "dmidecode",
        "dmesg",
        "systemctl",
        "hostnamectl",
        "timedatectl",
        "lsmod",
        "modinfo",
        "top",
        "ps",
        "numactl",
        "uptime",
        "uname",
        "hostname",
        "sensors",
      ],
      simHandler(basicSystemSimulator.current),
    );

    // PCI / journalctl
    router.registerMany(
      ["lspci", "journalctl"],
      simHandler(pciToolsSimulator.current),
    );

    // Other simulators
    router.register("nvlink-audit", simHandler(nvlinkAuditSimulator.current));
    router.register(
      "nv-fabricmanager",
      simHandler(fabricManagerSimulator.current),
    );
    router.register(
      "nvidia-bug-report.sh",
      simHandler(nvidiaBugReportSimulator.current),
    );
    router.registerMany(
      ["hpl", "nccl-test", "gpu-burn", "all_reduce_perf", "mpirun"],
      simHandler(benchmarkSimulator.current),
    );
    router.registerMany(
      ["df", "mount", "lfs"],
      simHandler(storageSimulator.current),
    );
    router.register("clusterkit", simHandler(clusterKitSimulator.current));
    router.register("nemo", simHandler(nemoSimulator.current));

    // Linux utility commands
    router.registerMany(
      [
        "cat",
        "pwd",
        "ls",
        "head",
        "tail",
        "echo",
        "wc",
        "grep",
        "ip",
        "env",
        "dpkg",
        "apt",
        "nvcc",
        "iostat",
        "efibootmgr",
        "nfsstat",
        "ldconfig",
        "taskset",
      ],
      simHandler(linuxUtilsSimulator.current),
    );

    // ── Shell builtins ────────────────────────────────────
    // These need direct access to currentContext / commandHistory / router,
    // so they live here rather than in a simulator.

    // Known directory tree (matches linuxUtilsSimulator ls handler)
    const KNOWN_DIRS = new Set([
      "/",
      "/root",
      "/root/scripts",
      "/home",
      "/home/admin",
      "/home/admin/scripts",
      "/etc",
      "/etc/slurm",
      "/etc/docker",
      "/etc/nvidia",
      "/etc/enroot",
      "/dev",
      "/dev/mst",
      "/usr",
      "/usr/local",
      "/usr/local/cuda",
      "/usr/local/cuda/bin",
      "/var",
      "/var/log",
      "/var/log/slurm",
      "/tmp",
      "/opt",
      "/opt/nemo",
      "/data",
      "/data/training",
      "/data/output",
      "/scratch",
      "/proc",
      "/sys",
    ]);

    router.register("cd", (cl) => {
      const args = cl.trim().split(/\s+/).slice(1);
      let target = args[0] || "/root"; // bare `cd` goes home

      // Expand ~ and -
      if (target === "~" || target === "") target = "/root";
      if (target === "-") {
        // No OLDPWD tracking, just go home
        target = "/root";
      }

      // Resolve relative paths
      if (!target.startsWith("/")) {
        const base = currentContext.current.currentPath;
        target = base === "/" ? `/${target}` : `${base}/${target}`;
      }

      // Normalize . and ..
      const parts = target.split("/").filter(Boolean);
      const resolved: string[] = [];
      for (const p of parts) {
        if (p === ".") continue;
        if (p === "..") {
          resolved.pop();
        } else {
          resolved.push(p);
        }
      }
      const newPath = "/" + resolved.join("/") || "/";

      if (!KNOWN_DIRS.has(newPath)) {
        return {
          output: `\x1b[31mbash: cd: ${args[0]}: No such file or directory\x1b[0m`,
          exitCode: 1,
        };
      }

      currentContext.current.currentPath = newPath;
      return { output: "", exitCode: 0 };
    });

    router.register("whoami", () => ({
      output: "root",
      exitCode: 0,
    }));

    router.register("id", () => ({
      output: "uid=0(root) gid=0(root) groups=0(root)",
      exitCode: 0,
    }));

    router.register("export", (cl) => {
      const args = cl.trim().split(/\s+/).slice(1);
      if (args.length === 0) {
        // Show current exports
        const lines = Object.entries(currentContext.current.environment)
          .map(([k, v]) => `declare -x ${k}="${v}"`)
          .join("\n");
        return { output: lines, exitCode: 0 };
      }
      // Parse VAR=VALUE assignments
      for (const arg of args) {
        const eqIdx = arg.indexOf("=");
        if (eqIdx > 0) {
          const key = arg.slice(0, eqIdx);
          const value = arg.slice(eqIdx + 1).replace(/^["']|["']$/g, "");
          currentContext.current.environment[key] = value;
        }
      }
      return { output: "", exitCode: 0 };
    });

    router.register("unset", (cl) => {
      const args = cl.trim().split(/\s+/).slice(1);
      for (const arg of args) {
        delete currentContext.current.environment[arg];
      }
      return { output: "", exitCode: 0 };
    });

    router.register("history", () => {
      const lines = commandHistory.map(
        (cmd, i) => `  ${String(i + 1).padStart(4)}  ${cmd}`,
      );
      return { output: lines.join("\n"), exitCode: 0 };
    });

    router.register("which", (cl) => {
      const args = cl.trim().split(/\s+/).slice(1);
      if (args.length === 0) {
        return { output: "", exitCode: 1 };
      }
      const lines: string[] = [];
      for (const cmd of args) {
        if (router.resolve(cmd)) {
          // Map commands to realistic paths
          const binPath =
            cmd.startsWith("nvidia") || cmd === "dcgmi" || cmd === "nvcc"
              ? `/usr/local/cuda/bin/${cmd}`
              : cmd.startsWith("ib") ||
                  cmd.startsWith("mlx") ||
                  cmd === "mst" ||
                  cmd === "perfquery" ||
                  cmd === "sminfo" ||
                  cmd === "smpquery" ||
                  cmd === "ofed_info"
                ? `/usr/sbin/${cmd}`
                : cmd.startsWith("s") &&
                    [
                      "sinfo",
                      "squeue",
                      "scontrol",
                      "sbatch",
                      "srun",
                      "scancel",
                      "sacct",
                      "sacctmgr",
                    ].includes(cmd)
                  ? `/usr/bin/${cmd}`
                  : `/usr/bin/${cmd}`;
          lines.push(binPath);
        } else {
          lines.push(
            `which: no ${cmd} in (${currentContext.current.environment.PATH})`,
          );
        }
      }
      return {
        output: lines.join("\n"),
        exitCode: lines.some((l) => l.includes("which: no")) ? 1 : 0,
      };
    });

    router.register("type", (cl) => {
      const args = cl.trim().split(/\s+/).slice(1);
      if (args.length === 0) {
        return { output: "", exitCode: 1 };
      }
      const builtins = new Set([
        "cd",
        "export",
        "unset",
        "source",
        "alias",
        "history",
        "exit",
        "logout",
        "set",
        "type",
      ]);
      const lines: string[] = [];
      for (const cmd of args) {
        if (builtins.has(cmd)) {
          lines.push(`${cmd} is a shell builtin`);
        } else if (router.resolve(cmd)) {
          lines.push(`${cmd} is /usr/bin/${cmd}`);
        } else {
          lines.push(`bash: type: ${cmd}: not found`);
        }
      }
      return { output: lines.join("\n"), exitCode: 0 };
    });

    router.register("man", (cl) => {
      const args = cl.trim().split(/\s+/).slice(1);
      if (args.length === 0) {
        return {
          output:
            "What manual page do you want?\nFor example, try 'man nvidia-smi'.",
          exitCode: 1,
        };
      }
      const cmd = args[args.length - 1]; // support `man -s 1 cmd`
      // man only covers real Linux/HPC commands, not simulator builtins
      const simulatorBuiltins = new Set(["help", "hint", "practice"]);
      if (simulatorBuiltins.has(cmd)) {
        return {
          output: `No manual entry for ${cmd}\nTip: '${cmd}' is a simulator command. Type 'help ${cmd}' instead.`,
          exitCode: 1,
        };
      }
      const metadata = getCommandMetadata(cmd);
      if (metadata) {
        return {
          output: formatCommandHelp(metadata, term.cols || 80),
          exitCode: 0,
        };
      }
      return {
        output: `No manual entry for ${cmd}\nSee 'help' for available commands.`,
        exitCode: 1,
      };
    });

    router.register("alias", (cl) => {
      const args = cl.trim().split(/\s+/).slice(1);
      if (args.length === 0) {
        return {
          output: "alias ll='ls -alF'\nalias la='ls -A'\nalias l='ls -CF'",
          exitCode: 0,
        };
      }
      // Accept but silently ignore alias definitions
      return { output: "", exitCode: 0 };
    });

    router.register("source", (cl) => {
      const args = cl.trim().split(/\s+/).slice(1);
      if (args.length === 0) {
        return {
          output:
            "bash: source: filename argument required\nsource: usage: source filename [arguments]",
          exitCode: 2,
        };
      }
      // Simulate sourcing common files
      return { output: "", exitCode: 0 };
    });

    // Also register "." as alias for source
    router.register(".", (cl) => {
      const args = cl.trim().split(/\s+/).slice(1);
      if (args.length === 0) {
        return {
          output:
            "bash: .: filename argument required\n.: usage: . filename [arguments]",
          exitCode: 2,
        };
      }
      return { output: "", exitCode: 0 };
    });

    router.register("exit", () => ({
      output:
        "\x1b[33mThis is a simulated terminal — there is no session to exit.\x1b[0m",
      exitCode: 0,
    }));

    router.register("logout", () => ({
      output:
        "\x1b[33mThis is a simulated terminal — there is no session to log out of.\x1b[0m",
      exitCode: 0,
    }));

    router.register("set", (cl) => {
      const args = cl.trim().split(/\s+/).slice(1);
      if (args.length === 0) {
        // Show environment (like bash `set` with no args)
        const lines = Object.entries(currentContext.current.environment)
          .map(([k, v]) => `${k}=${v}`)
          .join("\n");
        return { output: lines, exitCode: 0 };
      }
      return { output: "", exitCode: 0 };
    });

    router.register("sleep", (cl) => {
      const args = cl.trim().split(/\s+/).slice(1);
      if (args.length === 0) {
        return {
          output:
            "sleep: missing operand\nTry 'sleep --help' for more information.",
          exitCode: 1,
        };
      }
      // In the simulator, sleep returns immediately
      return { output: "", exitCode: 0 };
    });

    router.register("date", () => ({
      output: new Date().toString(),
      exitCode: 0,
    }));

    router.register("touch", (cl) => {
      const args = cl.trim().split(/\s+/).slice(1);
      if (args.length === 0) {
        return {
          output: "touch: missing file operand",
          exitCode: 1,
        };
      }
      return { output: "", exitCode: 0 };
    });

    router.register("mkdir", (cl) => {
      const args = cl
        .trim()
        .split(/\s+/)
        .filter((a) => !a.startsWith("-"))
        .slice(1);
      if (args.length === 0) {
        return {
          output: "mkdir: missing operand",
          exitCode: 1,
        };
      }
      return { output: "", exitCode: 0 };
    });

    router.register("rm", () => ({ output: "", exitCode: 0 }));
    router.register("cp", () => ({ output: "", exitCode: 0 }));
    router.register("mv", () => ({ output: "", exitCode: 0 }));
    router.register("chmod", () => ({ output: "", exitCode: 0 }));
    router.register("chown", () => ({ output: "", exitCode: 0 }));

    const executeCommand = async (cmdLine: string) => {
      if (!cmdLine.trim()) {
        prompt();
        return;
      }

      // Expand $(command) shell substitutions before processing.
      // In a real bash shell these would be expanded by the shell;
      // in the simulator we expand common patterns to simulated values.
      const originalCmdLine = cmdLine;
      cmdLine = cmdLine.replace(
        /\$\(([^)]+)\)/g,
        (_match: string, innerCmd: string) => {
          const inner = innerCmd.trim();
          if (inner.startsWith("pgrep")) return "12345";
          return "0";
        },
      );

      // Add to history (store the original, unexpanded form)
      setCommandHistory((prev) => [...prev, originalCmdLine]);
      currentContext.current.history.push(originalCmdLine);

      // Parse command
      const parts = cmdLine.trim().split(/\s+/);
      const command = parts[0];

      let result: import("@/types/commands").CommandResult = {
        output: "",
        exitCode: 0,
      };

      // INTERACTIVE SHELL MODE INTERCEPT
      if (shellState.mode === "nvsm") {
        const newState = handleInteractiveShellInput(
          nvsmSimulator.current,
          cmdLine,
          currentContext.current,
          term,
          shellState,
          prompt,
        );
        setShellState(newState);
        return;
      }

      if (shellState.mode === "cmsh") {
        const newState = handleInteractiveShellInput(
          cmshSimulator.current,
          cmdLine,
          currentContext.current,
          term,
          shellState,
          prompt,
        );
        setShellState(newState);
        return;
      }

      try {
        // Handle "clear" before router (early return)
        if (command === "clear") {
          term.clear();
          prompt();
          return;
        }

        // Handle environment variable assignments (VAR=VALUE)
        const envVarPattern = /^[A-Z_][A-Z0-9_]*=\S+$/;
        if (envVarPattern.test(cmdLine.trim())) {
          result.output = cmdLine.trim();
          result.exitCode = 0;
        } else {
          const handler = router.resolve(command);
          if (handler) {
            result = await handler(cmdLine, currentContext.current);
          } else {
            result.output = `\x1b[31mbash: ${command}: command not found\x1b[0m`;
            result.exitCode = 127;
            const suggestion = getDidYouMeanMessage(command);
            if (suggestion) {
              result.output += "\n\n" + suggestion;
            } else {
              result.output +=
                "\n\nType \x1b[36mhelp\x1b[0m to see available commands.";
            }
          }

          // Post-handler: check for interactive mode entry (nvsm/cmsh)
          if (command === "nvsm" || command === "cmsh") {
            const parsed = parseCommand(cmdLine);
            if (
              shouldEnterInteractiveMode(
                result,
                parsed.subcommands.length === 0,
              )
            ) {
              setShellState({ mode: command, prompt: result.prompt || "" });
            }
          }
        }

        // Apply pipe filters (grep, tail, head, etc.) to command output
        if (result.output && hasPipes(cmdLine)) {
          result.output = applyPipeFilters(result.output, cmdLine);
        }

        if (result.output) {
          term.writeln("\n" + result.output);
        }

        // Scenario Validation - Check for active scenario and validate command
        const store = useSimulationStore.getState();
        const {
          activeScenario,
          scenarioProgress,
          recordCommand,
          validateStep,
          validationConfig,
        } = store;

        if (
          activeScenario &&
          scenarioProgress[activeScenario.id] &&
          validationConfig.enabled
        ) {
          const progress = scenarioProgress[activeScenario.id];
          const currentStepIndex = progress.currentStepIndex;
          const currentStep = activeScenario.steps[currentStepIndex];
          const stepProgress = progress.steps[currentStepIndex];

          if (currentStep && stepProgress && !stepProgress.completed) {
            // Record the command for hint tracking (except special commands)
            if (
              command !== "hint" &&
              command !== "clear" &&
              command !== "help"
            ) {
              recordCommand(activeScenario.id, currentStep.id, cmdLine);
            }

            // Validate whenever the command is recognized (exitCode !== 127).
            // Even if a simulator returns an error (exitCode 1), the user
            // demonstrated the correct command knowledge.  The command tracker
            // already recorded the full command line, so the validator can
            // match it against expected commands regardless of exit status.
            const commandFound = result.exitCode !== 127; // 127 = command not found

            if (commandFound) {
              // Validate using ScenarioValidator
              const validationResult = ScenarioValidator.validateCommand(
                cmdLine,
                result.output,
                currentStep,
                currentContext.current,
                stepProgress.commandsExecuted,
              );

              // Store validation result in state
              validateStep(activeScenario.id, currentStep.id, validationResult);

              // Show validation feedback if enabled
              if (
                validationConfig.immediatefeedback &&
                validationResult.feedback
              ) {
                term.writeln("");
                term.writeln(validationResult.feedback);
              }

              // Show progress bar if enabled and not yet complete
              if (
                validationConfig.showProgress &&
                !validationResult.passed &&
                validationResult.progress > 0
              ) {
                const progressBar = renderProgressBar(
                  validationResult.progress,
                );
                term.writeln(progressBar);
              }
            }
          }
        }
      } catch (error) {
        term.writeln(`\n\x1b[31mError executing command: ${error}\x1b[0m`);
      }

      prompt();
    };

    // Store executeCommand ref for external access (auto-SSH on node selection)
    executeCommandRef.current = executeCommand;

    // Defer term.open() until container has non-zero dimensions to prevent
    // xterm Viewport._innerRefresh from accessing uninitialized _renderService.dimensions
    let initObserver: ResizeObserver | null = null;
    const { clientWidth, clientHeight } = container;
    if (clientWidth > 0 && clientHeight > 0) {
      openAndInit();
    } else {
      initObserver = new ResizeObserver((entries) => {
        const rect = entries[0]?.contentRect;
        if (rect && rect.width > 0 && rect.height > 0) {
          initObserver!.disconnect();
          initObserver = null;
          openAndInit();
        }
      });
      initObserver.observe(container);
    }

    return () => {
      disposed = true;
      initObserver?.disconnect();
      resizeObserver.disconnect();
      term.dispose();
      setIsTerminalReady(false);
      // Delay removal so the handler can suppress errors from xterm's pending RAFs
      setTimeout(
        () => window.removeEventListener("error", handleXtermError),
        100,
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Terminal initialization runs once on mount

  // Lab Feedback - display messages when labs start/complete
  useLabFeedback(xtermRef.current, isTerminalReady, selectedNode || "dgx-00");

  return (
    <div data-testid="terminal" className={`terminal-container ${className}`}>
      <div className="terminal-node-indicator px-3 py-1.5 bg-gray-800 border-b border-gray-700 text-xs font-mono flex items-center gap-2">
        <span className="text-gray-400">Terminal connected to:</span>
        <span className="text-green-400 font-semibold">{connectedNode}</span>
      </div>
      <div ref={terminalRef} className="terminal-content" />
    </div>
  );
};
