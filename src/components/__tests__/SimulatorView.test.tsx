import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
} from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { act } from "react";
import { SimulatorView } from "../SimulatorView";
import { useSimulationStore } from "../../store/simulationStore";

// ResizeObserver is not available in jsdom
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Mock child components to isolate SimulatorView testing
vi.mock("../Dashboard", () => ({
  Dashboard: () => <div data-testid="dashboard">Dashboard Panel</div>,
}));

vi.mock("../Terminal", () => ({
  Terminal: () => <div data-testid="terminal">Terminal Panel</div>,
}));

vi.mock("../FaultInjection", () => ({
  FaultInjection: () => <div data-testid="fault-injection">Sandbox Panel</div>,
}));

// Mock useSimulationStore - default: no active scenario
vi.mock("../../store/simulationStore", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSimulationStore: vi.fn((selector?: any) =>
    selector ? selector({ activeScenario: null }) : { activeScenario: null },
  ),
}));

describe("SimulatorView", () => {
  it("should render both dashboard and terminal panels", () => {
    render(<SimulatorView />);
    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("terminal")).toBeInTheDocument();
  });

  it("should render with custom className", () => {
    const { container } = render(<SimulatorView className="test-class" />);
    expect(container.firstChild).toHaveClass("test-class");
  });

  it("should render the resize handle", () => {
    const { container } = render(<SimulatorView />);
    // Fallback layout renders a GripVertical SVG as the resize indicator
    const gripIcon = container.querySelector(".lucide-grip-vertical");
    expect(gripIcon).toBeInTheDocument();
  });

  describe("desktop fallback layout tab buttons", () => {
    it("should render Terminal and Sandbox tab buttons", () => {
      render(<SimulatorView />);
      // The fallback layout (containerWidth === 0) renders static tab buttons
      const terminalButton = screen.getByRole("button", { name: /Terminal/i });
      const faultButton = screen.getByRole("button", { name: /Sandbox/i });
      expect(terminalButton).toBeInTheDocument();
      expect(faultButton).toBeInTheDocument();
    });

    it("should show Terminal tab as active by default with nvidia-green styling", () => {
      render(<SimulatorView />);
      const terminalButton = screen.getByRole("button", { name: /Terminal/i });
      expect(terminalButton).toHaveClass("text-nvidia-green");
      expect(terminalButton).toHaveClass("border-nvidia-green");
    });
  });

  describe("mobile layout tab behavior", () => {
    let originalInnerWidth: number;

    beforeEach(() => {
      originalInnerWidth = window.innerWidth;
      // Set mobile viewport width
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 500,
      });
      // Reset the store mock to default (no active scenario)
      const mockStore = vi.mocked(useSimulationStore);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockStore.mockImplementation((selector?: any) =>
        selector
          ? selector({ activeScenario: null })
          : { activeScenario: null },
      );
    });

    afterEach(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      });
    });

    it("should render Dashboard, Terminal, and Sandbox tabs in mobile layout", () => {
      render(<SimulatorView />);
      expect(
        screen.getByRole("button", { name: /Dashboard/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Terminal/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Sandbox/i }),
      ).toBeInTheDocument();
    });

    it("should show FaultInjection component when clicking Sandbox tab", () => {
      render(<SimulatorView />);

      const faultsTab = screen.getByRole("button", { name: /Sandbox/i });
      fireEvent.click(faultsTab);

      expect(screen.getByTestId("fault-injection")).toBeInTheDocument();
    });

    it("should disable Sandbox tab with lock icon when activeScenario is set", () => {
      const mockStore = vi.mocked(useSimulationStore);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockStore.mockImplementation((selector?: any) =>
        selector
          ? selector({ activeScenario: { id: "test-scenario" } })
          : { activeScenario: { id: "test-scenario" } },
      );

      const { container } = render(<SimulatorView />);

      const faultsTab = screen.getByRole("button", { name: /Sandbox/i });
      expect(faultsTab).toBeDisabled();

      // Lock icon should be present within the faults tab area
      const lockIcon = container.querySelector(".lucide-lock");
      expect(lockIcon).toBeInTheDocument();
    });

    it("should auto-switch from Sandbox tab to Terminal when scenario activates", () => {
      const mockStore = vi.mocked(useSimulationStore);

      // Start with no scenario
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockStore.mockImplementation((selector?: any) =>
        selector
          ? selector({ activeScenario: null })
          : { activeScenario: null },
      );

      const { rerender } = render(<SimulatorView />);

      // Navigate to Sandbox tab
      const faultsTab = screen.getByRole("button", { name: /Sandbox/i });
      fireEvent.click(faultsTab);
      expect(screen.getByTestId("fault-injection")).toBeInTheDocument();

      // Now simulate a scenario becoming active
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockStore.mockImplementation((selector?: any) =>
        selector
          ? selector({ activeScenario: { id: "test-scenario" } })
          : { activeScenario: { id: "test-scenario" } },
      );

      // Re-render to trigger the useEffect
      act(() => {
        rerender(<SimulatorView />);
      });

      // Should have auto-switched to Terminal tab
      expect(screen.getByTestId("terminal")).toBeInTheDocument();
      // FaultInjection should no longer be visible
      expect(screen.queryByTestId("fault-injection")).not.toBeInTheDocument();
    });
  });
});
