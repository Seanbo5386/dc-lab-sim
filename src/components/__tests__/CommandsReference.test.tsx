import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("lucide-react", () => {
  const mk = (n: string) => {
    const C = () => null;
    C.displayName = n;
    return C;
  };
  return {
    Terminal: mk("Terminal"),
    ChevronRight: mk("ChevronRight"),
    ChevronDown: mk("ChevronDown"),
    Search: mk("Search"),
    Lightbulb: mk("Lightbulb"),
    Loader2: mk("Loader2"),
  };
});

const mockCommands = [
  {
    command: "nvidia-smi",
    category: "gpu_management",
    description: "NVIDIA System Management Interface",
    synopsis: "nvidia-smi [OPTION...]",
    global_options: [
      { flag: "-q", description: "Detailed query mode" },
      { flag: "-L", description: "List all GPUs" },
    ],
    subcommands: [{ name: "topo", description: "Show GPU topology" }],
    common_usage_patterns: [
      { command: "nvidia-smi", description: "Basic GPU status" },
      { command: "nvidia-smi -q", description: "Detailed query" },
    ],
    interoperability: { related_commands: ["dcgmi", "nvtop"] },
  },
  {
    command: "dcgmi",
    category: "gpu_management",
    description: "Data Center GPU Manager CLI",
    synopsis: "dcgmi [subcommand] [OPTIONS]",
    global_options: [],
    subcommands: [
      { name: "diag", description: "Run diagnostics" },
      { name: "health", description: "Health checks" },
    ],
    common_usage_patterns: [
      { command: "dcgmi diag -r 1", description: "Quick diagnostic" },
    ],
  },
  {
    command: "ibstat",
    category: "networking",
    description: "InfiniBand port status",
    synopsis: "ibstat [OPTIONS]",
    global_options: [
      { short: "p", long: "port", description: "Show specific port" },
    ],
    common_usage_patterns: [
      { command: "ibstat", description: "Show IB port status" },
    ],
  },
];

const mockRegistry = {
  getByCategory: vi.fn((category: string) =>
    mockCommands.filter((c) => c.category === category),
  ),
  getCommandNames: vi.fn(() => mockCommands.map((c) => c.command)),
  isInitialized: true,
};

vi.mock("@/cli", () => ({
  getCommandDefinitionRegistry: vi.fn(() => Promise.resolve(mockRegistry)),
}));

vi.mock("@/data/taskCategories.json", () => ({
  default: {
    categories: [
      {
        title: "Check GPU Health",
        decisionGuide: "Quick snapshot → nvidia-smi | Deep diagnostics → dcgmi",
      },
      {
        title: "Diagnose Network",
        decisionGuide: "Port status → ibstat | Fabric → ibdiagnet",
      },
    ],
  },
}));

import { getCommandDefinitionRegistry } from "@/cli";
import { CommandsReference } from "../CommandsReference";

// ============================================================================
// Tests
// ============================================================================

describe("CommandsReference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. Loading state
  // --------------------------------------------------------------------------

  it("renders loading state initially", () => {
    // Make the registry promise stay pending
    vi.mocked(getCommandDefinitionRegistry).mockReturnValueOnce(
      new Promise(() => {}),
    );

    render(<CommandsReference />);
    expect(
      screen.getByText("Loading command reference..."),
    ).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 2. Category headers after loading
  // --------------------------------------------------------------------------

  it("shows category headers after registry loads", async () => {
    render(<CommandsReference />);

    await waitFor(() => {
      expect(screen.getByText("GPU Management")).toBeInTheDocument();
    });
    expect(screen.getByText("Networking & InfiniBand")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 3. Command count display
  // --------------------------------------------------------------------------

  it("shows total command count", async () => {
    render(<CommandsReference />);

    await waitFor(() => {
      expect(
        screen.getByText("3 commands across 2 categories"),
      ).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 4. Search filters commands by name
  // --------------------------------------------------------------------------

  it("search filters commands by name", async () => {
    render(<CommandsReference />);

    await waitFor(() => {
      expect(screen.getByText("GPU Management")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search commands...");
    fireEvent.change(searchInput, { target: { value: "ibstat" } });

    // Networking category should remain (has ibstat)
    expect(screen.getByText("Networking & InfiniBand")).toBeInTheDocument();
    // GPU Management should be filtered out
    expect(screen.queryByText("GPU Management")).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 5. Category expansion shows command list
  // --------------------------------------------------------------------------

  it("category expansion shows command list", async () => {
    render(<CommandsReference />);

    await waitFor(() => {
      expect(screen.getByText("GPU Management")).toBeInTheDocument();
    });

    // Click to expand GPU Management
    fireEvent.click(screen.getByText("GPU Management").closest("button")!);

    // Commands should appear
    expect(screen.getByText("nvidia-smi")).toBeInTheDocument();
    expect(screen.getByText("dcgmi")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 6. Category collapse hides command list
  // --------------------------------------------------------------------------

  it("category collapse hides command list", async () => {
    render(<CommandsReference />);

    await waitFor(() => {
      expect(screen.getByText("GPU Management")).toBeInTheDocument();
    });

    const categoryBtn = screen.getByText("GPU Management").closest("button")!;

    // Expand
    fireEvent.click(categoryBtn);
    expect(screen.getByText("nvidia-smi")).toBeInTheDocument();

    // Collapse
    fireEvent.click(categoryBtn);
    expect(screen.queryByText("nvidia-smi")).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 7. Command expansion shows synopsis and options
  // --------------------------------------------------------------------------

  it("command expansion shows synopsis and options", async () => {
    render(<CommandsReference />);

    await waitFor(() => {
      expect(screen.getByText("GPU Management")).toBeInTheDocument();
    });

    // Expand category
    fireEvent.click(screen.getByText("GPU Management").closest("button")!);

    // Expand nvidia-smi command
    fireEvent.click(screen.getByText("nvidia-smi").closest("button")!);

    // Synopsis
    expect(screen.getByText("nvidia-smi [OPTION...]")).toBeInTheDocument();
    // Options
    expect(screen.getByText("-q")).toBeInTheDocument();
    expect(screen.getByText("Detailed query mode")).toBeInTheDocument();
    // Subcommands
    expect(screen.getByText("topo")).toBeInTheDocument();
    expect(screen.getByText("Show GPU topology")).toBeInTheDocument();
    // Usage examples
    expect(screen.getByText("Basic GPU status")).toBeInTheDocument();
    // Related (dcgmi also appears as a command name in the list)
    expect(screen.getAllByText("dcgmi").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("nvtop")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 8. Quick Decision Guide
  // --------------------------------------------------------------------------

  it("shows Quick Decision Guide that expands on click", async () => {
    render(<CommandsReference />);

    await waitFor(() => {
      expect(screen.getByText("Quick Decision Guide")).toBeInTheDocument();
    });

    // Expand the guide
    fireEvent.click(
      screen.getByText("Quick Decision Guide").closest("button")!,
    );

    expect(screen.getByText("Check GPU Health")).toBeInTheDocument();
    expect(screen.getByText("Diagnose Network")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Quick snapshot → nvidia-smi | Deep diagnostics → dcgmi",
      ),
    ).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 9. No results message
  // --------------------------------------------------------------------------

  it("shows no-results message when search has no matches", async () => {
    render(<CommandsReference />);

    await waitFor(() => {
      expect(screen.getByText("GPU Management")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search commands...");
    fireEvent.change(searchInput, { target: { value: "nonexistent-xyz" } });

    expect(screen.queryByText("GPU Management")).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 10. Search filters by description
  // --------------------------------------------------------------------------

  it("search filters commands by description", async () => {
    render(<CommandsReference />);

    await waitFor(() => {
      expect(screen.getByText("GPU Management")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search commands...");
    fireEvent.change(searchInput, {
      target: { value: "InfiniBand port status" },
    });

    expect(screen.getByText("Networking & InfiniBand")).toBeInTheDocument();
    expect(screen.queryByText("GPU Management")).not.toBeInTheDocument();
  });
});
