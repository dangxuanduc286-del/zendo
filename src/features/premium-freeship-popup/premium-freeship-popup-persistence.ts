import type { PremiumFreeshipPopupConfig } from "./types/premium-freeship-popup";
import { PREMIUM_FREESHIP_POPUP_DEFAULT_CONFIG } from "./constants/premium-freeship-popup";
import { normalizeMediaUrl } from "../../lib/media-url";

const toStringOrEmpty = (value: unknown): string => (typeof value === "string" ? value : "");
const toNullableString = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value : null);
const toBoolean = (value: unknown, fallback: boolean): boolean => (typeof value === "boolean" ? value : fallback);
const toNumber = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};
const toImageUrl = (value: unknown): string => normalizeMediaUrl(toStringOrEmpty(value));
const toPopupLinkUrl = (value: unknown): string => {
  const normalized = toStringOrEmpty(value).trim();
  return normalized ? normalized : "";
};

export function normalizePremiumFreeshipPopupConfig(value: unknown): PremiumFreeshipPopupConfig {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const minimumOrder = toNumber(raw.minimumOrder, PREMIUM_FREESHIP_POPUP_DEFAULT_CONFIG.minimumOrder);
  const freeshipAmount = toNumber(raw.freeshipAmount, PREMIUM_FREESHIP_POPUP_DEFAULT_CONFIG.freeshipAmount);
  const delaySeconds = toNumber(raw.delaySeconds, PREMIUM_FREESHIP_POPUP_DEFAULT_CONFIG.delaySeconds);
  const repeatHours = toNumber(raw.repeatHours, PREMIUM_FREESHIP_POPUP_DEFAULT_CONFIG.repeatHours);
  const mobileOnly = toBoolean(raw.mobileOnly, PREMIUM_FREESHIP_POPUP_DEFAULT_CONFIG.mobileOnly);
  const desktopOnly = toBoolean(raw.desktopOnly, PREMIUM_FREESHIP_POPUP_DEFAULT_CONFIG.desktopOnly);
  const showFor = raw.showFor === "mobile" || raw.showFor === "desktop" ? raw.showFor : mobileOnly ? "mobile" : desktopOnly ? "desktop" : "all";
  return {
    enabled: toBoolean(raw.enabled, PREMIUM_FREESHIP_POPUP_DEFAULT_CONFIG.enabled),
    title: toStringOrEmpty(raw.title) || PREMIUM_FREESHIP_POPUP_DEFAULT_CONFIG.title,
    headline: toStringOrEmpty(raw.headline) || PREMIUM_FREESHIP_POPUP_DEFAULT_CONFIG.headline,
    description: toStringOrEmpty(raw.description) || PREMIUM_FREESHIP_POPUP_DEFAULT_CONFIG.description,
    bannerDesktop: toStringOrEmpty(raw.bannerDesktop),
    bannerMobile: toStringOrEmpty(raw.bannerMobile),
    imageUrl: toImageUrl(raw.imageUrl),
    popupLinkUrl: toPopupLinkUrl(raw.popupLinkUrl),
    freeshipAmount,
    minimumOrder,
    delaySeconds,
    delayMs: delaySeconds * 1000,
    repeatHours,
    primaryButtonText: toStringOrEmpty(raw.primaryButtonText) || PREMIUM_FREESHIP_POPUP_DEFAULT_CONFIG.primaryButtonText,
    secondaryButtonText: toStringOrEmpty(raw.secondaryButtonText) || PREMIUM_FREESHIP_POPUP_DEFAULT_CONFIG.secondaryButtonText,
    showFor,
    mobileOnly,
    desktopOnly,
    subline: toStringOrEmpty(raw.subline) || PREMIUM_FREESHIP_POPUP_DEFAULT_CONFIG.subline,
    ctaLabel: toStringOrEmpty(raw.ctaLabel) || PREMIUM_FREESHIP_POPUP_DEFAULT_CONFIG.ctaLabel,
    secondaryCtaLabel: toStringOrEmpty(raw.secondaryCtaLabel) || PREMIUM_FREESHIP_POPUP_DEFAULT_CONFIG.secondaryCtaLabel,
    minOrderValue: minimumOrder,
    freeshipValue: freeshipAmount,
    startAt: toNullableString(raw.startAt),
    endAt: toNullableString(raw.endAt),
    updatedAt: toNullableString(raw.updatedAt),
  };
}

export function serializePremiumFreeshipPopupConfig(config: PremiumFreeshipPopupConfig): Record<string, unknown> {
  return {
    enabled: config.enabled,
    title: config.title,
    headline: config.headline,
    description: config.description,
    bannerDesktop: config.bannerDesktop,
    bannerMobile: config.bannerMobile,
    imageUrl: normalizeMediaUrl(config.imageUrl),
    popupLinkUrl: toPopupLinkUrl(config.popupLinkUrl),
    freeshipAmount: config.freeshipAmount,
    minimumOrder: config.minimumOrder,
    delaySeconds: config.delaySeconds,
    repeatHours: config.repeatHours,
    primaryButtonText: config.primaryButtonText,
    secondaryButtonText: config.secondaryButtonText,
    showFor: config.showFor,
    mobileOnly: config.mobileOnly,
    desktopOnly: config.desktopOnly,
    subline: config.subline,
    ctaLabel: config.ctaLabel,
    secondaryCtaLabel: config.secondaryCtaLabel,
    minOrderValue: config.minOrderValue,
    freeshipValue: config.freeshipValue,
    startAt: config.startAt,
    endAt: config.endAt,
    updatedAt: new Date().toISOString(),
  };
}
