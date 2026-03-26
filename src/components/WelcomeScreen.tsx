import React, { useEffect, useState, useRef } from "react";
import {
  Terminal,
  Monitor,
  BookOpen,
  Cpu,
  ArrowRight,
  Cloud,
} from "lucide-react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { TerminalDemo } from "./TerminalDemo";

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
        {/* 1. Header Section — compact; tighter on small screens */}
        <div className="relative overflow-hidden bg-gradient-to-r from-black to-gray-900 px-4 sm:px-6 py-2 sm:py-3 text-center border-b border-gray-800 flex-shrink-0">
          {/* Decorative NVIDIA Green Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-nvidia-green shadow-[0_0_20px_rgba(118,185,0,0.6)]" />

          <div className="flex justify-center mb-1 sm:mb-2">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-nvidia-green rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(118,185,0,0.3)] animate-pulse-slow">
              <span className="text-black font-bold text-lg sm:text-2xl select-none">
                N
              </span>
            </div>
          </div>

          <h1
            id="welcome-dialog-title"
            className="text-xl sm:text-2xl font-bold text-white mb-0.5 sm:mb-1 tracking-tight"
          >
            DC Lab <span className="text-nvidia-green">Sim</span>
          </h1>
          <p className="hidden sm:block text-gray-400 text-sm max-w-2xl mx-auto mt-1 px-4 font-light">
            Browser-based datacenter lab simulator for NCP-AII certification
            exam prep. Train, test, and certify in a risk-free virtual world.
          </p>
        </div>

        {/* 2. Terminal Demo — center stage; gets all remaining space */}
        <div className="px-3 sm:px-6 pt-3 sm:pt-5 pb-2 sm:pb-3 flex-1 min-h-0 overflow-y-auto">
          <TerminalDemo onEnterApp={handleClose} />
        </div>

        {/* 3. Stats Bar */}
        <div className="flex items-center justify-center gap-0 px-4 sm:px-6 py-1.5 sm:py-3 flex-shrink-0">
          <div className="flex items-center gap-0 divide-x divide-gray-700">
            <span className="px-2.5 sm:px-5 text-center text-xs sm:text-sm text-gray-400">
              32 Missions
            </span>
            <span className="px-2.5 sm:px-5 text-center text-xs sm:text-sm text-gray-400">
              229 Commands
            </span>
            <span className="px-2.5 sm:px-5 text-center text-xs sm:text-sm text-gray-400">
              6 Architectures
            </span>
            <span className="px-2.5 sm:px-5 text-center text-xs sm:text-sm text-gray-400">
              400+ Questions
            </span>
          </div>
        </div>

        {/* 4. Feature Pills — hidden on very small screens */}
        <div className="hidden sm:flex items-center justify-center gap-2 px-6 py-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-gray-800/50 rounded-full px-3 py-1.5">
            <Terminal className="w-4 h-4 text-nvidia-green" />
            <span className="text-gray-300 text-sm">CLI Simulation</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-800/50 rounded-full px-3 py-1.5">
            <Cpu className="w-4 h-4 text-nvidia-green" />
            <span className="text-gray-300 text-sm">Fault Injection</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-800/50 rounded-full px-3 py-1.5">
            <Monitor className="w-4 h-4 text-nvidia-green" />
            <span className="text-gray-300 text-sm">Telemetry</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-800/50 rounded-full px-3 py-1.5">
            <BookOpen className="w-4 h-4 text-nvidia-green" />
            <span className="text-gray-300 text-sm">Guided Scenarios</span>
          </div>
        </div>

        {/* 5. Sign-up CTA */}
        <div className="flex items-center justify-center gap-1.5 px-4 sm:px-6 py-1 sm:py-2 flex-shrink-0">
          <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
          <p className="text-xs sm:text-sm text-gray-400">
            <span className="text-nvidia-green">Sign up</span> to save your
            progress across devices
          </p>
        </div>

        {/* 6. Enter Button */}
        <div className="bg-gray-900 border-t border-gray-800 p-2 sm:p-3 flex justify-center flex-shrink-0">
          <button
            onClick={handleClose}
            className="group relative inline-flex items-center gap-2 sm:gap-3 px-5 sm:px-6 py-2.5 sm:py-3 bg-nvidia-green text-black text-sm sm:text-base font-bold rounded-lg overflow-hidden transition-all duration-300 hover:bg-nvidia-darkgreen hover:scale-105 hover:shadow-[0_0_20px_rgba(118,185,0,0.4)] focus:outline-none focus:ring-2 focus:ring-nvidia-green focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            <span className="relative z-10">Enter Virtual Datacenter</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />

            {/* Button Shine Effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-shine bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
