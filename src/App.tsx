import { useState, useEffect } from 'react';
import { SimulatorView } from './components/SimulatorView';
import { FaultInjection } from './components/FaultInjection';
import { LabWorkspace } from './components/LabWorkspace';
import { ExamWorkspace } from './components/ExamWorkspace';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Documentation } from './components/Documentation';
import { useSimulationStore } from './store/simulationStore';
import { MetricsSimulator } from './utils/metricsSimulator';
import { initializeScenario } from './utils/scenarioLoader';
import {
  Monitor,
  BookOpen,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
} from 'lucide-react';

type View = 'simulator' | 'labs' | 'docs';

// Metrics simulator instance
const metricsSimulator = new MetricsSimulator();

function App() {
  const [currentView, setCurrentView] = useState<View>('simulator');
  const [showLabWorkspace, setShowLabWorkspace] = useState(false);
  const [showExamWorkspace, setShowExamWorkspace] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  const {
    cluster,
    isRunning,
    startSimulation,
    stopSimulation,
    resetSimulation,
    exportCluster,
    importCluster,
  } = useSimulationStore();

  // Activate metrics simulation when running
  useEffect(() => {
    if (isRunning) {
      metricsSimulator.start((updater) => {
        const store = useSimulationStore.getState();
        store.cluster.nodes.forEach(node => {
          const updatedGPUs = updater(node.gpus);
          updatedGPUs.forEach((gpu, idx) => {
            if (JSON.stringify(gpu) !== JSON.stringify(node.gpus[idx])) {
              store.updateGPU(node.id, gpu.id, gpu);
            }
          });
        });
      }, 1000);
    } else {
      metricsSimulator.stop();
    }

    return () => {
      metricsSimulator.stop();
    };
  }, [isRunning]);

  const handleExport = () => {
    const data = exportCluster();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cluster-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          importCluster(content);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleStartLab = async (domain: string) => {
    // Map domain to first scenario in that domain
    const domainScenarios: Record<string, string> = {
      'domain1': 'domain1-server-post',
      'domain2': 'domain2-mig-setup',
      'domain3': 'domain3-slurm-config',
      'domain4': 'domain4-dcgmi-diag',
      'domain5': 'domain5-xid-errors',
    };

    const scenarioId = domainScenarios[domain];
    if (scenarioId) {
      const success = await initializeScenario(scenarioId);
      if (success) {
        setCurrentView('simulator'); // Switch to simulator view
        setShowLabWorkspace(true); // Show lab workspace overlay
      }
    }
  };

  const handleBeginExam = () => {
    setCurrentView('simulator'); // Switch to simulator view
    setShowExamWorkspace(true); // Show exam workspace overlay
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Header */}
      <header className={`bg-black border-b border-gray-800 px-6 py-4 transition-all duration-300 ${showLabWorkspace ? 'ml-[600px]' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-nvidia-green rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-xl">N</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-nvidia-green">
                  AI Infrastructure Simulator
                </h1>
                <p className="text-xs text-gray-400">
                  NCP-AII Certification Training Environment
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Simulation controls */}
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
              <button
                onClick={isRunning ? stopSimulation : startSimulation}
                className={`p-2 rounded transition-colors ${isRunning
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-nvidia-green hover:bg-nvidia-darkgreen text-black'
                  }`}
                title={isRunning ? 'Pause Simulation' : 'Start Simulation'}
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={resetSimulation}
                className="p-2 rounded hover:bg-gray-700 transition-colors text-gray-300"
                title="Reset Simulation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <div className="h-6 w-px bg-gray-700" />
              <button
                onClick={handleExport}
                className="p-2 rounded hover:bg-gray-700 transition-colors text-gray-300"
                title="Export Cluster Config"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleImport}
                className="p-2 rounded hover:bg-gray-700 transition-colors text-gray-300"
                title="Import Cluster Config"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>

            <div className="text-right">
              <div className="text-sm font-medium text-nvidia-green">
                {cluster.name}
              </div>
              <div className="text-xs text-gray-400">
                {cluster.nodes.length} nodes • {cluster.nodes.reduce((sum, n) => sum + n.gpus.length, 0)} GPUs
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className={`bg-gray-800 border-b border-gray-700 px-6 transition-all duration-300 ${showLabWorkspace ? 'ml-[600px]' : ''}`}>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentView('simulator')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${currentView === 'simulator'
              ? 'border-nvidia-green text-nvidia-green'
              : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
          >
            <Monitor className="w-4 h-4" />
            <span className="font-medium">Simulator</span>
          </button>
          <button
            onClick={() => setCurrentView('labs')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${currentView === 'labs'
              ? 'border-nvidia-green text-nvidia-green'
              : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
          >
            <Settings className="w-4 h-4" />
            <span className="font-medium">Labs & Scenarios</span>
          </button>
          <button
            onClick={() => setCurrentView('docs')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${currentView === 'docs'
              ? 'border-nvidia-green text-nvidia-green'
              : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="font-medium">Documentation</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className={`flex-1 overflow-hidden transition-all duration-300 ${showLabWorkspace ? 'ml-[600px]' : ''}`}>
        {currentView === 'simulator' && (
          <SimulatorView className="h-full" />
        )}

        {currentView === 'labs' && (
          <div className="p-6">
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
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
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
                      onClick={() => handleStartLab('domain1')}
                      className="mt-4 w-full bg-nvidia-green text-black py-2 rounded-lg font-medium hover:bg-nvidia-darkgreen transition-colors"
                    >
                      Start Labs
                    </button>
                  </div>

                  {/* Domain 2: Physical Layer Management */}
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
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
                      onClick={() => handleStartLab('domain2')}
                      className="mt-4 w-full bg-nvidia-green text-black py-2 rounded-lg font-medium hover:bg-nvidia-darkgreen transition-colors"
                    >
                      Start Labs
                    </button>
                  </div>

                  {/* Domain 3: Control Plane Installation */}
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
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
                      onClick={() => handleStartLab('domain3')}
                      className="mt-4 w-full bg-nvidia-green text-black py-2 rounded-lg font-medium hover:bg-nvidia-darkgreen transition-colors"
                    >
                      Start Labs
                    </button>
                  </div>

                  {/* Domain 4: Cluster Test and Verification */}
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
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
                      onClick={() => handleStartLab('domain4')}
                      className="mt-4 w-full bg-nvidia-green text-black py-2 rounded-lg font-medium hover:bg-nvidia-darkgreen transition-colors"
                    >
                      Start Labs
                    </button>
                  </div>

                  {/* Domain 5: Troubleshooting */}
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
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
                      onClick={() => handleStartLab('domain5')}
                      className="mt-4 w-full bg-nvidia-green text-black py-2 rounded-lg font-medium hover:bg-nvidia-darkgreen transition-colors"
                    >
                      Start Labs
                    </button>
                  </div>

                  {/* Practice Exam */}
                  <div className="bg-gradient-to-br from-nvidia-green to-nvidia-darkgreen rounded-lg p-6 border border-nvidia-green">
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
                      onClick={handleBeginExam}
                      className="w-full bg-black text-nvidia-green py-2 rounded-lg font-medium hover:bg-gray-900 transition-colors"
                    >
                      Begin Practice Exam
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'docs' && (
          <Documentation />
        )}
      </main>

      {/* Footer */}
      <footer className={`bg-black border-t border-gray-800 px-6 py-3 transition-all duration-300 ${showLabWorkspace ? 'ml-[600px]' : ''}`}>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div>
            NVIDIA AI Infrastructure Certification Simulator v1.0
          </div>
          <div className="flex items-center gap-4">
            <span>Status: {isRunning ? '🟢 Running' : '🔴 Paused'}</span>
            <span>•</span>
            <span>NCP-AII Training Environment</span>
          </div>
        </div>
      </footer>

      {/* Lab Workspace Overlay */}
      {showLabWorkspace && (
        <LabWorkspace onClose={() => setShowLabWorkspace(false)} />
      )}

      {/* Exam Workspace Overlay */}
      {showExamWorkspace && (
        <ExamWorkspace onClose={() => setShowExamWorkspace(false)} />
      )}
      {/* Welcome Splash Screen */}
      {showWelcome && (
        <WelcomeScreen onClose={() => setShowWelcome(false)} />
      )}
    </div>
  );
}

export default App;
