import {
  Rocket,
  Github,
  Bug,
  GitPullRequest,
  Tag,
  ExternalLink,
  Sparkles,
  Linkedin,
  Shield,
} from "lucide-react";

const CHANGELOG = [
  {
    version: "v0.9.2",
    title: "Polish & Educational Enrichment",
    current: true,
    highlights: [
      "Fault Injection educational toasts, info panels, and XID modal",
      "Virtual file system relative path resolution (cd + cat/ls/head/tail)",
      "Verbose --help mode with 'more' keyword for full untruncated output",
      "Legal disclaimer and NVIDIA trademark attribution",
    ],
  },
  {
    version: "v0.9.0",
    title: "Sandbox & Multi-Architecture",
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
              <a
                href="https://www.linkedin.com/in/sean-m-woods/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-nvidia-green hover:text-green-400 transition-colors"
              >
                <Linkedin className="w-4 h-4" />
                Sean Woods — Project Lead
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

        {/* Legal Disclaimer */}
        <section>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-nvidia-green" />
            Legal Disclaimer
          </h3>
          <div className="bg-gray-800 rounded-lg p-5 text-sm text-gray-400 leading-relaxed space-y-3">
            <p>
              NVIDIA, the NVIDIA logo, DGX, DGX A100, DGX H100, DGX H200, DGX
              B200, A100, H100, H200, B200, NVLink, NVSwitch, InfiniBand,
              Mellanox, ConnectX, BlueField, CUDA, DCGM, NCCL, and NVSM are
              trademarks and/or registered trademarks of{" "}
              <span className="text-white font-medium">NVIDIA Corporation</span>{" "}
              in the United States and other countries.
            </p>
            <p>
              This project is an{" "}
              <span className="text-white font-medium">
                independent, community-built educational tool
              </span>{" "}
              and is <span className="text-white font-medium">not</span>{" "}
              developed, endorsed, certified, or affiliated with NVIDIA
              Corporation in any way. The NCP-AII certification exam is
              administered solely by NVIDIA, and this simulator makes no
              guarantees about exam content, accuracy, or outcomes.
            </p>
            <p>
              All simulated command outputs, hardware specifications, and
              diagnostic data are approximations created for{" "}
              <span className="text-white font-medium">
                educational purposes only
              </span>{" "}
              and may not reflect the exact behavior of real NVIDIA hardware or
              software. Users should always refer to official NVIDIA
              documentation for authoritative technical information.
            </p>
            <p>
              Exam content, format, and objectives may be updated by NVIDIA at
              any time. This simulator may not reflect the most current exam
              material and is intended to{" "}
              <span className="text-white font-medium">
                supplement, not replace
              </span>
              , official NVIDIA training materials and documentation.
            </p>
            <p>
              This software is provided{" "}
              <span className="text-white font-medium">
                &quot;as is&quot; without warranty of any kind
              </span>
              , express or implied, including but not limited to the warranties
              of merchantability, fitness for a particular purpose, and
              noninfringement. In no event shall the authors or copyright
              holders be liable for any claim, damages, or other liability
              arising from the use of this software, including but not limited
              to exam results or certification outcomes.
            </p>
            <p>
              All other trademarks referenced herein are the property of their
              respective owners. Slurm is a trademark of SchedMD LLC. Linux is a
              registered trademark of Linus Torvalds. Docker is a trademark of
              Docker, Inc.
            </p>
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
                href="https://www.anthropic.com/claude-code"
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
              . Architecture design, test scaffolding, scenario authoring, and
              iterative debugging were all done through AI-assisted pair
              programming.
            </p>
            <p className="mt-3 text-gray-400">
              Thanks to NVIDIA for the NCP-AII certification program and the
              public documentation that made this simulator possible.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
