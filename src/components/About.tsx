import {
  Rocket,
  Github,
  Bug,
  GitPullRequest,
  Tag,
  ExternalLink,
  Sparkles,
} from "lucide-react";

const CHANGELOG = [
  {
    version: "v0.9.0",
    title: "Sandbox & Multi-Architecture",
    current: true,
    highlights: [
      "ScenarioContext isolation for per-scenario sandbox state",
      "DGX A100, H100, H200, and B200 hardware support",
      "Spotlight tour for guided onboarding",
      "CI/CD pipeline with lint, test, and build checks",
    ],
  },
  {
    version: "v0.8.0",
    title: "Code Quality",
    highlights: [
      "20-task improvement plan from codebase audit",
      "ESLint zero errors and warnings",
      "CommandRouter refactor for maintainability",
      "Lazy loading for improved initial load",
    ],
  },
  {
    version: "v0.7.0",
    title: "Narrative Scenarios",
    highlights: [
      "28 story-driven scenarios across all 5 domains",
      "NarrativeIntro mission briefing screen",
      "InlineQuiz for in-scenario knowledge checks",
      "NarrativeResolution with debrief and scoring",
    ],
  },
  {
    version: "v0.6.0",
    title: "UI Consolidation",
    highlights: [
      "Four-tab navigation (Simulator, Labs, Documentation)",
      "ReferenceTab with unified command lookup",
      "XID error code reference database",
    ],
  },
  {
    version: "v0.5.0",
    title: "Learning Phases 2\u20134",
    highlights: [
      "Spaced repetition with SM-2 algorithm",
      "Three-tier progression (Guided \u2192 Choice \u2192 Realistic)",
      "ExamGauntlet timed random testing",
    ],
  },
  {
    version: "v0.4.0",
    title: "CLI Architecture",
    highlights: [
      "JSON-based command definitions",
      "Registry-based validation system",
      "Structured command parsing and routing",
    ],
  },
  {
    version: "v0.3.0",
    title: "Learning System",
    highlights: [
      "Study Dashboard with progress tracking",
      "Quiz questions for 6 command families",
      "LearningPaths tab interface",
      "2,900+ unit tests",
    ],
  },
  {
    version: "v0.2.0",
    title: "Interactive Features",
    highlights: [
      "GPU benchmarking simulator",
      "MIG configurator",
      "Slurm job visualizer",
      "InfiniBand cable tracer",
    ],
  },
  {
    version: "v0.1.0",
    title: "Foundation",
    highlights: [
      "Core terminal simulator with xterm.js",
      "D3.js network topology visualization",
      "Zustand state management stores",
      "DGX cluster modeling with GPU/NVLink/IB state",
    ],
  },
];

const REPO_URL = "https://github.com/Seanbo5386/NVIDIA-Certification-Simulator";

export function About() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h2 className="text-xl font-bold text-nvidia-green">About</h2>
        <p className="text-sm text-gray-400 mt-1">
          Project background, how to contribute, and version history
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Motivation */}
        <section>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
            <Rocket className="w-5 h-5 text-nvidia-green" />
            Motivation
          </h3>
          <div className="bg-gray-800 rounded-lg p-5 space-y-3 text-gray-300 text-sm leading-relaxed">
            <p>
              The{" "}
              <span className="text-white font-medium">
                NVIDIA AI Infrastructure Certification Simulator
              </span>{" "}
              is a browser-based training environment for the{" "}
              <span className="text-nvidia-green font-medium">
                NCP-AII certification exam
              </span>
              . It lets you practice datacenter administration commands and
              troubleshooting workflows without needing physical DGX hardware.
            </p>
            <p>
              The simulator covers the full exam blueprint across all five
              domains: Systems & Server Bring-Up, Physical Layer Management,
              Control Plane Installation, Cluster Test & Verification, and
              Troubleshooting & Optimization.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {[
                { label: "Scenarios", value: "28" },
                { label: "Domains", value: "5" },
                { label: "Exam Questions", value: "150+" },
                { label: "Command Families", value: "6" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-gray-900 rounded-lg p-3 text-center"
                >
                  <div className="text-xl font-bold text-nvidia-green">
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contribute & Feedback */}
        <section>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
            <Github className="w-5 h-5 text-nvidia-green" />
            Contribute & Feedback
          </h3>
          <div className="bg-gray-800 rounded-lg p-5 space-y-4 text-sm">
            <p className="text-gray-300 leading-relaxed">
              This project is open source. Contributions, bug reports, and
              feature requests are welcome.
            </p>
            <div className="space-y-3">
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="github-link"
                className="flex items-center gap-2 text-nvidia-green hover:text-green-400 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                GitHub Repository
              </a>
              <div className="flex items-start gap-2 text-gray-400">
                <Bug className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Found a bug or have feedback? Open an{" "}
                  <a
                    href={`${REPO_URL}/issues`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-nvidia-green hover:text-green-400 transition-colors underline"
                  >
                    issue
                  </a>{" "}
                  on GitHub.
                </span>
              </div>
              <div className="flex items-start gap-2 text-gray-400">
                <GitPullRequest className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Want to contribute? Fork the repo, create a branch, and submit
                  a pull request.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Changelog */}
        <section>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
            <Tag className="w-5 h-5 text-nvidia-green" />
            Changelog
          </h3>
          <div className="space-y-0">
            {CHANGELOG.map((entry, i) => (
              <div key={entry.version} className="flex gap-4">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 mt-1.5 ${
                      entry.current
                        ? "bg-nvidia-green ring-2 ring-nvidia-green ring-offset-2 ring-offset-gray-900"
                        : "bg-gray-600"
                    }`}
                  />
                  {i < CHANGELOG.length - 1 && (
                    <div className="w-px flex-1 bg-gray-700 my-1" />
                  )}
                </div>

                {/* Content */}
                <div className="pb-6 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-mono text-sm font-bold ${
                        entry.current ? "text-nvidia-green" : "text-gray-300"
                      }`}
                      data-testid={
                        entry.current ? "current-version" : undefined
                      }
                    >
                      {entry.version}
                    </span>
                    <span className="text-sm text-gray-400">{entry.title}</span>
                    {entry.current && (
                      <span className="text-xs bg-nvidia-green text-black px-1.5 py-0.5 rounded font-medium">
                        current
                      </span>
                    )}
                  </div>
                  <ul className="text-xs text-gray-400 space-y-0.5">
                    {entry.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-1.5">
                        <span className="text-gray-600 mt-0.5">&#x2022;</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Special Thanks */}
        <section className="pb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-nvidia-green" />
            Special Thanks
          </h3>
          <div className="bg-gray-800 rounded-lg p-5 text-sm text-gray-300 leading-relaxed">
            <p>
              This project was built in partnership with{" "}
              <a
                href="https://claude.ai/claude-code"
                target="_blank"
                rel="noopener noreferrer"
                className="text-nvidia-green font-medium hover:text-green-400 transition-colors underline"
              >
                Claude Code
              </a>
              , powered by{" "}
              <span className="text-nvidia-green font-medium">
                Anthropic's Claude Opus 4.6
              </span>
              . From architecting the sandbox isolation system to wiring up
              2,900+ unit tests, from debugging circular dependency chains at
              midnight to crafting every narrative scenario — Opus was there for
              every commit.
            </p>
            <p className="mt-3 text-gray-400">
              This simulator genuinely would not exist without AI-assisted
              development. What would have taken a team months was built by one
              developer and one very determined language model. Here's to the
              future of human-AI collaboration.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
