import Link from "next/link";
import {
  AFFILIATE_ATTRIBUTION_OPTIONS,
  type AffiliateSettings,
} from "@/lib/admin/affiliate";

type Props = {
  settings: AffiliateSettings;
  redirectTo: string;
};

const fieldClass =
  "w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]";
const sectionCard = "space-y-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:p-5";

export default function AffiliateCtvSettingsForm({ settings, redirectTo }: Props) {
  return (
    <form
      action="/api/admin/affiliates/settings"
      method="POST"
      className="space-y-6"
    >
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className={sectionCard}>
        <h3 className="text-base font-semibold text-[#0F172A]">Cấu hình chung</h3>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
          <input
            type="checkbox"
            name="affiliateEnabled"
            value="1"
            defaultChecked={settings.affiliateEnabled}
            className="mt-1 h-4 w-4 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB]"
          />
          <span>
            <span className="block text-sm font-medium text-[#0F172A]">Bật chương trình CTV</span>
            <span className="mt-0.5 block text-xs text-[#64748B]">
              Khi tắt, storefront có thể ẩn khu vực CTV theo logic hiển thị của từng trang.
            </span>
          </span>
        </label>
      </div>

      <div className={sectionCard}>
        <h3 className="text-base font-semibold text-[#0F172A]">Hoa hồng & thanh toán</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-[#64748B]">Tỷ lệ hoa hồng mặc định (%)</span>
            <input
              type="number"
              name="commissionRate"
              min={0}
              max={100}
              step="0.1"
              required
              defaultValue={String(settings.commissionRate)}
              className={fieldClass}
              placeholder="Ví dụ: 5"
            />
            <span className="text-xs text-[#64748B]">Giá trị từ 0 đến 100 (%).</span>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-[#64748B]">Ngưỡng thanh toán tối thiểu (VNĐ)</span>
            <input
              type="number"
              name="payoutThreshold"
              min={0}
              step={1}
              required
              defaultValue={String(Math.round(settings.payoutThreshold))}
              className={fieldClass}
              placeholder="Ví dụ: 500000"
            />
            <span className="text-xs text-[#64748B]">Số nguyên không âm (đơn vị VNĐ).</span>
          </label>
        </div>
        <p className="text-xs text-[#94A3B8]">
          {/* TODO: Ghi chú thanh toán — thêm field trong website_settings khi có nhu cầu lưu riêng. */}
          Ghi chú thanh toán riêng: chưa có field trong schema cài đặt — có thể bổ sung sau.
        </p>
      </div>

      <div className={sectionCard}>
        <h3 className="text-base font-semibold text-[#0F172A]">Theo dõi giới thiệu</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-[#64748B]">Thời gian cookie giới thiệu (ngày)</span>
            <input
              type="number"
              name="cookieDuration"
              min={1}
              step={1}
              required
              defaultValue={String(settings.cookieDuration)}
              className={fieldClass}
              placeholder="Ví dụ: 30"
            />
            <span className="text-xs text-[#64748B]">Phải là số nguyên lớn hơn 0.</span>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-[#64748B]">Quy tắc attribution</span>
            <select
              name="attributionRule"
              defaultValue={settings.attributionRule}
              className={fieldClass}
            >
              {AFFILIATE_ATTRIBUTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className={sectionCard}>
        <h3 className="text-base font-semibold text-[#0F172A]">Điểm thưởng & rút tiền</h3>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
            <input
              type="checkbox"
              name="rewardPointEnabled"
              value="1"
              defaultChecked={settings.rewardPointEnabled}
              className="mt-1 h-4 w-4 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span>
              <span className="block text-sm font-medium text-[#0F172A]">Bật điểm thưởng CTV</span>
              <span className="mt-0.5 block text-xs text-[#64748B]">Cho phép tích điểm thưởng theo chương trình.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
            <input
              type="checkbox"
              name="withdrawalEnabled"
              value="1"
              defaultChecked={settings.withdrawalEnabled}
              className="mt-1 h-4 w-4 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span>
              <span className="block text-sm font-medium text-[#0F172A]">Bật rút tiền CTV</span>
              <span className="mt-0.5 block text-xs text-[#64748B]">
                Cho phép CTV gửi yêu cầu rút tiền (khi module rút tiền đang bật).
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className={sectionCard}>
        <h3 className="text-base font-semibold text-[#0F172A]">Cấu hình tab hoa hồng (thông báo CTV)</h3>
        <p className="text-xs text-[#64748B]">
          Điều khiển tab &quot;Hoa hồng&quot; trong mục Thông báo tài khoản, tổng quan thu nhập, realtime và âm thanh — áp dụng desktop &amp; mobile.
        </p>
        <div className="mt-3 space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
            <input
              type="checkbox"
              name="commissionTab_tabEnabled"
              value="1"
              defaultChecked={settings.commissionTab.tabEnabled}
              className="mt-1 h-4 w-4 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span className="text-sm font-medium text-[#0F172A]">Bật tab hoa hồng</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
            <input
              type="checkbox"
              name="commissionTab_showIncomeSummary"
              value="1"
              defaultChecked={settings.commissionTab.showIncomeSummary}
              className="mt-1 h-4 w-4 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span className="text-sm font-medium text-[#0F172A]">Hiển thị tổng thu nhập</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
            <input
              type="checkbox"
              name="commissionTab_showPendingCommission"
              value="1"
              defaultChecked={settings.commissionTab.showPendingCommission}
              className="mt-1 h-4 w-4 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span className="text-sm font-medium text-[#0F172A]">Hiển thị hoa hồng chờ duyệt</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
            <input
              type="checkbox"
              name="commissionTab_showPaidCommission"
              value="1"
              defaultChecked={settings.commissionTab.showPaidCommission}
              className="mt-1 h-4 w-4 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span className="text-sm font-medium text-[#0F172A]">Hiển thị hoa hồng đã thanh toán</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
            <input
              type="checkbox"
              name="commissionTab_showAffiliateOrderCount"
              value="1"
              defaultChecked={settings.commissionTab.showAffiliateOrderCount}
              className="mt-1 h-4 w-4 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span className="text-sm font-medium text-[#0F172A]">Hiển thị số đơn affiliate</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
            <input
              type="checkbox"
              name="commissionTab_realtimeBadgeEnabled"
              value="1"
              defaultChecked={settings.commissionTab.realtimeBadgeEnabled}
              className="mt-1 h-4 w-4 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span className="text-sm font-medium text-[#0F172A]">Hiển thị badge realtime</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
            <input
              type="checkbox"
              name="commissionTab_soundEnabled"
              value="1"
              defaultChecked={settings.commissionTab.soundEnabled}
              className="mt-1 h-4 w-4 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span className="text-sm font-medium text-[#0F172A]">Phát âm thanh khi có hoa hồng mới</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
            <input
              type="checkbox"
              name="commissionTab_groupSimilarEnabled"
              value="1"
              defaultChecked={settings.commissionTab.groupSimilarEnabled}
              className="mt-1 h-4 w-4 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span className="text-sm font-medium text-[#0F172A]">Gộp thông báo giống nhau</span>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-[#64748B]">Cửa sổ gộp (giây)</span>
            <input
              type="number"
              name="commissionTab_groupWindowSeconds"
              min={30}
              max={600}
              step={1}
              defaultValue={String(settings.commissionTab.groupWindowSeconds)}
              className={fieldClass}
            />
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
            <input
              type="checkbox"
              name="commissionTab_previewProductEnabled"
              value="1"
              defaultChecked={settings.commissionTab.previewProductEnabled}
              className="mt-1 h-4 w-4 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span className="text-sm font-medium text-[#0F172A]">Hiển thị preview sản phẩm</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
            <input
              type="checkbox"
              name="commissionTab_maskedCustomerEnabled"
              value="1"
              defaultChecked={settings.commissionTab.maskedCustomerEnabled}
              className="mt-1 h-4 w-4 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span className="text-sm font-medium text-[#0F172A]">Hiển thị tên khách hàng (đã mask)</span>
          </label>
        </div>
        <div className="mt-4 space-y-2 rounded-xl border border-[#E2E8F0] bg-white p-3">
          <p className="text-xs font-semibold text-[#0F172A]">Âm thanh thông báo</p>
          <label className="space-y-1">
            <span className="text-xs font-medium text-[#64748B]">Chế độ</span>
            <select name="commissionTab_soundMode" defaultValue={settings.commissionTab.soundMode} className={fieldClass}>
              <option value="off">Tắt file (chỉ dùng checkbox âm thanh phía trên)</option>
              <option value="default">Âm thanh mặc định hệ thống</option>
              <option value="custom">URL file tùy chỉnh (path nội bộ, ví dụ sau khi upload media)</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-[#64748B]">URL âm thanh tùy chỉnh</span>
            <input
              type="text"
              name="commissionTab_soundCustomUrl"
              defaultValue={settings.commissionTab.soundCustomUrl}
              placeholder="/uploads/..."
              className={fieldClass}
            />
            <span className="text-[11px] text-[#64748B]">Upload qua Thư viện media admin rồi dán URL path an toàn (bắt đầu bằng /).</span>
          </label>
        </div>
      </div>

      <div id="ctv-guide" className={`${sectionCard} scroll-mt-24`}>
        <h3 className="text-base font-semibold text-[#0F172A]">Hướng dẫn CTV</h3>
        <label className="space-y-1">
          <span className="text-xs font-medium text-[#64748B]">Nội dung hiển thị cho CTV (văn bản thuần)</span>
          <textarea
            name="ctvGuideContent"
            rows={14}
            defaultValue={settings.ctvGuideContent}
            className={`${fieldClass} min-h-[280px] resize-y font-sans`}
            placeholder="Để trống: tab Hướng dẫn CTV sẽ dùng bản mẫu tiếng Việt có dấu."
          />
          <span className="text-xs text-[#64748B]">
            Nếu để trống, tab “Hướng dẫn CTV” hiển thị bản hướng dẫn mặc định của hệ thống.
          </span>
        </label>
        <p className="text-xs text-[#94A3B8]">
          {/* TODO: Điều khoản CTV riêng — thêm field trong website_settings khi cần tách khỏi hướng dẫn. */}
          Điều khoản CTV riêng: chưa có field — có thể mở rộng schema sau.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="submit"
          name="ctv_settings_action"
          value="save"
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#2563EB] px-6 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
        >
          Lưu cài đặt CTV
        </button>
        <button
          type="submit"
          name="ctv_settings_action"
          value="restore_defaults"
          formNoValidate
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-5 text-sm font-semibold text-amber-900 hover:bg-amber-100"
          title="Ghi đè các trường CTV bằng giá trị mặc định hệ thống (chương trình tắt, tỷ lệ 5%, ngưỡng 100.000đ, cookie 30 ngày, v.v.). Các cài đặt website khác không đổi."
        >
          Đặt lại mặc định CTV
        </button>
        <Link
          href="/admin/collaborators?tab=cai-dat"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#E2E8F0] px-5 text-sm font-semibold text-[#0F172A] hover:bg-slate-50"
        >
          Hoàn tác (tải lại)
        </Link>
        <p className="text-xs text-[#64748B] sm:ml-auto">
          Cần chỉnh logo, banner, footer?{" "}
          <Link href="/admin/website-appearance" className="font-semibold text-[#2563EB] hover:underline">
            Giao diện & cài đặt website
          </Link>
        </p>
      </div>
    </form>
  );
}
