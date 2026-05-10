import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../lib/auth";

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

export const metadata: Metadata = {
  title: "Thống kê truy cập | Quản trị Zendo.vn",
  description: "Thống kê truy cập và hoạt động gần đây trong admin Zendo.vn.",
  robots: { index: false, follow: false },
};

export default async function AdminTrafficPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/traffic");
  }

  const db = await getDbClient();
  const [totalAuditLogs, uniqueActions, recentLogs] = db
    ? await Promise.all([
        db.auditLog.count(),
        db.auditLog.groupBy({ by: ["action"] }),
        db.auditLog.findMany({
          orderBy: [{ createdAt: "desc" }],
          take: 20,
          select: {
            id: true,
            action: true,
            entity: true,
            entityId: true,
            ipAddress: true,
            createdAt: true,
            admin: { select: { fullName: true, email: true } },
          },
        }),
      ])
    : [0, [], []];


  return (
    <main className="w-full max-w-none space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">Thống kê truy cập</h1>
        <p className="mt-1 text-sm text-[#64748B]">Theo dõi hoạt động quản trị gần đây từ Audit Log.</p>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-[#64748B]">Tổng sự kiện</p>
          <p className="mt-1 text-2xl font-bold text-[#0F172A]">{totalAuditLogs}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-[#64748B]">Nhóm hành động</p>
          <p className="mt-1 text-2xl font-bold text-[#0F172A]">{uniqueActions.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-[#64748B]">Bản ghi gần nhất</p>
          <p className="mt-1 text-2xl font-bold text-[#0F172A]">{recentLogs.length}</p>
        </article>
      </section>

      {!db ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Hệ thống chưa cấu hình cơ sở dữ liệu.
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
            <tr>
              <th className="px-4 py-3 font-semibold">Hành động</th>
              <th className="px-4 py-3 font-semibold">Đối tượng</th>
              <th className="px-4 py-3 font-semibold">Người thao tác</th>
              <th className="px-4 py-3 font-semibold">IP</th>
              <th className="px-4 py-3 font-semibold">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {recentLogs.map((log) => (
              <tr key={log.id} className="border-b border-[#E2E8F0] last:border-none">
                <td className="px-4 py-3 font-medium text-[#0F172A]">{log.action}</td>
                <td className="px-4 py-3 text-[#64748B]">
                  {log.entity}
                  {log.entityId ? ` (${log.entityId})` : ""}
                </td>
                <td className="px-4 py-3 text-[#64748B]">
                  {log.admin?.fullName ?? log.admin?.email ?? "Hệ thống"}
                </td>
                <td className="px-4 py-3 text-[#64748B]">{log.ipAddress ?? "-"}</td>
                <td className="px-4 py-3 text-[#64748B]">{log.createdAt.toLocaleString("vi-VN")}</td>
              </tr>
            ))}
            {!recentLogs.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">
                  Chưa có dữ liệu truy cập.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        </div>
      </section>
    </main>
  );
}
