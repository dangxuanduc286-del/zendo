import type { LoaiThietBiAnalytics } from "./event-types";

const TABLET_REGEX =
  /(ipad|tablet|(android(?!.*mobile))|silk|playbook|kindle|nexus 7|nexus 9|xoom)/i;
const MOBILE_REGEX =
  /(mobile|iphone|ipod|android.*mobile|windows phone|blackberry|bb10|opera mini)/i;

export function xacDinhLoaiThietBiTuUserAgent(
  userAgent: string | null | undefined,
): LoaiThietBiAnalytics {
  const ua = typeof userAgent === "string" ? userAgent : "";
  if (TABLET_REGEX.test(ua)) return "tablet";
  if (MOBILE_REGEX.test(ua)) return "mobile";
  return "desktop";
}

