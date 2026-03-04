// src/components/__tests__/UserMenu.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock aws-amplify/auth
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockConfirmSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockResetPassword = vi.fn();
const mockConfirmResetPassword = vi.fn();
const mockResendSignUpCode = vi.fn();
vi.mock("aws-amplify/auth", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
  confirmSignUp: (...args: unknown[]) => mockConfirmSignUp(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
  confirmResetPassword: (...args: unknown[]) =>
    mockConfirmResetPassword(...args),
  resendSignUpCode: (...args: unknown[]) => mockResendSignUpCode(...args),
}));

// Mock lucide-react
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
  Eye: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Eye" {...props} />
  ),
  EyeOff: (props: Record<string, unknown>) => (
    <svg data-testid="icon-EyeOff" {...props} />
  ),
  Check: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Check" {...props} />
  ),
  Circle: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Circle" {...props} />
  ),
}));

// Mock focus trap hook
vi.mock("../../hooks/useFocusTrap", () => ({
  useFocusTrap: vi.fn(),
}));

// Mock auth toast store
const mockShowToast = vi.fn();
vi.mock("../../store/authToastStore", () => ({
  useAuthToastStore: { getState: () => ({ show: mockShowToast }) },
}));

import { UserMenu } from "../UserMenu";

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Basic rendering ---

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

  it("shows 'Account' when no email is provided", () => {
    render(<UserMenu isLoggedIn={true} syncStatus="synced" />);
    expect(screen.getByText("Account")).toBeInTheDocument();
  });

  // --- Modal behavior ---

  it("opens modal dialog on click", () => {
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
  });

  it("closes modal on backdrop click", () => {
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Click backdrop (the dialog overlay element itself)
    fireEvent.click(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clears password field when modal is closed", () => {
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "secretpass" },
    });
    expect(screen.getByPlaceholderText("Password")).toHaveValue("secretpass");
    // Close by clicking backdrop
    fireEvent.click(screen.getByRole("dialog"));
    // Re-open
    fireEvent.click(screen.getByText("Sign in"));
    expect(screen.getByPlaceholderText("Password")).toHaveValue("");
  });

  // --- Sign in form ---

  it("switches to sign up form", () => {
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.click(screen.getByText("Sign up"));
    expect(screen.getByText("Create account")).toBeInTheDocument();
  });

  it("switches back to sign in from sign up", () => {
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.click(screen.getByText("Sign up"));
    expect(screen.getByText("Create account")).toBeInTheDocument();
    fireEvent.click(
      screen.getByText("Already have an account?").querySelector("button")!,
    );
    expect(
      screen.getByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  it("calls signIn on form submit", async () => {
    mockSignIn.mockResolvedValue({ isSignedIn: true });
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

  // --- Sign up form ---

  it("calls signUp on sign up form submit", async () => {
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
    mockSignIn.mockResolvedValue({ isSignedIn: true });
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

  // --- Error sanitization ---

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

  // --- Password checklist + eye toggle (Task 4) ---

  it("shows password checklist when typing in sign up form", () => {
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.click(screen.getByText("Sign up"));
    fireEvent.change(screen.getByPlaceholderText("Password (8+ characters)"), {
      target: { value: "abc" },
    });
    expect(screen.getByTestId("password-checklist")).toBeInTheDocument();
    // "One lowercase letter" should be met (green check), others not
    expect(screen.getByText("One lowercase letter")).toBeInTheDocument();
  });

  it("does not show checklist when password is empty", () => {
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.click(screen.getByText("Sign up"));
    expect(screen.queryByTestId("password-checklist")).not.toBeInTheDocument();
  });

  it("toggles password visibility with eye icon", () => {
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    const passwordInput = screen.getByPlaceholderText("Password");
    expect(passwordInput).toHaveAttribute("type", "password");
    const toggleBtn = screen.getByLabelText("Show password");
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Hide password")).toBeInTheDocument();
  });

  // --- Forgot password flow (Task 5) ---

  it("navigates to forgot password view", () => {
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.click(screen.getByText("Forgot password?"));
    expect(
      screen.getByRole("heading", { name: "Reset password" }),
    ).toBeInTheDocument();
  });

  it("calls resetPassword on forgot password submit", async () => {
    mockResetPassword.mockResolvedValue({});
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByText("Forgot password?"));
    fireEvent.click(screen.getByRole("button", { name: "Send reset code" }));
    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith({
        username: "test@example.com",
      });
    });
  });

  it("shows reset password form after sending code", async () => {
    mockResetPassword.mockResolvedValue({});
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByText("Forgot password?"));
    fireEvent.click(screen.getByRole("button", { name: "Send reset code" }));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Enter new password" }),
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Reset code")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("New password")).toBeInTheDocument();
    });
  });

  it("calls confirmResetPassword and auto-signs in", async () => {
    mockResetPassword.mockResolvedValue({});
    mockConfirmResetPassword.mockResolvedValue({});
    mockSignIn.mockResolvedValue({ isSignedIn: true });
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByText("Forgot password?"));
    fireEvent.click(screen.getByRole("button", { name: "Send reset code" }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Reset code")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText("Reset code"), {
      target: { value: "123456" },
    });
    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "NewPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    await waitFor(() => {
      expect(mockConfirmResetPassword).toHaveBeenCalledWith({
        username: "test@example.com",
        confirmationCode: "123456",
        newPassword: "NewPass123!",
      });
      expect(mockSignIn).toHaveBeenCalledWith({
        username: "test@example.com",
        password: "NewPass123!",
      });
    });
  });

  it("blocks weak password on reset", async () => {
    mockResetPassword.mockResolvedValue({});
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByText("Forgot password?"));
    fireEvent.click(screen.getByRole("button", { name: "Send reset code" }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Reset code")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText("Reset code"), {
      target: { value: "123456" },
    });
    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "weak" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    await waitFor(() => {
      expect(
        screen.getByText("Password requirements not met."),
      ).toBeInTheDocument();
    });
    expect(mockConfirmResetPassword).not.toHaveBeenCalled();
  });

  it("shows back to sign in link from forgot password", () => {
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.click(screen.getByText("Forgot password?"));
    fireEvent.click(screen.getByText("Back to sign in"));
    expect(
      screen.getByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  it("sanitizes CodeMismatchException", async () => {
    mockResetPassword.mockResolvedValue({});
    mockConfirmResetPassword.mockRejectedValue(
      Object.assign(new Error("Code mismatch"), {
        name: "CodeMismatchException",
      }),
    );
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByText("Forgot password?"));
    fireEvent.click(screen.getByRole("button", { name: "Send reset code" }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Reset code")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText("Reset code"), {
      target: { value: "000000" },
    });
    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "NewPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    await waitFor(() => {
      expect(
        screen.getByText("Invalid verification code. Please try again."),
      ).toBeInTheDocument();
    });
  });

  // --- Resend verification code (Task 6) ---

  it("shows resend button on confirm view", async () => {
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
      expect(screen.getByText("Resend")).toBeInTheDocument();
    });
  });

  it("calls resendSignUpCode on resend click", async () => {
    mockSignUp.mockResolvedValue({});
    mockResendSignUpCode.mockResolvedValue({});
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
      expect(screen.getByText("Resend")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Resend"));
    await waitFor(() => {
      expect(mockResendSignUpCode).toHaveBeenCalledWith({
        username: "new@example.com",
      });
    });
  });

  it("disables resend button during cooldown", async () => {
    mockSignUp.mockResolvedValue({});
    mockResendSignUpCode.mockResolvedValue({});
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
      expect(screen.getByText("Resend")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Resend"));
    await waitFor(() => {
      expect(
        screen.getByText("Code sent — check your email"),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Code sent — check your email")).toBeDisabled();
  });

  // --- Success toasts (Task 7) ---

  it("fires success toast on sign in", async () => {
    mockSignIn.mockResolvedValue({ isSignedIn: true });
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
      expect(mockShowToast).toHaveBeenCalledWith("Signed in!", "success");
    });
  });

  it("fires success toast on account verification", async () => {
    mockConfirmSignUp.mockResolvedValue({});
    mockSignIn.mockResolvedValue({ isSignedIn: true });
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
      expect(
        screen.getByPlaceholderText("Verification code"),
      ).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText("Verification code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify & sign in" }));
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        "Account verified — signed in!",
        "success",
      );
    });
  });

  it("fires success toast on password reset", async () => {
    mockResetPassword.mockResolvedValue({});
    mockConfirmResetPassword.mockResolvedValue({});
    mockSignIn.mockResolvedValue({ isSignedIn: true });
    render(<UserMenu isLoggedIn={false} syncStatus="idle" />);
    fireEvent.click(screen.getByText("Sign in"));
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByText("Forgot password?"));
    fireEvent.click(screen.getByRole("button", { name: "Send reset code" }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Reset code")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText("Reset code"), {
      target: { value: "123456" },
    });
    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "NewPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        "Password reset successful!",
        "success",
      );
    });
  });

  it("fires info toast on resend code", async () => {
    mockSignUp.mockResolvedValue({});
    mockResendSignUpCode.mockResolvedValue({});
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
      expect(screen.getByText("Resend")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Resend"));
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        "Verification code resent!",
        "info",
      );
    });
  });
});
