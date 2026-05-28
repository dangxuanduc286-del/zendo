"use client";

import type { AffiliateCommissionStatus } from "@prisma/client";
import {
  canAdminApproveCommissionStatus,
  canAdminCancelCommissionStatus,
  canAdminMarkCommissionPaidStatus,
} from "@/lib/affiliate/commission-hold";

type ActionKind = "approve" | "cancel" | "mark_paid";

function ConfirmForm({
  commissionId,
  redirectTo,
  action,
  label,
  message,
  className,
}: {
  commissionId: string;
  redirectTo: string;
  action: ActionKind;
  label: string;
  message: string;
  className: string;
}) {
  return (
    <form
      action={`/api/admin/affiliates/commissions/${commissionId}/status`}
      method="POST"
      className="inline"
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      <input id={`affiliate-commission-${commissionId}-${action}-action`} type="hidden" name="commissionAction" value={action} />
      <input id={`affiliate-commission-${commissionId}-${action}-redirect-to`} type="hidden" name="redirectTo" value={redirectTo} />
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}

export default function AffiliateCommissionActions({
  commissionId,
  redirectTo,
  status,
  orderBlocksApproveAndPay,
}: {
  commissionId: string;
  redirectTo: string;
  status: AffiliateCommissionStatus;
  orderBlocksApproveAndPay: boolean;
}): JSX.Element {
  const baseBtn =
    "inline-flex rounded-xl border px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex flex-wrap gap-1.5">
      {canAdminApproveCommissionStatus(status) && !orderBlocksApproveAndPay ? (
        <ConfirmForm
          commissionId={commissionId}
          redirectTo={redirectTo}
          action="approve"
          label="Duyệt (giữ 7 ngày)"
          message="Duyệt hoa hồng? Hệ thống sẽ giữ 7 ngày trước khi mở khóa khả dụng."
          className={`${baseBtn} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}
        />
      ) : null}
      {canAdminMarkCommissionPaidStatus(status) && !orderBlocksApproveAndPay ? (
        <ConfirmForm
          commissionId={commissionId}
          redirectTo={redirectTo}
          action="mark_paid"
          label="Đã thanh toán"
          message="Xác nhận hoa hồng này đã được thanh toán?"
          className={`${baseBtn} border-[#2563EB] bg-sky-50 text-[#1D4ED8] hover:bg-sky-100`}
        />
      ) : null}
      {canAdminCancelCommissionStatus(status) ? (
        <ConfirmForm
          commissionId={commissionId}
          redirectTo={redirectTo}
          action="cancel"
          label="Hủy"
          message="Bạn chắc chắn muốn hủy hoa hồng này?"
          className={`${baseBtn} border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100`}
        />
      ) : null}
    </div>
  );
}
