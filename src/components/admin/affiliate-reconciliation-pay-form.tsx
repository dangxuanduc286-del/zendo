"use client";

type Props = {
  affiliateProfileId: string;
  approvedOutstandingVnd: number;
  payoutThresholdVnd: number;
  redirectTo: string;
  disabled?: boolean;
};

export default function AffiliateReconciliationPayForm({
  affiliateProfileId,
  approvedOutstandingVnd,
  payoutThresholdVnd,
  redirectTo,
  disabled,
}: Props): JSX.Element {
  const submit = (form: HTMLFormElement) => {
    if (disabled || approvedOutstandingVnd <= 0) return;
    if (!confirm("Đánh dấu đã thanh toán toàn bộ hoa hồng đã duyệt (APPROVED) của CTV này?")) {
      return;
    }
    if (
      approvedOutstandingVnd < payoutThresholdVnd &&
      !confirm(
        "Số tiền chưa đạt ngưỡng thanh toán. Bạn vẫn muốn đánh dấu đã thanh toán?",
      )
    ) {
      return;
    }
    const below = approvedOutstandingVnd < payoutThresholdVnd;
    const hidden = form.querySelector<HTMLInputElement>('input[name="confirmBelowThreshold"]');
    if (hidden) hidden.value = below ? "1" : "0";
    form.submit();
  };

  return (
    <form
      action="/api/admin/affiliates/reconciliation/pay"
      method="POST"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
    >
      <input type="hidden" name="affiliateProfileId" value={affiliateProfileId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <input type="hidden" name="confirmBelowThreshold" value="0" />
      <button
        type="submit"
        disabled={disabled || approvedOutstandingVnd <= 0}
        className="inline-flex rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Đánh dấu đã thanh toán
      </button>
    </form>
  );
}
