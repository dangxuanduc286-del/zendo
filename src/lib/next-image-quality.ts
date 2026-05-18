import { NEXT_IMAGE_QUALITIES } from "../../next-image-config.mjs";

/** Đồng bộ với `images.qualities` trong next.config.mjs */
export const NEXT_IMAGE_ALLOWED_QUALITIES = NEXT_IMAGE_QUALITIES as readonly number[];

const ALLOWED_SET = new Set<number>(NEXT_IMAGE_ALLOWED_QUALITIES);

/** Tránh runtime error khi quality không nằm trong whitelist Next.js. */
export function clampNextImageQuality(quality: number | undefined, fallback = 75): number {
  const n = Number(quality);
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.round(n);
  if (ALLOWED_SET.has(rounded)) return rounded;
  if (rounded > 95) return 95;
  if (rounded >= 93) return 94;
  if (rounded >= 91) return 92;
  if (rounded >= 88) return 90;
  if (rounded >= 83) return 85;
  if (rounded >= 78) return 80;
  if (rounded >= 73) return 75;
  if (rounded >= 68) return 70;
  return fallback;
}
