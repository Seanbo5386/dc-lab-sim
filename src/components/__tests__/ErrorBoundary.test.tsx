import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary";

// Suppress console.error from ErrorBoundary.componentDidCatch
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>Child content</div>;
};

describe("ErrorBoundary", () => {
  it("should render children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("should catch rendering errors and display fallback", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("should show Try Again button on error", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("should show error details in dev mode", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Error: Test error")).toBeInTheDocument();
  });

  it("should offer a Reset application data button on error (F5 recovery)", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(
      screen.getByRole("button", { name: /reset application data/i }),
    ).toBeInTheDocument();
  });

  it("should clear persisted state and reload when Reset application data is clicked", () => {
    const removeItem = vi
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(() => {});
    const reload = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload },
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /reset application data/i }),
    );

    expect(removeItem).toHaveBeenCalledWith("nvidia-simulator-storage");
    expect(reload).toHaveBeenCalled();

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    removeItem.mockRestore();
  });
});
