import { create } from "zustand";

export type AuthToastType = "success" | "info" | "error";

interface AuthToastState {
  visible: boolean;
  message: string;
  type: AuthToastType;
  show: (message: string, type: AuthToastType) => void;
  dismiss: () => void;
}

export const useAuthToastStore = create<AuthToastState>()((set) => ({
  visible: false,
  message: "",
  type: "success" as AuthToastType,

  show: (message, type) => {
    set({ visible: true, message, type });
  },

  dismiss: () => {
    set({ visible: false });
  },
}));
