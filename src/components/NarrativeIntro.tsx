import { Crosshair } from "lucide-react";

interface NarrativeIntroProps {
  title: string;
  narrative: {
    hook: string;
    setting: string;
    resolution: string;
  };
  onBegin: () => void;
}

export function NarrativeIntro({
  title,
  narrative,
  onBegin,
}: NarrativeIntroProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="max-w-lg">
        {/* Mission icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-nvidia-green/20 flex items-center justify-center">
          <Crosshair className="w-8 h-8 text-nvidia-green" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-nvidia-green mb-4">{title}</h2>

        {/* Hook — the attention grabber */}
        <p className="text-lg text-white font-medium mb-6 leading-relaxed italic">
          &ldquo;{narrative.hook}&rdquo;
        </p>

        {/* Setting — the context */}
        <p className="text-gray-300 mb-8 leading-relaxed">
          {narrative.setting}
        </p>

        {/* Begin button */}
        <button
          onClick={onBegin}
          className="px-8 py-3 bg-nvidia-green text-black font-bold rounded-lg hover:bg-nvidia-darkgreen transition-colors text-lg"
        >
          Begin Mission
        </button>
      </div>
    </div>
  );
}
