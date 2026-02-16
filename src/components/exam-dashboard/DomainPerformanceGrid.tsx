import { useLearningStore } from "@/store/learningStore";
import { DOMAIN_INFO } from "@/utils/examEngine";
import type { DomainId } from "@/types/scenarios";

const DOMAIN_IDS: DomainId[] = [
  "domain1",
  "domain2",
  "domain3",
  "domain4",
  "domain5",
];

function getBarColor(percentage: number): string {
  if (percentage >= 70) return "bg-green-500";
  if (percentage >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

export function DomainPerformanceGrid() {
  const domainProgress = useLearningStore((s) => s.domainProgress);

  return (
    <div
      data-testid="domain-performance-grid"
      className="bg-gray-800 rounded-lg border border-gray-700 p-5"
    >
      <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wide">
        Domain Performance
      </h3>

      <div className="space-y-4">
        {DOMAIN_IDS.map((domainId) => {
          const info = DOMAIN_INFO[domainId];
          const progress = domainProgress[domainId];
          const attempted = progress?.questionsAttempted ?? 0;
          const correct = progress?.questionsCorrect ?? 0;
          const percentage =
            attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

          return (
            <div key={domainId}>
              {/* Domain name + weight */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-300">{info.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    Weight: {info.weight}%
                  </span>
                  {attempted > 0 && (
                    <span className="text-xs text-gray-400 font-semibold">
                      {correct}/{attempted} ({percentage}%)
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-700 rounded-full h-2">
                {attempted > 0 ? (
                  <div
                    className={`h-2 rounded-full transition-all ${getBarColor(percentage)}`}
                    style={{ width: `${percentage}%` }}
                  />
                ) : (
                  <div className="h-2 rounded-full bg-gray-600 w-0" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
