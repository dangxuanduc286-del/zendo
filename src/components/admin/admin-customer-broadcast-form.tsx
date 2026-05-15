"use client";

import { useState } from "react";
import {
  adminCardBody,
  adminDangerButton,
  adminLabel,
  adminMetaText,
  adminPrimaryButton,
  adminSelect,
  adminTextarea,
} from "@/lib/admin-ui";

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
    <form onSubmit={onSubmit} className={`${adminCardBody} max-w-full space-y-5`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className={adminLabel}>Loại</span>
          <select
            value={kind}
            onChange={(ev) => setKind(ev.target.value as "PROMOTION" | "SYSTEM")}
            className={adminSelect}
          >
            <option value="PROMOTION">Khuyến mãi (PROMOTION)</option>
            <option value="SYSTEM">Hệ thống (SYSTEM)</option>
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className={adminLabel}>Đối tượng</span>
          <select
            value={audience}
            onChange={(ev) => setAudience(ev.target.value as "ALL" | "AFFILIATE")}
            className={adminSelect}
          >
            <option value="ALL">Toàn bộ khách (không guest)</option>
            <option value="AFFILIATE">Chỉ CTV (Affiliate ACTIVE)</option>
          </select>
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className={adminLabel}>Tiêu đề</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={adminSelect}
        />
      </label>

      <label className="block space-y-1.5">
        <span className={adminLabel}>Nội dung</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={6}
          className={`${adminTextarea} min-h-[180px] leading-relaxed`}
        />
      </label>

      <label className="block space-y-1.5">
        <span className={adminLabel}>Liên kết (chỉ đường dẫn nội bộ /...)</span>
        <input value={actionHref} onChange={(e) => setActionHref(e.target.value)} className={adminSelect} />
      </label>

      {kind === "PROMOTION" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className={adminLabel}>Banner (URL ảnh)</span>
            <input value={banner} onChange={(e) => setBanner(e.target.value)} className={adminSelect} />
          </label>
          <label className="block space-y-1.5">
            <span className={adminLabel}>Nhãn CTA</span>
            <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} className={adminSelect} />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className={adminLabel}>Hết hạn (local datetime)</span>
            <input type="datetime-local" value={expireAt} onChange={(e) => setExpireAt(e.target.value)} className={adminSelect} />
          </label>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className={adminLabel}>systemType</span>
            <input value={systemType} onChange={(e) => setSystemType(e.target.value)} className={adminSelect} />
          </label>
          <label className="block space-y-1.5">
            <span className={adminLabel}>severity</span>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as "info" | "warning" | "critical")}
              className={adminSelect}
            >
              <option value="info">info</option>
              <option value="warning">warning</option>
              <option value="critical">critical</option>
            </select>
          </label>
        </div>
      )}

      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
        <button type="submit" disabled={submitting} className={`${adminPrimaryButton} h-11 rounded-2xl px-6 shadow-sm`}>
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

      <p className={adminMetaText}>
        Gửi ngay tới hộp thông báo tài khoản khách (CustomerAccountNotification). Không lên lịch trong phiên bản này — chỉ gửi một lần khi bấm.
      </p>
    </form>
  );
}
