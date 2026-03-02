import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MissionModeBar } from "../MissionModeBar";

vi.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: Record<string, unknown>) => (
      <svg data-testid={`icon-${name}`} {...props} />
    );
    Icon.displayName = name;
    return Icon;
  };
  return {
    ArrowLeft: createIcon("ArrowLeft"),
    BarChart3: createIcon("BarChart3"),
  };
});

const defaultProps = {
  title: "The Midnight Deployment",
  currentStep: 2,
  totalSteps: 10,
  tier: 1 as const,
  onAbort: vi.fn(),
  onToggleDashboard: vi.fn(),
};

describe("MissionModeBar", () => {
  it("renders mission title", () => {
    render(<MissionModeBar {...defaultProps} />);
    expect(screen.getByText("The Midnight Deployment")).toBeInTheDocument();
  });

  it("renders step progress text", () => {
    render(<MissionModeBar {...defaultProps} />);
    expect(screen.getByText("Step 3 of 10")).toBeInTheDocument();
  });

  it("renders correct number of step dots", () => {
    render(<MissionModeBar {...defaultProps} />);
    const dotsContainer = screen.getByTestId("step-dots");
    expect(dotsContainer.children).toHaveLength(10);
  });

  it("calls onAbort when abort button clicked", () => {
    const onAbort = vi.fn();
    render(<MissionModeBar {...defaultProps} onAbort={onAbort} />);
    fireEvent.click(screen.getByLabelText("Abort mission"));
    expect(onAbort).toHaveBeenCalled();
  });

  it("calls onToggleDashboard when cluster button clicked", () => {
    const onToggleDashboard = vi.fn();
    render(
      <MissionModeBar
        {...defaultProps}
        onToggleDashboard={onToggleDashboard}
      />,
    );
    fireEvent.click(screen.getByLabelText("Toggle cluster dashboard"));
    expect(onToggleDashboard).toHaveBeenCalled();
  });

  it("renders tier badge text for tier 1", () => {
    render(<MissionModeBar {...defaultProps} tier={1} />);
    expect(screen.getByText("Guided")).toBeInTheDocument();
  });

  it("renders tier badge text for tier 2", () => {
    render(<MissionModeBar {...defaultProps} tier={2} />);
    expect(screen.getByText("Choice")).toBeInTheDocument();
  });

  it("renders tier badge text for tier 3", () => {
    render(<MissionModeBar {...defaultProps} tier={3} />);
    expect(screen.getByText("Realistic")).toBeInTheDocument();
  });

  it("renders Standard badge when no tier is provided", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tier: _, ...propsWithoutTier } = defaultProps;
    render(<MissionModeBar {...propsWithoutTier} />);
    expect(screen.getByText("Standard")).toBeInTheDocument();
  });
});
