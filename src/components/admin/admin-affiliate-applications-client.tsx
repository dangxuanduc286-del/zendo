"use client";

import { useCallback, useMemo, useState } from "react";
import { ADMIN_AFFILIATE_APPLICATIONS_HREF } from "@/lib/admin-menu";
import { adminLabel, adminPrimaryButton, adminSelect, adminTableShell } from "@/lib/admin-ui";

export type AffiliateApplicationClientRow = {
  id: string;
  customerId: string;
  fullName: string;
  phone: string;
  trafficSource: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  email: string | null;
  socialLink: string | null;
  experience: string | null;
  note: string | null;
  followerCount: number | null;
  sellingCategories: string | null;
  score: number | null;
  scoreReason: string | null;
  quickReviewNote: string | null;
  adminNote: string | null;
  reviewedAt: string | null;
  reviewedByAdmin: { id: string; fullName: string; email: string } | null;
  customer: { id: string; fullName: string | null; email: string | null; phone: string | null };
};

function statusLabel(status: AffiliateApplicationClientRow["status"]): string {
  if (status === "PENDING") return "Chờ duyệt";
  if (status === "APPROVED") return "Đã duyệt";
  return "Từ chối";
}

function statusBadgeClass(status: AffiliateApplicationClientRow["status"]): string {
  if (status === "PENDING") return "bg-amber-100 text-amber-800";
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-800";
  return "bg-rose-100 text-rose-800";
}

function vnDateTime(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function customerLabel(c: AffiliateApplicationClientRow["customer"]): string {
  const name = (c.fullName ?? "").trim();
  const em = (c.email ?? "").trim();
  if (name && em) return `${name} · ${em}`;
  if (name) return name;
  if (em) return em;
  return c.id.slice(0, 8);
}

function applicationContactEmail(row: AffiliateApplicationClientRow): string {
  const fromApp = (row.email ?? "").trim();
  if (fromApp) return fromApp;
  return (row.customer.email ?? "").trim() || "—";
}

type Props = {
  rows: AffiliateApplicationClientRow[];
  statusFilter: "ALL" | "PENDING" | "APPROVED" | "REJECTED";
  appErrorMessage: string;
  redirectPath: string;
};

export function AdminAffiliateApplicationsClient(props: Props): JSX.Element {
  const { rows, statusFilter, appErrorMessage, redirectPath } = props;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const close = useCallback(() => setSelectedId(null), []);

  return (
    <div className="space-y-5">
      {appErrorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{appErrorMessage}</div>
      ) : null}

      <form className="flex flex-wrap items-end gap-3" action={ADMIN_AFFILIATE_APPLICATIONS_HREF} method="GET">
        <label className="space-y-1.5">
          <span className={adminLabel}>Trạng thái</span>
          <select
            id="admin-affiliate-applications-status"
            name="status"
            defaultValue={statusFilter}
            className={`${adminSelect} h-11 min-h-[2.75rem] min-w-[200px] rounded-2xl`}
          >
            <option value="ALL">Tất cả</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Từ chối</option>
          </select>
        </label>
        <button type="submit" className={`${adminPrimaryButton} h-11 rounded-2xl px-6`}>
          Lọc
        </button>
      </form>

      <div className={adminTableShell}>
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-900">
            <tr>
              <th className="px-4 py-3 font-semibold">Tên</th>
              <th className="px-4 py-3 font-semibold">SĐT</th>
              <th className="px-4 py-3 font-semibold">Email liên hệ</th>
              <th className="px-4 py-3 font-semibold">Khách hàng</th>
              <th className="px-4 py-3 font-semibold">Nguồn traffic</th>
              <th className="px-4 py-3 font-semibold">Trạng thái</th>
              <th className="px-4 py-3 font-semibold">Ngày gửi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-slate-200 last:border-none hover:bg-slate-50"
                onClick={() => setSelectedId(row.id)}
              >
                <td className="px-4 py-3 font-medium text-slate-900">{row.fullName}</td>
                <td className="px-4 py-3 text-slate-900">{row.phone}</td>
                <td className="max-w-[200px] px-4 py-3 break-all text-slate-900">{applicationContactEmail(row)}</td>
                <td className="max-w-[240px] px-4 py-3 break-words text-slate-500">{customerLabel(row.customer)}</td>
                <td className="max-w-[180px] px-4 py-3 break-words text-slate-500">{row.trafficSource?.trim() || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(row.status)}`}>
                    {statusLabel(row.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{vnDateTime(row.createdAt)}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  Không có đơn đăng ký trong bộ lọc hiện tại.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 p-0 sm:p-4" role="presentation" onClick={close}>
          <aside
            className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-xl sm:rounded-2xl"
            role="dialog"
            aria-modal
            aria-labelledby="ctv-app-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
              <div className="min-w-0">
                <h2 id="ctv-app-detail-title" className="text-lg font-semibold text-slate-900">
                  Chi tiết đăng ký CTV
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">Mã đơn: {selected.id}</p>
              </div>
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>

            <div className="space-y-3 px-4 py-4 text-sm text-slate-900">
              <dl className="space-y-2 text-xs text-slate-500">
                <div>
                  <dt className="font-medium">Họ và tên</dt>
                  <dd className="mt-0.5 text-sm text-slate-900">{selected.fullName}</dd>
                </div>
                <div>
                  <dt className="font-medium">Số điện thoại</dt>
                  <dd className="mt-0.5 text-sm text-slate-900">{selected.phone}</dd>
                </div>
                <div>
                  <dt className="font-medium">Email liên hệ</dt>
                  <dd className="mt-0.5 break-all text-sm text-slate-900">{applicationContactEmail(selected)}</dd>
                </div>
                <div>
                  <dt className="font-medium">Khách hàng</dt>
                  <dd className="mt-0.5 break-words text-sm text-slate-900">{customerLabel(selected.customer)}</dd>
                </div>
                <div>
                  <dt className="font-medium">Link mạng xã hội</dt>
                  <dd className="mt-0.5 break-all text-sm text-slate-900">
                    {selected.socialLink?.trim() ? (
                      <a href={selected.socialLink} target="_blank" rel="noopener noreferrer" className="text-sky-600 underline">
                        {selected.socialLink}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Kinh nghiệm bán hàng</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-900">{selected.experience?.trim() || "—"}</dd>
                </div>
                <div>
                  <dt className="font-medium">Nguồn traffic chính</dt>
                  <dd className="mt-0.5 text-sm text-slate-900">{selected.trafficSource?.trim() || "—"}</dd>
                </div>
                <div>
                  <dt className="font-medium">Ngành hàng (nếu có)</dt>
                  <dd className="mt-0.5 text-sm text-slate-900">{selected.sellingCategories?.trim() || "—"}</dd>
                </div>
                <div>
                  <dt className="font-medium">Ghi chú thêm</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-900">{selected.note?.trim() || "—"}</dd>
                </div>
                <div>
                  <dt className="font-medium">Trạng thái</dt>
                  <dd className="mt-0.5">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(selected.status)}`}>
                      {statusLabel(selected.status)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Ngày gửi</dt>
                  <dd className="mt-0.5 text-sm text-slate-900">{vnDateTime(selected.createdAt)}</dd>
                </div>
                {selected.reviewedAt ? (
                  <div>
                    <dt className="font-medium">Duyệt lúc</dt>
                    <dd className="mt-0.5 text-sm text-slate-900">{vnDateTime(selected.reviewedAt)}</dd>
                  </div>
                ) : null}
                {selected.reviewedByAdmin ? (
                  <div>
                    <dt className="font-medium">Người xử lý</dt>
                    <dd className="mt-0.5 text-sm text-slate-900">
                      {selected.reviewedByAdmin.fullName} ({selected.reviewedByAdmin.email})
                    </dd>
                  </div>
                ) : null}
                {selected.adminNote?.trim() ? (
                  <div>
                    <dt className="font-medium">Ghi chú admin (gửi khách khi từ chối / kèm duyệt)</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-900">{selected.adminNote}</dd>
                  </div>
                ) : null}
                {selected.score != null ? (
                  <div>
                    <dt className="font-medium">Điểm hồ sơ tạm</dt>
                    <dd className="mt-0.5 text-sm text-slate-900">
                      {selected.score}/100
                      {selected.scoreReason ? ` — ${selected.scoreReason}` : ""}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {selected.status === "PENDING" ? (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <form
                    action={`/api/admin/collaborators/applications/${selected.id}/approve`}
                    method="POST"
                    className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3"
                  >
                    <p className="text-xs font-semibold text-emerald-900">Duyệt CTV</p>
                    <textarea
                      id={`admin-affiliate-application-${selected.id}-approve-note`}
                      name="adminNote"
                      rows={2}
                      placeholder="Ghi chú gửi kèm (tùy chọn)"
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-sky-500"
                    />
                    <textarea
                      id={`admin-affiliate-application-${selected.id}-approve-internal-note`}
                      name="internalQuickNote"
                      rows={2}
                      placeholder="Ghi chú nội bộ — khách không thấy (tùy chọn)"
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-sky-500"
                    />
                    <input type="hidden" name="redirectTo" value={redirectPath} />
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Duyệt CTV
                    </button>
                  </form>
                  <form
                    action={`/api/admin/collaborators/applications/${selected.id}/reject`}
                    method="POST"
                    className="space-y-2 rounded-xl border border-rose-100 bg-rose-50/50 p-3"
                  >
                    <p className="text-xs font-semibold text-rose-900">Từ chối</p>
                    <textarea
                      id={`admin-affiliate-application-${selected.id}-reject-note`}
                      name="adminNote"
                      rows={3}
                      placeholder="Lý do từ chối (khách sẽ thấy trong thông báo)"
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-sky-500"
                    />
                    <textarea
                      id={`admin-affiliate-application-${selected.id}-reject-internal-note`}
                      name="internalQuickNote"
                      rows={2}
                      placeholder="Ghi chú nội bộ — khách không thấy (tùy chọn)"
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-sky-500"
                    />
                    <input type="hidden" name="redirectTo" value={redirectPath} />
                    <button
                      type="submit"
                      className="w-full rounded-lg border border-rose-300 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-100"
                    >
                      Từ chối
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
