import React, { useEffect, useState, useRef } from "react";
import {
  Terminal,
  Monitor,
  BookOpen,
  Cpu,
  ShieldCheck,
  Activity,
  ArrowRight,
} from "lucide-react";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface WelcomeScreenProps {
  onClose: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle close with animation
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 500); // Wait for animation
  };

  // Set up focus trap for accessibility (WCAG 2.1.2)
  useFocusTrap(modalRef, {
    isActive: isVisible,
    onEscape: handleClose,
  });

  useEffect(() => {
    // Trigger animation on mount
    setIsVisible(true);
  }, []);

  return (
    <div
      data-testid="welcome-screen"
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-700 ${isVisible ? "opacity-100" : "opacity-0"}`}
    >
      {/* Background Backdrop with Blur and Overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Main Content Container */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-dialog-title"
        className={`relative z-10 w-full max-w-5xl max-h-[90vh] bg-gray-900/90 border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-700 delay-100 flex flex-col ${isVisible ? "translate-y-0 scale-100" : "translate-y-10 scale-95"}`}
      >
        {/* Header Section — compact to maximize content area */}
        <div className="relative overflow-hidden bg-gradient-to-r from-black to-gray-900 px-6 py-4 text-center border-b border-gray-800 flex-shrink-0">
          {/* Decorative NVIDIA Green Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-nvidia-green shadow-[0_0_20px_rgba(118,185,0,0.6)]" />

          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 bg-nvidia-green rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(118,185,0,0.3)] animate-pulse-slow">
              <span className="text-black font-bold text-2xl select-none">
                N
              </span>
            </div>
          </div>

          <h1
            id="welcome-dialog-title"
            className="text-2xl font-bold text-white mb-1 tracking-tight"
          >
            DC Lab <span className="text-nvidia-green">Sim</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-2xl mx-auto mt-1 px-4 font-light">
            Browser-based datacenter lab simulator for NCP-AII certification
            exam prep. Train, test, and certify in a risk-free virtual world.
          </p>
        </div>

        {/* Content Section */}
        <div className="p-5 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 overflow-y-auto flex-1">
          {/* Left Column: Mission & Description */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-6 h-6 text-nvidia-green" />
              <h3 className="text-xl font-semibold text-white">
                NCP-AII Certification Ready
              </h3>
            </div>
            <p className="text-gray-300 leading-relaxed text-base">
              Designed specifically for the{" "}
              <strong>
                NVIDIA Certified Professional - AI Infrastructure (NCP-AII)
              </strong>{" "}
              exam. This simulator provides a comprehensive platform to practice
              system administration, troubleshooting, and optimization tasks
              without needing physical hardware.
            </p>

            <div className="flex items-center gap-3 mt-8 mb-2">
              <Activity className="w-6 h-6 text-nvidia-green" />
              <h3 className="text-xl font-semibold text-white">
                Interactive Experience
              </h3>
            </div>
            <p className="text-gray-300 leading-relaxed text-base">
              Interact with a full-stack simulation of a DGX H100 SuperPOD. From
              managing physical connections to configuring complex workloads
              with Slurm and Kubernetes, every aspect is simulated with high
              fidelity.
            </p>
          </div>

          {/* Right Column: Key Features Grid */}
          <div className="grid grid-cols-1 gap-4">
            <FeatureCard
              icon={<Terminal className="w-6 h-6 text-black" />}
              title="Full CLI Simulation"
              description="Master essential tools: nvidia-smi, ipmitool, nvsm, cmsh, and mlxconfig with realistic outputs and behavior."
            />
            <FeatureCard
              icon={<Cpu className="w-6 h-6 text-black" />}
              title="Fault Injection Labs"
              description="Diagnose and resolve critical hardware failures like XID errors, thermal throttling, and network link drops."
            />
            <FeatureCard
              icon={<Monitor className="w-6 h-6 text-black" />}
              title="Real-time Telemetry"
              description="Visualize GPU utilization, memory bandwidth, and power consumption across the entire cluster."
            />
            <FeatureCard
              icon={<BookOpen className="w-6 h-6 text-black" />}
              title="Guided Scenarios"
              description="Step-by-step labs covering all 5 certification domains, from initial bring-up to advanced troubleshooting."
            />
          </div>
        </div>

        {/* Footer / Action */}
        <div className="bg-gray-900 border-t border-gray-800 p-3 flex justify-center flex-shrink-0">
          <button
            onClick={handleClose}
            className="group relative inline-flex items-center gap-3 px-6 py-3 bg-nvidia-green text-black text-base font-bold rounded-lg overflow-hidden transition-all duration-300 hover:bg-nvidia-darkgreen hover:scale-105 hover:shadow-[0_0_20px_rgba(118,185,0,0.4)] focus:outline-none focus:ring-2 focus:ring-nvidia-green focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            <span className="relative z-10">Enter Virtual Datacenter</span>
            <ArrowRight className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />

            {/* Button Shine Effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-shine bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper Component for Features
const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-700 group">
    <div className="flex-shrink-0 w-12 h-12 bg-nvidia-green rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
      {icon}
    </div>
    <div>
      <h4 className="text-white font-bold text-lg mb-1">{title}</h4>
      <p className="text-gray-400 text-sm leading-snug">{description}</p>
    </div>
  </div>
);
