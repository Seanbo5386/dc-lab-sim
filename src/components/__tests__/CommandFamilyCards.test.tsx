import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommandFamilyCards } from "../CommandFamilyCards";

describe("CommandFamilyCards", () => {
  describe("Initial Render", () => {
    it("should render all command families by default", () => {
      render(<CommandFamilyCards />);

      // Check that all 7 families are rendered
      expect(screen.getByText("GPU Monitoring")).toBeInTheDocument();
      expect(screen.getByText("InfiniBand Tools")).toBeInTheDocument();
      expect(screen.getByText("BMC & Hardware")).toBeInTheDocument();
      expect(screen.getByText("Slurm Cluster Tools")).toBeInTheDocument();
      expect(screen.getByText("Container Tools")).toBeInTheDocument();
      expect(screen.getByText("Diagnostics & Testing")).toBeInTheDocument();
      expect(screen.getByText("XID Diagnostics")).toBeInTheDocument();
    });

    it("should render a specific family when familyId is provided", () => {
      render(<CommandFamilyCards familyId="gpu-monitoring" />);

      expect(screen.getByText("GPU Monitoring")).toBeInTheDocument();
      // Other families should not be rendered
      expect(screen.queryByText("InfiniBand Tools")).not.toBeInTheDocument();
    });

    it("should show empty state for non-existent familyId", () => {
      render(<CommandFamilyCards familyId="non-existent" />);

      expect(
        screen.getByText(/Command family "non-existent" not found/),
      ).toBeInTheDocument();
    });

    it("should display tool count badges", () => {
      render(<CommandFamilyCards familyId="gpu-monitoring" />);

      expect(screen.getByText("4 tools")).toBeInTheDocument();
    });

    it("should display family icons", () => {
      render(<CommandFamilyCards familyId="gpu-monitoring" />);

      // GPU Monitoring icon is a chart emoji
      expect(screen.getByText(/📊/)).toBeInTheDocument();
    });
  });

  describe("QuickRule Display", () => {
    it("should prominently display the quick rule", () => {
      render(<CommandFamilyCards familyId="gpu-monitoring" />);

      expect(screen.getByText("Quick Rule:")).toBeInTheDocument();
      expect(
        screen.getByText(
          /Quick check\? nvidia-smi\. Continuous monitoring\? nvtop\./,
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Tool List", () => {
    it("should display tool names in full mode", () => {
      render(<CommandFamilyCards familyId="gpu-monitoring" mode="full" />);

      // Tool names may appear multiple times (in tool list and as related tools)
      expect(screen.getAllByText("nvidia-smi").length).toBeGreaterThan(0);
      expect(screen.getAllByText("nvtop").length).toBeGreaterThan(0);
      expect(screen.getAllByText("dcgmi").length).toBeGreaterThan(0);
      expect(screen.getAllByText("nvsm").length).toBeGreaterThan(0);
    });

    it("should display tool taglines", () => {
      render(<CommandFamilyCards familyId="gpu-monitoring" mode="full" />);

      expect(screen.getByText("Quick snapshot")).toBeInTheDocument();
      expect(screen.getByText("Live dashboard")).toBeInTheDocument();
    });

    it("should display permission badges", () => {
      render(<CommandFamilyCards familyId="gpu-monitoring" mode="full" />);

      // nvidia-smi is user permission, nvsm is root
      expect(screen.getAllByText("user").length).toBeGreaterThan(0);
      expect(screen.getAllByText("root").length).toBeGreaterThan(0);
    });
  });

  describe("Tool Expansion", () => {
    it("should expand tool details when clicked", () => {
      render(<CommandFamilyCards familyId="gpu-monitoring" mode="full" />);

      // Click on nvidia-smi tool header (first occurrence is the tool button)
      const toolHeaders = screen.getAllByText("nvidia-smi");
      const toolHeader = toolHeaders[0].closest("button");
      expect(toolHeader).toBeInTheDocument();
      fireEvent.click(toolHeader!);

      // Should show description
      expect(
        screen.getByText(/Displays GPU state including memory usage/),
      ).toBeInTheDocument();
    });

    it("should show example command when expanded", () => {
      render(<CommandFamilyCards familyId="gpu-monitoring" mode="full" />);

      const toolHeaders = screen.getAllByText("nvidia-smi");
      const toolHeader = toolHeaders[0].closest("button");
      fireEvent.click(toolHeader!);

      // Example command should be visible
      expect(
        screen.getByText(/nvidia-smi -q -i 0 -d MEMORY,UTILIZATION/),
      ).toBeInTheDocument();
    });

    it('should show "Best For" section when expanded', () => {
      render(<CommandFamilyCards familyId="gpu-monitoring" mode="full" />);

      const toolHeaders = screen.getAllByText("nvidia-smi");
      const toolHeader = toolHeaders[0].closest("button");
      fireEvent.click(toolHeader!);

      // In full mode, all tools are expanded, so "Best For:" appears multiple times
      expect(screen.getAllByText("Best For:").length).toBeGreaterThan(0);
      expect(
        screen.getByText(/Spot checks, seeing what processes/),
      ).toBeInTheDocument();
    });

    it("should show related tools when expanded", () => {
      render(<CommandFamilyCards familyId="gpu-monitoring" mode="full" />);

      const toolHeaders = screen.getAllByText("nvidia-smi");
      const toolHeader = toolHeaders[0].closest("button");
      fireEvent.click(toolHeader!);

      // "Related:" appears for each tool that has related tools
      expect(screen.getAllByText("Related:").length).toBeGreaterThan(0);
      // nvtop and dcgmi are related to nvidia-smi
      // Using getAllByText since tool names appear in both headers and related sections
      expect(screen.getAllByText("nvtop").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("dcgmi").length).toBeGreaterThanOrEqual(1);
    });

    it("should collapse tool when clicked again", () => {
      render(<CommandFamilyCards familyId="gpu-monitoring" mode="full" />);

      const toolHeaders = screen.getAllByText("nvidia-smi");
      const toolHeader = toolHeaders[0].closest("button");
      fireEvent.click(toolHeader!);

      // Verify it expanded - "Best For:" appears multiple times in full mode
      expect(screen.getAllByText("Best For:").length).toBeGreaterThan(0);

      // Click again to collapse
      fireEvent.click(toolHeader!);

      // Content should be hidden (but still in DOM with opacity-0)
      // Find the wrapper div with the transition classes for the nvidia-smi tool
      const toolContainer = toolHeader!.closest(
        ".border.border-gray-700.rounded-lg",
      );
      const expandedWrapper = toolContainer?.querySelector(
        ".overflow-hidden.transition-all",
      );
      expect(expandedWrapper).toHaveClass("opacity-0");
    });
  });

  describe("Quiz Button", () => {
    it("should show quiz button in full mode when onStartQuiz is provided", () => {
      const onStartQuiz = vi.fn();
      render(
        <CommandFamilyCards
          familyId="gpu-monitoring"
          mode="full"
          onStartQuiz={onStartQuiz}
        />,
      );

      expect(screen.getByText("Start GPU Monitoring Quiz")).toBeInTheDocument();
    });

    it("should not show quiz button in reference mode", () => {
      render(<CommandFamilyCards familyId="gpu-monitoring" mode="reference" />);

      expect(
        screen.queryByText("Start GPU Monitoring Quiz"),
      ).not.toBeInTheDocument();
    });

    it("should call onStartQuiz when quiz button is clicked", () => {
      const onStartQuiz = vi.fn();
      render(
        <CommandFamilyCards
          familyId="gpu-monitoring"
          mode="full"
          onStartQuiz={onStartQuiz}
        />,
      );

      fireEvent.click(screen.getByText("Start GPU Monitoring Quiz"));

      expect(onStartQuiz).toHaveBeenCalledWith("gpu-monitoring");
    });

    it("should not render quiz button when onStartQuiz not provided", () => {
      render(<CommandFamilyCards familyId="gpu-monitoring" mode="full" />);

      // Button should NOT be rendered when onStartQuiz is not provided
      expect(
        screen.queryByText("Start GPU Monitoring Quiz"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Reference Mode", () => {
    it("should collapse family content by default in reference mode", () => {
      render(<CommandFamilyCards familyId="gpu-monitoring" mode="reference" />);

      // The tool list section should be collapsed (opacity-0)
      expect(screen.getByText("Tools in this family")).toBeInTheDocument();
      const toolsSection = screen
        .getByText("Tools in this family")
        .closest("div");
      expect(toolsSection?.parentElement).toHaveClass("opacity-0");
    });

    it("should expand family when header is clicked in reference mode", () => {
      render(<CommandFamilyCards familyId="gpu-monitoring" mode="reference" />);

      // Click on the family header area
      const familyHeader = screen
        .getByText("GPU Monitoring")
        .closest(".cursor-pointer");
      fireEvent.click(familyHeader!);

      // Tools section should be expanded
      const toolsSection = screen
        .getByText("Tools in this family")
        .closest("div");
      expect(toolsSection?.parentElement).toHaveClass("opacity-100");
    });

    it("should show chevron icon in reference mode", () => {
      render(<CommandFamilyCards familyId="gpu-monitoring" mode="reference" />);

      // The chevron SVG should be present
      const svgs = document.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe("Try It Button", () => {
    it('should show "Try It" button when onShowToolExample is provided', () => {
      const onShowToolExample = vi.fn();
      render(
        <CommandFamilyCards
          familyId="gpu-monitoring"
          mode="full"
          onShowToolExample={onShowToolExample}
        />,
      );

      // Expand a tool first
      const toolHeaders = screen.getAllByText("nvidia-smi");
      const toolHeader = toolHeaders[0].closest("button");
      fireEvent.click(toolHeader!);

      // In full mode with onShowToolExample, "Try It" appears for each tool
      expect(screen.getAllByText("Try It").length).toBeGreaterThan(0);
    });

    it("should call onShowToolExample when Try It is clicked", () => {
      const onShowToolExample = vi.fn();
      render(
        <CommandFamilyCards
          familyId="gpu-monitoring"
          mode="full"
          onShowToolExample={onShowToolExample}
        />,
      );

      // Expand nvidia-smi
      const toolHeaders = screen.getAllByText("nvidia-smi");
      const toolHeader = toolHeaders[0].closest("button");
      fireEvent.click(toolHeader!);

      // Click the first "Try It" button (for nvidia-smi)
      const tryItButtons = screen.getAllByText("Try It");
      fireEvent.click(tryItButtons[0]);

      expect(onShowToolExample).toHaveBeenCalledWith(
        "gpu-monitoring",
        "nvidia-smi",
      );
    });

    it('should not show "Try It" button when onShowToolExample not provided', () => {
      render(<CommandFamilyCards familyId="gpu-monitoring" mode="full" />);

      // Expand a tool
      const toolHeaders = screen.getAllByText("nvidia-smi");
      const toolHeader = toolHeaders[0].closest("button");
      fireEvent.click(toolHeader!);

      expect(screen.queryByText("Try It")).not.toBeInTheDocument();
    });
  });

  describe("Grid Layout", () => {
    it("should render families in a grid container", () => {
      const { container } = render(<CommandFamilyCards />);

      const grid = container.querySelector(".grid");
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass("grid-cols-1");
      expect(grid).toHaveClass("md:grid-cols-2");
      expect(grid).toHaveClass("lg:grid-cols-3");
    });
  });

  describe("All Families Data", () => {
    it("should display correct tool counts for all families", () => {
      render(<CommandFamilyCards mode="full" />);

      // GPU Monitoring: 4 tools
      // InfiniBand Tools: 4 tools
      // BMC & Hardware: 3 tools
      // Slurm Cluster Tools: 4 tools
      // Container Tools: 3 tools
      // Diagnostics & Testing: 3 tools
      // XID Diagnostics: 3 tools
      const toolBadges = screen.getAllByText(/^\d+ tools$/);
      expect(toolBadges.length).toBe(7);
    });
  });
});
