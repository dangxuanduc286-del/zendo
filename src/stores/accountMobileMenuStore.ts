"use client";

import { create } from "zustand";

type AccountMobileMenuState = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

export const useAccountMobileMenuStore = create<AccountMobileMenuState>((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  close: () => set({ open: false }),
}));

