import { PREMIUM_FREESHIP_POPUP_STORAGE_KEY } from "../constants/premium-freeship-popup";

export function getPremiumFreeshipPopupLastSeen(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREMIUM_FREESHIP_POPUP_STORAGE_KEY);
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function setPremiumFreeshipPopupLastSeen(value: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREMIUM_FREESHIP_POPUP_STORAGE_KEY, String(value));
  } catch {
    // Ignore storage failures.
  }
}
