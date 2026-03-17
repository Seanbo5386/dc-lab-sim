import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => {
  const mk = (n: string) => {
    const C = () => null;
    C.displayName = n;
    return C;
  };
  return {
    X: mk("X"),
    MessageSquare: mk("MessageSquare"),
    Send: mk("Send"),
    Loader2: mk("Loader2"),
  };
});

// Mock Amplify client
const mockCreate = vi.fn();
vi.mock("aws-amplify/data", () => ({
  generateClient: () => ({
    models: {
      Feedback: {
        create: (...args: unknown[]) => mockCreate(...args),
      },
    },
  }),
}));

// Mock useFocusTrap
vi.mock("../../hooks/useFocusTrap", () => ({
  useFocusTrap: vi.fn(),
}));

import { FeedbackModal } from "../FeedbackModal";

describe("FeedbackModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    isLoggedIn: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when closed", () => {
    render(<FeedbackModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Send Feedback")).not.toBeInTheDocument();
  });

  it("renders modal when open", () => {
    render(<FeedbackModal {...defaultProps} />);
    expect(screen.getByText("Send Feedback")).toBeInTheDocument();
  });

  it("shows three category pills", () => {
    render(<FeedbackModal {...defaultProps} />);
    expect(screen.getByText("General Feedback")).toBeInTheDocument();
    expect(screen.getByText("Bug Report")).toBeInTheDocument();
    expect(screen.getByText("Success Story")).toBeInTheDocument();
  });

  it("changes placeholder when category changes", () => {
    render(<FeedbackModal {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("What could we do better?"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Bug Report"));
    expect(
      screen.getByPlaceholderText(
        "Describe what happened and what you expected",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Success Story"));
    expect(
      screen.getByPlaceholderText(
        "Did this help you pass the NCP-AII? We'd love to hear about it!",
      ),
    ).toBeInTheDocument();
  });

  it("disables submit when textarea is empty", () => {
    render(<FeedbackModal {...defaultProps} />);
    const submit = screen.getByRole("button", { name: /submit/i });
    expect(submit).toBeDisabled();
  });

  it("enables submit when textarea has content", () => {
    render(<FeedbackModal {...defaultProps} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Great tool!" },
    });
    const submit = screen.getByRole("button", { name: /submit/i });
    expect(submit).not.toBeDisabled();
  });

  it("calls Amplify create on submit and shows success", async () => {
    mockCreate.mockResolvedValueOnce({ data: { id: "123" } });
    render(<FeedbackModal {...defaultProps} />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Love it!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        category: "general",
        message: "Love it!",
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/thank you/i)).toBeInTheDocument();
    });
  });

  it("handles submission failure gracefully", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Network error"));
    render(<FeedbackModal {...defaultProps} />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(screen.queryByText(/thank you/i)).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /submit/i })).not.toBeDisabled();
  });

  it("shows sign-in prompt when not logged in", () => {
    render(<FeedbackModal {...defaultProps} isLoggedIn={false} />);
    expect(
      screen.getByText(/please sign in to submit feedback/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("closes modal when sign-in button clicked (unauthenticated)", () => {
    render(<FeedbackModal {...defaultProps} isLoggedIn={false} />);
    const signInBtn = screen.getByRole("button", { name: /sign in/i });
    fireEvent.click(signInBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", () => {
    render(<FeedbackModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("feedback-backdrop"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("resets form state when reopened", () => {
    const { rerender } = render(<FeedbackModal {...defaultProps} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "draft" },
    });
    fireEvent.click(screen.getByText("Bug Report"));

    // Close and reopen
    rerender(<FeedbackModal {...defaultProps} isOpen={false} />);
    rerender(<FeedbackModal {...defaultProps} isOpen={true} />);

    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(
      screen.getByPlaceholderText("What could we do better?"),
    ).toBeInTheDocument();
  });
});
