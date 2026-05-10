"use client";

import { useEffect, useMemo, useState } from "react";
import AdminKycProxyImage from "@/components/admin/admin-kyc-proxy-image";
import { adminDangerButton, adminPrimaryButton, adminSecondaryButton, adminTextarea } from "../../../../../lib/admin-ui";

type Status = "PENDING" | "APPROVED" | "REJECTED";

type Row = {
  id: string;
  verificationStatus: Status;
  createdAt: string;
  verifiedAt: string | null;
  bankName: string;
  bankAccountNumberMasked: string;
  bankAccountHolder: string;
  customer: { id: string; fullName: string | null; email: string | null } | null;
};

type Detail = {
  id: string;
  verificationStatus: Status;
  createdAt: string;
  verifiedAt: string | null;
  rejectionReason: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  citizenIdFrontObjectKey: string;
  citizenIdBackObjectKey: string;
  verifiedByAdmin: { id: string; fullName: string; email: string } | null;
  customer: { id: string; fullName: string | null; email: string | null; phone: string | null } | null;
  auditLogs: Array<{
    id: string;
    createdAt: string;
    action: "approve" | "reject" | "change_apply";
    admin: { id: string; fullName: string; email: string } | null;
    statusBefore: Status | null;
    statusAfter: Status | null;
    reason: string;
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

export default function AdminPayoutAccountsTable({ status, query }: { status: Status; query: string }): JSX.Element {
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
    if (status === "APPROVED") return "Đã duyệt";
    if (status === "REJECTED") return "Từ chối";
    return "Chờ xác minh";
  }, [status]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      qs.set("status", status);
      if (query) qs.set("q", query);
      const res = await fetch(`/api/admin/affiliates/payout-accounts?${qs.toString()}`, {
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
      const res = await fetch(`/api/admin/affiliates/payout-accounts/${id}`, { credentials: "same-origin", cache: "no-store" });
      const j = (await res.json()) as { ok?: boolean; data?: Detail; message?: string };
      if (!res.ok || !j.ok || !j.data) throw new Error(j.message || "Không tải được chi tiết.");
      setDetail(j.data);
      if (j.data.verificationStatus === "REJECTED") setRejectReason(j.data.rejectionReason || "");
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
    if (!confirm("Duyệt tài khoản nhận tiền này?")) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/admin/affiliates/payout-accounts/${detail.id}/approve`, {
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
    if (!confirm("Từ chối tài khoản nhận tiền này?")) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/admin/affiliates/payout-accounts/${detail.id}/reject`, {
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
        {loading ? <p className="text-sm text-[#64748B]">Đang tải danh sách…</p> : null}
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
        {!loading && !rows.length ? <p className="text-sm text-[#64748B]">Không có dữ liệu.</p> : null}

        {!loading && rows.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs text-[#64748B]">
                  <th className="py-2">CTV</th>
                  <th className="py-2">Chủ TK</th>
                  <th className="py-2">Ngân hàng</th>
                  <th className="py-2">STK</th>
                  <th className="py-2">Trạng thái</th>
                  <th className="py-2">Ngày gửi</th>
                  <th className="py-2">Ngày xử lý</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-[#E2E8F0]">
                    <td className="py-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#0F172A] truncate">
                          {r.customer?.fullName || r.customer?.email || r.customer?.id || "—"}
                        </p>
                        {r.customer?.email ? <p className="text-xs text-[#64748B] truncate">{r.customer.email}</p> : null}
                      </div>
                    </td>
                    <td className="py-3 text-[#0F172A]">{r.bankAccountHolder}</td>
                    <td className="py-3 text-[#0F172A]">{r.bankName}</td>
                    <td className="py-3 font-mono text-[#0F172A]">{r.bankAccountNumberMasked}</td>
                    <td className="py-3">
                      <span
                        className={
                          r.verificationStatus === "APPROVED"
                            ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                            : r.verificationStatus === "REJECTED"
                              ? "rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                              : "rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"
                        }
                      >
                        {r.verificationStatus === "APPROVED" ? "APPROVED" : r.verificationStatus === "REJECTED" ? "REJECTED" : "PENDING"}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-[#64748B]">{fmt(r.createdAt)}</td>
                    <td className="py-3 text-xs text-[#64748B]">{fmt(r.verifiedAt)}</td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setOpenId(r.id)}
                        className={adminSecondaryButton}
                      >
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
          <div
            ref={setDrawerScrollEl}
            className="absolute right-0 top-0 h-full w-full max-w-[720px] overflow-y-auto bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] p-4">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Chi tiết xác minh</p>
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
                    <p className="text-xs font-semibold text-[#0F172A]">Tài khoản hệ thống</p>
                    <p className="mt-1 text-sm text-[#0F172A]">
                      {detail.customer?.fullName || detail.customer?.email || detail.customer?.id || "—"}
                    </p>
                    {detail.customer?.email ? <p className="text-xs text-[#64748B]">{detail.customer.email}</p> : null}
                    {detail.customer?.phone ? <p className="text-xs text-[#64748B]">{detail.customer.phone}</p> : null}
                  </div>

                  <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-white p-4">
                    <p className="text-xs font-semibold text-[#0F172A]">Thông tin ngân hàng</p>
                    <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-[#0F172A] sm:grid-cols-2">
                      <p><span className="font-medium">Ngân hàng:</span> {detail.bankName}</p>
                      <p className="font-mono"><span className="font-sans font-medium">STK:</span> {detail.bankAccountNumber}</p>
                      <p className="sm:col-span-2"><span className="font-medium">Chủ tài khoản:</span> {detail.bankAccountHolder}</p>
                    </div>
                    <div className="mt-3 text-xs text-[#64748B]">
                      <p><span className="font-medium">Ngày gửi:</span> {fmt(detail.createdAt)}</p>
                      <p><span className="font-medium">Ngày xử lý:</span> {fmt(detail.verifiedAt)}</p>
                      <p>
                        <span className="font-medium">Admin xử lý:</span>{" "}
                        {detail.verifiedByAdmin ? `${detail.verifiedByAdmin.fullName} (${detail.verifiedByAdmin.email})` : "-"}
                      </p>
                    </div>
                    {detail.verificationStatus === "REJECTED" && detail.rejectionReason ? (
                      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                        <p className="text-xs font-semibold">Lý do từ chối</p>
                        <p className="mt-1 whitespace-pre-wrap">{detail.rejectionReason}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
                      <p className="text-xs font-semibold text-[#0F172A]">CCCD mặt trước</p>
                      <AdminKycProxyImage
                        key={`${detail.id}-cccd-front`}
                        objectKey={detail.citizenIdFrontObjectKey}
                        alt="CCCD mặt trước"
                        className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                        enabled
                        observerRoot={drawerScrollEl}
                      />
                    </div>
                    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
                      <p className="text-xs font-semibold text-[#0F172A]">CCCD mặt sau</p>
                      <AdminKycProxyImage
                        key={`${detail.id}-cccd-back`}
                        objectKey={detail.citizenIdBackObjectKey}
                        alt="CCCD mặt sau"
                        className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                        enabled
                        observerRoot={drawerScrollEl}
                      />
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-white p-4">
                    <p className="text-xs font-semibold text-[#0F172A]">Hành động</p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                      <button
                        type="button"
                        onClick={() => void approve()}
                        disabled={actionBusy || detail.verificationStatus === "APPROVED"}
                        className={adminPrimaryButton}
                      >
                        Approve
                      </button>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-[#64748B]">Reject reason (bắt buộc khi Reject)</label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={2}
                          maxLength={2000}
                          className={adminTextarea}
                          placeholder="Ví dụ: Ảnh mờ / Tên CCCD không khớp / STK sai…"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => void reject()}
                        disabled={actionBusy}
                        className={adminDangerButton}
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-white p-4">
                    <p className="text-xs font-semibold text-[#0F172A]">Lịch sử xử lý</p>
                    {(detail.auditLogs?.length ?? 0) ? (
                      <div className="mt-2 space-y-2">
                        {detail.auditLogs.map((a) => (
                          <div key={a.id} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs">
                            <p className="font-semibold text-[#0F172A]">
                              {a.action === "approve" ? "Approve" : a.action === "change_apply" ? "Áp dụng đổi TK" : "Reject"}{" "}
                              <span className="font-normal text-[#64748B]">· {fmt(a.createdAt)}</span>
                            </p>
                            <p className="mt-1 text-[#334155]">
                              Admin:{" "}
                              {a.admin ? `${a.admin.fullName} (${a.admin.email})` : "—"}{" "}
                              {a.action !== "change_apply" && a.statusBefore && a.statusAfter
                                ? `· ${a.statusBefore} → ${a.statusAfter}`
                                : ""}
                            </p>
                            {a.reason ? (
                              <p
                                className={
                                  a.action === "reject"
                                    ? "mt-1 whitespace-pre-wrap text-rose-800"
                                    : "mt-1 whitespace-pre-wrap text-[#334155]"
                                }
                              >
                                {a.action === "reject" ? "Lý do: " : ""}
                                {a.reason}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-[#64748B]">Chưa có lịch sử xử lý.</p>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

