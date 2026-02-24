/**
 * Sync Toast Notification Store
 *
 * Lightweight Zustand store for ephemeral toast notifications triggered by
 * cloud sync failures and offline status. No persistence — toasts are transient.
 */

import { create } from "zustand";

export type SyncToastType = "error" | "offline" | "retrying";

interface SyncToastState {
  visible: boolean;
  message: string;
  type: SyncToastType;
  show: (message: string, type: SyncToastType) => void;
  dismiss: () => void;
}

export const useSyncToastStore = create<SyncToastState>()((set) => ({
  visible: false,
  message: "",
  type: "error" as SyncToastType,

  show: (message, type) => {
    set({ visible: true, message, type });
  },

  dismiss: () => {
    set({ visible: false });
  },
}));
