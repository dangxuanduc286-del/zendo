"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ThemeSettings } from "../../lib/settings";
import type { ThemeSettingsFormValues } from "../../lib/admin-settings";
import { themeSettingsToFormValues } from "../../lib/admin-theme-form-values";
import AdminImageUploadField from "./admin-image-upload-field";

type SaveState = "idle" | "saving";

export default function AdminCampaignBackgroundEditor({
  themeSettings,
}: {
  themeSettings: ThemeSettings;
}): JSX.Element {
  const router = useRouter();
  const [enabled, setEnabled] = useState(Boolean(themeSettings.campaignBackgroundEnabled));
  const [desktopUrl, setDesktopUrl] = useState(themeSettings.campaignBackgroundImage || "");
  const [mobileUrl, setMobileUrl] = useState(themeSettings.campaignBackgroundMobileImage || "");
  const [status, setStatus] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function saveCampaignOnly(): Promise<void> {
    setError("");
    setSuccess("");
    setStatus("saving");
    try {
      const base: ThemeSettingsFormValues = themeSettingsToFormValues(themeSettings);
      const payload: ThemeSettingsFormValues = {
        ...base,
        campaignBackgroundEnabled: enabled,
        campaignBackgroundImage: desktopUrl,
        campaignBackgroundMobileImage: mobileUrl,
      };
      const response = await fetch("/api/admin/settings/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? "Không thể lưu ảnh nền chiến dịch.");
        setStatus("idle");
        return;
      }
      setSuccess("Đã lưu ảnh nền chiến dịch.");
      setStatus("idle");
      router.refresh();
    } catch {
      setError("Có lỗi xảy ra khi lưu ảnh nền chiến dịch.");
      setStatus("idle");
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-[#0F172A]">Ảnh nền chiến dịch</h2>
        <p className="text-sm text-[#64748B]">
          Ảnh nền toàn trang nằm sau nội dung (CSS background), <strong>không phải</strong> banner carousel hero. Chỉnh ở đây{" "}
          <strong>không</strong> đổi cấu hình <code className="rounded bg-slate-100 px-1">homeBanners</code> hay chế độ{" "}
          <code className="rounded bg-slate-100 px-1">object-fit</code> của hero (tab Danh sách banner).
        </p>
        <p className="text-xs text-[#64748B]">
          Ảnh nền chiến dịch dùng CSS background (storefront: <code className="rounded bg-slate-100 px-1">background-size: cover</code>,{" "}
          <code className="rounded bg-slate-100 px-1">background-position: top center</code>, <code className="rounded bg-slate-100 px-1">no-repeat</code>). Nên dùng
          khoảng 2560×1440 px (desktop), chừa vùng giữa ít chi tiết.
        </p>
      </header>

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
      ) : null}

      <label className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm font-medium text-[#0F172A]">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-[#CBD5E1]"
        />
        Bật ảnh nền chiến dịch
      </label>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdminImageUploadField
          label="Ảnh nền desktop (chiến dịch)"
          value={desktopUrl}
          kind="theme"
          hint="Ảnh nền chiến dịch dùng CSS background, nên dùng 2560×1440 px hoặc 1920×1080 px; storefront: background-size cover, background-position top center."
          previewClassName="aspect-[16/9] w-full"
          previewImageClassName="object-cover object-center"
          quality={90}
          clearLabel="Xóa ảnh nền desktop"
          onChange={setDesktopUrl}
        />
        <AdminImageUploadField
          label="Ảnh nền mobile (chiến dịch)"
          value={mobileUrl}
          kind="theme"
          hint="Tùy chọn. Tỷ lệ dọc 9:16; nếu trống, mobile có thể dùng ảnh desktop hoặc nền mặc định tùy cấu hình."
          previewClassName="aspect-[9/16] w-full max-w-[220px]"
          previewImageClassName="object-cover object-center"
          quality={90}
          clearLabel="Xóa ảnh nền mobile"
          onChange={setMobileUrl}
        />
      </div>

      <div>
        <button
          type="button"
          onClick={() => void saveCampaignOnly()}
          disabled={status === "saving"}
          className="inline-flex h-9 items-center rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm font-medium text-[#0F172A] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "saving" ? "Đang lưu..." : "Lưu ảnh nền chiến dịch"}
        </button>
      </div>
    </section>
  );
}
