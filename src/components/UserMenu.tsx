// src/components/UserMenu.tsx
import { useState, useRef, useEffect } from "react";
import { signOut, signIn, signUp, confirmSignUp } from "aws-amplify/auth";
import { LogIn, LogOut, User, Cloud, CloudOff, Loader2 } from "lucide-react";
import type { SyncStatus } from "@/hooks/useCloudSync";
import { validatePassword } from "@/utils/passwordValidation";

interface UserMenuProps {
  isLoggedIn: boolean;
  syncStatus: SyncStatus;
  userEmail?: string;
}

type AuthView = "closed" | "signIn" | "signUp" | "confirm";

export function UserMenu({ isLoggedIn, syncStatus, userEmail }: UserMenuProps) {
  const [authView, setAuthView] = useState<AuthView>("closed");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (authView !== "closed" && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [authView]);

  useEffect(() => {
    if (authView === "closed") return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setAuthView("closed");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [authView]);

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
        setAuthView("closed");
        setEmail("");
        setPassword("");
      } else if (nextStep?.signInStep === "CONFIRM_SIGN_UP") {
        setAuthView("confirm");
      } else {
        setError("Additional verification required.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
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
      setError(err instanceof Error ? err.message : "Sign up failed");
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
        setAuthView("closed");
        setEmail("");
        setPassword("");
        setConfirmCode("");
      } else {
        setError(
          "Sign in failed after verification. Please try signing in again.",
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
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
        ref={buttonRef}
        onClick={() => setAuthView(authView === "closed" ? "signIn" : "closed")}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-700"
      >
        <LogIn className="w-4 h-4" />
        <span className="hidden sm:inline">Sign in</span>
      </button>

      {authView !== "closed" && (
        <div
          ref={dropdownRef}
          className="fixed w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 z-[9999]"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
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
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:border-nvidia-green focus:outline-none"
                required
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
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
                    setPasswordErrors([]);
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
              <input
                type="password"
                placeholder="Password (8+ characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => {
                  if (password) {
                    setPasswordErrors(validatePassword(password).errors);
                  }
                }}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:border-nvidia-green focus:outline-none"
                required
                minLength={8}
              />
              {passwordErrors.length > 0 && (
                <ul className="text-xs text-yellow-400 space-y-0.5 list-disc list-inside">
                  {passwordErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              )}
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
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
                    setPasswordErrors([]);
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
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-nvidia-green text-black text-sm font-semibold rounded hover:bg-green-500 transition-colors disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify & sign in"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
