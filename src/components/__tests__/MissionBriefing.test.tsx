import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MissionBriefing } from "../MissionBriefing";

// Mock useFocusTrap
const mockUseFocusTrap = vi.fn();
vi.mock("../../hooks/useFocusTrap", () => ({
  useFocusTrap: (...args: unknown[]) => mockUseFocusTrap(...args),
}));

const defaultProps = {
  title: "The Midnight Deployment",
  narrative: {
    hook: "A new cluster has arrived at midnight.",
    setting: "You're the lead engineer on call.",
    resolution: "Successfully bring the cluster online.",
  },
  tier: 1 as const,
  estimatedTime: 15,
  onBegin: vi.fn(),
};

describe("MissionBriefing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders mission title", () => {
    render(<MissionBriefing {...defaultProps} />);
    expect(screen.getByText("The Midnight Deployment")).toBeInTheDocument();
  });

  it("renders narrative setting text", () => {
    render(<MissionBriefing {...defaultProps} />);
    expect(
      screen.getByText("You're the lead engineer on call."),
    ).toBeInTheDocument();
  });

  it("renders Accept Mission button", () => {
    render(<MissionBriefing {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /accept mission/i }),
    ).toBeInTheDocument();
  });

  it("calls onBegin when Accept Mission clicked", () => {
    const onBegin = vi.fn();
    render(<MissionBriefing {...defaultProps} onBegin={onBegin} />);
    fireEvent.click(screen.getByRole("button", { name: /accept mission/i }));
    expect(onBegin).toHaveBeenCalledOnce();
  });

  it("renders tier badge", () => {
    render(<MissionBriefing {...defaultProps} tier={1} />);
    expect(screen.getByText("Guided")).toBeInTheDocument();
  });

  it("renders estimated time", () => {
    render(<MissionBriefing {...defaultProps} estimatedTime={15} />);
    expect(screen.getByText(/~15 min/)).toBeInTheDocument();
  });

  it("has correct ARIA attributes", () => {
    render(<MissionBriefing {...defaultProps} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("renders skip button when skippable is true", () => {
    const onSkip = vi.fn();
    render(
      <MissionBriefing {...defaultProps} skippable={true} onSkip={onSkip} />,
    );
    expect(screen.getByText(/skip this tutorial/i)).toBeInTheDocument();
  });

  it("does not render skip button when not skippable", () => {
    render(<MissionBriefing {...defaultProps} />);
    expect(screen.queryByText(/skip this tutorial/i)).not.toBeInTheDocument();
  });

  it("configures useFocusTrap", () => {
    render(<MissionBriefing {...defaultProps} />);
    expect(mockUseFocusTrap).toHaveBeenCalled();
    const [, options] = mockUseFocusTrap.mock.calls[0];
    expect(options.isActive).toBe(true);
    expect(typeof options.onEscape).toBe("function");
  });
});
