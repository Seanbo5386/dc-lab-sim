/**
 * Tour step definitions for the spotlight onboarding tour.
 *
 * Each tab (Simulator, Labs, Docs, Exams, About) has its own set of steps
 * that highlight key UI elements on the user's first visit.
 */

export interface TourStep {
  /** CSS selector for the target element */
  selector: string;
  /** Bold heading displayed in the tooltip */
  title: string;
  /** 1-2 sentence explanation */
  description: string;
  /** Preferred tooltip placement relative to the target */
  placement: "top" | "bottom" | "left" | "right";
}

export type TourId = "simulator" | "labs" | "docs" | "exams" | "about";

export const SIMULATOR_TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="dashboard-panel"]',
    title: "Cluster Dashboard",
    description:
      "This is your real-time view of the datacenter. It shows GPU health, memory usage, temperatures, and node status across the cluster.",
    placement: "right",
  },
  {
    selector: '[data-tour="terminal-panel"]',
    title: "Interactive Terminal",
    description:
      "Type datacenter commands here just like a real Linux terminal. Try `nvidia-smi` or `ibstat` to see simulated output from actual NVIDIA tools.",
    placement: "left",
  },
  {
    selector: '[data-tour="sim-controls"]',
    title: "Simulation Controls",
    description:
      "Use these to pause, resume, or reset the cluster state. Pausing freezes all metrics so you can inspect values without them changing.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="split-handle"]',
    title: "Adjustable Layout",
    description:
      "Drag this handle to resize the dashboard and terminal panels. Your layout preference is saved automatically.",
    placement: "left",
  },
  {
    selector: "#tab-labs",
    title: "Ready to Learn?",
    description:
      "When you're ready for guided missions, head to Labs & Scenarios. There are 32 story-driven scenarios covering all five exam domains.",
    placement: "bottom",
  },
  {
    selector: "#tab-exams",
    title: "Test Yourself",
    description:
      "The Exams tab has practice exams, timed quizzes, a gauntlet mode, and tool mastery challenges to measure your certification readiness.",
    placement: "bottom",
  },
  {
    selector: "#tab-reference",
    title: "Reference Library",
    description:
      "Need to look up a command, troubleshoot an error, or review the exam blueprint? The Documentation tab has architecture guides, command references, and XID error codes.",
    placement: "bottom",
  },
  {
    selector: "#tab-about",
    title: "About & Changelog",
    description:
      "Learn about the project, find the GitHub repo, and check the changelog for what's new in each release.",
    placement: "bottom",
  },
];

export const LABS_TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="missions-grid"]',
    title: "Mission Board",
    description:
      "Scenarios are organized by exam domain. Each domain maps to a section of the NCP-AII certification with its exam weight shown.",
    placement: "top",
  },
  {
    selector: '[data-tour="scenario-card-first"]',
    title: "Story-Driven Missions",
    description:
      "Each mission drops you into a realistic datacenter situation. You'll get a briefing, work through steps in the terminal, and answer knowledge checks along the way.",
    placement: "right",
  },
  {
    selector: '[data-tour="difficulty-badges"]',
    title: "Difficulty Levels",
    description:
      "Scenarios are sorted by difficulty. Start with beginner missions to learn the tools, then progress to advanced scenarios where you diagnose issues with no hints.",
    placement: "right",
  },
  {
    selector: "#tab-exams",
    title: "Test Your Knowledge",
    description:
      "When you're ready to test yourself, head to the Exams tab for practice exams, timed quizzes, and tool mastery challenges.",
    placement: "bottom",
  },
];

export const DOCS_TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="doc-sub-tabs"]',
    title: "Documentation Sections",
    description:
      "Six reference sections cover everything from cluster architecture to exam strategy. Click any tab to jump to that topic.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="doc-architecture"]',
    title: "Cluster Architecture",
    description:
      "Start here to understand the DGX SuperPOD layout \u2014 node specs, GPU configurations, and the InfiniBand network fabric connecting it all.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="doc-commands"]',
    title: "Command Reference",
    description:
      "A searchable reference for every simulated command, organized by tool family. Each entry shows usage examples and what to look for in the output.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="doc-troubleshooting"]',
    title: "Troubleshooting Flows",
    description:
      "Step-by-step troubleshooting workflows for common datacenter issues like GPU errors, network failures, and thermal events.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="doc-xid"]',
    title: "XID Error Reference",
    description:
      "Look up NVIDIA XID error codes by number or keyword. Each entry explains severity, likely cause, and recommended remediation.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="doc-exam"]',
    title: "Exam Blueprint",
    description:
      "Review the NCP-AII certification structure \u2014 domain weights, question format, and study strategies to focus your preparation.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="doc-glossary"]',
    title: "Glossary",
    description:
      "Quick-reference glossary of datacenter and NVIDIA terminology you'll encounter on the exam and in the simulator.",
    placement: "bottom",
  },
];

export const EXAMS_TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="exam-readiness"]',
    title: "Readiness Score",
    description:
      "Your overall exam preparedness based on practice results, study time, and streak.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="exam-modes"]',
    title: "Exam Modes",
    description:
      "Five practice formats: Full Practice, Quick Quiz, Gauntlet, Weak Area, and Review Mistakes.",
    placement: "top",
  },
  {
    selector: '[data-tour="tool-mastery"]',
    title: "Tool Mastery Quizzes",
    description:
      "Test your knowledge of each command family with Tool Selection and Deep Mastery quizzes.",
    placement: "top",
  },
  {
    selector: '[data-tour="exam-history"]',
    title: "History & Performance",
    description:
      "Track your exam scores over time and see which domains need more practice.",
    placement: "top",
  },
];

export const ABOUT_TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="about-motivation"]',
    title: "Project Overview",
    description:
      "What this simulator is, why it was built, and key stats about its scope.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="about-contribute"]',
    title: "Contribute & Feedback",
    description:
      "GitHub repository link, how to file issues, and contribution guidelines.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="about-legal"]',
    title: "Legal Disclaimer",
    description:
      "Important trademark notices and disclaimers about this project's relationship to NVIDIA.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="about-credits"]',
    title: "Special Thanks",
    description:
      "Credits and acknowledgments for the tools and resources that made this project possible.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="about-changelog"]',
    title: "Version History",
    description:
      "Expand the changelog to see what's been added in each release.",
    placement: "bottom",
  },
];

export const TOUR_STEPS: Record<TourId, TourStep[]> = {
  simulator: SIMULATOR_TOUR_STEPS,
  labs: LABS_TOUR_STEPS,
  docs: DOCS_TOUR_STEPS,
  exams: EXAMS_TOUR_STEPS,
  about: ABOUT_TOUR_STEPS,
};
