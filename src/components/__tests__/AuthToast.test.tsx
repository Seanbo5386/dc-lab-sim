import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useAuthToastStore } from "../../store/authToastStore";

// Mock lucide-react
vi.mock("lucide-react", () => ({
  CheckCircle2: (props: Record<string, unknown>) => (
    <svg data-testid="icon-CheckCircle2" {...props} />
  ),
  Info: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Info" {...props} />
  ),
  AlertCircle: (props: Record<string, unknown>) => (
    <svg data-testid="icon-AlertCircle" {...props} />
  ),
}));

import { AuthToast } from "../AuthToast";

describe("AuthToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAuthToastStore.setState({
      visible: false,
      message: "",
      type: "success",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when not visible", () => {
    render(<AuthToast />);
    expect(screen.queryByTestId("auth-toast")).not.toBeInTheDocument();
  });

  it("renders success toast with message", () => {
    useAuthToastStore.setState({
      visible: true,
      message: "Signed in!",
      type: "success",
    });
    render(<AuthToast />);
    expect(screen.getByTestId("auth-toast")).toBeInTheDocument();
    expect(screen.getByText("Signed in!")).toBeInTheDocument();
    expect(screen.getByTestId("icon-CheckCircle2")).toBeInTheDocument();
  });

  it("renders error toast with AlertCircle icon", () => {
    useAuthToastStore.setState({
      visible: true,
      message: "Failed!",
      type: "error",
    });
    render(<AuthToast />);
    expect(screen.getByTestId("icon-AlertCircle")).toBeInTheDocument();
  });

  it("renders info toast with Info icon", () => {
    useAuthToastStore.setState({
      visible: true,
      message: "Code resent",
      type: "info",
    });
    render(<AuthToast />);
    expect(screen.getByTestId("icon-Info")).toBeInTheDocument();
  });

  it("auto-dismisses success toast after 3 seconds", () => {
    useAuthToastStore.setState({
      visible: true,
      message: "OK",
      type: "success",
    });
    render(<AuthToast />);
    expect(screen.getByTestId("auth-toast")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(useAuthToastStore.getState().visible).toBe(false);
  });

  it("auto-dismisses error toast after 5 seconds", () => {
    useAuthToastStore.setState({
      visible: true,
      message: "Err",
      type: "error",
    });
    render(<AuthToast />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(useAuthToastStore.getState().visible).toBe(false);
  });

  it("has correct accessibility attributes", () => {
    useAuthToastStore.setState({
      visible: true,
      message: "Test",
      type: "success",
    });
    render(<AuthToast />);
    const toast = screen.getByTestId("auth-toast");
    expect(toast).toHaveAttribute("role", "status");
    expect(toast).toHaveAttribute("aria-live", "polite");
  });
});
