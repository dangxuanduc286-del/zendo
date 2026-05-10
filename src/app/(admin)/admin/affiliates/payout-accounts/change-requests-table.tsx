"use client";

import { useEffect, useMemo, useState } from "react";
import AdminKycProxyImage from "@/components/admin/admin-kyc-proxy-image";
import { adminDangerButton, adminPrimaryButton, adminSecondaryButton, adminTextarea } from "../../../../../lib/admin-ui";

type Status = "PENDING" | "APPROVED" | "REJECTED";

type Row = {
  id: string;
  status: Status;
  requestedAt: string;
  reviewedAt: string | null;
  payoutAccountId: string;
  requestedBankName: string;
  requestedBankAccountNumberMasked: string;
  requestedBankAccountHolder: string;
  customer: { id: string; fullName: string | null; email: string | null } | null;
};

type Detail = {
  id: string;
  status: Status;
  rejectionReason: string;
  requestedAt: string;
  reviewedAt: string | null;
  payoutAccountId: string;
  payoutVerificationStatus: string;
  currentBankName: string;
  currentBankAccountNumber: string;
  currentBankAccountHolder: string;
  requestedBankName: string;
  requestedBankAccountNumber: string;
  requestedBankAccountHolder: string;
  citizenIdFrontObjectKey: string;
  citizenIdBackObjectKey: string;
  reviewedByAdmin: { id: string; fullName: string; email: string } | null;
  customer: { id: string; fullName: string | null; email: string | null; phone: string | null } | null;
  siblingHistory: Array<{ id: string; status: Status; requestedAt: string; reviewedAt: string | null }>;
  auditLogs: Array<{
    id: string;
    createdAt: string;
    action: string;
    admin: { id: string; fullName: string; email: string } | null;
    metadata: Record<string, unknown>;
  }>;
};

function fmt(d: string | null): string {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleString("vi-VN");
  } catch {
    return "-";
  }
}

function auditLabel(action: string): string {
  if (action === "change_request:approve") return "Duyệt thay đổi TK";
  if (action === "change_request:reject") return "Từ chối yêu cầu";
  return action;
}

export default function AdminPayoutChangeRequestsTable({ status, query }: { status: Status; query: string }): JSX.Element {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [drawerScrollEl, setDrawerScrollEl] = useState<HTMLDivElement | null>(null);

  const title = useMemo(() => {
    if (status === "APPROVED") return "Đã duyệt (áp dụng TK)";
    if (status === "REJECTED") return "Từ chối";
    return "Đang chờ duyệt";
  }, [status]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      qs.set("status", status);
      if (query) qs.set("q", query);
      const res = await fetch(`/api/admin/affiliates/payout-account-change-requests?${qs.toString()}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const j = (await res.json()) as { ok?: boolean; data?: Row[]; message?: string };
      if (!res.ok || !j.ok || !Array.isArray(j.data)) throw new Error(j.message || "Không tải được danh sách.");
      setRows(j.data);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "Không tải được danh sách.");
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    setRejectReason("");
    try {
      const res = await fetch(`/api/admin/affiliates/payout-account-change-requests/${id}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const j = (await res.json()) as { ok?: boolean; data?: Detail; message?: string };
      if (!res.ok || !j.ok || !j.data) throw new Error(j.message || "Không tải được chi tiết.");
      setDetail(j.data);
      if (j.data.status === "REJECTED") setRejectReason("");
    } catch (e) {
      setDetail(null);
      setError(e instanceof Error ? e.message : "Không tải được chi tiết.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, query]);

  useEffect(() => {
    if (!openId) return;
    void loadDetail(openId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  const approve = async () => {
    if (!detail) return;
    if (!confirm("Áp dụng thay đổi tài khoản và CCCD cho CTV (giữ trạng thái TK đã duyệt)?")) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/admin/affiliates/payout-account-change-requests/${detail.id}/approve`, {
        method: "POST",
        credentials: "same-origin",
      });
      const j = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !j.ok) throw new Error(j.message || "Không duyệt được.");
      await load();
      await loadDetail(detail.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không duyệt được.");
    } finally {
      setActionBusy(false);
    }
  };

  const reject = async () => {
    if (!detail) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setError("Vui lòng nhập lý do từ chối.");
      return;
    }
    if (!confirm("Từ chối yêu cầu này? Tài khoản hiện tại của CTV giữ nguyên.")) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/admin/affiliates/payout-account-change-requests/${detail.id}/reject`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const j = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !j.ok) throw new Error(j.message || "Không từ chối được.");
      await load();
      await loadDetail(detail.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không từ chối được.");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="relative">
      <div className="p-4">
        <p className="text-xs text-[#64748B]">
          Hiển thị:{" "}
          <span className="font-semibold text-[#0F172A]">{title}</span>. Rút tiền luôn dùng TK đã duyệt; yêu cầu chỉ áp dụng sau khi approve.
        </p>
        {loading ? <p className="mt-2 text-sm text-[#64748B]">Đang tải danh sách…</p> : null}
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
        {!loading && !rows.length ? <p className="mt-2 text-sm text-[#64748B]">Không có yêu cầu.</p> : null}

        {!loading && rows.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[920px] w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs text-[#64748B]">
                  <th className="py-2">CTV</th>
                  <th className="py-2">Ngân hàng (đề xuất)</th>
                  <th className="py-2">STK ẩn</th>
                  <th className="py-2">Gửi lúc</th>
                  <th className="py-2">Trạng thái</th>
                  <th className="py-2 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-[#EEF2F6]">
                    <td className="py-3 text-[#0F172A]">
                      {r.customer?.fullName || r.customer?.email || "—"}
                      {r.customer?.email ? <span className="block text-xs text-[#64748B]">{r.customer.email}</span> : null}
                    </td>
                    <td className="py-3 text-[#0F172A]">{r.requestedBankName}</td>
                    <td className="py-3 font-mono text-xs">{r.requestedBankAccountNumberMasked}</td>
                    <td className="py-3 text-xs text-[#64748B]">{fmt(r.requestedAt)}</td>
                    <td className="py-3 text-xs">{r.status}</td>
                    <td className="py-3 text-right">
                      <button type="button" className={adminSecondaryButton} onClick={() => setOpenId(r.id)}>
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {openId ? (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Đóng"
            onClick={() => setOpenId(null)}
          />
          <div ref={setDrawerScrollEl} className="absolute right-0 top-0 h-full w-full max-w-[780px] overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] p-4">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Yêu cầu đổi tài khoản nhận tiền</p>
                <p className="text-xs text-[#64748B]">{title}</p>
              </div>
              <button type="button" onClick={() => setOpenId(null)} className={adminSecondaryButton}>
                Đóng
              </button>
            </div>

            <div className="p-4">
              {detailLoading ? <p className="text-sm text-[#64748B]">Đang tải…</p> : null}
              {!detailLoading && detail ? (
                <>
                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <p className="text-xs font-semibold text-[#0F172A]">CTV</p>
                    <p className="mt-1 text-sm text-[#0F172A]">
                      {detail.customer?.fullName || detail.customer?.email || "—"}
                    </p>
                    {detail.customer?.email ? <p className="text-xs text-[#64748B]">{detail.customer.email}</p> : null}
                    <p className="mt-2 text-xs text-[#64748B]">
                      Payout account ID:{" "}
                      <span className="font-mono text-[#0F172A]">{detail.payoutAccountId}</span> · Verification:{" "}
                      <span className="font-semibold">{detail.payoutVerificationStatus}</span>
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
                      <p className="text-xs font-semibold text-emerald-800">Tài khoản đang áp dụng (snapshot lúc gửi)</p>
                      <p className="mt-2 text-sm">
                        <span className="font-medium">NH:</span> {detail.currentBankName}
                      </p>
                      <p className="mt-1 font-mono text-sm">
                        <span className="font-sans font-medium">STK:</span> {detail.currentBankAccountNumber}
                      </p>
                      <p className="mt-1 text-sm">
                        <span className="font-medium">Chủ TK:</span> {detail.currentBankAccountHolder}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                      <p className="text-xs font-semibold text-amber-900">Đề xuất mới</p>
                      <p className="mt-2 text-sm">
                        <span className="font-medium">NH:</span> {detail.requestedBankName}
                      </p>
                      <p className="mt-1 font-mono text-sm">
                        <span className="font-sans font-medium">STK:</span> {detail.requestedBankAccountNumber}
                      </p>
                      <p className="mt-1 text-sm">
                        <span className="font-medium">Chủ TK:</span> {detail.requestedBankAccountHolder}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-[#64748B]">
                    Gửi: {fmt(detail.requestedAt)} · Xử lý: {fmt(detail.reviewedAt)}{" "}
                    {detail.reviewedByAdmin
                      ? `· ${detail.reviewedByAdmin.fullName} (${detail.reviewedByAdmin.email})`
                      : ""}
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
                      <p className="text-xs font-semibold text-[#0F172A]">CCCD mặt trước (bản đề xuất)</p>
                      <AdminKycProxyImage
                        key={`${detail.id}-cccd-front`}
                        objectKey={detail.citizenIdFrontObjectKey}
                        alt="CCCD mặt trước"
                        className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                        enabled={Boolean(openId && detail)}
                        observerRoot={drawerScrollEl}
                      />
                    </div>
                    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
                      <p className="text-xs font-semibold text-[#0F172A]">CCCD mặt sau (bản đề xuất)</p>
                      <AdminKycProxyImage
                        key={`${detail.id}-cccd-back`}
                        objectKey={detail.citizenIdBackObjectKey}
                        alt="CCCD mặt sau"
                        className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                        enabled={Boolean(openId && detail)}
                        observerRoot={drawerScrollEl}
                      />
                    </div>
                  </div>

                  {detail.status === "REJECTED" && detail.rejectionReason ? (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                      <p className="text-xs font-semibold">Lý do từ chối</p>
                      <p className="mt-1 whitespace-pre-wrap">{detail.rejectionReason}</p>
                    </div>
                  ) : null}

                  {detail.status === "PENDING" ? (
                    <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-white p-4">
                      <p className="text-xs font-semibold text-[#0F172A]">Hành động</p>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                        <button
                          type="button"
                          disabled={actionBusy}
                          className={adminPrimaryButton}
                          onClick={() => void approve()}
                        >
                          Approve &amp; áp dụng
                        </button>
                        <div className="flex-1">
                          <label className="text-xs font-medium text-[#64748B]">Reject reason</label>
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            rows={2}
                            maxLength={2000}
                            className={adminTextarea}
                            placeholder="Ví dụ: STK không khớp chủ TK / ảnh mờ…"
                          />
                        </div>
                        <button type="button" disabled={actionBusy} className={adminDangerButton} onClick={() => void reject()}>
                          Reject
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {(detail.siblingHistory?.length ?? 0) > 0 ? (
                    <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-white p-4">
                      <p className="text-xs font-semibold text-[#0F172A]">Lịch sử yêu cầu khác (cùng TK)</p>
                      <div className="mt-2 space-y-2">
                        {detail.siblingHistory.map((s) => (
                          <div key={s.id} className="rounded-lg border border-[#EEF2F6] bg-[#F8FAFC] p-2 text-xs">
                            <span className="font-semibold">{s.status}</span> · gửi {fmt(s.requestedAt)}
                            {s.reviewedAt ? <> · xử lý {fmt(s.reviewedAt)}</> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {(detail.auditLogs?.length ?? 0) > 0 ? (
                    <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-white p-4">
                      <p className="text-xs font-semibold text-[#0F172A]">Audit (yêu cầu này)</p>
                      <div className="mt-2 space-y-2">
                        {detail.auditLogs.map((a) => (
                          <div key={a.id} className="rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] p-3 text-xs">
                            <p className="font-semibold text-[#0F172A]">
                              {auditLabel(a.action)} <span className="font-normal text-[#64748B]">· {fmt(a.createdAt)}</span>
                            </p>
                            <p className="mt-1 text-[#334155]">
                              Admin:{" "}
                              {a.admin ? `${a.admin.fullName} (${a.admin.email})` : "—"}
                            </p>
                            {typeof a.metadata.reason === "string" && a.metadata.reason ? (
                              <p className="mt-1 whitespace-pre-wrap text-rose-800">Lý do: {a.metadata.reason}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
