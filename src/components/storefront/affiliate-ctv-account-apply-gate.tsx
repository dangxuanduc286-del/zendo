"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

type ApplicationPublic = {
  status: ApplicationStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  trafficSource: string | null;
  followerCount: number | null;
  sellingCategories: string | null;
  experience: string | null;
  score: number | null;
  scoreReason: string | null;
};

type GetResponse = { ok: boolean; application: ApplicationPublic | null; message?: string };

type PostSuccess =
  | { ok: true; outcome: "created"; message?: string; application: ApplicationPublic & { id: string } }
  | { ok: true; outcome: "pending_exists"; message?: string; application: ApplicationPublic }
  | { ok: true; outcome: "already_ctv_active"; message?: string };

type PostBody = { ok: false; message?: string } | PostSuccess;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isReasonablePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 14;
}

type Props = {
  shoppingHomeHref: string;
};

export function AffiliateCtvAccountApplyGate(props: Props): JSX.Element {
  const { shoppingHomeHref } = props;
  const { data: session } = useSession();
  const sessionEmailRaw =
    typeof session?.user?.email === "string" && session.user.email.trim() ? session.user.email.trim() : "";
  const hasSessionEmail = Boolean(sessionEmailRaw) && isValidEmail(sessionEmailRaw);

  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [application, setApplication] = useState<ApplicationPublic | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [emailContact, setEmailContact] = useState("");
  const [emailFieldError, setEmailFieldError] = useState<string | null>(null);
  const [socialLink, setSocialLink] = useState("");
  const [experience, setExperience] = useState("");
  const [trafficSource, setTrafficSource] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!modalOpen) return;
    setEmailFieldError(null);
    if (!hasSessionEmail) {
      setEmailContact("");
    }
  }, [modalOpen, hasSessionEmail]);

  const refresh = useCallback(async (): Promise<void> => {
    setLoadState("loading");
    setLoadError(null);
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
      setLoadState("idle");
    } catch {
      setLoadState("error");
      setLoadError("Lỗi mạng. Thử lại sau.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const status = application?.status ?? null;
  const isPending = status === "PENDING";
  const isRejected = status === "REJECTED";

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitError(null);
    setEmailFieldError(null);
    if (!fullName.trim()) {
      setSubmitError("Vui lòng nhập họ và tên.");
      return;
    }
    if (!phone.trim() || !isReasonablePhone(phone)) {
      setSubmitError("Vui lòng nhập số điện thoại hợp lệ.");
      return;
    }

    let resolvedEmailForBody: string;
    if (hasSessionEmail) {
      resolvedEmailForBody = sessionEmailRaw.trim().toLowerCase();
    } else {
      const em = emailContact.trim();
      if (!em) {
        setEmailFieldError("Vui lòng nhập email liên hệ.");
        return;
      }
      if (!isValidEmail(em)) {
        setEmailFieldError("Email không hợp lệ.");
        return;
      }
      resolvedEmailForBody = em.toLowerCase();
    }

    const body: Record<string, string> = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: resolvedEmailForBody,
    };
    const s = socialLink.trim();
    if (s) body.socialLink = s;
    const ex = experience.trim();
    if (ex) body.experience = ex;
    const t = trafficSource.trim();
    if (t) body.trafficSource = t;
    const n = note.trim();
    if (n) body.note = n;

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
        setSubmitError("Phiên đăng nhập đã hết hạn.");
        return;
      }
      if (res.status === 429 && !data.ok && "message" in data) {
        setSubmitError(data.message ?? "Quá nhiều yêu cầu. Thử lại sau.");
        return;
      }
      if (!data.ok) {
        const msg = "message" in data ? (data.message ?? "Không gửi được.") : "Không gửi được.";
        if (res.status === 400 && /email/i.test(msg)) {
          setEmailFieldError(msg);
          return;
        }
        setSubmitError(msg);
        return;
      }
      if (data.outcome === "pending_exists") {
        setApplication(data.application);
        setModalOpen(false);
        return;
      }
      if (data.outcome === "already_ctv_active") {
        void refresh();
        setModalOpen(false);
        return;
      }
      if (data.outcome === "created") {
        const { id: _id, ...pub } = data.application;
        void _id;
        setApplication(pub);
        setModalOpen(false);
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
      <div className="mt-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs text-[#64748B]">
        Đang tải trạng thái đăng ký CTV…
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="mt-2 space-y-2">
        <p className="text-sm text-rose-700">{loadError}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A]"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm text-[#64748B]">
          Bạn đã gửi yêu cầu đăng ký CTV. Vui lòng chờ quản trị viên xét duyệt.
        </p>
        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
          Chờ duyệt
        </span>
      </div>
    );
  }

  return (
    <>
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
            Bạn có thể điều chỉnh hồ sơ và gửi lại đơn mới bên dưới.
          </p>
        </div>
      ) : null}
      <p className="mt-2 text-sm text-[#64748B]">
        Gửi hồ sơ đăng ký CTV để quản trị viên xét duyệt. Nếu tài khoản chưa gắn email đăng nhập, vui lòng nhập email
        liên hệ trong biểu mẫu.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setSubmitError(null);
            setEmailFieldError(null);
            setModalOpen(true);
          }}
          className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
        >
          Đăng ký CTV
        </button>
        <Link
          href={shoppingHomeHref}
          className="rounded-lg bg-[#FFFDF8]0 px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#D97706]"
        >
          Tiếp tục mua sắm
        </Link>
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => !submitting && setModalOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[#E2E8F0] bg-white p-4 shadow-xl sm:rounded-2xl"
            role="dialog"
            aria-modal
            aria-labelledby="ctv-apply-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="ctv-apply-title" className="text-base font-semibold text-[#0F172A]">
              Đăng ký CTV
            </h3>
            <p className="mt-1 text-xs text-[#64748B]">Các mục có dấu * là bắt buộc.</p>
            <form className="mt-4 space-y-3" onSubmit={(e) => void onSubmit(e)} noValidate>
              <label className="block text-xs font-medium text-[#0F172A]">
                Họ và tên *
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
                  autoComplete="name"
                />
              </label>
              <label className="block text-xs font-medium text-[#0F172A]">
                Số điện thoại *
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
                  autoComplete="tel"
                />
              </label>
              <div className="block">
                <label className="text-xs font-medium text-[#0F172A]" htmlFor="ctv-apply-email">
                  Email liên hệ *
                </label>
                {hasSessionEmail ? (
                  <input
                    id="ctv-apply-email"
                    readOnly
                    value={sessionEmailRaw}
                    className="mt-1 w-full cursor-not-allowed rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#64748B] outline-none"
                    autoComplete="email"
                  />
                ) : (
                  <input
                    id="ctv-apply-email"
                    type="email"
                    value={emailContact}
                    onChange={(e) => {
                      setEmailContact(e.target.value);
                      if (emailFieldError) setEmailFieldError(null);
                    }}
                    autoComplete="email"
                    aria-invalid={Boolean(emailFieldError)}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#2563EB] ${
                      emailFieldError ? "border-rose-400" : "border-[#E2E8F0]"
                    }`}
                    placeholder="ten@example.com"
                  />
                )}
                {emailFieldError ? <p className="mt-1 text-xs text-rose-700">{emailFieldError}</p> : null}
              </div>
              <label className="block text-xs font-medium text-[#0F172A]">
                Link Facebook / TikTok (tuỳ chọn)
                <input
                  value={socialLink}
                  onChange={(e) => setSocialLink(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
                />
              </label>
              <label className="block text-xs font-medium text-[#0F172A]">
                Kinh nghiệm bán hàng
                <textarea
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
                  placeholder="Mô tả ngắn gọn kinh nghiệm của bạn"
                />
              </label>
              <label className="block text-xs font-medium text-[#0F172A]">
                Nguồn traffic chính
                <input
                  value={trafficSource}
                  onChange={(e) => setTrafficSource(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
                  placeholder="Ví dụ: TikTok, Facebook group, website…"
                />
              </label>
              <label className="block text-xs font-medium text-[#0F172A]">
                Ghi chú thêm
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
                />
              </label>
              {submitError ? <p className="text-xs text-rose-700">{submitError}</p> : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Đang gửi…" : "Gửi đăng ký"}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-60"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
