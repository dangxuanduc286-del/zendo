"use client";

import PremiumFreeshipPopup from "./PremiumFreeshipPopup";
import type { PremiumFreeshipPopupConfig } from "./types/premium-freeship-popup";

export default function PremiumFreeshipProvider({ config }: { config: PremiumFreeshipPopupConfig }): JSX.Element {
  return <PremiumFreeshipPopup config={config} />;
}
