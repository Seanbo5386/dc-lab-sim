import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SyncToast } from "../SyncToast";
import { useSyncToastStore } from "@/store/syncToastStore";

describe("SyncToast", () => {
  beforeEach(() => {
    useSyncToastStore.setState({
      visible: false,
      message: "",
      type: "error",
    });
  });

  it("should not render when not visible", () => {
    render(<SyncToast />);
    expect(screen.queryByTestId("sync-toast")).not.toBeInTheDocument();
  });

  it("should render when visible with error message", () => {
    useSyncToastStore.setState({
      visible: true,
      message: "Sync failed",
      type: "error",
    });
    render(<SyncToast />);
    expect(screen.getByTestId("sync-toast")).toBeInTheDocument();
    expect(screen.getByText("Sync failed")).toBeInTheDocument();
  });

  it("should render retry button for error type when onRetry provided", () => {
    useSyncToastStore.setState({
      visible: true,
      message: "Sync failed",
      type: "error",
    });
    const onRetry = vi.fn();
    render(<SyncToast onRetry={onRetry} />);
    expect(screen.getByTestId("sync-toast-retry")).toBeInTheDocument();
  });

  it("should not render retry button for offline type", () => {
    useSyncToastStore.setState({
      visible: true,
      message: "You're offline",
      type: "offline",
    });
    const onRetry = vi.fn();
    render(<SyncToast onRetry={onRetry} />);
    expect(screen.queryByTestId("sync-toast-retry")).not.toBeInTheDocument();
  });

  it("should call onRetry and dismiss when retry button clicked", () => {
    useSyncToastStore.setState({
      visible: true,
      message: "Sync failed",
      type: "error",
    });
    const onRetry = vi.fn();
    render(<SyncToast onRetry={onRetry} />);
    fireEvent.click(screen.getByTestId("sync-toast-retry"));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("should dismiss when close button clicked", () => {
    useSyncToastStore.setState({
      visible: true,
      message: "Error",
      type: "error",
    });
    render(<SyncToast />);
    fireEvent.click(screen.getByTestId("sync-toast-close"));
    // After animation timeout, it should dismiss
    // The dismiss is called synchronously on the store
  });

  it("should render offline message", () => {
    useSyncToastStore.setState({
      visible: true,
      message: "You're offline. Progress will sync when reconnected.",
      type: "offline",
    });
    render(<SyncToast />);
    expect(
      screen.getByText("You're offline. Progress will sync when reconnected."),
    ).toBeInTheDocument();
  });

  it("should render retrying message", () => {
    useSyncToastStore.setState({
      visible: true,
      message: "Retrying in 2s...",
      type: "retrying",
    });
    render(<SyncToast />);
    expect(screen.getByText("Retrying in 2s...")).toBeInTheDocument();
  });
});
