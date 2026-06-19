export type PremiumFreeshipPopupConfig = {
  enabled: boolean;
  title: string;
  headline: string;
  description: string;
  bannerDesktop: string;
  bannerMobile: string;
  imageUrl: string;
  popupLinkUrl: string;
  freeshipAmount: number;
  minimumOrder: number;
  delaySeconds: number;
  delayMs: number;
  repeatHours: number;
  primaryButtonText: string;
  secondaryButtonText: string;
  showFor: "all" | "mobile" | "desktop";
  mobileOnly: boolean;
  desktopOnly: boolean;
  subline: string;
  ctaLabel: string;
  secondaryCtaLabel: string;
  minOrderValue: number;
  freeshipValue: number;
  startAt: string | null;
  endAt: string | null;
  updatedAt: string | null;
};

export type PremiumFreeshipPopupState = {
  open: boolean;
  lastSeenAt: number | null;
};
