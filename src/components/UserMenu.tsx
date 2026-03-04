// src/components/UserMenu.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import {
  signOut,
  signIn,
  signUp,
  confirmSignUp,
  resetPassword,
  confirmResetPassword,
  resendSignUpCode,
} from "aws-amplify/auth";
import {
  LogIn,
  LogOut,
  User,
  Cloud,
  CloudOff,
  Loader2,
  Eye,
  EyeOff,
  Check,
  Circle,
} from "lucide-react";
import type { SyncStatus } from "@/hooks/useCloudSync";
import {
  validatePassword,
  passwordRules,
  MIN_PASSWORD_LENGTH,
} from "@/utils/passwordValidation";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useAuthToastStore } from "@/store/authToastStore";

const RATE_LIMIT_COOLDOWN_MS = 30_000;
const RESEND_COOLDOWN_MS = 30_000;

function sanitizeAuthError(err: unknown): string {
  if (err instanceof Error) {
    switch (err.name) {
      case "UserNotFoundException":
      case "NotAuthorizedException":
        return "Incorrect email or password.";
      case "UserAlreadyAuthenticatedException":
        return "You are already signed in.";
      case "LimitExceededException":
        return "Too many attempts. Please try again later.";
      case "CodeMismatchException":
        return "Invalid verification code. Please try again.";
      case "ExpiredCodeException":
        return "Verification code has expired. Please request a new one.";
      default:
        return err.message;
    }
  }
  return "An unexpected error occurred.";
}

interface UserMenuProps {
  isLoggedIn: boolean;
  syncStatus: SyncStatus;
  userEmail?: string;
}

type AuthView =
  | "closed"
  | "signIn"
  | "signUp"
  | "confirm"
  | "forgotPassword"
  | "resetPassword";

function PasswordChecklist({ password }: { password: string }) {
  if (!password) return null;
  return (
    <ul className="space-y-1" data-testid="password-checklist">
      {passwordRules.map((rule) => {
        const met = rule.test(password);
        return (
          <li key={rule.message} className="flex items-center gap-1.5 text-xs">
            {met ? (
              <Check className="w-3 h-3 text-nvidia-green flex-shrink-0" />
            ) : (
              <Circle className="w-3 h-3 text-gray-500 flex-shrink-0" />
            )}
            <span className={met ? "text-nvidia-green" : "text-gray-500"}>
              {rule.message}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  showPassword,
  onToggleShow,
  required,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  showPassword: boolean;
  onToggleShow: () => void;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 pr-10 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:border-nvidia-green focus:outline-none"
        required={required}
        minLength={MIN_PASSWORD_LENGTH}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? (
          <EyeOff className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

export function UserMenu({ isLoggedIn, syncStatus, userEmail }: UserMenuProps) {
  const [authView, setAuthView] = useState<AuthView>("closed");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      if (resendTimerRef.current) clearTimeout(resendTimerRef.current);
    };
  }, []);

  const handleClose = useCallback(() => {
    setEmail("");
    setPassword("");
    setConfirmCode("");
    setError("");
    setLoading(false);
    setCooldown(false);
    setShowPassword(false);
    setNewPassword("");
    setResetCode("");
    setResendCooldown(false);
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    if (resendTimerRef.current) clearTimeout(resendTimerRef.current);
    setAuthView("closed");
  }, []);

  useFocusTrap(modalRef, {
    isActive: authView !== "closed",
    onEscape: handleClose,
  });

  const handleAuthError = (err: unknown) => {
    setError(sanitizeAuthError(err));
    if (err instanceof Error && err.name === "LimitExceededException") {
      setCooldown(true);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = setTimeout(
        () => setCooldown(false),
        RATE_LIMIT_COOLDOWN_MS,
      );
    }
  };

  const syncIcon = () => {
    switch (syncStatus) {
      case "syncing":
        return <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />;
      case "synced":
        return <Cloud className="w-3.5 h-3.5 text-nvidia-green" />;
      case "error":
        return <CloudOff className="w-3.5 h-3.5 text-red-400" />;
      default:
        return null;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password,
      });
      if (isSignedIn) {
        handleClose();
        useAuthToastStore.getState().show("Signed in!", "success");
      } else if (nextStep?.signInStep === "CONFIRM_SIGN_UP") {
        setAuthView("confirm");
      } else {
        setError("Additional verification required.");
      }
    } catch (err: unknown) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const validation = validatePassword(password);
    if (!validation.isValid) {
      setError("Password requirements not met.");
      return;
    }
    setLoading(true);
    try {
      await signUp({ username: email, password });
      setAuthView("confirm");
    } catch (err: unknown) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: confirmCode });
      const { isSignedIn } = await signIn({ username: email, password });
      if (isSignedIn) {
        handleClose();
        useAuthToastStore
          .getState()
          .show("Account verified — signed in!", "success");
      } else {
        setError(
          "Sign in failed after verification. Please try signing in again.",
        );
      }
    } catch (err: unknown) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      await resendSignUpCode({ username: email });
      useAuthToastStore.getState().show("Verification code resent!", "info");
      setResendCooldown(true);
      if (resendTimerRef.current) clearTimeout(resendTimerRef.current);
      resendTimerRef.current = setTimeout(
        () => setResendCooldown(false),
        RESEND_COOLDOWN_MS,
      );
    } catch (err: unknown) {
      handleAuthError(err);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword({ username: email });
      setAuthView("resetPassword");
    } catch (err: unknown) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setError("Password requirements not met.");
      return;
    }
    setLoading(true);
    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: resetCode,
        newPassword,
      });
      const { isSignedIn } = await signIn({
        username: email,
        password: newPassword,
      });
      if (isSignedIn) {
        handleClose();
        useAuthToastStore
          .getState()
          .show("Password reset successful!", "success");
      } else {
        setError(
          "Password reset succeeded but sign-in requires additional verification. Please sign in manually.",
        );
      }
    } catch (err: unknown) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-2">
        {syncIcon()}
        <div className="flex items-center gap-1.5 text-sm text-gray-300">
          <User className="w-4 h-4" />
          <span className="hidden sm:inline max-w-[120px] truncate">
            {userEmail || "Account"}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-700"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setAuthView("signIn")}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-700"
      >
        <LogIn className="w-4 h-4" />
        <span className="hidden sm:inline">Sign in</span>
      </button>

      {authView !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label="Authentication"
        >
          <div
            ref={modalRef}
            className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Green accent bar */}
            <div className="h-1 bg-nvidia-green" />

            <div className="p-6">
              {authView === "signIn" && (
                <form onSubmit={handleSignIn} className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">Sign in</h3>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:border-nvidia-green focus:outline-none"
                    required
                  />
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    placeholder="Password"
                    showPassword={showPassword}
                    onToggleShow={() => setShowPassword((p) => !p)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setAuthView("forgotPassword");
                    }}
                    className="text-xs text-nvidia-green hover:underline"
                  >
                    Forgot password?
                  </button>
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading || cooldown}
                    className="w-full py-2 bg-nvidia-green text-black text-sm font-semibold rounded hover:bg-green-500 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    No account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthView("signUp");
                        setError("");
                      }}
                      className="text-nvidia-green hover:underline"
                    >
                      Sign up
                    </button>
                  </p>
                </form>
              )}

              {authView === "signUp" && (
                <form onSubmit={handleSignUp} className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">
                    Create account
                  </h3>
                  <p className="text-xs text-gray-400">
                    Your progress will sync across devices.
                  </p>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:border-nvidia-green focus:outline-none"
                    required
                  />
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    placeholder="Password (8+ characters)"
                    showPassword={showPassword}
                    onToggleShow={() => setShowPassword((p) => !p)}
                    required
                  />
                  <PasswordChecklist password={password} />
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading || cooldown}
                    className="w-full py-2 bg-nvidia-green text-black text-sm font-semibold rounded hover:bg-green-500 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Creating account..." : "Sign up"}
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthView("signIn");
                        setError("");
                      }}
                      className="text-nvidia-green hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                </form>
              )}

              {authView === "confirm" && (
                <form onSubmit={handleConfirm} className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">
                    Check your email
                  </h3>
                  <p className="text-xs text-gray-400">
                    Enter the verification code sent to {email}
                  </p>
                  <input
                    type="text"
                    placeholder="Verification code"
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:border-nvidia-green focus:outline-none"
                    required
                  />
                  <p className="text-xs text-gray-400">
                    Didn&apos;t get a code?{" "}
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendCooldown}
                      className="text-nvidia-green hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resendCooldown
                        ? "Code sent — check your email"
                        : "Resend"}
                    </button>
                  </p>
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading || cooldown}
                    className="w-full py-2 bg-nvidia-green text-black text-sm font-semibold rounded hover:bg-green-500 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Verifying..." : "Verify & sign in"}
                  </button>
                </form>
              )}

              {authView === "forgotPassword" && (
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">
                    Reset password
                  </h3>
                  <p className="text-xs text-gray-400">
                    Enter your email to receive a reset code.
                  </p>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:border-nvidia-green focus:outline-none"
                    required
                  />
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading || cooldown}
                    className="w-full py-2 bg-nvidia-green text-black text-sm font-semibold rounded hover:bg-green-500 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Send reset code"}
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setAuthView("signIn");
                      }}
                      className="text-nvidia-green hover:underline"
                    >
                      Back to sign in
                    </button>
                  </p>
                </form>
              )}

              {authView === "resetPassword" && (
                <form
                  onSubmit={handleConfirmResetPassword}
                  className="space-y-3"
                >
                  <h3 className="text-sm font-semibold text-white">
                    Enter new password
                  </h3>
                  <p className="text-xs text-gray-400">
                    Enter the code sent to {email} and your new password.
                  </p>
                  <input
                    type="text"
                    placeholder="Reset code"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:border-nvidia-green focus:outline-none"
                    required
                  />
                  <PasswordInput
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="New password"
                    showPassword={showPassword}
                    onToggleShow={() => setShowPassword((p) => !p)}
                    required
                  />
                  <PasswordChecklist password={newPassword} />
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading || cooldown}
                    className="w-full py-2 bg-nvidia-green text-black text-sm font-semibold rounded hover:bg-green-500 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Resetting..." : "Reset password"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
