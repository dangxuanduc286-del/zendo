import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { getSettingValue } from "../../../../../lib/settings";
import PremiumFreeshipAdmin from "../../../../../features/premium-freeship-popup/PremiumFreeshipAdmin";
import { DEFAULT_PREMIUM_FREESHIP_POPUP_CONFIG, PREMIUM_FREESHIP_POPUP_SETTING_KEY } from "../../../../../features/premium-freeship-popup/constants/premium-freeship-popup";
import { normalizePremiumFreeshipPopupConfig } from "../../../../../features/premium-freeship-popup/premium-freeship-popup-persistence";

export default async function AdminPremiumFreeshipPopupPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/marketing/premium-freeship-popup");
  }

  const setting = await getSettingValue<unknown>(PREMIUM_FREESHIP_POPUP_SETTING_KEY);
  const normalizedSetting = normalizePremiumFreeshipPopupConfig(setting);
  const initialConfig = normalizedSetting ?? DEFAULT_PREMIUM_FREESHIP_POPUP_CONFIG;
  console.log("[premium-freeship-popup][page]", {
    rawSetting: setting,
    normalizedSetting,
    initialConfig,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Marketing</p>
        <h1 className="text-2xl font-extrabold tracking-[-0.04em] text-slate-950">Premium Freeship Popup</h1>
        <p className="text-sm text-slate-600">Quản lý popup Freeship 30.000đ tách biệt khỏi popup storefront hiện có.</p>
      </header>
      <PremiumFreeshipAdmin initialConfig={initialConfig} />
    </main>
  );
}
