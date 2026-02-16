import {
  BookOpen,
  Zap,
  Trophy,
  Target,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { EXAM_MODE_CONFIGS, type ExamMode } from "@/utils/examEngine";

export interface ExamModeEntry {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  duration: string;
  questionCount: string;
  badge?: string;
  launchKey: "exam" | "gauntlet";
  examMode?: ExamMode;
}

export const EXAM_MODE_REGISTRY: ExamModeEntry[] = [
  {
    id: "full-practice",
    title: EXAM_MODE_CONFIGS["full-practice"].name,
    subtitle: "Full Exam Simulation",
    description: EXAM_MODE_CONFIGS["full-practice"].description,
    icon: BookOpen,

    duration: "90 min",
    questionCount: "60 questions",
    badge: "RECOMMENDED",
    launchKey: "exam",
    examMode: "full-practice",
  },
  {
    id: "quick-quiz",
    title: EXAM_MODE_CONFIGS["quick-quiz"].name,
    subtitle: "Fast Review",
    description: EXAM_MODE_CONFIGS["quick-quiz"].description,
    icon: Zap,

    duration: "15 min",
    questionCount: "15 questions",
    launchKey: "exam",
    examMode: "quick-quiz",
  },
  {
    id: "exam-gauntlet",
    title: "Exam Gauntlet",
    subtitle: "Timed Challenge",
    description:
      "Tackle 10 weighted scenarios in a timed exam format. Simulates the real DCA certification experience with domain-based scoring.",
    icon: Trophy,

    duration: "30-90 min",
    questionCount: "10 scenarios",
    launchKey: "gauntlet",
  },
  {
    id: "weak-area-focus",
    title: EXAM_MODE_CONFIGS["weak-area-focus"].name,
    subtitle: "Targeted Practice",
    description: EXAM_MODE_CONFIGS["weak-area-focus"].description,
    icon: Target,

    duration: "30 min",
    questionCount: "20 questions",
    launchKey: "exam",
    examMode: "weak-area-focus",
  },
  {
    id: "review-mistakes",
    title: EXAM_MODE_CONFIGS["review-mode"].name,
    subtitle: "Learn From Errors",
    description: EXAM_MODE_CONFIGS["review-mode"].description,
    icon: RotateCcw,

    duration: "No limit",
    questionCount: "Varies",
    launchKey: "exam",
    examMode: "review-mode",
  },
];
