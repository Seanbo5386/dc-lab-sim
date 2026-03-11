import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

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

// Mock @xterm/xterm – the Terminal constructor returns a lightweight stub
vi.mock("@xterm/xterm", () => {
  const mockTerminal = {
    open: vi.fn(),
    write: vi.fn(),
    writeln: vi.fn(),
    onData: vi.fn(() => ({ dispose: vi.fn() })),
    onKey: vi.fn(() => ({ dispose: vi.fn() })),
    input: vi.fn(),
    dispose: vi.fn(),
    loadAddon: vi.fn(),
    options: {},
    cols: 80,
    rows: 24,
    element: document.createElement("div"),
  };
  return { Terminal: vi.fn(() => mockTerminal) };
});

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: vi.fn(() => ({ fit: vi.fn(), dispose: vi.fn() })),
}));

vi.mock("@xterm/addon-web-links", () => ({
  WebLinksAddon: vi.fn(() => ({ dispose: vi.fn() })),
}));

// Mock stores
vi.mock("../../store/simulationStore", () => {
  const mockState = {
    selectedNode: "dgx-00",
    cluster: {
      nodes: [{ id: "dgx-00", hostname: "dgx-00", systemType: "DGX-A100" }],
    },
    activeScenario: null,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hook: any = vi.fn((selector?: any) =>
    selector ? selector(mockState) : mockState,
  );
  hook.getState = vi.fn(() => mockState);
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

describe("Terminal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
