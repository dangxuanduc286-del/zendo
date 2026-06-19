"use server";

import { upsertSettingValue } from "../../../lib/settings";
import { PREMIUM_FREESHIP_POPUP_SETTING_KEY } from "../constants/premium-freeship-popup";
import { normalizePremiumFreeshipPopupConfig, serializePremiumFreeshipPopupConfig } from "../premium-freeship-popup-persistence";
import type { PremiumFreeshipPopupConfig } from "../types/premium-freeship-popup";

export async function savePremiumFreeshipPopupConfigAction(
  config: PremiumFreeshipPopupConfig,
): Promise<{ ok: boolean; message: string }> {
  const normalized = normalizePremiumFreeshipPopupConfig(config);
  const saved = await upsertSettingValue(PREMIUM_FREESHIP_POPUP_SETTING_KEY, serializePremiumFreeshipPopupConfig(normalized), {
    group: "marketing",
    description: "Premium Freeship popup setting",
    isPublic: true,
  });

  if (!saved) {
    return { ok: false, message: "Không thể lưu cấu hình Premium Freeship Popup." };
  }

  return { ok: true, message: "Đã lưu cấu hình Premium Freeship Popup." };
}
