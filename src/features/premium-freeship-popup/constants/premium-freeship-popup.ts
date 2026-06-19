import type { PremiumFreeshipPopupConfig } from "../types/premium-freeship-popup";

export const PREMIUM_FREESHIP_POPUP_SETTING_KEY = "premium_freeship_popup_setting";
export const PREMIUM_FREESHIP_POPUP_STORAGE_KEY = "zendo-premium-freeship-popup-last-seen";

export const DEFAULT_PREMIUM_FREESHIP_POPUP_CONFIG: PremiumFreeshipPopupConfig = {
  enabled: false,
  title: "Ưu đãi dành riêng cho bạn",
  headline: "FREESHIP 30.000Đ",
  description: "Miễn phí vận chuyển đến 30.000đ cho đơn hàng từ 299.000đ",
  bannerDesktop: "",
  bannerMobile: "",
  imageUrl: "",
  popupLinkUrl: "",
  freeshipAmount: 30000,
  minimumOrder: 299000,
  delaySeconds: 5,
  delayMs: 5000,
  repeatHours: 12,
  primaryButtonText: "NHẬN FREESHIP NGAY",
  secondaryButtonText: "Để sau",
  showFor: "all",
  mobileOnly: false,
  desktopOnly: false,
  subline: "Ưu đãi tự động ẩn trong 12 giờ sau khi đóng hoặc nhận.",
  ctaLabel: "NHẬN FREESHIP NGAY",
  secondaryCtaLabel: "Để sau",
  minOrderValue: 299000,
  freeshipValue: 30000,
  startAt: null,
  endAt: null,
  updatedAt: null,
};

export const PREMIUM_FREESHIP_POPUP_DEFAULT_CONFIG = DEFAULT_PREMIUM_FREESHIP_POPUP_CONFIG;
