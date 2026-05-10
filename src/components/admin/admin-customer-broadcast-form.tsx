"use client";

import { useState } from "react";
import { adminDangerButton, adminPrimaryButton } from "@/lib/admin-ui";

export default function AdminCustomerBroadcastForm(): JSX.Element {
  const [kind, setKind] = useState<"PROMOTION" | "SYSTEM">("PROMOTION");
  const [audience, setAudience] = useState<"ALL" | "AFFILIATE">("ALL");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [actionHref, setActionHref] = useState("/");
  const [banner, setBanner] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Xem ưu đãi");
  const [expireAt, setExpireAt] = useState("");
  const [systemType, setSystemType] = useState("ANNOUNCEMENT");
  const [severity, setSeverity] = useState<"info" | "warning" | "critical">("info");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/customer-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          audience,
          title,
          body,
          actionHref: actionHref.trim() || null,
          banner: kind === "PROMOTION" ? (banner.trim() || null) : null,
          ctaLabel: kind === "PROMOTION" ? (ctaLabel.trim() || null) : null,
          expireAt: kind === "PROMOTION" && expireAt.trim() ? new Date(expireAt).toISOString() : null,
          systemType: kind === "SYSTEM" ? systemType.trim() || null : null,
          severity: kind === "SYSTEM" ? severity : null,
        }),
      });
      const j = (await res.json()) as { ok?: boolean; message?: string; inserted?: number; scanned?: number };
      if (!res.ok) {
        setError(j.message ?? "Gửi thất bại.");
        return;
      }
      setMessage(`Đã gửi. Khách quét: ${j.scanned ?? 0}, thêm mới: ${j.inserted ?? 0}.`);
    } catch {
      setError("Lỗi mạng hoặc máy chủ.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-800">Loại</span>
          <select
            value={kind}
            onChange={(ev) => setKind(ev.target.value as "PROMOTION" | "SYSTEM")}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="PROMOTION">Khuyến mãi (PROMOTION)</option>
            <option value="SYSTEM">Hệ thống (SYSTEM)</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-800">Đối tượng</span>
          <select
            value={audience}
            onChange={(ev) => setAudience(ev.target.value as "ALL" | "AFFILIATE")}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="ALL">Toàn bộ khách (không guest)</option>
            <option value="AFFILIATE">Chỉ CTV (Affiliate ACTIVE)</option>
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-slate-800">Tiêu đề</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-800">Nội dung</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={5}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-800">Liên kết (chỉ đường dẫn nội bộ /...)</span>
        <input
          value={actionHref}
          onChange={(e) => setActionHref(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      {kind === "PROMOTION" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-800">Banner (URL ảnh)</span>
            <input
              value={banner}
              onChange={(e) => setBanner(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-800">Nhãn CTA</span>
            <input
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-800">Hết hạn (local datetime)</span>
            <input
              type="datetime-local"
              value={expireAt}
              onChange={(e) => setExpireAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-800">systemType</span>
            <input
              value={systemType}
              onChange={(e) => setSystemType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-800">severity</span>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as "info" | "warning" | "critical")}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="info">info</option>
              <option value="warning">warning</option>
              <option value="critical">critical</option>
            </select>
          </label>
        </div>
      )}

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={submitting} className={adminPrimaryButton}>
          {submitting ? "Đang gửi…" : "Gửi thông báo"}
        </button>
        <button
          type="button"
          className={adminDangerButton}
          onClick={() => {
            setTitle("");
            setBody("");
            setMessage(null);
            setError(null);
          }}
        >
          Xóa form
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Gửi ngay tới hộp thông báo tài khoản khách (CustomerAccountNotification). Không lên lịch trong phiên bản này — chỉ gửi một lần khi bấm.
      </p>
    </form>
  );
}
