"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

type ApplicationPublic = {
  status: ApplicationStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  trafficSource: string | null;
  followerCount: number | null;
  sellingCategories: string | null;
  score: number | null;
  scoreReason: string | null;
};

type GetResponse = { ok: boolean; application: ApplicationPublic | null; message?: string };

type PostSuccess =
  | { ok: true; outcome: "created"; application: ApplicationPublic & { id: string } }
  | { ok: true; outcome: "pending_exists"; application: ApplicationPublic }
  | { ok: true; outcome: "already_ctv_active" };

type PostBody = { ok: false; message?: string } | PostSuccess;

export type AffiliateApplicationFormProps = {
  defaultEmail: string | null;
  contactHref: string;
  contactLabel: string;
  lienHeHref: string;
};

const TRAFFIC_SOURCE_OPTIONS = [
  "TikTok",
  "Facebook",
  "YouTube",
  "Website/Blog",
  "Group/Cộng đồng",
  "Bạn bè/người quen",
  "Khác",
] as const;

const SELLING_CATEGORY_OPTIONS = [
  "Thiết bị điện tử",
  "Phụ kiện điện thoại",
  "Đồ gia dụng",
  "Làm đẹp/sức khỏe",
  "Mẹ & bé",
  "Khác",
] as const;

const NOTE_PLACEHOLDER =
  "Bạn dự định bán qua kênh nào, tệp khách hàng là ai, sản phẩm nào muốn đẩy mạnh?";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isReasonablePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 14;
}

export function AffiliateApplicationForm(props: AffiliateApplicationFormProps): JSX.Element {
  const { defaultEmail, contactHref, contactLabel, lienHeHref } = props;

  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [application, setApplication] = useState<ApplicationPublic | null>(null);
  const [alreadyCtv, setAlreadyCtv] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(() => (defaultEmail?.trim() ? defaultEmail.trim() : ""));
  const [socialLink, setSocialLink] = useState("");
  const [trafficSource, setTrafficSource] = useState("");
  const [followerCountStr, setFollowerCountStr] = useState("");
  const [sellingCategories, setSellingCategories] = useState("");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setLoadState("loading");
    setLoadError(null);
    setInfoMessage(null);
    try {
      const res = await fetch("/api/account/affiliate/apply", { credentials: "same-origin" });
      const data = (await res.json()) as GetResponse;
      if (res.status === 401) {
        setLoadState("error");
        setLoadError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        return;
      }
      if (!data.ok || !res.ok) {
        setLoadState("error");
        setLoadError(data.message ?? "Không tải được trạng thái yêu cầu.");
        return;
      }
      setApplication(data.application);
      setAlreadyCtv(false);
      setLoadState("idle");
    } catch {
      setLoadState("error");
      setLoadError("Lỗi mạng. Thử lại sau.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (loadState !== "idle" || application?.status !== "REJECTED") return;
    if (application.trafficSource) setTrafficSource((prev) => prev || application.trafficSource || "");
    if (application.followerCount != null) {
      setFollowerCountStr((prev) => prev || String(application.followerCount));
    }
    if (application.sellingCategories) {
      setSellingCategories((prev) => prev || application.sellingCategories || "");
    }
  }, [
    application?.status,
    application?.trafficSource,
    application?.followerCount,
    application?.sellingCategories,
    loadState,
  ]);

  const status = application?.status ?? null;
  const isPending = status === "PENDING";
  const isApproved = status === "APPROVED";
  const isRejected = status === "REJECTED";

  const canShowForm = useMemo(() => {
    if (loadState !== "idle") return false;
    if (isApproved) return false;
    if (isPending) return false;
    return true;
  }, [loadState, isApproved, isPending]);

  const trafficSelectValues = useMemo(() => {
    const base: string[] = [...TRAFFIC_SOURCE_OPTIONS];
    const extra =
      application?.status === "REJECTED" && application.trafficSource?.trim()
        ? application.trafficSource.trim()
        : "";
    if (extra && !base.includes(extra)) return [extra, ...base];
    return base;
  }, [application?.status, application?.trafficSource]);

  const sellingSelectValues = useMemo(() => {
    const base: string[] = [...SELLING_CATEGORY_OPTIONS];
    const extra =
      application?.status === "REJECTED" && application.sellingCategories?.trim()
        ? application.sellingCategories.trim()
        : "";
    if (extra && !base.includes(extra)) return [extra, ...base];
    return base;
  }, [application?.status, application?.sellingCategories]);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitError(null);
    setInfoMessage(null);
    if (!fullName.trim()) {
      setSubmitError("Vui lòng nhập họ tên.");
      return;
    }
    if (!phone.trim() || !isReasonablePhone(phone)) {
      setSubmitError("Vui lòng nhập số điện thoại hợp lệ.");
      return;
    }
    if (!email.trim() || !isValidEmail(email)) {
      setSubmitError("Vui lòng nhập email hợp lệ.");
      return;
    }

    const body: Record<string, string | number | undefined> = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
    };
    const s = socialLink.trim();
    if (s) body.socialLink = s;
    const n = note.trim();
    if (n) body.note = n;
    const t = trafficSource.trim();
    if (t) body.trafficSource = t;
    const sell = sellingCategories.trim();
    if (sell) body.sellingCategories = sell;
    const fc = followerCountStr.trim();
    if (fc !== "") {
      if (!/^\d+$/.test(fc)) {
        setSubmitError("Số người theo dõi phải là số nguyên không âm.");
        return;
      }
      body.followerCount = Number(fc);
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/account/affiliate/apply", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as PostBody;
      if (res.status === 401) {
        setSubmitError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        return;
      }
      if (!data.ok) {
        setSubmitError("message" in data ? (data.message ?? "Không gửi được yêu cầu.") : "Không gửi được yêu cầu.");
        return;
      }
      if (data.outcome === "already_ctv_active") {
        setAlreadyCtv(true);
        setApplication(null);
        return;
      }
      if (data.outcome === "pending_exists") {
        setApplication(data.application);
        setInfoMessage("Bạn đã có đơn đang chờ duyệt. Không cần gửi trùng.");
        return;
      }
      if (data.outcome === "created") {
        const { id, ...pub } = data.application;
        void id;
        setApplication(pub);
        setInfoMessage("Đã gửi yêu cầu thành công. Cửa hàng sẽ xem xét trong thời gian sớm nhất.");
        return;
      }
    } catch {
      setSubmitError("Lỗi mạng. Thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadState === "loading") {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-8 text-center text-sm text-slate-600 shadow-sm">
        Đang tải trạng thái yêu cầu…
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-5 text-sm text-rose-950 shadow-sm">
        <p>{loadError}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-rose-900 ring-1 ring-rose-200 transition hover:bg-rose-50 sm:w-auto"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (alreadyCtv) {
    return (
      <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/80 px-4 py-6 text-center shadow-sm sm:px-6">
        <p className="text-sm font-semibold text-emerald-950">Tài khoản của bạn đã là CTV đang hoạt động.</p>
        <p className="mt-2 text-sm text-emerald-900/90">Mở trang tài khoản để xem link giới thiệu và báo cáo.</p>
        <Link
          href="/tai-khoan"
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-md shadow-sky-600/20 transition hover:bg-sky-700 sm:w-auto sm:min-w-[240px]"
        >
          Vào trang CTV của tôi
        </Link>
      </div>
    );
  }

  if (isApproved) {
    return (
      <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/80 px-4 py-6 text-center shadow-sm sm:px-6">
        <p className="text-sm font-semibold text-emerald-950">Yêu cầu của bạn đã được duyệt.</p>
        <p className="mt-2 text-sm text-emerald-900/90">Mở tài khoản để dùng trung tâm CTV và lấy link giới thiệu.</p>
        <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-emerald-900/85">
          Nếu mục CTV trong tài khoản chưa hiện sau khi được duyệt: đăng xuất rồi đăng nhập lại để làm mới phiên, hoặc tải
          lại trang sau vài giây.
        </p>
        <Link
          href="/tai-khoan"
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-md shadow-sky-600/20 transition hover:bg-sky-700 sm:w-auto sm:min-w-[240px]"
        >
          Vào trang CTV của tôi
        </Link>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="rounded-2xl border border-sky-200/90 bg-sky-50/90 px-4 py-6 text-center shadow-sm sm:px-6">
        {infoMessage ? (
          <p
            className="mb-3 rounded-xl border border-sky-200 bg-white/90 px-3 py-2 text-xs font-medium text-sky-950"
            role="status"
          >
            {infoMessage}
          </p>
        ) : null}
        <p className="text-base font-semibold text-sky-950">Đã gửi yêu cầu, đang chờ duyệt</p>
        <p className="mt-2 text-sm leading-relaxed text-sky-900/90">
          Zendo.vn sẽ xem xét thông tin bạn gửi. Bạn không cần gửi lại cho đến khi có cập nhật trạng thái.
        </p>
        {application?.score != null ? (
          <div className="mx-auto mt-4 max-w-md rounded-xl border border-sky-200/80 bg-white/90 px-3 py-3 text-left text-xs text-sky-950">
            <p className="font-semibold">Điểm hồ sơ tạm tính: {application.score}/100</p>
            {application.scoreReason ? (
              <p className="mt-1.5 leading-relaxed text-sky-900/95">
                <span className="font-medium text-sky-950">Lý do: </span>
                {application.scoreReason}
              </p>
            ) : null}
            <p className="mt-2 text-[11px] leading-relaxed text-sky-800/90">
              Điểm chỉ hỗ trợ sơ bộ; quyết định duyệt thuộc cửa hàng.
            </p>
          </div>
        ) : null}
        {application ? (
          <p className="mt-3 text-xs text-sky-800/80">Cập nhật lần cuối: {new Date(application.updatedAt).toLocaleString("vi-VN")}</p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
          <Link
            href="/tai-khoan"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 sm:w-auto"
          >
            Mở trang tài khoản
          </Link>
          <a
            href={contactHref}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-sky-100 bg-white px-4 text-sm font-semibold text-sky-900 transition hover:bg-sky-50 sm:w-auto"
          >
            {contactLabel}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      {isRejected ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/95 px-4 py-4 text-left text-sm text-rose-950 shadow-sm">
          <p className="font-semibold">Yêu cầu làm CTV đã bị từ chối</p>
          {application?.adminNote ? (
            <p className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-rose-100 bg-white/80 px-3 py-2 leading-relaxed text-rose-950">
              <span className="font-medium text-rose-900">Ghi chú từ cửa hàng: </span>
              {application.adminNote}
            </p>
          ) : (
            <p className="mt-2 text-xs text-rose-900/90">Cửa hàng không để lại ghi chú chi tiết.</p>
          )}
          <p className="mt-3 text-xs leading-relaxed text-rose-900/90">
            Bạn có thể điều chỉnh hồ sơ và gửi lại đơn mới bên dưới. Nếu cần làm rõ lý do hoặc điều kiện, vui lòng liên
            hệ qua kênh hỗ trợ.
          </p>
          <p className="mt-2 text-xs text-rose-900/85">
            {lienHeHref.startsWith("/") ? (
              <Link href={lienHeHref} className="font-semibold text-sky-800 underline underline-offset-2">
                Trang liên hệ
              </Link>
            ) : (
              <a href={lienHeHref} className="font-semibold text-sky-800 underline underline-offset-2">
                Trang liên hệ
              </a>
            )}{" "}
            ·{" "}
            <a href={contactHref} className="font-semibold text-sky-800 underline underline-offset-2">
              {contactLabel}
            </a>
            .
          </p>
        </div>
      ) : null}

      {canShowForm ? (
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="w-full min-w-0 space-y-4 rounded-2xl border border-slate-200/95 bg-white/95 p-4 shadow-md shadow-slate-900/5 ring-1 ring-slate-100 sm:p-6"
        >
          {infoMessage ? (
            <p
              className="rounded-xl border border-sky-200 bg-sky-50/90 px-3 py-2 text-sm font-medium text-sky-950"
              role="status"
            >
              {infoMessage}
            </p>
          ) : null}
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Gửi yêu cầu làm CTV</h3>
            <p className="mt-1 text-sm text-slate-600">
              Điền thông tin chính xác để cửa hàng xét duyệt nhanh hơn. Hệ thống tự tính điểm hồ sơ tạm (0–100) từ các mục
              bạn cung cấp.
            </p>
            <p className="mt-2 rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2 text-xs leading-relaxed text-sky-950">
              Thông tin này giúp Zendo.vn duyệt CTV nhanh và phân nhóm hỗ trợ phù hợp.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block min-w-0 sm:col-span-2">
              <span className="text-sm font-medium text-slate-800">Họ tên</span>
              <input
                name="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
                className="mt-1.5 w-full min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              />
            </label>
            <label className="block min-w-0">
              <span className="text-sm font-medium text-slate-800">Số điện thoại</span>
              <input
                name="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                inputMode="tel"
                required
                className="mt-1.5 w-full min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              />
            </label>
            <label className="block min-w-0">
              <span className="text-sm font-medium text-slate-800">Email</span>
              <input
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="mt-1.5 w-full min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              />
            </label>
            <label className="block min-w-0 sm:col-span-2">
              <span className="text-sm font-medium text-slate-800">Link mạng xã hội / kênh bán hàng</span>
              <span className="mt-0.5 block text-xs font-normal text-slate-500">Tùy chọn — dạng https://… (+ điểm nếu có URL hợp lệ)</span>
              <input
                name="socialLink"
                value={socialLink}
                onChange={(e) => setSocialLink(e.target.value)}
                placeholder="https://"
                className="mt-1.5 w-full min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              />
            </label>
            <label className="block min-w-0 sm:col-span-1">
              <span className="text-sm font-medium text-slate-800">Nguồn traffic chính</span>
              <span className="mt-0.5 block text-xs font-normal text-slate-500">Tùy chọn — chọn kênh chính bạn dùng để giới thiệu</span>
              <select
                name="trafficSource"
                value={trafficSource}
                onChange={(e) => setTrafficSource(e.target.value)}
                className="mt-1.5 w-full min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              >
                <option value="">— Chưa chọn —</option>
                {trafficSelectValues.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 sm:col-span-1">
              <span className="text-sm font-medium text-slate-800">Số follower / người theo dõi</span>
              <span className="mt-0.5 block text-xs font-normal text-slate-500">Tùy chọn — số nguyên không âm</span>
              <input
                name="followerCount"
                type="number"
                min={0}
                step={1}
                value={followerCountStr}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    setFollowerCountStr("");
                    return;
                  }
                  const n = Number(v);
                  if (!Number.isFinite(n) || n < 0) return;
                  const capped = Math.min(Math.floor(n), 100_000_000);
                  setFollowerCountStr(String(capped));
                }}
                placeholder="Ví dụ: 5000"
                className="mt-1.5 w-full min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              />
            </label>
            <label className="block min-w-0 sm:col-span-2">
              <span className="text-sm font-medium text-slate-800">Ngành hàng muốn bán</span>
              <span className="mt-0.5 block text-xs font-normal text-slate-500">Tùy chọn — chọn ngành bạn muốn tập trung</span>
              <select
                name="sellingCategories"
                value={sellingCategories}
                onChange={(e) => setSellingCategories(e.target.value)}
                className="mt-1.5 w-full min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              >
                <option value="">— Chưa chọn —</option>
                {sellingSelectValues.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 sm:col-span-2">
              <span className="text-sm font-medium text-slate-800">Ghi chú / kế hoạch bán hàng</span>
              <span className="mt-0.5 block text-xs font-normal text-slate-500">
                Tùy chọn — từ 30 ký tự trở lên được cộng điểm kế hoạch
              </span>
              <textarea
                name="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder={NOTE_PLACEHOLDER}
                className="mt-1.5 w-full min-w-0 resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              />
            </label>
          </div>

          {submitError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-md shadow-sky-600/20 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[200px]"
            >
              {submitting ? "Đang gửi…" : "Gửi yêu cầu"}
            </button>
            <p className="text-center text-xs text-slate-500 sm:text-left">
              Cần hỗ trợ khác?{" "}
              {lienHeHref.startsWith("/") ? (
                <Link href={lienHeHref} className="font-semibold text-sky-800 underline underline-offset-2">
                  Trang liên hệ
                </Link>
              ) : (
                <a href={lienHeHref} className="font-semibold text-sky-800 underline underline-offset-2">
                  Trang liên hệ
                </a>
              )}{" "}
              hoặc{" "}
              <a href={contactHref} className="font-semibold text-sky-800 underline underline-offset-2">
                {contactLabel}
              </a>
              .
            </p>
          </div>
        </form>
      ) : null}
    </div>
  );
}
