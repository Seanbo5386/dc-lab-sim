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
    ArrowRight: createIcon("ArrowRight"),
    Cloud: createIcon("Cloud"),
    UserPlus: createIcon("UserPlus"),
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
  // Accessibility
  // --------------------------------------------------------------------------

  it("has appropriate ARIA attributes on the dialog", () => {
    render(<WelcomeScreen onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "welcome-dialog-title");
  });

  // --------------------------------------------------------------------------
  // Animated terminal demo
  // --------------------------------------------------------------------------

  it("renders the animated terminal demo container", () => {
    render(<WelcomeScreen onClose={onClose} />);
    expect(screen.getByTestId("terminal-demo")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Stats bar
  // --------------------------------------------------------------------------

  it("renders stats bar with key numbers", () => {
    render(<WelcomeScreen onClose={onClose} />);
    expect(screen.getByText(/32 Missions/i)).toBeInTheDocument();
    expect(screen.getByText(/229 Commands/i)).toBeInTheDocument();
    expect(screen.getByText(/6 Architectures/i)).toBeInTheDocument();
    expect(screen.getByText(/400\+ Questions/i)).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Feature pills
  // --------------------------------------------------------------------------

  it("renders feature pills", () => {
    render(<WelcomeScreen onClose={onClose} />);
    expect(screen.getByText("CLI Simulation")).toBeInTheDocument();
    expect(screen.getByText("Fault Injection")).toBeInTheDocument();
    expect(screen.getByText("Telemetry")).toBeInTheDocument();
    expect(screen.getByText("Guided Scenarios")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Sign-up CTA
  // --------------------------------------------------------------------------

  it("renders sign-up CTA", () => {
    render(<WelcomeScreen onClose={onClose} />);
    expect(screen.getByText(/sign up/i)).toBeInTheDocument();
  });
});
