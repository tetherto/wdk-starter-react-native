import { create } from 'zustand';

interface ToastState {
  message: string | null;
  show: (message: string) => void;
  hide: () => void;
}

/**
 * Global toast state — matches the prototype's single, reusable #toast
 * element (shown for "Swap coming soon", "Buy coming soon", "Scan coming
 * soon", "Address copied", etc.) rather than a native Alert dialog. Any
 * screen can call useToast().show('message') from anywhere; the actual
 * rendering + auto-hide timer lives in components/Toast.tsx, mounted once
 * at the root so it overlays whatever screen is currently active — same
 * pattern as the prototype's one global toast div.
 */
export const useToast = create<ToastState>((set) => ({
  message: null,
  show: (message) => set({ message }),
  hide: () => set({ message: null }),
}));
