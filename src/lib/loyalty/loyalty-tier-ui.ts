/** UI hạng thành viên (điểm tích lũy) — dùng CTV desktop, không đổi logic loyalty backend. */

export const LOYALTY_TIERS = [
  { label: "Đồng", min: 0, next: 200 },
  { label: "Bạc", min: 200, next: 1000 },
  { label: "Vàng", min: 1000, next: 5000 },
  { label: "Kim cương", min: 5000, next: null as number | null },
] as const;

export type LoyaltyTierUi = {
  tierIndex: number;
  tierLabel: string;
  progress: number;
  progressPercent: number;
  pointsLine: string;
  subline: string;
  showBar: boolean;
  rankDisplay: string;
  rankStep: string;
};

export function computeLoyaltyTierUi(points: number): LoyaltyTierUi {
  let tierIndex = 0;
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    if (points >= LOYALTY_TIERS[i].min) {
      tierIndex = i;
      break;
    }
  }
  const t = LOYALTY_TIERS[tierIndex];
  const next = t.next;
  const rankStep = `Hạng ${tierIndex + 1}/${LOYALTY_TIERS.length}`;

  if (next == null) {
    return {
      tierIndex,
      tierLabel: t.label,
      progress: 1,
      progressPercent: 100,
      pointsLine: `${points.toLocaleString("vi-VN")} điểm`,
      subline: "Bạn đang ở hạng thành viên cao nhất.",
      showBar: false,
      rankDisplay: `CTV ${t.label}`,
      rankStep,
    };
  }

  const span = next - t.min;
  const progress = span > 0 ? Math.min(1, Math.max(0, (points - t.min) / span)) : 1;
  const remain = Math.max(0, next - points);
  const nextLabel = tierIndex < LOYALTY_TIERS.length - 1 ? LOYALTY_TIERS[tierIndex + 1].label : "";

  return {
    tierIndex,
    tierLabel: t.label,
    progress,
    progressPercent: Math.round(progress * 100),
    pointsLine: `${points.toLocaleString("vi-VN")} / ${next.toLocaleString("vi-VN")} điểm`,
    subline: `Còn ${remain.toLocaleString("vi-VN")} điểm để lên ${nextLabel}`,
    showBar: true,
    rankDisplay: `CTV ${t.label}`,
    rankStep,
  };
}
