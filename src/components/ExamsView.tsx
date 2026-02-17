import commandFamiliesData from "@/data/commandFamilies.json";
import { EXAM_MODE_REGISTRY } from "@/data/examModeRegistry";
import { useLearningStore } from "@/store/learningStore";
import { useLearningProgressStore } from "@/store/learningProgressStore";
import { ExamReadinessHero } from "./exam-dashboard/ExamReadinessHero";
import { ExamModeCard } from "./exam-dashboard/ExamModeCard";
import { ToolQuizCard } from "./exam-dashboard/ToolQuizCard";
import { RecentExamHistory } from "./exam-dashboard/RecentExamHistory";
import { DomainPerformanceGrid } from "./exam-dashboard/DomainPerformanceGrid";

interface CommandFamily {
  id: string;
  name: string;
  icon: string;
  quickRule: string;
  tools: { name: string }[];
}

export interface ExamsViewProps {
  onBeginExam: (mode?: string) => void;
  onOpenExamGauntlet: () => void;
  onOpenToolQuiz: (familyId: string) => void;
  onOpenMasteryQuiz: (familyId: string) => void;
}

export function ExamsView({
  onBeginExam,
  onOpenExamGauntlet,
  onOpenToolQuiz,
  onOpenMasteryQuiz,
}: ExamsViewProps) {
  const examAttempts = useLearningStore((s) => s.examAttempts);
  const familyQuizScores = useLearningProgressStore((s) => s.familyQuizScores);
  const masteryQuizScores = useLearningProgressStore(
    (s) => s.masteryQuizScores,
  );

  const families = (commandFamiliesData as { families: CommandFamily[] })
    .families;

  // Get last exam score for display on cards
  const lastExamScore =
    examAttempts.length > 0
      ? examAttempts[examAttempts.length - 1].percentage
      : undefined;

  return (
    <div data-testid="exams-list" className="p-6 h-full overflow-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Readiness Hero */}
        <div data-tour="exam-readiness">
          <ExamReadinessHero />
        </div>

        {/* Exam Modes */}
        <section data-tour="exam-modes">
          <h2 className="text-lg font-bold text-white mb-1">Exam Modes</h2>
          <p className="text-sm text-gray-400 mb-4">
            Choose an exam format that matches your study goals.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXAM_MODE_REGISTRY.map((mode) => (
              <ExamModeCard
                key={mode.id}
                mode={mode}
                onLaunch={() => {
                  if (mode.launchKey === "gauntlet") {
                    onOpenExamGauntlet();
                  } else {
                    onBeginExam(mode.examMode);
                  }
                }}
                lastScore={
                  mode.id === "full-practice" || mode.id === "quick-quiz"
                    ? lastExamScore
                    : undefined
                }
              />
            ))}
          </div>
        </section>

        {/* Tool Mastery Quizzes */}
        <section data-tour="tool-mastery">
          <h2 className="text-lg font-bold text-white mb-1">
            Tool Mastery Quizzes
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Test your knowledge of specific command families — from tool
            selection to deep mastery of flags, output, and troubleshooting.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {families.map((family) => (
              <ToolQuizCard
                key={family.id}
                familyId={family.id}
                familyName={family.name}
                familyIcon={family.icon}
                tools={family.tools.map((t) => t.name)}
                description={family.quickRule}
                quizResult={familyQuizScores[family.id]}
                masteryResult={masteryQuizScores[family.id]}
                onTakeQuiz={onOpenToolQuiz}
                onTakeMasteryQuiz={onOpenMasteryQuiz}
              />
            ))}
          </div>
        </section>

        {/* History + Domain Performance */}
        <div
          data-tour="exam-history"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <RecentExamHistory />
          <DomainPerformanceGrid />
        </div>
      </div>
    </div>
  );
}
