/**
 * FAQ / câu hỏi nhanh & mẫu trả lời — dùng Support Panel (không phụ thuộc pathname).
 * Phân luồng CTV vs khách dựa trên session `affiliateActive` (storefront USER).
 */

export type StorefrontQuickQuestion = { id: string; label: string; text: string };

/** Khách hàng (không ACTIVE affiliate profile). */
export const STORE_QUICK_QUESTIONS_CUSTOMER: readonly StorefrontQuickQuestion[] = [
  {
    id: "c-order-not-received",
    label: "Chưa nhận đơn",
    text: "Tôi chưa nhận được đơn hàng",
  },
  {
    id: "c-refund",
    label: "Hoàn tiền",
    text: "Làm sao để hoàn tiền?",
  },
  {
    id: "c-account-info",
    label: "Đổi thông tin TK",
    text: "Tôi muốn đổi thông tin tài khoản",
  },
] as const;

/** CTV (có AffiliateProfile ACTIVE / PAUSED — UI dùng affiliateActive). */
export const STORE_QUICK_QUESTIONS_AFFILIATE: readonly StorefrontQuickQuestion[] = [
  {
    id: "a-commission",
    label: "Duyệt hoa hồng",
    text: "Hoa hồng của tôi bao giờ được duyệt?",
  },
  {
    id: "a-order-missing",
    label: "Không thấy đơn",
    text: "Tôi không thấy đơn hàng trong hệ thống",
  },
  {
    id: "a-affiliate-link",
    label: "Tạo link",
    text: "Cách tạo link affiliate?",
  },
] as const;

export type AdminQuickReplyPreset = {
  id: string;
  shortLabel: string;
  title: string;
  text: string;
  /** Gợi ý phân loại — merge vào ticket.tags khi gửi nhanh. */
  tag?: string;
  /** Mặc định true: gửi tin ngay (không chỉ chèn composer). */
  sendImmediately?: boolean;
};

export function rankAdminQuickReplyPresets(
  items: AdminQuickReplyPreset[],
  ctx: { ticketTags: string[]; participantKind?: "affiliate" | "customer" },
): AdminQuickReplyPreset[] {
  const tagLower = ctx.ticketTags.map((t) => t.trim().toLowerCase()).filter(Boolean);
  const scored = items.map((item, idx) => {
    let score = idx * 0.001;
    const itag = item.tag?.trim().toLowerCase();
    if (ctx.participantKind === "affiliate" && item.id.startsWith("adm-a-")) score += 3;
    if (ctx.participantKind === "customer" && item.id.startsWith("adm-c-")) score += 3;
    if (itag && tagLower.includes(itag)) score += 6;
    if (tagLower.includes("payment") && itag === "payment") score += 4;
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}

/** Admin → khách: mẫu trả lời (thêm vào composer). */
export const ADMIN_REPLY_PRESETS_CUSTOMER: readonly AdminQuickReplyPreset[] = [
  {
    id: "adm-c-processing",
    shortLabel: "Đơn đang xử lý",
    title: "Đơn đang xử lý 24h",
    text: "Đơn hàng đang được xử lý, vui lòng chờ trong khoảng 24 giờ. Nếu sau thời gian này vẫn chưa cập nhật, bạn gửi giúp mình mã đơn để kiểm tra.",
    tag: "support",
  },
  {
    id: "adm-c-refund-code",
    shortLabel: "Hoàn tiền — cần mã đơn",
    title: "Yêu cầu mã đơn hoàn tiền",
    text: "Bạn vui lòng cung cấp mã đơn hàng để bên mình hỗ trợ hoàn tiền theo đúng quy trình.",
    tag: "payment",
  },
  {
    id: "adm-c-account",
    shortLabel: "Cập nhật TK",
    title: "Hướng dẫn đổi thông tin tài khoản",
    text: "Bạn có thể cập nhật thông tin trong phần Tài khoản / Thông tin cá nhân trên website. Nếu cần hỗ trợ thêm, cho mình biết nội dung cần đổi.",
    tag: "support",
  },
] as const;

/** Admin → CTV. */
export const ADMIN_REPLY_PRESETS_AFFILIATE: readonly AdminQuickReplyPreset[] = [
  {
    id: "adm-a-commission-delay",
    shortLabel: "Hoa hồng 3–5 ngày",
    title: "Thời gian duyệt hoa hồng",
    text: "Hoa hồng thường được duyệt trong khoảng 3–5 ngày làm việc, tùy chu kỳ đối soát. Bạn theo dõi trạng thái trong khu vực CTV / Affiliate.",
    tag: "affiliate",
  },
  {
    id: "adm-a-order-status",
    shortLabel: "Kiểm tra đơn",
    title: "Nhắc kiểm tra trạng thái đơn",
    text: "Bạn vui lòng kiểm tra lại trạng thái đơn hàng và bộ lọc thời gian trong mục đơn giới thiệu. Nếu vẫn không thấy, gửi mình mã đơn hoặc link ref để tra.",
    tag: "affiliate",
  },
  {
    id: "adm-a-link-guide",
    shortLabel: "Tạo link ref",
    title: "Hướng dẫn link affiliate",
    text: "Bạn vào mục CTV / Affiliate trong tài khoản để sao chép link giới thiệu và mã ref. Nếu chưa thấy mục này, có thể chương trình đang tắt hoặc hồ sơ chưa được kích hoạt.",
    tag: "affiliate",
  },
] as const;

/** Mẫu nội bộ admin (chung). */
export const ADMIN_REPLY_PRESETS_GENERAL: readonly AdminQuickReplyPreset[] = [
  {
    id: "adm-order-code",
    shortLabel: "Mã đơn",
    title: "Yêu cầu mã đơn",
    text: "Bạn vui lòng cung cấp mã đơn hàng giúp mình.",
    tag: "support",
  },
  {
    id: "adm-received",
    shortLabel: "Đang xử lý",
    title: "Đã nhận yêu cầu",
    text: "Zendo đã nhận được yêu cầu, đang kiểm tra cho bạn.",
    tag: "support",
  },
  {
    id: "adm-wait",
    shortLabel: "Chờ phút",
    title: "Nhắc chờ",
    text: "Bạn vui lòng chờ trong ít phút, mình sẽ phản hồi ngay.",
    tag: "support",
  },
  {
    id: "adm-recorded",
    shortLabel: "Ghi nhận",
    title: "Đã ghi nhận",
    text: "Thông tin đã được ghi nhận, bên mình sẽ xử lý sớm.",
    tag: "support",
  },
] as const;

export function allAdminQuickReplyPresets(): AdminQuickReplyPreset[] {
  const raw = [
    ...ADMIN_REPLY_PRESETS_GENERAL,
    ...ADMIN_REPLY_PRESETS_CUSTOMER,
    ...ADMIN_REPLY_PRESETS_AFFILIATE,
  ];
  return raw.map((p) => ({ ...p, sendImmediately: p.sendImmediately ?? true }));
}
