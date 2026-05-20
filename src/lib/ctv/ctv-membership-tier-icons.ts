import type { LucideIcon } from "lucide-react";
import { Crown, Gem, Medal, Sparkles, Trophy } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  medal: Medal,
  crown: Crown,
  gem: Gem,
  trophy: Trophy,
};

export function resolveCtvTierIcon(iconKey: string): LucideIcon {
  return ICON_MAP[iconKey.trim().toLowerCase()] ?? Medal;
}
