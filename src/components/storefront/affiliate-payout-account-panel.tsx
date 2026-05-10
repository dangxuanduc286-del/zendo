"use client";

import { useEffect, useMemo, useState } from "react";

type ChangeReq = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  reviewedAt: string | null;
  rejectionReason: string;
  requestedBankName: string;
  requestedBankAccountNumberMasked: string;
  requestedBankAccountHolder: string;
};

type PayoutAccount =
  | {
      id: string;
      bankName: string;
      bankAccountNumberMasked: string;
      bankAccountHolder: string;
      verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
      rejectionReason?: string;
      verifiedAt?: string | null;
      changeRequests?: ChangeReq[];
    }
  | null;

type LoadState =
  | { loading: true; account: null; exists: boolean }
  | { loading: false; account: PayoutAccount; exists: boolean };

async function uploadCccd(
  file: File,
  side: "front" | "back",
  changeDraftToken?: string | null,
): Promise<{ ok: boolean; objectKey?: string; message?: string }> {
  const form = new FormData();
  form.set("file", file);
  form.set("side", side);
  if (changeDraftToken?.trim()) form.set("changeDraftToken", changeDraftToken.trim());
  const res = await fetch("/api/account/affiliate/payout-account/upload", {
    method: "POST",
    credentials: "same-origin",
    body: form,
  });
  const j = (await res.json()) as { ok?: boolean; objectKey?: string; message?: string };
  if (res.ok && j.ok && j.objectKey) return { ok: true, objectKey: j.objectKey };
  return { ok: false, message: j.message ?? "Không tải ảnh lên được." };
}

function changeStatusLabel(s: ChangeReq["status"]): string {
  if (s === "PENDING") return "Chờ duyệt đổi TK";
  if (s === "APPROVED") return "Đã áp dụng đổi TK";
  return "Đã từ chối đổi TK";
}

export default function AffiliatePayoutAccountPanel({
  onChanged,
}: {
  onChanged?: (account: PayoutAccount) => void;
}): JSX.Element {
  const [state, setState] = useState<LoadState>({ loading: true, account: null, exists: false });
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontUploading, setFrontUploading] = useState(false);
  const [backUploading, setBackUploading] = useState(false);
  const [frontKey, setFrontKey] = useState("");
  const [backKey, setBackKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showChangeForm, setShowChangeForm] = useState(false);
  const [changeDraftToken, setChangeDraftToken] = useState<string | null>(null);
  const [chBankName, setChBankName] = useState("");
  const [chBankAccountNumber, setChBankAccountNumber] = useState("");
  const [chBankAccountHolder, setChBankAccountHolder] = useState("");
  const [chFrontFile, setChFrontFile] = useState<File | null>(null);
  const [chBackFile, setChBackFile] = useState<File | null>(null);
  const [chFrontUploading, setChFrontUploading] = useState(false);
  const [chBackUploading, setChBackUploading] = useState(false);
  const [chFrontKey, setChFrontKey] = useState("");
  const [chBackKey, setChBackKey] = useState("");
  const [chSubmitting, setChSubmitting] = useState(false);

  const canSubmitInitial = useMemo(() => {
    if (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountHolder.trim()) return false;
    if (!frontKey || !backKey) return false;
    return true;
  }, [bankAccountHolder, bankAccountNumber, bankName, backKey, frontKey]);

  const canSubmitChange = useMemo(() => {
    if (!changeDraftToken) return false;
    if (!chBankName.trim() || !chBankAccountNumber.trim() || !chBankAccountHolder.trim()) return false;
    if (!chFrontKey || !chBackKey) return false;
    return true;
  }, [changeDraftToken, chBackKey, chBankAccountHolder, chBankAccountNumber, chBankName, chFrontKey]);

  const pendingChange =
    state.account?.changeRequests?.find((c) => c.status === "PENDING") ?? null;

  const load = async () => {
    setError("");
    try {
      const res = await fetch("/api/account/affiliate/payout-account", { credentials: "same-origin" });
      const j = (await res.json()) as
        | { ok?: boolean; exists?: boolean; account?: NonNullable<PayoutAccount>; message?: string }
        | { ok?: boolean; exists?: boolean; message?: string };
      if (!res.ok || !j.ok) throw new Error((j as { message?: string }).message || "Không tải được thông tin.");
      const exists = Boolean((j as { exists?: boolean }).exists);
      const account = (j as { account?: NonNullable<PayoutAccount> }).account ?? null;
      setState({ loading: false, exists, account });
      onChanged?.(account);
    } catch (e) {
      setState({ loading: false, exists: false, account: null });
      setError(e instanceof Error ? e.message : "Không tải được thông tin.");
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!state.account) return;
    if (state.account.verificationStatus !== "PENDING") {
      const pollPendingChange = pendingChange !== null;
      if (state.account.verificationStatus !== "APPROVED" || !pollPendingChange) return;
      const id = window.setInterval(() => {
        void load();
      }, 10000);
      return () => window.clearInterval(id);
    }
    const id = window.setInterval(() => {
      void load();
    }, 10000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.account?.id, state.account?.verificationStatus, pendingChange?.id]);

  const submit = async () => {
    setError("");
    setSuccess("");
    if (!canSubmitInitial) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/affiliate/payout-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          bankName: bankName.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          bankAccountHolder: bankAccountHolder.trim(),
          citizenIdFrontObjectKey: frontKey,
          citizenIdBackObjectKey: backKey,
        }),
      });
      const j = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !j.ok) throw new Error(j.message || "Không lưu được thông tin.");
      setSuccess(j.message || "Đã gửi thông tin.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được thông tin.");
    } finally {
      setSubmitting(false);
    }
  };

  const openChangeForm = (): void => {
    setError("");
    setSuccess("");
    const token =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `dr-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    setChangeDraftToken(token);
    setChBankName("");
    setChBankAccountNumber("");
    setChBankAccountHolder("");
    setChFrontFile(null);
    setChBackFile(null);
    setChFrontKey("");
    setChBackKey("");
    setShowChangeForm(true);
  };

  const submitChange = async (): Promise<void> => {
    setError("");
    setSuccess("");
    if (!canSubmitChange || !changeDraftToken) return;
    setChSubmitting(true);
    try {
      const res = await fetch("/api/account/affiliate/payout-account/change-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          bankName: chBankName.trim(),
          bankAccountNumber: chBankAccountNumber.trim(),
          bankAccountHolder: chBankAccountHolder.trim(),
          citizenIdFrontObjectKey: chFrontKey,
          citizenIdBackObjectKey: chBackKey,
          changeDraftToken,
        }),
      });
      const j = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !j.ok) throw new Error(j.message || "Không gửi được yêu cầu.");
      setSuccess(j.message || "Đã gửi yêu cầu.");
      setShowChangeForm(false);
      setChangeDraftToken(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không gửi được yêu cầu.");
    } finally {
      setChSubmitting(false);
    }
  };

  const uploadFront = async (): Promise<void> => {
    if (!frontFile) return;
    setError("");
    setSuccess("");
    setFrontUploading(true);
    try {
      const up = await uploadCccd(frontFile, "front");
      if (!up.ok || !up.objectKey) throw new Error(up.message || "Không tải ảnh lên được.");
      setFrontKey(up.objectKey);
      setSuccess("Đã tải CCCD mặt trước.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải ảnh lên được.");
    } finally {
      setFrontUploading(false);
    }
  };

  const uploadBack = async (): Promise<void> => {
    if (!backFile) return;
    setError("");
    setSuccess("");
    setBackUploading(true);
    try {
      const up = await uploadCccd(backFile, "back");
      if (!up.ok || !up.objectKey) throw new Error(up.message || "Không tải ảnh lên được.");
      setBackKey(up.objectKey);
      setSuccess("Đã tải CCCD mặt sau.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải ảnh lên được.");
    } finally {
      setBackUploading(false);
    }
  };

  const uploadChFront = async (): Promise<void> => {
    if (!chFrontFile || !changeDraftToken) return;
    setError("");
    setSuccess("");
    setChFrontUploading(true);
    try {
      const up = await uploadCccd(chFrontFile, "front", changeDraftToken);
      if (!up.ok || !up.objectKey) throw new Error(up.message || "Không tải ảnh lên được.");
      setChFrontKey(up.objectKey);
      setSuccess("Đã tải CCCD mặt trước (yêu cầu đổi TK).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải ảnh lên được.");
    } finally {
      setChFrontUploading(false);
    }
  };

  const uploadChBack = async (): Promise<void> => {
    if (!chBackFile || !changeDraftToken) return;
    setError("");
    setSuccess("");
    setChBackUploading(true);
    try {
      const up = await uploadCccd(chBackFile, "back", changeDraftToken);
      if (!up.ok || !up.objectKey) throw new Error(up.message || "Không tải ảnh lên được.");
      setChBackKey(up.objectKey);
      setSuccess("Đã tải CCCD mặt sau (yêu cầu đổi TK).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải ảnh lên được.");
    } finally {
      setChBackUploading(false);
    }
  };

  return (
    <section id="affiliate-payout-account" className="mt-4 min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-sm sm:p-4">
      <h4 className="text-base font-semibold text-[#0F172A]">Tài khoản nhận tiền</h4>
      {state.loading ? (
        <p className="mt-2 text-sm text-[#64748B]">Đang tải…</p>
      ) : state.account ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm text-[#0F172A]">
            <p className="text-xs font-semibold text-[#0F172A]">Thông tin đăng ký đang có hiệu lực rút tiền</p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Ngân hàng:</span> {state.account.bankName}
            </p>
            <p className="mt-1 text-sm">
              <span className="font-medium">Số tài khoản:</span> {state.account.bankAccountNumberMasked}
            </p>
            <p className="mt-1 text-sm">
              <span className="font-medium">Chủ tài khoản:</span> {state.account.bankAccountHolder}
            </p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Trạng thái xác minh:</span>{" "}
              {state.account.verificationStatus === "APPROVED"
                ? "Đã duyệt"
                : state.account.verificationStatus === "PENDING"
                  ? "Chờ duyệt"
                  : "Từ chối"}
            </p>
            {state.account.verificationStatus === "REJECTED" && state.account.rejectionReason ? (
              <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
                Lý do: {state.account.rejectionReason}
              </p>
            ) : null}
            {state.account.verificationStatus === "APPROVED" ? (
              <p className="mt-2 text-xs text-[#64748B]">
                Để đổi thông tin sau khi đã duyệt, bạn gửi yêu cầu qua admin — không sửa trực tiếp. Trong lúc chờ, rút tiền
                vẫn dùng tài khoản hiện tại.
              </p>
            ) : (
              <p className="mt-2 text-xs text-[#64748B]">
                Sau khi đã duyệt, mọi thay đổi phải qua yêu cầu xét duyệt lại — không chỉnh sửa trực tiếp trên TK đã duyệt.
              </p>
            )}
          </div>

          {(state.account.changeRequests?.length ?? 0) > 0 ? (
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-3">
              <p className="text-xs font-semibold text-[#0F172A]">Yêu cầu thay đổi TK (gần đây)</p>
              <ul className="mt-2 space-y-2 text-xs text-[#334155]">
                {state.account.changeRequests!.map((c) => (
                  <li key={c.id} className="rounded-md border border-[#EEF2F6] bg-[#F8FAFC] p-2">
                    <span className="font-semibold text-[#0F172A]">{changeStatusLabel(c.status)}</span>
                    {" · "}
                    {new Date(c.requestedAt).toLocaleString("vi-VN")}
                    {c.reviewedAt ? (
                      <>
                        {" · "}Xử lý: {new Date(c.reviewedAt).toLocaleString("vi-VN")}
                      </>
                    ) : null}
                    <div className="mt-1 text-[11px] text-[#64748B]">
                      Đề xuất: {c.requestedBankName} · {c.requestedBankAccountNumberMasked} · {c.requestedBankAccountHolder}
                    </div>
                    {c.status === "REJECTED" && c.rejectionReason ? (
                      <p className="mt-1 text-rose-800">Lý do: {c.rejectionReason}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {state.account.verificationStatus === "APPROVED" ? (
            <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#FFFDF8] p-3">
              {pendingChange ? (
                <p className="text-sm text-amber-900">
                  Bạn có yêu cầu đổi tài khoản <span className="font-semibold">đang chờ duyệt</span>. Tiếp tục rút tiền bằng
                  TK hiện tại cho đến khi được phê duyệt.
                </p>
              ) : (
                <>
                  {!showChangeForm ? (
                    <button
                      type="button"
                      onClick={() => openChangeForm()}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#0F172A] px-4 text-sm font-semibold text-white"
                    >
                      Yêu cầu thay đổi tài khoản ngân hàng
                    </button>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-[#0F172A]">Biểu mẫu yêu cầu thay đổi</p>
                      <p className="mt-1 text-xs text-[#64748B]">
                        Điền thông tin mới và tải CCCD mới. Không được trùng hoàn toàn TK hiện tại (sau khi chuẩn hoá).
                      </p>

                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <input
                          value={chBankName}
                          onChange={(e) => setChBankName(e.target.value)}
                          placeholder="Ngân hàng mới"
                          className="h-11 min-w-0 rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#2563EB]"
                        />
                        <input
                          value={chBankAccountNumber}
                          onChange={(e) => setChBankAccountNumber(e.target.value)}
                          placeholder="Số tài khoản mới"
                          inputMode="numeric"
                          className="h-11 min-w-0 rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#2563EB]"
                        />
                        <input
                          value={chBankAccountHolder}
                          onChange={(e) => setChBankAccountHolder(e.target.value)}
                          placeholder="Tên chủ TK mới"
                          className="h-11 min-w-0 rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#2563EB] md:col-span-2"
                        />
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-lg border border-[#E2E8F0] p-3">
                          <p className="text-xs font-semibold">CCCD mặt trước (mới)</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setChFrontFile(e.target.files?.[0] ?? null)}
                            className="mt-2 block w-full text-xs"
                          />
                          <button
                            type="button"
                            disabled={!chFrontFile || chFrontUploading}
                            onClick={() => void uploadChFront()}
                            className="mt-2 inline-flex h-9 items-center justify-center rounded-lg bg-[#0F172A] px-3 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            {chFrontUploading ? "Đang tải…" : chFrontKey ? "Đã tải ✓" : "Tải lên"}
                          </button>
                        </div>
                        <div className="rounded-lg border border-[#E2E8F0] p-3">
                          <p className="text-xs font-semibold">CCCD mặt sau (mới)</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setChBackFile(e.target.files?.[0] ?? null)}
                            className="mt-2 block w-full text-xs"
                          />
                          <button
                            type="button"
                            disabled={!chBackFile || chBackUploading}
                            onClick={() => void uploadChBack()}
                            className="mt-2 inline-flex h-9 items-center justify-center rounded-lg bg-[#0F172A] px-3 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            {chBackUploading ? "Đang tải…" : chBackKey ? "Đã tải ✓" : "Tải lên"}
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <button
                          type="button"
                          disabled={!canSubmitChange || chSubmitting}
                          onClick={() => void submitChange()}
                          className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {chSubmitting ? "Đang gửi…" : "Gửi yêu cầu thay đổi"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowChangeForm(false);
                            setChangeDraftToken(null);
                          }}
                          className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#334155]"
                        >
                          Huỷ
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-[#64748B]">
            Vui lòng đăng ký tài khoản ngân hàng nhận tiền và tải ảnh CCCD (trước/sau). Sau khi gửi sẽ ở trạng thái{" "}
            <span className="font-semibold">chờ duyệt</span>.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Ngân hàng"
              className="h-11 min-w-0 rounded-lg border border-[#E2E8F0] px-3 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
            />
            <input
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              placeholder="Số tài khoản"
              inputMode="numeric"
              className="h-11 min-w-0 rounded-lg border border-[#E2E8F0] px-3 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
            />
            <input
              value={bankAccountHolder}
              onChange={(e) => setBankAccountHolder(e.target.value)}
              placeholder="Tên chủ tài khoản"
              className="h-11 min-w-0 rounded-lg border border-[#E2E8F0] px-3 text-sm text-[#0F172A] outline-none focus:border-[#2563EB] md:col-span-2"
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-[#E2E8F0] p-3">
              <p className="text-xs font-semibold text-[#0F172A]">CCCD mặt trước</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFrontFile(e.target.files?.[0] ?? null)}
                className="mt-2 block w-full text-xs"
              />
              <button
                type="button"
                disabled={!frontFile || frontUploading}
                onClick={() => void uploadFront()}
                className="mt-2 inline-flex h-9 items-center justify-center rounded-lg bg-[#0F172A] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {frontUploading ? "Đang tải…" : frontKey ? "Đã tải ✓" : "Tải lên"}
              </button>
            </div>

            <div className="rounded-lg border border-[#E2E8F0] p-3">
              <p className="text-xs font-semibold text-[#0F172A]">CCCD mặt sau</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBackFile(e.target.files?.[0] ?? null)}
                className="mt-2 block w-full text-xs"
              />
              <button
                type="button"
                disabled={!backFile || backUploading}
                onClick={() => void uploadBack()}
                className="mt-2 inline-flex h-9 items-center justify-center rounded-lg bg-[#0F172A] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {backUploading ? "Đang tải…" : backKey ? "Đã tải ✓" : "Tải lên"}
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={!canSubmitInitial || submitting}
            onClick={() => void submit()}
            className="mt-3 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Đang gửi…" : "Gửi đăng ký"}
          </button>
        </>
      )}

      {error ? <p className="mt-2 text-xs font-medium text-rose-700">{error}</p> : null}
      {success ? <p className="mt-2 text-xs font-medium text-emerald-700">{success}</p> : null}
    </section>
  );
}
