import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { SimulatorView } from "../SimulatorView";

// ResizeObserver is not available in jsdom
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
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
});
