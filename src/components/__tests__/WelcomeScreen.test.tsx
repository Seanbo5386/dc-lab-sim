import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WelcomeScreen } from "../WelcomeScreen";

// ============================================================================
// Mocks
// ============================================================================

// Mock lucide-react icons explicitly to avoid SVG rendering issues in jsdom
vi.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: Record<string, unknown>) => (
      <svg data-testid={`icon-${name}`} {...props} />
    );
    Icon.displayName = name;
    return Icon;
  };
  return {
    Terminal: createIcon("Terminal"),
    Monitor: createIcon("Monitor"),
    BookOpen: createIcon("BookOpen"),
    Cpu: createIcon("Cpu"),
    ShieldCheck: createIcon("ShieldCheck"),
    Activity: createIcon("Activity"),
    ArrowRight: createIcon("ArrowRight"),
  };
});

// Mock useFocusTrap hook to avoid side-effect issues in jsdom
const mockUseFocusTrap = vi.fn();
vi.mock("../../hooks/useFocusTrap", () => ({
  useFocusTrap: (...args: unknown[]) => mockUseFocusTrap(...args),
}));

// ============================================================================
// Tests
// ============================================================================

describe("WelcomeScreen", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Basic rendering
  // --------------------------------------------------------------------------

  it("renders without crashing", () => {
    const { container } = render(<WelcomeScreen onClose={onClose} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows the welcome title/heading", () => {
    render(<WelcomeScreen onClose={onClose} />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toContain("DC Lab");
    expect(heading.textContent).toContain("Sim");
  });

  it("shows the 'Enter Virtual Datacenter' dismiss button", () => {
    render(<WelcomeScreen onClose={onClose} />);
    expect(
      screen.getByRole("button", { name: /enter virtual datacenter/i }),
    ).toBeInTheDocument();
  });

  it("invokes onClose when dismiss button is clicked (after animation delay)", async () => {
    render(<WelcomeScreen onClose={onClose} />);
    const button = screen.getByRole("button", {
      name: /enter virtual datacenter/i,
    });

    fireEvent.click(button);

    // onClose is called after a 500ms setTimeout
    await waitFor(
      () => {
        expect(onClose).toHaveBeenCalledTimes(1);
      },
      { timeout: 1000 },
    );
  });

  // --------------------------------------------------------------------------
  // Content verification
  // --------------------------------------------------------------------------

  it("shows the description text about NCP-AII certification", () => {
    render(<WelcomeScreen onClose={onClose} />);
    expect(
      screen.getByText(/datacenter lab simulator for NCP-AII/i),
    ).toBeInTheDocument();
  });

  it("shows NCP-AII certification reference", () => {
    render(<WelcomeScreen onClose={onClose} />);
    expect(
      screen.getByText(/NCP-AII Certification Ready/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/NVIDIA Certified Professional/i),
    ).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Modal overlay
  // --------------------------------------------------------------------------

  it("renders a fixed overlay (modal backdrop)", () => {
    render(<WelcomeScreen onClose={onClose} />);
    const overlay = screen.getByTestId("welcome-screen");
    expect(overlay.className).toContain("fixed");
    expect(overlay.className).toContain("inset-0");
    expect(overlay.className).toContain("z-50");
  });

  // --------------------------------------------------------------------------
  // Escape key handling
  // --------------------------------------------------------------------------

  it("configures useFocusTrap with onEscape callback for Escape key dismissal", () => {
    render(<WelcomeScreen onClose={onClose} />);
    expect(mockUseFocusTrap).toHaveBeenCalled();
    const lastCall =
      mockUseFocusTrap.mock.calls[mockUseFocusTrap.mock.calls.length - 1];
    const options = lastCall[1];
    expect(options).toHaveProperty("onEscape");
    expect(typeof options.onEscape).toBe("function");
  });

  // --------------------------------------------------------------------------
  // Key features / highlights
  // --------------------------------------------------------------------------

  it("shows all four key feature cards", () => {
    render(<WelcomeScreen onClose={onClose} />);
    expect(screen.getByText("Full CLI Simulation")).toBeInTheDocument();
    expect(screen.getByText("Fault Injection Labs")).toBeInTheDocument();
    expect(screen.getByText("Real-time Telemetry")).toBeInTheDocument();
    expect(screen.getByText("Guided Scenarios")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Accessibility
  // --------------------------------------------------------------------------

  it("has appropriate ARIA attributes on the dialog", () => {
    render(<WelcomeScreen onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "welcome-dialog-title");
  });
});
