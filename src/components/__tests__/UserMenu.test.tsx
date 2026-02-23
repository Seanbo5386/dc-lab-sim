// src/components/__tests__/UserMenu.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock aws-amplify/auth
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockConfirmSignUp = vi.fn();
const mockSignOut = vi.fn();
vi.mock("aws-amplify/auth", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
  confirmSignUp: (...args: unknown[]) => mockConfirmSignUp(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

// Mock lucide-react (Proxy causes vitest to hang)
vi.mock("lucide-react", () => ({
  LogIn: (props: Record<string, unknown>) => (
    <svg data-testid="icon-LogIn" {...props} />
  ),
  LogOut: (props: Record<string, unknown>) => (
    <svg data-testid="icon-LogOut" {...props} />
  ),
  User: (props: Record<string, unknown>) => (
    <svg data-testid="icon-User" {...props} />
  ),
  Cloud: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Cloud" {...props} />
  ),
  CloudOff: (props: Record<string, unknown>) => (
    <svg data-testid="icon-CloudOff" {...props} />
  ),
  Loader2: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Loader2" {...props} />
  ),
}));

import { UserMenu } from "../UserMenu";

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows sign in button when logged out", () => {
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });

  it("shows sign out button and email when logged in", () => {
    render(
      <UserMenu
        isLoggedIn={true}
        syncStatus="synced"
        userEmail="test@example.com"
      />,
    );
    expect(screen.getByText("Sign out")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("shows sync status icon when synced", () => {
    render(<UserMenu isLoggedIn={true} syncStatus="synced" />);
    expect(screen.getByTestId("icon-Cloud")).toBeInTheDocument();
  });

  it("shows spinning loader when syncing", () => {
    render(<UserMenu isLoggedIn={true} syncStatus="syncing" />);
    expect(screen.getByTestId("icon-Loader2")).toBeInTheDocument();
  });

  it("shows error icon when sync fails", () => {
    render(<UserMenu isLoggedIn={true} syncStatus="error" />);
    expect(screen.getByTestId("icon-CloudOff")).toBeInTheDocument();
  });

  it("opens sign in form on click", () => {
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  it("switches to sign up form", () => {
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.click(screen.getByText("Sign up"));
    expect(screen.getByText("Create account")).toBeInTheDocument();
  });

  it("switches back to sign in from sign up", () => {
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    // Open form -> go to sign up
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.click(screen.getByText("Sign up"));
    expect(screen.getByText("Create account")).toBeInTheDocument();
    // Click the "Sign in" link inside the sign-up form (not the trigger button)
    fireEvent.click(
      screen.getByText("Already have an account?").querySelector("button")!,
    );
    // Should show the sign in form heading
    expect(
      screen.getByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  it("calls signIn on form submit", async () => {
    mockSignIn.mockResolvedValue({});
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    // The submit button inside the form (type="submit")
    const submitBtn = screen
      .getAllByRole("button", { name: "Sign in" })
      .find((btn) => btn.getAttribute("type") === "submit")!;
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        username: "test@example.com",
        password: "password123",
      });
    });
  });

  it("shows error message on sign in failure", async () => {
    mockSignIn.mockRejectedValue(new Error("Invalid credentials"));
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrong" },
    });
    const submitBtn = screen
      .getAllByRole("button", { name: "Sign in" })
      .find((btn) => btn.getAttribute("type") === "submit")!;
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("calls signOut when signed in user clicks sign out", async () => {
    mockSignOut.mockResolvedValue(undefined);
    render(<UserMenu isLoggedIn={true} syncStatus="synced" />);
    fireEvent.click(screen.getByText("Sign out"));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it("calls signUp on sign up form submit", async () => {
    mockSignUp.mockResolvedValue({});
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    // Open form -> switch to sign up
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.click(screen.getByText("Sign up"));
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password (8+ characters)"), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        username: "new@example.com",
        password: "Password123!",
      });
    });
  });

  it("shows confirmation form after successful sign up", async () => {
    mockSignUp.mockResolvedValue({});
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.click(screen.getByText("Sign up"));
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password (8+ characters)"), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Verification code"),
      ).toBeInTheDocument();
    });
  });

  it("calls confirmSignUp and signIn on verification", async () => {
    mockConfirmSignUp.mockResolvedValue({});
    mockSignIn.mockResolvedValue({});
    mockSignUp.mockResolvedValue({});
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    // Navigate to sign up -> fill -> submit -> confirm view
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.click(screen.getByText("Sign up"));
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password (8+ characters)"), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Verification code"),
      ).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText("Verification code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify & sign in" }));
    await waitFor(() => {
      expect(mockConfirmSignUp).toHaveBeenCalledWith({
        username: "new@example.com",
        confirmationCode: "123456",
      });
      expect(mockSignIn).toHaveBeenCalledWith({
        username: "new@example.com",
        password: "Password123!",
      });
    });
  });

  it("shows 'Account' when no email is provided", () => {
    render(<UserMenu isLoggedIn={true} syncStatus="synced" />);
    expect(screen.getByText("Account")).toBeInTheDocument();
  });

  it("shows generic error for UserNotFoundException", async () => {
    mockSignIn.mockRejectedValue(
      Object.assign(new Error("User does not exist."), {
        name: "UserNotFoundException",
      }),
    );
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "unknown@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    const submitBtn = screen
      .getAllByRole("button", { name: "Sign in" })
      .find((btn) => btn.getAttribute("type") === "submit")!;
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(
        screen.getByText("Incorrect email or password."),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("User does not exist.")).not.toBeInTheDocument();
  });

  it("shows generic error for NotAuthorizedException", async () => {
    mockSignIn.mockRejectedValue(
      Object.assign(new Error("Incorrect username or password."), {
        name: "NotAuthorizedException",
      }),
    );
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrongpass" },
    });
    const submitBtn = screen
      .getAllByRole("button", { name: "Sign in" })
      .find((btn) => btn.getAttribute("type") === "submit")!;
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(
        screen.getByText("Incorrect email or password."),
      ).toBeInTheDocument();
    });
  });

  it("closes the auth form when clicking sign in button again", () => {
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    // Open
    fireEvent.click(screen.getByText("Sign in"));
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    // Close by clicking the trigger button again (it toggles)
    fireEvent.click(screen.getByTestId("icon-LogIn"));
    expect(screen.queryByPlaceholderText("Email")).not.toBeInTheDocument();
  });

  it("clears password field when dropdown is closed", () => {
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "secretpass" },
    });
    expect(screen.getByPlaceholderText("Password")).toHaveValue("secretpass");
    // Close by toggling
    fireEvent.click(screen.getByTestId("icon-LogIn"));
    // Re-open
    fireEvent.click(screen.getByTestId("icon-LogIn"));
    expect(screen.getByPlaceholderText("Password")).toHaveValue("");
  });

  it("disables submit button after rate limit error", async () => {
    mockSignIn.mockRejectedValue(
      Object.assign(new Error("Rate exceeded"), {
        name: "LimitExceededException",
      }),
    );
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    const submitBtn = screen
      .getAllByRole("button", { name: "Sign in" })
      .find((btn) => btn.getAttribute("type") === "submit")!;
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(
        screen.getByText("Too many attempts. Please try again later."),
      ).toBeInTheDocument();
    });
    await waitFor(() => {
      const btn = screen
        .getAllByRole("button")
        .find((b) => b.getAttribute("type") === "submit");
      expect(btn).toBeDisabled();
    });
  });
});
