/**
 * Cấu hình chương trình CTV — không import server-only / prisma (dùng được từ client).
 */
import {
  DEFAULT_AFFILIATE_COMMISSION_TAB_SETTINGS,
  normalizeAffiliateCommissionTabSettings,
  type AffiliateCommissionTabSettings,
} from "../affiliate-commission-tab-settings";

export type { AffiliateCommissionTabSettings };

export type AffiliateSettings = {
  affiliateEnabled: boolean;
  commissionRate: number;
  payoutThreshold: number;
  cookieDuration: number;
  attributionRule: string;
  rewardPointEnabled: boolean;
  withdrawalEnabled: boolean;
  ctvGuideContent: string;
  commissionTab: AffiliateCommissionTabSettings;
};

export const DEFAULT_AFFILIATE_SETTINGS: AffiliateSettings = {
  affiliateEnabled: false,
  commissionRate: 5,
  payoutThreshold: 100000,
  cookieDuration: 30,
  attributionRule: "last_click",
  rewardPointEnabled: false,
  withdrawalEnabled: false,
  ctvGuideContent: "",
  commissionTab: { ...DEFAULT_AFFILIATE_COMMISSION_TAB_SETTINGS },
};

export const DEFAULT_CTV_GUIDE_CONTENT_VI = `1. Cách lấy link giới thiệu

Đăng nhập tài khoản đã được gắn hồ sơ cộng tác viên (CTV) trên Zendo.vn. Trong khu vực tài khoản hoặc trang dành cho CTV (nếu storefront đã bật), bạn sẽ thấy liên kết giới thiệu cá nhân kèm mã ref. Nhấn “Sao chép liên kết” để lấy URL và bắt đầu chia sẻ.

2. Cách chia sẻ link CTV

- Chia sẻ công khai trên mạng xã hội, blog, video hoặc gửi cho người thân có nhu cầu mua hàng.
- Không gửi tin nhắn quảng cáo không được phép (spam), không giả mạo thương hiệu Zendo.vn.
- Khuyến khích mô tả trung thực sản phẩm và ưu đãi đang áp dụng trên website.

3. Cách tính hoa hồng

Hoa hồng thường được tính theo tỷ lệ phần trăm trên giá trị đơn hàng hợp lệ sau khi đơn được xác nhận theo quy tắc chương trình (ví dụ: sau khi thanh toán thành công và đơn không thuộc trường hợp loại trừ). Tỷ lệ cụ thể do Zendo.vn cấu hình và có thể khác nhau theo từng CTV hoặc chiến dịch — xem phần cài đặt / thông báo nội bộ để biết mức áp dụng cho tài khoản của bạn.

4. Khi nào hoa hồng được duyệt

Đơn hàng phát sinh từ liên kết giới thiệu hợp lệ sẽ được ghi nhận hoa hồng ở trạng thái “chờ duyệt”. Đội vận hành duyệt hoa hồng khi đơn đạt điều kiện theo chính sách (đã thanh toán, không hủy, không vi phạm quy tắc ghi nhận). Bạn có thể theo dõi trạng thái trong khu vực dành cho CTV trên tài khoản.

5. Khi nào được thanh toán

Sau khi hoa hồng ở trạng thái “đã duyệt”, Zendo.vn sẽ thực hiện đối soát theo chu kỳ và ngưỡng thanh toán đã công bố. Khi đủ điều kiện, khoản thanh toán sẽ được chuyển theo phương thức bạn đã đăng ký (nếu chương trình rút tiền / thanh toán CTV được bật).

6. Quy định đơn hợp lệ

- Đơn phát sinh từ cookie / liên kết giới thiệu còn hiệu lực theo thời gian cookie cấu hình.
- Đơn không bị hủy, không hoàn tiền toàn phần theo chính sách loại trừ hoa hồng.
- Thông tin người mua và sản phẩm trung thực; không lạm dụng mã giảm giá hoặc gian lận ghi nhận.

7. Chính sách hủy / hoàn tiền (refund)

Nếu đơn hàng bị hủy trước khi giao hoặc được hoàn tiền theo chính sách đổi trả của Zendo.vn, hoa hồng có thể không được ghi nhận hoặc bị điều chỉnh / hủy tương ứng. Mọi thay đổi tuân theo điều khoản chương trình CTV và chính sách bán hàng hiện hành trên website.

8. Hỏi chung

- Tôi có thể đổi link giới thiệu không? Mã ref gắn với hồ sơ CTV; thay đổi nếu có sẽ do quản trị viên cấu hình.
- Tại sao đơn của tôi không có hoa hồng? Có thể do cookie hết hạn, đơn không hợp lệ, hoặc sản phẩm thuộc danh mục loại trừ — kiểm tra trạng thái đơn và liên hệ hỗ trợ nếu cần.
- Làm sao để biết chương trình CTV có đang bật? Trên website, phần hướng dẫn / khu vực CTV chỉ hiển thị khi chương trình được kích hoạt phía hệ thống.`;

export const AFFILIATE_ATTRIBUTION_OPTIONS = [
  { value: "last_click", label: "Click cuối cùng" },
  { value: "first_click", label: "Click đầu tiên" },
  { value: "ref_priority", label: "Ưu tiên mã ref" },
] as const;

export function resolveCtvGuideContentForDisplay(settings: AffiliateSettings): string {
  const raw = settings.ctvGuideContent?.trim() ?? "";
  return raw.length > 0 ? settings.ctvGuideContent : DEFAULT_CTV_GUIDE_CONTENT_VI;
}

function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeAffiliateSettings(
  raw: Record<string, unknown> | null | undefined,
): AffiliateSettings {
  const source = raw ?? {};
  return {
    affiliateEnabled: toBoolean(source.affiliateEnabled, DEFAULT_AFFILIATE_SETTINGS.affiliateEnabled),
    commissionRate: toNumber(
      source.commissionRate ?? source.affiliateCommissionRate,
      DEFAULT_AFFILIATE_SETTINGS.commissionRate,
    ),
    payoutThreshold: toNumber(
      source.payoutThreshold ?? source.affiliatePayoutThreshold,
      DEFAULT_AFFILIATE_SETTINGS.payoutThreshold,
    ),
    cookieDuration: toNumber(
      source.cookieDuration ?? source.affiliateCookieDurationDays,
      DEFAULT_AFFILIATE_SETTINGS.cookieDuration,
    ),
    attributionRule: toString(
      source.attributionRule ?? source.affiliateAttributionRule,
      DEFAULT_AFFILIATE_SETTINGS.attributionRule,
    ),
    rewardPointEnabled: toBoolean(
      source.rewardPointEnabled ?? source.affiliateRewardPointsEnabled,
      DEFAULT_AFFILIATE_SETTINGS.rewardPointEnabled,
    ),
    withdrawalEnabled: toBoolean(source.withdrawalEnabled, DEFAULT_AFFILIATE_SETTINGS.withdrawalEnabled),
    ctvGuideContent: toString(source.ctvGuideContent, DEFAULT_AFFILIATE_SETTINGS.ctvGuideContent),
    commissionTab: normalizeAffiliateCommissionTabSettings(source),
  };
}
