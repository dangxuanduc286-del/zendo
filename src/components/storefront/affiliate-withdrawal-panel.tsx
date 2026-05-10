"use client";

import { useMemo, useState } from "react";

type WithdrawalRow = {
  id: string;
  createdAt: string;
  amount: number;
  status: string;
  statusDisplayVi?: string;
  approvedAt?: string | null;
  paidAt?: string | null;
};

export default function AffiliateWithdrawalPanel({
  withdrawnEnabled,
  payoutAccount,
  availableAmount,
  withdrawals,
  minWithdrawalAmount,
  payoutThreshold,
  busy,
  onSubmitRequest,
}: {
  /** Bật từ website + hồ sơ CTV (không mock trên UI nếu API tắt). */
  withdrawnEnabled: boolean;
  payoutAccount:
    | {
        bankName: string;
        bankAccountNumberMasked: string;
        bankAccountHolder: string;
        verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
        rejectionReason?: string;
      }
    | null;
  availableAmount: number;
  withdrawals: WithdrawalRow[];
  minWithdrawalAmount: number;
  /** Ngưỡng tối thiểu hiển thị (đồng bộ server). */
  payoutThreshold: number;
  busy?: boolean;
  onSubmitRequest: (payload: { amount: number; note: string }) => Promise<{ ok: boolean; message?: string }>;
}): JSX.Element {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parsedAmount = useMemo(() => Math.floor(Number(amount || 0)), [amount]);
  const effectiveMin = Math.max(minWithdrawalAmount, payoutThreshold);
  const canSubmitAmount =
    parsedAmount >= effectiveMin && parsedAmount > 0 && parsedAmount <= availableAmount;

  const submit = async () => {
    setError("");
    setSuccess("");
    if (!withdrawnEnabled) return;
    if (parsedAmount <= 0) {
      setError("Số tiền rút phải lớn hơn 0.");
      return;
    }
    if (parsedAmount < effectiveMin) {
      setError(`Số tiền rút tối thiểu là ${new Intl.NumberFormat("vi-VN").format(effectiveMin)}đ.`);
      return;
    }
    if (parsedAmount > availableAmount) {
      setError("Số tiền vượt quá số dư có thể rút.");
      return;
    }
    if (!payoutAccount || payoutAccount.verificationStatus !== "APPROVED") return;
    setSubmitting(true);
    try {
      const res = await onSubmitRequest({
        amount: parsedAmount,
        note: note.trim(),
      });
      if (res.ok) {
        setSuccess(res.message ?? "Đã nhận yêu cầu rút tiền.");
        setAmount("");
        setNote("");
      } else {
        setError(res.message ?? "Không gửi được yêu cầu.");
      }
    } catch {
      setError("Không gửi được yêu cầu. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const fmtMoney = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n)}đ`;
  const payoutReady = payoutAccount?.verificationStatus === "APPROVED";

  return (
    <section className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-sm sm:p-4 min-w-0">
      <h4 className="text-base font-semibold text-[#0F172A]">Yêu cầu rút tiền</h4>
      {withdrawnEnabled ? (
        <>
          {!payoutAccount ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Bạn chưa đăng ký <span className="font-semibold">Tài khoản nhận tiền</span>. Vui lòng đăng ký trước khi rút
              tiền.
            </p>
          ) : payoutAccount.verificationStatus === "PENDING" ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Tài khoản nhận tiền đang <span className="font-semibold">chờ xác minh</span>. Bạn chưa thể rút tiền.
            </p>
          ) : payoutAccount.verificationStatus === "REJECTED" ? (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              Tài khoản nhận tiền đã bị <span className="font-semibold">từ chối</span>
              {payoutAccount.rejectionReason ? `: ${payoutAccount.rejectionReason}` : "."}
            </p>
          ) : null}

          <p className="mt-2 text-xs text-[#64748B]">
            Số dư có thể rút:{" "}
            <span className="font-semibold text-[#0F172A] tabular-nums">{fmtMoney(availableAmount)}</span>
          </p>
          <p className="mt-1 text-xs text-[#64748B]">
            Ngưỡng rút tối thiểu:{" "}
            <span className="font-semibold text-[#0F172A]">{fmtMoney(effectiveMin)}</span>
          </p>
          {!busy && availableAmount < effectiveMin ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Số dư chưa đủ để rút ({fmtMoney(availableAmount)} / tối thiểu {fmtMoney(effectiveMin)}).
            </p>
          ) : null}

          {payoutAccount ? (
            <div className="mt-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs text-[#0F172A]">
              <p className="font-semibold">Tài khoản nhận tiền</p>
              <p className="mt-1 text-[#334155]">
                {payoutAccount.bankName} · {payoutAccount.bankAccountNumberMasked} · {payoutAccount.bankAccountHolder}
              </p>
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Số tiền (VNĐ)"
              inputMode="numeric"
              className="h-11 min-w-0 rounded-lg border border-[#E2E8F0] px-3 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
            />
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ghi chú (tuỳ chọn)"
              className="h-11 min-w-0 rounded-lg border border-[#E2E8F0] px-3 text-sm text-[#0F172A] outline-none focus:border-[#2563EB] md:col-span-2"
            />
          </div>
          <button
            type="button"
            disabled={submitting || busy || !canSubmitAmount || !payoutReady}
            onClick={() => void submit()}
            className="mt-3 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Đang gửi…" : "Gửi yêu cầu rút tiền"}
          </button>
          {error ? <p className="mt-2 text-xs font-medium text-rose-700">{error}</p> : null}
          {success ? <p className="mt-2 text-xs font-medium text-emerald-700">{success}</p> : null}
          {withdrawals.length ? (
            <div className="mt-4 min-w-0 space-y-2">
              <p className="text-xs font-semibold text-[#0F172A]">Lịch sử yêu cầu</p>
              {withdrawals.map((row) => (
                <div key={row.id} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs">
                  <p className="font-medium text-[#0F172A]">
                    {fmtMoney(row.amount)} · {row.statusDisplayVi ?? row.status}
                  </p>
                  <p className="mt-0.5 text-[#64748B]">
                    Gửi: {new Date(row.createdAt).toLocaleString("vi-VN")}
                    {row.approvedAt ? ` · Duyệt: ${new Date(row.approvedAt).toLocaleString("vi-VN")}` : ""}
                    {row.paidAt ? ` · Chi: ${new Date(row.paidAt).toLocaleString("vi-VN")}` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#64748B]">Chưa có yêu cầu rút tiền nào.</p>
          )}
        </>
      ) : (
        <div className="mt-2 space-y-1 text-sm text-[#64748B]">
          <p>Chức năng yêu cầu rút tiền sẽ do quản trị viên bật trong cài đặt chương trình CTV.</p>
          <p>
            Khi được bật, bạn cần đủ số dư tối thiểu (thường từ {fmtMoney(payoutThreshold)} trở lên — xem cụ thể trong
            thông báo nội bộ hoặc cài đặt website).
          </p>
        </div>
      )}
    </section>
  );
}
