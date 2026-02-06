import { FaultInjection } from "./FaultInjection";
import { Trophy, GraduationCap, TrendingUp } from "lucide-react";

interface LabsAndScenariosViewProps {
  onStartLab: (domain: string) => void;
  onBeginExam: () => void;
  onOpenLearningPaths: () => void;
  onOpenStudyDashboard: () => void;
  onOpenExamGauntlet: () => void;
  learningProgress: { completed: number; total: number };
}

export function LabsAndScenariosView({
  onStartLab,
  onBeginExam,
  onOpenLearningPaths,
  onOpenStudyDashboard,
  onOpenExamGauntlet,
  learningProgress,
}: LabsAndScenariosViewProps) {
  return (
    <div data-testid="labs-list" className="p-6 h-full overflow-auto">
      <div className="max-w-6xl mx-auto">
        {/* Fault Injection System */}
        <FaultInjection />

        {/* Lab Scenarios */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-nvidia-green mb-6">
            Interactive Labs & Scenarios
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Domain 1: Systems and Server Bring-Up */}
            <div
              data-testid="domain-1-card"
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <div className="text-sm text-nvidia-green font-semibold mb-2">
                Domain 1 • 31%
              </div>
              <h3 className="text-lg font-bold mb-3">
                Systems & Server Bring-Up
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-nvidia-green">▸</span>
                  DGX SuperPOD Initial Deployment
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-nvidia-green">▸</span>
                  Firmware Upgrade Workflow
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-nvidia-green">▸</span>
                  Cable Validation
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-nvidia-green">▸</span>
                  Power and Cooling Validation
                </li>
              </ul>
              <button
                onClick={() => onStartLab("domain1")}
                className="mt-4 w-full bg-nvidia-green text-black py-2 rounded-lg font-medium hover:bg-nvidia-darkgreen transition-colors"
              >
                Start Labs
              </button>
            </div>

            {/* Domain 2: Physical Layer Management */}
            <div
              data-testid="domain-2-card"
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <div className="text-sm text-nvidia-green font-semibold mb-2">
                Domain 2 • 5%
              </div>
              <h3 className="text-lg font-bold mb-3">
                Physical Layer Management
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-nvidia-green">▸</span>
                  BlueField DPU Configuration
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-nvidia-green">▸</span>
                  MIG Partitioning
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-nvidia-green">▸</span>
                  Advanced MIG Scenarios
                </li>
              </ul>
              <button
                onClick={() => onStartLab("domain2")}
                className="mt-4 w-full bg-nvidia-green text-black py-2 rounded-lg font-medium hover:bg-nvidia-darkgreen transition-colors"
              >
                Start Labs
              </button>
            </div>

            {/* Domain 3: Control Plane Installation */}
            <div
              data-testid="domain-3-card"
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <div className="text-sm text-nvidia-green font-semibold mb-2">
                Domain 3 • 19%
              </div>
              <h3 className="text-lg font-bold mb-3">
                Control Plane Installation
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-nvidia-green">▸</span>
                  BCM High Availability Setup
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-nvidia-green">▸</span>
                  Slurm with GPU GRES
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-nvidia-green">▸</span>
                  Container Toolkit Setup
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-nvidia-green">▸</span>
                  Pyxis/Enroot with Slurm
                </li>
              </ul>
              <button
                onClick={() => onStartLab("domain3")}
                className="mt-4 w-full bg-nvidia-green text-black py-2 rounded-lg font-medium hover:bg-nvidia-darkgreen transition-colors"
              >
                Start Labs
              </button>
            </div>

            {/* Domain 4: Cluster Test and Verification */}
            <div
              data-testid="domain-4-card"
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <div className="text-sm text-nvidia-green font-semibold mb-2">
                Domain 4 • 33%
              </div>
              <h3 className="text-lg font-bold mb-3">
                Cluster Test & Verification
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-nvidia-green">▸</span>
                  Single-Node Stress Test
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-nvidia-green">▸</span>
                  HPL Benchmark
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-nvidia-green">▸</span>
                  NCCL Tests (Single & Multi-Node)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-nvidia-green">▸</span>
                  Storage Validation
                </li>
              </ul>
              <button
                onClick={() => onStartLab("domain4")}
                className="mt-4 w-full bg-nvidia-green text-black py-2 rounded-lg font-medium hover:bg-nvidia-darkgreen transition-colors"
              >
                Start Labs
              </button>
            </div>

            {/* Domain 5: Troubleshooting */}
            <div
              data-testid="domain-5-card"
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <div className="text-sm text-nvidia-green font-semibold mb-2">
                Domain 5 • 12%
              </div>
              <h3 className="text-lg font-bold mb-3">
                Troubleshooting & Optimization
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-nvidia-green">▸</span>
                  Low HPL Performance
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-nvidia-green">▸</span>
                  GPU Faults in NVSM
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-nvidia-green">▸</span>
                  InfiniBand Link Errors
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-nvidia-green">▸</span>
                  Container GPU Visibility Issues
                </li>
              </ul>
              <button
                onClick={() => onStartLab("domain5")}
                className="mt-4 w-full bg-nvidia-green text-black py-2 rounded-lg font-medium hover:bg-nvidia-darkgreen transition-colors"
              >
                Start Labs
              </button>
            </div>

            {/* Practice Exam */}
            <div
              data-testid="practice-exam-card"
              className="bg-gradient-to-br from-nvidia-green to-nvidia-darkgreen rounded-lg p-6 border border-nvidia-green"
            >
              <div className="text-sm text-black font-semibold mb-2">
                Full Exam Simulation
              </div>
              <h3 className="text-lg font-bold text-black mb-3">
                NCP-AII Practice Exam
              </h3>
              <p className="text-sm text-gray-900 mb-4">
                Take a timed mock exam with questions covering all five domains.
                Get instant feedback and detailed explanations.
              </p>
              <button
                onClick={onBeginExam}
                className="w-full bg-black text-nvidia-green py-2 rounded-lg font-medium hover:bg-gray-900 transition-colors"
              >
                Begin Practice Exam
              </button>
            </div>

            {/* Exam Gauntlet */}
            <div
              data-testid="exam-gauntlet-card"
              className="bg-gray-800 rounded-lg p-6 border border-orange-600"
            >
              <div className="text-sm text-orange-400 font-semibold mb-2 flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Timed Challenge
              </div>
              <h3 className="text-lg font-bold mb-3">Exam Gauntlet</h3>
              <p className="text-sm text-gray-300 mb-4">
                Tackle 10 weighted scenarios in a timed exam format. Simulates
                the real DCA certification experience with domain-based scoring.
              </p>
              <ul className="space-y-2 text-sm text-gray-300 mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">▸</span>
                  10 scenarios weighted by exam domains
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">▸</span>
                  Choose 30, 60, or 90 minute time limit
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">▸</span>
                  Detailed domain performance breakdown
                </li>
              </ul>
              <button
                onClick={onOpenExamGauntlet}
                className="w-full bg-orange-600 text-white py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors"
              >
                Start Gauntlet
              </button>
            </div>

            {/* Learning Paths */}
            <div className="bg-gray-800 rounded-lg p-6 border border-purple-600">
              <div className="text-sm text-purple-400 font-semibold mb-2 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Guided Learning
              </div>
              <h3 className="text-lg font-bold mb-3">Learning Paths</h3>

              {/* Progress indicator */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-purple-400">
                    {learningProgress.completed}/{learningProgress.total}{" "}
                    lessons
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 transition-all duration-300"
                    style={{
                      width: `${learningProgress.total > 0 ? (learningProgress.completed / learningProgress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">▸</span>
                  Structured curricula for each domain
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">▸</span>
                  Step-by-step interactive tutorials
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">▸</span>
                  Hands-on command practice
                </li>
              </ul>
              <button
                onClick={onOpenLearningPaths}
                className="mt-4 w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                {learningProgress.completed > 0
                  ? "Continue Learning"
                  : "Start Learning"}
              </button>
            </div>

            {/* Study Progress Dashboard */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-sm text-blue-400 font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Track Your Progress
              </div>
              <h3 className="text-lg font-bold mb-3">Study Dashboard</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">▸</span>
                  View exam history & scores
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">▸</span>
                  Track domain performance
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">▸</span>
                  Study streak & recommendations
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">▸</span>
                  Identify weak areas
                </li>
              </ul>
              <button
                onClick={onOpenStudyDashboard}
                className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                View Progress
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
