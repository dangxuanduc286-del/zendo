"use client";

import { useId, useState } from "react";

type WithdrawalStatus = "PENDING" | "APPROVED" | "PAID" | "REJECTED";

function ConfirmApproveForm({
  withdrawalId,
  redirectTo,
}: {
  withdrawalId: string;
  redirectTo: string;
}) {
  return (
    <form
      action={`/api/admin/affiliates/withdrawals/${withdrawalId}/status`}
      method="POST"
      className="inline"
      onSubmit={(e) => {
        if (!confirm("Duyệt yêu cầu rút tiền này?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="withdrawalAction" value="approve" />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <button
        type="submit"
        className="inline-flex rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
      >
        Duyệt
      </button>
    </form>
  );
}

function ConfirmMarkPaidForm({
  withdrawalId,
  redirectTo,
}: {
  withdrawalId: string;
  redirectTo: string;
}) {
  return (
    <form
      action={`/api/admin/affiliates/withdrawals/${withdrawalId}/status`}
      method="POST"
      className="inline"
      onSubmit={(e) => {
        if (!confirm("Xác nhận đã thanh toán cho yêu cầu này?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="withdrawalAction" value="mark_paid" />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <button
        type="submit"
        className="inline-flex rounded-xl border border-[#2563EB] bg-sky-50 px-2.5 py-1 text-xs font-semibold text-[#1D4ED8] transition hover:bg-sky-100"
      >
        Đã thanh toán
      </button>
    </form>
  );
}

function RejectWithdrawalForm({
  withdrawalId,
  redirectTo,
  noteFieldId,
}: {
  withdrawalId: string;
  redirectTo: string;
  noteFieldId: string;
}) {
  return (
    <form
      action={`/api/admin/affiliates/withdrawals/${withdrawalId}/status`}
      method="POST"
      className="flex min-w-[200px] max-w-[280px] flex-col gap-1.5"
      onSubmit={(e) => {
        if (!confirm("Từ chối yêu cầu rút tiền này?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="withdrawalAction" value="reject" />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <label htmlFor={noteFieldId} className="text-[10px] font-medium text-[#64748B]">
        Ghi chú admin (tùy chọn)
      </label>
      <textarea
        id={noteFieldId}
        name="adminNote"
        rows={2}
        maxLength={4000}
        placeholder="Lý do từ chối…"
        className="w-full resize-y rounded-xl border border-[#E2E8F0] px-2 py-1.5 text-xs text-[#0F172A] outline-none focus:border-[#2563EB]"
      />
      <button
        type="submit"
        className="inline-flex w-fit rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 transition hover:bg-rose-100"
      >
        Từ chối
      </button>
    </form>
  );
}

export default function AffiliateWithdrawalActions({
  withdrawalId,
  redirectTo,
  status,
}: {
  withdrawalId: string;
  redirectTo: string;
  status: WithdrawalStatus;
}): JSX.Element {
  const baseId = useId();
  const [showReject, setShowReject] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {status === "PENDING" ? (
          <ConfirmApproveForm withdrawalId={withdrawalId} redirectTo={redirectTo} />
        ) : null}
        {status === "APPROVED" ? (
          <ConfirmMarkPaidForm withdrawalId={withdrawalId} redirectTo={redirectTo} />
        ) : null}
        {(status === "PENDING" || status === "APPROVED") && !showReject ? (
          <button
            type="button"
            onClick={() => setShowReject(true)}
            className="inline-flex rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 transition hover:bg-rose-100"
          >
            Từ chối…
          </button>
        ) : null}
      </div>
      {showReject && (status === "PENDING" || status === "APPROVED") ? (
        <RejectWithdrawalForm
          withdrawalId={withdrawalId}
          redirectTo={redirectTo}
          noteFieldId={`${baseId}-reject-note`}
        />
      ) : null}
    </div>
  );
}
