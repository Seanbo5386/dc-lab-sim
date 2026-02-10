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
import { useSimulationStore } from "@/store/simulationStore";
import { scenarioContextManager } from "@/store/scenarioContext";
import { ScenarioValidator } from "@/utils/scenarioValidator";
import { parse as parseCommand } from "@/utils/commandParser";
import { commandTracker } from "@/utils/commandValidator";
import {
  handleInteractiveShellInput,
  shouldEnterInteractiveMode,
  type ShellState,
} from "@/utils/interactiveShellHandler";
import { TERMINAL_OPTIONS, WELCOME_MESSAGE } from "@/constants/terminalConfig";
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
    "\x1b[1;36m═══════════════════════════════════════════════════════════════\x1b[0m\n";
  output += "\x1b[1;33m                    COMMAND PRACTICE EXERCISES\x1b[0m\n";
  output +=
    "\x1b[1;36m═══════════════════════════════════════════════════════════════\x1b[0m\n\n";

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
      "\n\x1b[1;36m───────────────────────────────────────────────────────────────\x1b[0m\n\n";
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
  const activeScenario = useSimulationStore((state) => state.activeScenario);
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
    if (activeScenario) {
      // Create or get scenario context
      const context = scenarioContextManager.getOrCreateContext(
        activeScenario.id,
        cluster,
      );
      scenarioContextManager.setActiveContext(activeScenario.id);

      // Add to command context
      currentContext.current.scenarioContext = context;
      currentContext.current.cluster = context.getCluster();

      console.log(
        `Terminal: Using scenario context for ${activeScenario.id}`,
      );
    } else {
      // Clear scenario context when no active scenario
      scenarioContextManager.setActiveContext(null);
      currentContext.current.scenarioContext = undefined;
      currentContext.current.cluster = cluster;

      console.log("Terminal: Cleared scenario context");
    }
  }, [activeScenario, cluster]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm(TERMINAL_OPTIONS);

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(terminalRef.current);

    // Safe fit function that checks container dimensions first
    const safeFit = () => {
      if (terminalRef.current) {
        const { clientWidth, clientHeight } = terminalRef.current;
        // Only fit if container has valid dimensions
        if (clientWidth > 0 && clientHeight > 0) {
          try {
            fitAddon.fit();
          } catch (e) {
            // Ignore fit errors during layout transitions
          }
        }
      }
    };

    // Fit terminal to container size (delayed to allow layout to settle)
    requestAnimationFrame(safeFit);

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      safeFit();
    });
    resizeObserver.observe(terminalRef.current);

    xtermRef.current = term;
    setIsTerminalReady(true);

    // Display welcome message
    term.write(WELCOME_MESSAGE);

    const prompt = () => {
      if (shellState.mode === "nvsm") {
        // Use NVSM's current prompt
        term.write(`\x1b[36m${shellState.prompt || "nvsm> "}\x1b[0m`);
      } else if (shellState.mode === "cmsh") {
        term.write(
          `\x1b[36m${shellState.prompt || "[root@dgx-headnode]% "}\x1b[0m`,
        );
      } else {
        // Normal bash prompt
        const node = currentContext.current.currentNode;
        term.write(`\x1b[1;32mroot@${node}\x1b[0m:\x1b[1;34m~\x1b[0m# `);
      }
    };

    prompt();

    // Helper function to render progress bar
    const renderProgressBar = (progress: number): string => {
      const width = 40;
      const filled = Math.round((progress / 100) * width);
      const empty = width - filled;
      const bar = "█".repeat(filled) + "░".repeat(empty);
      return `\x1b[36mProgress: [${bar}] ${progress}%\x1b[0m`;
    };

    let currentLine = "";

    const executeCommand = async (cmdLine: string) => {
      if (!cmdLine.trim()) {
        prompt();
        return;
      }

      // Add to history
      setCommandHistory((prev) => [...prev, cmdLine]);
      currentContext.current.history.push(cmdLine);

      // Parse command
      const parts = cmdLine.trim().split(/\s+/);
      const command = parts[0];

      let result: import("@/types/commands").CommandResult = {
        output: "",
        exitCode: 0,
      };

      // INTERACTIVE SHELL MODE INTERCEPT
      // When in an interactive shell (nvsm, cmsh), route commands through that shell
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

      // cmsh interactive mode intercept
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
        switch (command) {
          case "help": {
            // Enhanced help - show organized command list
            const args = cmdLine.trim().split(/\s+/).slice(1);
            if (args.length > 0) {
              // help <command> - show detailed help for specific command
              const commandName = args[0];
              const metadata = getCommandMetadata(commandName);
              if (metadata) {
                result.output = formatCommandHelp(metadata);
              } else {
                result.output = `\x1b[33mNo help available for '\x1b[36m${commandName}\x1b[33m'.\x1b[0m\n\nType \x1b[36mhelp\x1b[0m to see all available commands.`;
              }
            } else {
              // General help - show organized list
              result.output = formatCommandList();
            }
            break;
          }

          case "explain": {
            // explain <command> - detailed explanation with examples
            const args = cmdLine.trim().split(/\s+/).slice(1);
            if (args.length === 0) {
              result.output = `\x1b[33mUsage:\x1b[0m explain <command>\n\nGet detailed information about a specific command.\n\n\x1b[1mExamples:\x1b[0m\n  \x1b[36mexplain nvidia-smi\x1b[0m\n  \x1b[36mexplain dcgmi\x1b[0m\n  \x1b[36mexplain ipmitool\x1b[0m`;
              break;
            }

            const commandName = args[0];
            const metadata = getCommandMetadata(commandName);

            if (metadata) {
              result.output = formatCommandHelp(metadata);
            } else {
              result.output = `\x1b[33mNo information available for '\x1b[36m${commandName}\x1b[33m'.\x1b[0m`;

              // Try to suggest similar commands
              const suggestion = getDidYouMeanMessage(commandName);
              if (suggestion) {
                result.output += "\n\n" + suggestion;
              }
            }
            break;
          }

          case "explain-json": {
            // explain-json <command> - detailed explanation using JSON-based registry
            const args = cmdLine.trim().split(/\s+/).slice(1);
            if (args.length === 0) {
              result.output = `Usage: explain-json <command>\n\nProvides detailed command information from JSON definitions.\nIncludes usage patterns, exit codes, error resolutions, and state interactions.\n\nExample: explain-json nvidia-smi`;
              break;
            }

            const commandName = args[0];

            // Dynamic import to avoid circular dependencies
            try {
              const { getCommandDefinitionRegistry, generateExplainOutput } =
                await import("@/cli");
              const registry = await getCommandDefinitionRegistry();
              const output = await generateExplainOutput(
                commandName,
                registry,
                {
                  includeErrors: true,
                  includeExamples: true,
                  includePermissions: true,
                },
              );
              result.output = output;
            } catch (error) {
              result.output = `Error loading command information: ${error instanceof Error ? error.message : "Unknown error"}`;
              result.exitCode = 1;
            }
            break;
          }

          case "practice": {
            // practice - generate command learning exercises
            const args = cmdLine.trim().split(/\s+/).slice(1);

            try {
              const { getCommandDefinitionRegistry, CommandExerciseGenerator } =
                await import("@/cli");
              const registry = await getCommandDefinitionRegistry();
              const generator = new CommandExerciseGenerator(registry);

              // Parse subcommand
              const subcommand = args[0];

              if (!subcommand || subcommand === "random") {
                // Get 3 random exercises
                const exercises = generator.getRandomExercises(3);
                result.output = formatPracticeExercises(exercises);
              } else if (
                subcommand === "beginner" ||
                subcommand === "intermediate" ||
                subcommand === "advanced"
              ) {
                const exercises = generator.generateByDifficulty(subcommand, 3);
                result.output = formatPracticeExercises(exercises);
              } else if (subcommand === "category") {
                const category = args[1];
                if (!category) {
                  result.output = `Usage: practice category <category>\n\nAvailable categories: gpu_management, diagnostics, cluster_management, networking, containers, storage`;
                  break;
                }
                const exercises = generator.generateForCategory(category, 3);
                result.output = formatPracticeExercises(exercises);
              } else {
                // Assume it's a command name
                const exercises = generator.generateForCommand(subcommand);
                if (exercises.length === 0) {
                  result.output = `No exercises found for command: ${subcommand}\n\nTry: practice random, practice beginner, or practice category gpu_management`;
                } else {
                  result.output = formatPracticeExercises(
                    exercises.slice(0, 3),
                  );
                }
              }
            } catch (error) {
              result.output = `Error generating exercises: ${error instanceof Error ? error.message : "Unknown error"}`;
              result.exitCode = 1;
            }
            break;
          }

          case "clear":
            term.clear();
            prompt();
            return;

          case "ssh": {
            // Simulated SSH connection to cluster nodes
            const args = cmdLine.trim().split(/\s+/).slice(1);
            if (args.length === 0) {
              result.output =
                "\x1b[33mUsage: ssh <hostname>\x1b[0m\n\nAvailable nodes:\n" +
                cluster.nodes
                  .map((n) => `  \x1b[36m${n.id}\x1b[0m - ${n.systemType}`)
                  .join("\n");
              break;
            }

            const targetNode = args[0];
            // Check if target node exists in cluster
            const nodeExists = cluster.nodes.some((n) => n.id === targetNode);

            if (!nodeExists) {
              result.output = `\x1b[31mssh: Could not resolve hostname ${targetNode}: Name or service not known\x1b[0m`;
              result.exitCode = 1;
              break;
            }

            if (targetNode === currentContext.current.currentNode) {
              result.output = `\x1b[33mAlready connected to ${targetNode}\x1b[0m`;
              break;
            }

            // Simulate SSH connection
            const oldNode = currentContext.current.currentNode;
            currentContext.current.currentNode = targetNode;
            setConnectedNode(targetNode);

            // Update the store's selected node to keep Dashboard in sync
            useSimulationStore.getState().selectNode(targetNode);

            result.output =
              `\x1b[32mConnecting to ${targetNode}...\x1b[0m\n` +
              `\x1b[90mThe authenticity of host '${targetNode} (10.0.0.${cluster.nodes.findIndex((n) => n.id === targetNode) + 1})' was established.\x1b[0m\n` +
              `\x1b[32mConnection established.\x1b[0m\n` +
              `\x1b[90mLast login: ${new Date().toLocaleString()} from ${oldNode}\x1b[0m`;
            break;
          }

          case "hint": {
            // Get state from store
            const store = useSimulationStore.getState();
            const { activeScenario, scenarioProgress, revealHint } = store;

            // Check if there's an active scenario
            if (!activeScenario) {
              result.output =
                "\x1b[33mNo active lab scenario. Hints are only available during lab exercises.\x1b[0m\n\nStart a lab from the sidebar to access hints.";
              break;
            }

            const progress = scenarioProgress[activeScenario.id];
            if (!progress) {
              result.output =
                "\x1b[31mError: Could not load scenario progress.\x1b[0m";
              break;
            }

            const currentStep = activeScenario.steps[progress.currentStepIndex];
            const stepProgress = progress.steps[progress.currentStepIndex];

            if (!currentStep || !stepProgress) {
              result.output =
                "\x1b[31mError: Could not determine current step.\x1b[0m";
              break;
            }

            // Evaluate available hints
            const hintEvaluation = HintManager.getAvailableHints(
              currentStep,
              stepProgress,
            );

            if (hintEvaluation.nextHint) {
              // Reveal the next hint
              const hint = hintEvaluation.nextHint;
              revealHint(activeScenario.id, currentStep.id, hint.id);

              // Format and display the hint
              const formattedHint = HintManager.formatHint(
                hint,
                hintEvaluation.revealedCount + 1,
                hintEvaluation.totalCount,
              );

              result.output = formattedHint;
            } else {
              // No hints available
              result.output = HintManager.getNoHintMessage(hintEvaluation);
            }
            break;
          }

          case "nvidia-smi": {
            const parsed = parseCommand(cmdLine);
            result = nvidiaSmiSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "dcgmi": {
            // Use new command parser for dcgmi
            const parsed = parseCommand(cmdLine);
            result = dcgmiSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "nvsm": {
            const parsed = parseCommand(cmdLine);
            result = nvsmSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            // Check if entering interactive mode
            if (
              shouldEnterInteractiveMode(
                result,
                parsed.subcommands.length === 0,
              )
            ) {
              setShellState({ mode: "nvsm", prompt: result.prompt || "" });
            }
            break;
          }

          case "ipmitool": {
            const parsed = parseCommand(cmdLine);
            result = ipmitoolSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "ibstat": {
            const parsed = parseCommand(cmdLine);
            result = infinibandSimulator.current.executeIbstat(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "ibportstate": {
            const parsed = parseCommand(cmdLine);
            result = infinibandSimulator.current.executeIbportstate(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "ibporterrors": {
            const parsed = parseCommand(cmdLine);
            result = infinibandSimulator.current.executeIbporterrors(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "iblinkinfo": {
            const parsed = parseCommand(cmdLine);
            result = infinibandSimulator.current.executeIblinkinfo(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "perfquery": {
            const parsed = parseCommand(cmdLine);
            result = infinibandSimulator.current.executePerfquery(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "ibdiagnet": {
            const parsed = parseCommand(cmdLine);
            result = infinibandSimulator.current.executeIbdiagnet(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "ibdev2netdev": {
            const parsed = parseCommand(cmdLine);
            result = infinibandSimulator.current.executeIbdev2netdev(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "ibnetdiscover": {
            const parsed = parseCommand(cmdLine);
            result = infinibandSimulator.current.executeIbnetdiscover(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "sinfo": {
            const parsed = parseCommand(cmdLine);
            result = slurmSimulator.current.executeSinfo(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "squeue": {
            const parsed = parseCommand(cmdLine);
            result = slurmSimulator.current.executeSqueue(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "scontrol": {
            const parsed = parseCommand(cmdLine);
            result = slurmSimulator.current.executeScontrol(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "sbatch": {
            const parsed = parseCommand(cmdLine);
            result = slurmSimulator.current.executeSbatch(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "srun": {
            const parsed = parseCommand(cmdLine);
            result = slurmSimulator.current.executeSrun(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "scancel": {
            const parsed = parseCommand(cmdLine);
            result = slurmSimulator.current.executeScancel(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "sacct": {
            const parsed = parseCommand(cmdLine);
            result = slurmSimulator.current.executeSacct(
              parsed,
              currentContext.current,
            );
            break;
          }

          // Container tools
          case "docker":
          case "ngc":
          case "enroot": {
            const parsed = parseCommand(cmdLine);
            result = containerSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            break;
          }

          // Mellanox tools
          case "mst":
          case "mlxconfig":
          case "mlxlink":
          case "mlxcables":
          case "mlxup":
          case "mlxfwmanager": {
            const parsed = parseCommand(cmdLine);
            result = mellanoxSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            break;
          }

          // BCM
          case "bcm":
          case "bcm-node":
          case "crm": {
            const parsed = parseCommand(cmdLine);
            result = bcmSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "cmsh": {
            const parsed = parseCommand(cmdLine);
            result = cmshSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            // Check if entering interactive mode
            if (
              shouldEnterInteractiveMode(
                result,
                parsed.subcommands.length === 0,
              )
            ) {
              setShellState({ mode: "cmsh", prompt: result.prompt || "" });
            }
            break;
          }

          // Basic Linux commands for labs
          case "lscpu":
          case "free":
          case "dmidecode":
          case "dmesg":
          case "systemctl":
          case "hostnamectl":
          case "timedatectl":
          case "lsmod":
          case "modinfo":
          case "top":
          case "ps":
          case "numactl":
          case "uptime":
          case "uname":
          case "hostname":
          case "sensors": {
            const parsed = parseCommand(cmdLine);
            result = basicSystemSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "lspci":
          case "journalctl": {
            const parsed = parseCommand(cmdLine);
            result = pciToolsSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "nvlink-audit": {
            const parsed = parseCommand(cmdLine);
            result = nvlinkAuditSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "nv-fabricmanager": {
            const parsed = parseCommand(cmdLine);
            result = fabricManagerSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "nvidia-bug-report.sh": {
            const parsed = parseCommand(cmdLine);
            result = nvidiaBugReportSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "hpl": {
            const parsed = parseCommand(cmdLine);
            result = benchmarkSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "nccl-test": {
            const parsed = parseCommand(cmdLine);
            result = benchmarkSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "gpu-burn": {
            const parsed = parseCommand(cmdLine);
            result = benchmarkSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "df": {
            const parsed = parseCommand(cmdLine);
            result = storageSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "mount": {
            const parsed = parseCommand(cmdLine);
            result = storageSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "lfs": {
            const parsed = parseCommand(cmdLine);
            result = storageSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "clusterkit": {
            const parsed = parseCommand(cmdLine);
            result = clusterKitSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            break;
          }

          case "nemo": {
            const parsed = parseCommand(cmdLine);
            result = nemoSimulator.current.execute(
              parsed,
              currentContext.current,
            );
            break;
          }

          default: {
            result.output = `\x1b[31mbash: ${command}: command not found\x1b[0m`;
            result.exitCode = 127;

            // Add "Did you mean?" suggestions
            const suggestion = getDidYouMeanMessage(command);
            if (suggestion) {
              result.output += "\n\n" + suggestion;
            } else {
              result.output +=
                "\n\nType \x1b[36mhelp\x1b[0m to see available commands.";
            }
            break;
          }
        }

        // Apply pipe filters (grep, tail, head, etc.) to command output
        if (result.output && hasPipes(cmdLine)) {
          result.output = applyPipeFilters(result.output, cmdLine);
        }

        if (result.output) {
          term.writeln("\n" + result.output);
        }

        // Track command execution for validation
        commandTracker.recordCommand(cmdLine, result.output, result.exitCode);

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
              command !== "help" &&
              command !== "explain"
            ) {
              recordCommand(activeScenario.id, currentStep.id, cmdLine);
            }

            // Only validate if command succeeded or if we want to provide feedback on failures
            const commandSucceeded = result.exitCode === 0;
            const commandFound = result.exitCode !== 127; // 127 = command not found

            // Special case: GPU reset commands should be validated even if they fail
            // This is because XID 79 errors make GPU reset fail, but attempting it is correct
            const isGpuResetAttempt =
              cmdLine.includes("--gpu-reset") ||
              (cmdLine.includes("nvidia-smi") && cmdLine.includes("-r"));

            if (
              (commandSucceeded && commandFound) ||
              (commandFound && isGpuResetAttempt)
            ) {
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

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      setIsTerminalReady(false);
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
