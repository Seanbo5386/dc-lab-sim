import { useEffect, useRef } from "react";
import { useAuthToastStore, type AuthToastType } from "@/store/authToastStore";
import { CheckCircle2, Info, AlertCircle } from "lucide-react";

const AUTO_DISMISS_MS: Record<AuthToastType, number> = {
  success: 3000,
  info: 5000,
  error: 5000,
};

const ICON_MAP = {
  success: CheckCircle2,
  info: Info,
  error: AlertCircle,
};

const COLOR_MAP: Record<AuthToastType, { text: string; border: string }> = {
  success: { text: "text-nvidia-green", border: "border-nvidia-green" },
  info: { text: "text-blue-400", border: "border-blue-400" },
  error: { text: "text-red-400", border: "border-red-400" },
};

export function AuthToast() {
  const visible = useAuthToastStore((s) => s.visible);
  const message = useAuthToastStore((s) => s.message);
  const type = useAuthToastStore((s) => s.type);
  const dismiss = useAuthToastStore((s) => s.dismiss);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS[type]);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, type, message, dismiss]);

  if (!visible) return null;

  const Icon = ICON_MAP[type];
  const colors = COLOR_MAP[type];

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-gray-800/95 backdrop-blur-sm border ${colors.border} rounded-lg shadow-2xl`}
      role="status"
      aria-live="polite"
      data-testid="auth-toast"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${colors.text}`} />
      <span className="text-sm text-white">{message}</span>
    </div>
  );
}
