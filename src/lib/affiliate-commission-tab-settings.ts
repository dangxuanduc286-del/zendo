/**
 * Cấu hình tab "Hoa hồng" trong thông báo CTV — lưu trong `website_settings` (JSON),
 * chỉnh từ Admin → CTV → Cài đặt. Không hardcode logic nghiệp vụ trên client.
 */

export type AffiliateCommissionSoundMode = "off" | "default" | "custom";

export type AffiliateCommissionTabSettings = {
  tabEnabled: boolean;
  showIncomeSummary: boolean;
  showPendingCommission: boolean;
  showPaidCommission: boolean;
  showAffiliateOrderCount: boolean;
  realtimeBadgeEnabled: boolean;
  soundEnabled: boolean;
  soundMode: AffiliateCommissionSoundMode;
  /** URL âm thanh tùy chỉnh (upload media admin rồi dán URL). */
  soundCustomUrl: string;
  groupSimilarEnabled: boolean;
  /** Gộp các thông báo cùng loại trong cửa sổ (giây). */
  groupWindowSeconds: number;
  previewProductEnabled: boolean;
  maskedCustomerEnabled: boolean;
};

export const DEFAULT_AFFILIATE_COMMISSION_TAB_SETTINGS: AffiliateCommissionTabSettings = {
  tabEnabled: true,
  showIncomeSummary: true,
  showPendingCommission: true,
  showPaidCommission: true,
  showAffiliateOrderCount: true,
  realtimeBadgeEnabled: true,
  soundEnabled: true,
  soundMode: "default",
  soundCustomUrl: "",
  groupSimilarEnabled: true,
  groupWindowSeconds: 120,
  previewProductEnabled: true,
  maskedCustomerEnabled: true,
};

function toBool(v: unknown, d: boolean): boolean {
  return typeof v === "boolean" ? v : d;
}

function toStr(v: unknown, d: string): string {
  return typeof v === "string" ? v.trim() : d;
}

function toSoundMode(v: unknown): AffiliateCommissionSoundMode {
  if (v === "off" || v === "default" || v === "custom") return v;
  return "default";
}

function toWindowSeconds(v: unknown, d: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return d;
  return Math.min(600, Math.max(30, Math.round(n)));
}

/** Đọc từ `website_settings` phẳng hoặc object `affiliateCommissionTab`. */
export function normalizeAffiliateCommissionTabSettings(raw: unknown): AffiliateCommissionTabSettings {
  const base = DEFAULT_AFFILIATE_COMMISSION_TAB_SETTINGS;
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const nested =
    obj.affiliateCommissionTab && typeof obj.affiliateCommissionTab === "object" && !Array.isArray(obj.affiliateCommissionTab)
      ? (obj.affiliateCommissionTab as Record<string, unknown>)
      : {};

  const pick = (k: string, fb: unknown): unknown => nested[k] ?? obj[k] ?? fb;

  return {
    tabEnabled: toBool(pick("tabEnabled", pick("affiliateCommissionTabEnabled", base.tabEnabled)), base.tabEnabled),
    showIncomeSummary: toBool(
      pick("showIncomeSummary", pick("affiliateShowIncomeSummary", base.showIncomeSummary)),
      base.showIncomeSummary,
    ),
    showPendingCommission: toBool(
      pick("showPendingCommission", pick("affiliateShowPendingCommission", base.showPendingCommission)),
      base.showPendingCommission,
    ),
    showPaidCommission: toBool(
      pick("showPaidCommission", pick("affiliateShowPaidCommission", base.showPaidCommission)),
      base.showPaidCommission,
    ),
    showAffiliateOrderCount: toBool(
      pick("showAffiliateOrderCount", pick("affiliateShowOrderCount", base.showAffiliateOrderCount)),
      base.showAffiliateOrderCount,
    ),
    realtimeBadgeEnabled: toBool(
      pick("realtimeBadgeEnabled", pick("affiliateRealtimeBadgeEnabled", base.realtimeBadgeEnabled)),
      base.realtimeBadgeEnabled,
    ),
    soundEnabled: toBool(pick("soundEnabled", pick("affiliateSoundEnabled", base.soundEnabled)), base.soundEnabled),
    soundMode: toSoundMode(pick("soundMode", pick("affiliateCommissionSoundMode", base.soundMode))),
    soundCustomUrl: toStr(pick("soundCustomUrl", pick("affiliateCommissionSoundUrl", base.soundCustomUrl)), ""),
    groupSimilarEnabled: toBool(
      pick("groupSimilarEnabled", pick("affiliateGroupingEnabled", base.groupSimilarEnabled)),
      base.groupSimilarEnabled,
    ),
    groupWindowSeconds: toWindowSeconds(
      pick("groupWindowSeconds", pick("affiliateGroupWindowSeconds", base.groupWindowSeconds)),
      base.groupWindowSeconds,
    ),
    previewProductEnabled: toBool(
      pick("previewProductEnabled", pick("affiliatePreviewProductEnabled", base.previewProductEnabled)),
      base.previewProductEnabled,
    ),
    maskedCustomerEnabled: toBool(
      pick("maskedCustomerEnabled", pick("affiliateMaskedCustomerEnabled", base.maskedCustomerEnabled)),
      base.maskedCustomerEnabled,
    ),
  };
}

export function serializeAffiliateCommissionTabForWebsiteJson(
  s: AffiliateCommissionTabSettings,
): Record<string, unknown> {
  return {
    affiliateCommissionTab: {
      tabEnabled: s.tabEnabled,
      showIncomeSummary: s.showIncomeSummary,
      showPendingCommission: s.showPendingCommission,
      showPaidCommission: s.showPaidCommission,
      showAffiliateOrderCount: s.showAffiliateOrderCount,
      realtimeBadgeEnabled: s.realtimeBadgeEnabled,
      soundEnabled: s.soundEnabled,
      soundMode: s.soundMode,
      soundCustomUrl: s.soundCustomUrl,
      groupSimilarEnabled: s.groupSimilarEnabled,
      groupWindowSeconds: s.groupWindowSeconds,
      previewProductEnabled: s.previewProductEnabled,
      maskedCustomerEnabled: s.maskedCustomerEnabled,
    },
    // Khóa phẳng (tương thích tên user story / tìm kiếm)
    affiliateCommissionTabEnabled: s.tabEnabled,
    affiliateShowIncomeSummary: s.showIncomeSummary,
    affiliateShowPendingCommission: s.showPendingCommission,
    affiliateShowPaidCommission: s.showPaidCommission,
    affiliateShowOrderCount: s.showAffiliateOrderCount,
    affiliateRealtimeBadgeEnabled: s.realtimeBadgeEnabled,
    affiliateSoundEnabled: s.soundEnabled,
    affiliateCommissionSoundMode: s.soundMode,
    affiliateCommissionSoundUrl: s.soundCustomUrl,
    affiliateGroupingEnabled: s.groupSimilarEnabled,
    affiliateGroupWindowSeconds: s.groupWindowSeconds,
    affiliatePreviewProductEnabled: s.previewProductEnabled,
    affiliateMaskedCustomerEnabled: s.maskedCustomerEnabled,
  };
}
