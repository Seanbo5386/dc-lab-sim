import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { act } from "react";

// Provide ResizeObserver that triggers callback with non-zero dimensions
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = class ResizeObserver {
    private cb: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb;
    }
    observe(target: Element) {
      // Simulate non-zero dimensions so openAndInit fires
      setTimeout(() => {
        this.cb(
          [
            {
              contentRect: { width: 800, height: 400 },
              target,
            } as unknown as ResizeObserverEntry,
          ],
          this,
        );
      }, 0);
    }
    unobserve() {}
    disconnect() {}
  };

  // Make requestAnimationFrame synchronous for tests
  vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});

// Hoisted xterm stub so tests can assert on what the terminal wrote.
const { mockTerminal } = vi.hoisted(() => ({
  mockTerminal: {
    open: vi.fn(),
    write: vi.fn(),
    writeln: vi.fn(),
    onData: vi.fn(() => ({ dispose: vi.fn() })),
    onKey: vi.fn(() => ({ dispose: vi.fn() })),
    input: vi.fn(),
    dispose: vi.fn(),
    loadAddon: vi.fn(),
    focus: vi.fn(),
    reset: vi.fn(),
    options: {},
    cols: 80,
    rows: 24,
    element: document.createElement("div"),
  },
}));

// Mock @xterm/xterm – the Terminal constructor returns a lightweight stub
vi.mock("@xterm/xterm", () => ({ Terminal: vi.fn(() => mockTerminal) }));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: vi.fn(() => ({ fit: vi.fn(), dispose: vi.fn() })),
}));

vi.mock("@xterm/addon-web-links", () => ({
  WebLinksAddon: vi.fn(() => ({ dispose: vi.fn() })),
}));

// Mock stores
const { mockSimulationState } = vi.hoisted(() => ({
  mockSimulationState: {
    selectedNode: "dgx-00",
    cluster: {
      nodes: [
        { id: "dgx-00", hostname: "dgx-00", systemType: "DGX-A100" },
        { id: "dgx-01", hostname: "dgx-01", systemType: "DGX-A100" },
      ],
    },
    activeScenario: null as { id: string; title: string } | null,
    selectNode: vi.fn(),
  },
}));

vi.mock("../../store/simulationStore", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hook: any = vi.fn((selector?: any) =>
    selector ? selector(mockSimulationState) : mockSimulationState,
  );
  hook.getState = vi.fn(() => mockSimulationState);
  hook.subscribe = vi.fn(() => vi.fn());
  return { useSimulationStore: hook };
});

vi.mock("../../store/scenarioContext", () => ({
  scenarioContextManager: {
    getActiveContext: vi.fn(() => null),
    hasActiveContext: vi.fn(() => false),
    getOrCreateContext: vi.fn(() => ({
      getCluster: vi.fn(() => ({
        nodes: [{ id: "dgx-00", hostname: "dgx-00", systemType: "DGX-A100" }],
      })),
    })),
    setActiveContext: vi.fn(),
  },
}));

// Mock utilities
vi.mock("../../utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../utils/scenarioValidator", () => ({
  ScenarioValidator: vi.fn(() => ({ validateCommand: vi.fn() })),
}));

vi.mock("../../utils/commandParser", () => ({
  parse: vi.fn(() => ({ command: "", args: [], flags: {} })),
}));

vi.mock("../../utils/interactiveShellHandler", () => ({
  handleInteractiveShellInput: vi.fn(),
  shouldEnterInteractiveMode: vi.fn(() => false),
}));

vi.mock("../../constants/terminalConfig", () => ({
  TERMINAL_OPTIONS: {},
  generateWelcomeMessage: vi.fn(() => "Welcome"),
}));

vi.mock("../../utils/terminalKeyboardHandler", () => ({
  handleKeyboardInput: vi.fn(),
}));

vi.mock("../../hooks/useLabFeedback", () => ({
  useLabFeedback: vi.fn(),
}));

vi.mock("../../utils/hintManager", () => ({
  HintManager: vi.fn(() => ({ getHint: vi.fn() })),
}));

vi.mock("../../utils/commandMetadata", () => ({
  getCommandMetadata: vi.fn(),
}));

vi.mock("../../utils/commandSuggestions", () => ({
  formatCommandHelp: vi.fn(() => ""),
  formatCommandList: vi.fn(() => ""),
  getDidYouMeanMessage: vi.fn(() => null),
}));

vi.mock("../../utils/pipeHandler", () => ({
  applyPipeFilters: vi.fn((output: string) => output),
  hasPipes: vi.fn(() => false),
  validatePipeSyntax: vi.fn(() => null),
  validatePipeStages: vi.fn(() => null),
}));

vi.mock("../../cli/commandRouter", () => ({
  CommandRouter: vi.fn(() => ({
    register: vi.fn(),
    registerMany: vi.fn(),
    execute: vi.fn(() => null),
  })),
}));

// Mock all 20 simulators – factories must be fully self-contained (no external refs)
vi.mock("../../simulators/nvidiaSmiSimulator", () => ({
  NvidiaSmiSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
  })),
}));
vi.mock("../../simulators/dcgmiSimulator", () => ({
  DcgmiSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
  })),
}));
vi.mock("../../simulators/ipmitoolSimulator", () => ({
  IpmitoolSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
  })),
}));
vi.mock("../../simulators/infinibandSimulator", () => ({
  InfiniBandSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
  })),
}));
vi.mock("../../simulators/nvsmSimulator", () => ({
  NvsmSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
  })),
}));
vi.mock("../../simulators/mellanoxSimulator", () => ({
  MellanoxSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
  })),
}));
vi.mock("../../simulators/slurmSimulator", () => ({
  SlurmSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
    clearJobs: vi.fn(),
    syncFromContext: vi.fn(),
  })),
}));
vi.mock("../../simulators/containerSimulator", () => ({
  ContainerSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
  })),
}));
vi.mock("../../simulators/bcmSimulator", () => ({
  BcmSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
  })),
}));
vi.mock("../../simulators/cmshSimulator", () => ({
  CmshSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
  })),
}));
vi.mock("../../simulators/basicSystemSimulator", () => ({
  BasicSystemSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
  })),
}));
vi.mock("../../simulators/pciToolsSimulator", () => ({
  PciToolsSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
  })),
}));
vi.mock("../../simulators/benchmarkSimulator", () => ({
  BenchmarkSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
  })),
}));
vi.mock("../../simulators/storageSimulator", () => ({
  StorageSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
  })),
}));
vi.mock("../../simulators/nvlinkAuditSimulator", () => ({
  NvlinkAuditSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
  })),
}));
vi.mock("../../simulators/fabricManagerSimulator", () => ({
  FabricManagerSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
  })),
}));
vi.mock("../../simulators/nvidiaBugReportSimulator", () => ({
  NvidiaBugReportSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
  })),
}));
vi.mock("../../simulators/clusterKitSimulator", () => ({
  ClusterKitSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
  })),
}));
vi.mock("../../simulators/nemoSimulator", () => ({
  NeMoSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
  })),
}));
vi.mock("../../simulators/linuxUtilsSimulator", () => ({
  LinuxUtilsSimulator: vi.fn(() => ({
    execute: vi.fn(() => ""),
    getOutput: vi.fn(() => ""),
  })),
}));

import { Terminal } from "../Terminal";
import { generateWelcomeMessage } from "../../constants/terminalConfig";

describe("Terminal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSimulationState.activeScenario = null;
  });

  it("renders the terminal container", () => {
    const { container } = render(<Terminal />);
    expect(
      container.querySelector("[data-testid='terminal']"),
    ).toBeInTheDocument();
  });

  it("calls onReady with pasteCommand function when terminal initializes", async () => {
    const onReady = vi.fn();
    render(<Terminal onReady={onReady} />);
    await waitFor(() => {
      expect(onReady).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  it("pastes a command directly when no target node is given", async () => {
    let pasteCommand: (cmd: string, targetNode?: string) => void = () => {};
    render(<Terminal onReady={(fn) => (pasteCommand = fn)} />);
    await waitFor(() => expect(mockTerminal.onData).toHaveBeenCalled());

    mockTerminal.write.mockClear();
    act(() => pasteCommand("nvidia-smi"));

    // Command is written straight to the input; no ssh connect is performed.
    expect(mockTerminal.write).toHaveBeenCalledWith("nvidia-smi");
    const sshWrites = mockTerminal.write.mock.calls.filter((c) =>
      String(c[0]).startsWith("ssh "),
    );
    expect(sshWrites).toHaveLength(0);
  });

  it("pastes a command directly when the target node is the current node", async () => {
    let pasteCommand: (cmd: string, targetNode?: string) => void = () => {};
    render(<Terminal onReady={(fn) => (pasteCommand = fn)} />);
    await waitFor(() => expect(mockTerminal.onData).toHaveBeenCalled());

    mockTerminal.write.mockClear();
    // The terminal initializes connected to dgx-00 (the selected node).
    act(() => pasteCommand("nvidia-smi", "dgx-00"));

    expect(mockTerminal.write).toHaveBeenCalledWith("nvidia-smi");
    const sshWrites = mockTerminal.write.mock.calls.filter((c) =>
      String(c[0]).startsWith("ssh "),
    );
    expect(sshWrites).toHaveLength(0);
  });

  it("connects to the target node before staging the command when it differs", async () => {
    let pasteCommand: (cmd: string, targetNode?: string) => void = () => {};
    render(<Terminal onReady={(fn) => (pasteCommand = fn)} />);
    await waitFor(() => expect(mockTerminal.onData).toHaveBeenCalled());

    mockTerminal.write.mockClear();
    // Terminal is on dgx-00; ask to run on dgx-01.
    await act(async () => {
      pasteCommand("nvidia-smi", "dgx-01");
    });

    // The ssh connect is echoed immediately...
    expect(mockTerminal.write).toHaveBeenCalledWith("ssh dgx-01");
    // ...and the command is staged after the ssh resolves.
    await waitFor(() =>
      expect(mockTerminal.write).toHaveBeenCalledWith("nvidia-smi"),
    );
  });

  it("writes the full welcome banner when no scenario is active", async () => {
    render(<Terminal />);
    await waitFor(() => {
      expect(generateWelcomeMessage).toHaveBeenCalledWith(80, {
        variant: "full",
      });
    });
  });

  it("does not write a welcome banner while a mission is in progress", async () => {
    mockSimulationState.activeScenario = {
      id: "domain1-midnight-deployment",
      title: "Midnight Deployment",
    };
    const onReady = vi.fn();
    render(<Terminal onReady={onReady} />);
    // onReady fires at the end of the same init frame that would write the
    // banner, so once it has run we can assert the banner was skipped.
    await waitFor(() => {
      expect(onReady).toHaveBeenCalled();
    });
    expect(generateWelcomeMessage).not.toHaveBeenCalled();
  });
});
