/**
 * Fault Toast Notification Store
 *
 * Lightweight Zustand store for ephemeral toast notifications triggered by
 * the Fault Injection Training System. No persistence — toasts are transient.
 */

import { create } from "zustand";

export interface FaultToastData {
  id: string;
  title: string;
  message: string;
  suggestedCommand: string;
  severity: "critical" | "warning" | "info";
  xidCode?: number;
}

interface FaultToastState {
  toasts: FaultToastData[];
  addToast: (data: Omit<FaultToastData, "id">) => void;
  removeToast: (id: string) => void;
}

const MAX_TOASTS = 3;

function generateToastId(): string {
  return `fault-toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useFaultToastStore = create<FaultToastState>()((set) => ({
  toasts: [],

  addToast: (data) => {
    const toast: FaultToastData = {
      ...data,
      id: generateToastId(),
    };

    set((state) => {
      const updated = [...state.toasts, toast];
      // Keep only the newest MAX_TOASTS
      if (updated.length > MAX_TOASTS) {
        return { toasts: updated.slice(updated.length - MAX_TOASTS) };
      }
      return { toasts: updated };
    });
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
