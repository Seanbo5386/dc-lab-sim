import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { XidErrorModal } from "../XidErrorModal";

describe("XidErrorModal", () => {
  it("does not render when xidCode is null", () => {
    const { container } = render(
      <XidErrorModal xidCode={null} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders modal with XID details when xidCode is set", () => {
    render(<XidErrorModal xidCode={48} onClose={vi.fn()} />);

    expect(screen.getByText("XID 48")).toBeInTheDocument();
    expect(screen.getByText("Double-Bit ECC Error")).toBeInTheDocument();
    expect(screen.getByText("Memory")).toBeInTheDocument();
    expect(screen.getByText("Recommended Actions")).toBeInTheDocument();
  });

  it("calls onClose on backdrop click", () => {
    const onClose = vi.fn();
    render(<XidErrorModal xidCode={48} onClose={onClose} />);

    fireEvent.click(screen.getByTestId("xid-modal-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when clicking modal content", () => {
    const onClose = vi.fn();
    render(<XidErrorModal xidCode={48} onClose={onClose} />);

    // Click on the dialog content, not backdrop
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    render(<XidErrorModal xidCode={48} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on close button click", () => {
    const onClose = vi.fn();
    render(<XidErrorModal xidCode={48} onClose={onClose} />);

    fireEvent.click(screen.getByTestId("xid-modal-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows exam relevance badge for high-relevance XIDs", () => {
    render(<XidErrorModal xidCode={48} onClose={vi.fn()} />);

    expect(screen.getByText("Exam Relevant")).toBeInTheDocument();
  });

  it("shows related commands", () => {
    render(<XidErrorModal xidCode={48} onClose={vi.fn()} />);

    expect(screen.getByText("Related Commands")).toBeInTheDocument();
    expect(screen.getByText("nvidia-smi -q -d ECC")).toBeInTheDocument();
  });

  it("shows fallback message for unknown XID code", () => {
    render(<XidErrorModal xidCode={99999} onClose={vi.fn()} />);

    expect(
      screen.getByText("No data found for XID 99999."),
    ).toBeInTheDocument();
  });
});
