import { useState, useEffect, useRef, useCallback } from "react";
import { Crosshair, Clock, Zap } from "lucide-react";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface MissionBriefingProps {
  title: string;
  narrative: { hook: string; setting: string; resolution: string };
  tier?: 1 | 2 | 3;
  estimatedTime?: number;
  onBegin: () => void;
  skippable?: boolean;
  onSkip?: () => void;
}

const tierConfig: Record<1 | 2 | 3, { label: string; color: string }> = {
  1: { label: "Guided", color: "bg-green-600 text-green-100" },
  2: { label: "Choice", color: "bg-yellow-600 text-yellow-100" },
  3: { label: "Realistic", color: "bg-red-600 text-red-100" },
};

export function MissionBriefing({
  title,
  narrative,
  tier,
  estimatedTime,
  onBegin,
  skippable,
  onSkip,
}: MissionBriefingProps) {
  const [phase, setPhase] = useState(0);
  const [typedHook, setTypedHook] = useState("");
  const [skippedAnimation, setSkippedAnimation] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, {
    isActive: true,
    onEscape: onBegin,
  });

  // Phase progression
  useEffect(() => {
    if (skippedAnimation) return;

    // Phase 0 -> 1: icon + title + badges fade in
    const t1 = setTimeout(() => setPhase(1), 400);
    // Phase 1 -> 2: hook starts typing
    const t2 = setTimeout(() => setPhase(2), 800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [skippedAnimation]);

  // Typing animation for hook text
  useEffect(() => {
    if (phase !== 2 || skippedAnimation) return;

    const chars = narrative.hook.split("");
    const timers: ReturnType<typeof setTimeout>[] = [];

    chars.forEach((_, i) => {
      const timer = setTimeout(() => {
        setTypedHook(narrative.hook.slice(0, i + 1));

        // After last character, advance to phase 3
        if (i === chars.length - 1) {
          const t3 = setTimeout(() => {
            setPhase(3);
            const t4 = setTimeout(() => setPhase(4), 500);
            timers.push(t4);
          }, 300);
          timers.push(t3);
        }
      }, i * 35);
      timers.push(timer);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [phase, narrative.hook, skippedAnimation]);

  const handleBackdropClick = useCallback(() => {
    setSkippedAnimation(true);
    setTypedHook(narrative.hook);
    setPhase(4);
  }, [narrative.hook]);

  const handleDialogClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const tierInfo = tier ? tierConfig[tier] : null;

  return (
    <div
      data-testid="mission-briefing"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mission-briefing-title"
        className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={handleDialogClick}
      >
        {/* Green accent bar */}
        <div className="h-1 bg-nvidia-green" />

        <div className="px-6 py-6 text-center">
          {/* Icon + Title + Badges */}
          <div
            className={`transition-opacity duration-300 ${phase >= 1 ? "opacity-100" : "opacity-0"}`}
          >
            {/* Mission icon */}
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-nvidia-green/20 flex items-center justify-center">
              <Crosshair className="w-7 h-7 text-nvidia-green" />
            </div>

            {/* Title */}
            <h2
              id="mission-briefing-title"
              className="text-xl font-bold text-nvidia-green mb-3"
            >
              {title}
            </h2>

            {/* Badges */}
            <div className="flex items-center justify-center gap-3 mb-4">
              {tierInfo && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${tierInfo.color}`}
                >
                  <Zap className="w-3 h-3" />
                  {tierInfo.label}
                </span>
              )}
              {estimatedTime != null && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-700 text-gray-300">
                  <Clock className="w-3 h-3" />~{estimatedTime} min
                </span>
              )}
            </div>
          </div>

          {/* Hook - typed character by character */}
          <div
            className={`transition-opacity duration-300 ${phase >= 2 ? "opacity-100" : "opacity-0"}`}
          >
            <p className="text-base text-white font-medium mb-4 leading-relaxed italic min-h-[3rem]">
              {phase >= 2 && (
                <>
                  &ldquo;{skippedAnimation ? narrative.hook : typedHook}
                  {(skippedAnimation || typedHook === narrative.hook) && (
                    <>&rdquo;</>
                  )}
                </>
              )}
            </p>
          </div>

          {/* Setting */}
          <div
            className={`transition-opacity duration-500 ${phase >= 3 ? "opacity-100" : "opacity-0"}`}
          >
            <p className="text-sm text-gray-300 mb-6 leading-relaxed">
              {narrative.setting}
            </p>
          </div>

          {/* Accept Mission button */}
          <div
            className={`transition-opacity duration-300 ${phase >= 4 ? "opacity-100" : "opacity-0"}`}
          >
            <button
              onClick={onBegin}
              className="w-full px-6 py-3 bg-nvidia-green text-black font-bold rounded-lg hover:bg-nvidia-darkgreen transition-colors text-base shadow-[0_0_15px_rgba(118,185,0,0.3)]"
            >
              Accept Mission
            </button>

            {skippable && onSkip && (
              <button
                onClick={onSkip}
                className="mt-3 text-sm text-gray-400 hover:text-gray-200 underline transition-colors block mx-auto"
              >
                I'm familiar with Linux basics — skip this tutorial
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
