import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../lib/auth";
import {
  SITE_POLICY_TYPE_LABELS,
  type SitePolicyTypeValue,
} from "../../../../lib/admin-site-policy";
import { adminPrimaryButton, adminSecondaryButton } from "../../../../lib/admin-ui";
import SitePolicyDeleteButton from "../../../../components/admin/site-policy-delete-button";

export const metadata: Metadata = {
  title: "Chính sách hệ thống | Quản trị Zendo.vn",
  robots: { index: false, follow: false },
};

function isStaff(role?: string | null): boolean {
  return ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role ?? "");
}

export default async function AdminSitePoliciesPage({
  searchParams,
}: {
  searchParams?: Promise<{ deleted?: string }>;
}): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isStaff(session.user.role)) {
    redirect("/admin/login?callbackUrl=/admin/site-policies");
  }
  const qs = (await searchParams) ?? {};
  const showDeleted = qs.deleted === "1";

  const { db } = await import("../../../../lib/db");
  const rows = await db.sitePolicy.findMany({
    where: showDeleted ? {} : { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    take: 250,
    select: {
      id: true,
      title: true,
      slug: true,
      type: true,
      isPublished: true,
      sortOrder: true,
      deletedAt: true,
      updatedAt: true,
    },
  });

  const preview = (slug: string) => `/chinh-sach/${encodeURIComponent(slug)}`;

  return (
    <main className="w-full max-w-6xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Chính sách hệ thống</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Quản lý chính sách hiển thị trong Tài khoản và tại các URL{' '}
            <code className="rounded bg-slate-100 px-1">/chinh-sach/[slug]</code>. Chính sách loại “CTV /
            Affiliate” chỉ tài khoản CTV hoạt động và phiên có quyền quản trị mới xem được trên web.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Thuộc nhóm{' '}
            <Link href="/admin/website-appearance" className="font-medium text-sky-700 hover:underline">
              Cài đặt website &amp; giao diện
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/site-policies${showDeleted ? "" : "?deleted=1"}`}
            className={adminSecondaryButton}
          >
            {showDeleted ? "Ẩn bản đã xóa" : "Hiện cả đã xóa mềm"}
          </Link>
          <Link href="/admin/site-policies/new" className={adminPrimaryButton}>
            Thêm chính sách
          </Link>
        </div>
      </header>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[720px] w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Tiêu đề</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Thứ tự</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                  Chưa có bản ghi. Nhấn “Thêm chính sách” để tạo tra cứu bảo hành, đổi trả, CTV…
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const archived = Boolean(r.deletedAt);
                return (
                  <tr key={r.id} className={archived ? "bg-slate-50/70 text-slate-500" : ""}>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.title}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.slug}</td>
                    <td className="px-4 py-3">
                      {SITE_POLICY_TYPE_LABELS[r.type as SitePolicyTypeValue] ?? r.type}
                    </td>
                    <td className="px-4 py-3">
                      {archived ? (
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium">Đã xóa mềm</span>
                      ) : r.isPublished ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          Xuất bản
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                          Ẩn
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{r.sortOrder}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {!archived ? (
                          <>
                            <Link href={preview(r.slug)} className={`${adminSecondaryButton} px-3 py-1.5 text-xs`} target="_blank">
                              Xem
                            </Link>
                            <Link href={`/admin/site-policies/${r.id}`} className={`${adminSecondaryButton} px-3 py-1.5 text-xs`}>
                              Sửa
                            </Link>
                            <SitePolicyDeleteButton id={r.id} title={r.title} />
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
