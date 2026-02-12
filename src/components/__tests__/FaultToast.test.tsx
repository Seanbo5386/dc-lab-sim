import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { FaultToastContainer } from "../FaultToast";
import { useFaultToastStore } from "@/store/faultToastStore";

describe("FaultToast", () => {
  beforeEach(() => {
    useFaultToastStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when there are no toasts", () => {
    const { container } = render(<FaultToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it("renders toast with title, message, and suggested command", () => {
    render(<FaultToastContainer />);

    act(() => {
      useFaultToastStore.getState().addToast({
        title: "XID Error Injected",
        message: "GPU 0 marked Critical with XID 48.",
        suggestedCommand: "nvidia-smi -q -d ECC",
        severity: "critical",
        xidCode: 48,
      });
    });

    expect(screen.getByText("XID Error Injected")).toBeInTheDocument();
    expect(
      screen.getByText("GPU 0 marked Critical with XID 48."),
    ).toBeInTheDocument();
    expect(screen.getByText("nvidia-smi -q -d ECC")).toBeInTheDocument();
  });

  it("shows 'View XID Info' button when xidCode is present", () => {
    render(<FaultToastContainer />);

    act(() => {
      useFaultToastStore.getState().addToast({
        title: "XID Error",
        message: "msg",
        suggestedCommand: "cmd",
        severity: "critical",
        xidCode: 48,
      });
    });

    expect(screen.getByTestId("toast-view-xid")).toBeInTheDocument();
    expect(screen.getByText("View XID Info")).toBeInTheDocument();
  });

  it("hides 'View XID Info' when xidCode is undefined", () => {
    render(<FaultToastContainer />);

    act(() => {
      useFaultToastStore.getState().addToast({
        title: "Info Toast",
        message: "msg",
        suggestedCommand: "cmd",
        severity: "info",
      });
    });

    expect(screen.queryByTestId("toast-view-xid")).not.toBeInTheDocument();
  });

  it("calls removeToast on close button click", () => {
    render(<FaultToastContainer />);

    act(() => {
      useFaultToastStore.getState().addToast({
        title: "Test Toast",
        message: "msg",
        suggestedCommand: "cmd",
        severity: "warning",
      });
    });

    expect(screen.getByText("Test Toast")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("toast-close"));

    // After animation duration
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(useFaultToastStore.getState().toasts).toHaveLength(0);
  });

  it("shows dashboard hint text", () => {
    render(<FaultToastContainer />);

    act(() => {
      useFaultToastStore.getState().addToast({
        title: "Test",
        message: "msg",
        suggestedCommand: "cmd",
        severity: "info",
      });
    });

    expect(
      screen.getByText("Check the Dashboard to see changes reflected live."),
    ).toBeInTheDocument();
  });
});
