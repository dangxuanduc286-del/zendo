import type { SupportTicketType } from "@prisma/client";

export const SUPPORT_TICKET_TAG_CANONICAL = ["support", "payment", "bug", "affiliate"] as const;
export type SupportTicketTagCanonical = (typeof SUPPORT_TICKET_TAG_CANONICAL)[number];

function normalizeTag(t: string): string {
  return t.trim().toLowerCase().slice(0, 48);
}

/** Gợi ý tag theo nội dung + loại ticket (rule-based, không ML). */
export function inferSupportTicketTags(parts: {
  subject: string;
  body: string;
  type: SupportTicketType;
}): string[] {
  const text = `${parts.subject}\n${parts.body}`.toLowerCase();
  const tags = new Set<string>();

  if (
    parts.type === "AFFILIATE" ||
    parts.type === "WITHDRAWAL" ||
    parts.type === "AFFILIATE_APPLICATION"
  ) {
    tags.add("affiliate");
  }
  if (/hoàn tiền|refund|thanh toán|chuyển khoản|thanh toán|tiền về|ví\b/.test(text)) {
    tags.add("payment");
  }
  if (/\bbug\b|lỗi|không hoạt động|hỏng|crash|404|500/.test(text)) {
    tags.add("bug");
  }
  if (tags.size === 0) {
    tags.add("support");
  }
  return [...tags].map(normalizeTag).filter(Boolean).slice(0, 8);
}

export function mergeSupportTicketTags(existing: string[], extra: string[]): string[] {
  const out = new Set<string>();
  for (const t of existing) {
    const n = normalizeTag(t);
    if (n) out.add(n);
  }
  for (const t of extra) {
    const n = normalizeTag(t);
    if (n) out.add(n);
  }
  return [...out].slice(0, 50);
}
