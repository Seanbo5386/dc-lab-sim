import { Crosshair, X } from "lucide-react";

interface NarrativeIntroProps {
  title: string;
  narrative: {
    hook: string;
    setting: string;
    resolution: string;
  };
  onBegin: () => void;
  skippable?: boolean;
  onSkip?: () => void;
}

export function NarrativeIntro({
  title,
  narrative,
  onBegin,
  skippable,
  onSkip,
}: NarrativeIntroProps) {
  return (
    <div
      data-testid="narrative-intro-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Close / dismiss button */}
        <button
          onClick={onBegin}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Green accent bar at top */}
        <div className="h-1 bg-nvidia-green" />

        <div className="px-6 py-6 text-center">
          {/* Mission icon */}
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-nvidia-green/20 flex items-center justify-center">
            <Crosshair className="w-7 h-7 text-nvidia-green" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-nvidia-green mb-3">{title}</h2>

          {/* Hook — the attention grabber */}
          <p className="text-base text-white font-medium mb-4 leading-relaxed italic">
            &ldquo;{narrative.hook}&rdquo;
          </p>

          {/* Setting — the context */}
          <p className="text-sm text-gray-300 mb-6 leading-relaxed">
            {narrative.setting}
          </p>

          {/* Begin button */}
          <button
            onClick={onBegin}
            className="w-full px-6 py-3 bg-nvidia-green text-black font-bold rounded-lg hover:bg-nvidia-darkgreen transition-colors text-base"
          >
            Begin Mission
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
  );
}
