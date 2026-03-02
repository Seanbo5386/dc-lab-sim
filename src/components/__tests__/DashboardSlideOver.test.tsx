import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardSlideOver } from "../DashboardSlideOver";

vi.mock("../Dashboard", () => ({
  Dashboard: () => <div data-testid="dashboard-content">Dashboard</div>,
}));

describe("DashboardSlideOver", () => {
  it("renders dashboard content when open", () => {
    render(<DashboardSlideOver isOpen={true} onClose={() => {}} />);
    expect(screen.getByTestId("dashboard-content")).toBeInTheDocument();
    expect(screen.getByText("Cluster State")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    const { container } = render(
      <DashboardSlideOver isOpen={false} onClose={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<DashboardSlideOver isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("slide-over-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<DashboardSlideOver isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close dashboard"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    render(<DashboardSlideOver isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
