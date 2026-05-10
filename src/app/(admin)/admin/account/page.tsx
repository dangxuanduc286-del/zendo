import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import AccountProfileForm from "../../../../components/admin/account/account-profile-form";
import AccountSessionCard from "../../../../components/admin/account/account-session-card";

export const metadata: Metadata = {
  title: "Tài khoản của tôi | Quản trị Zendo.vn",
  description: "Quản lý hồ sơ, bảo mật và phiên đăng nhập quản trị Zendo.vn.",
  robots: {
    index: false,
    follow: false,
  },
};

function formatDate(value: Date | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function shortId(id: string): string {
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}

function initialsFromName(value: string): string {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return "AD";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0]}${tokens[tokens.length - 1][0]}`.toUpperCase();
}

export default async function AdminAccountPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/account");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/admin/login?callbackUrl=/admin/account");
  }

  const admin = await db.admin.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      username: true,
      avatarUrl: true,
      status: true,
      role: { select: { name: true } },
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      passwordHash: true,
    },
  });
  if (!admin) {
    redirect("/admin/login?callbackUrl=/admin/account");
  }

  const recentActivities = await db.auditLog.findMany({
    where: { adminId: admin.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      action: true,
      entity: true,
      createdAt: true,
    },
  });

  const fullName = admin.fullName.trim() || "Quản trị viên";
  const statusLabel = admin.status === "ACTIVE" ? "Đang hoạt động" : "Tạm khóa";
  const statusTone =
    admin.status === "ACTIVE"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <main className="w-full space-y-5">
      <header className="mb-5 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Tài khoản của tôi</h1>
        <p className="text-sm text-slate-600">
          Quản lý hồ sơ, bảo mật và phiên đăng nhập quản trị.
        </p>
      </header>

      <section className="grid w-full grid-cols-1 items-stretch gap-4 lg:grid-cols-2 lg:gap-5">
        <article className="h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-semibold text-slate-900">Hồ sơ quản trị</h2>
          <div className="mt-4 flex items-center gap-3">
            {admin.avatarUrl ? (
              <Image
                src={admin.avatarUrl}
                alt={fullName}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                {initialsFromName(fullName)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{fullName}</p>
              <p className="truncate text-xs text-slate-600">{admin.email}</p>
            </div>
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Mã tài khoản</dt>
              <dd className="font-medium text-slate-900">{shortId(admin.id)}</dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Vai trò</dt>
              <dd className="font-medium text-slate-900">Quản trị viên</dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Trạng thái</dt>
              <dd>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusTone}`}>
                  {statusLabel}
                </span>
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Ngày tạo</dt>
              <dd className="text-right font-medium text-slate-900">{formatDate(admin.createdAt)}</dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Cập nhật gần nhất</dt>
              <dd className="text-right font-medium text-slate-900">{formatDate(admin.updatedAt)}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500">Lần đăng nhập gần nhất</dt>
              <dd className="text-right font-medium text-slate-900">{formatDate(admin.lastLoginAt)}</dd>
            </div>
          </dl>
        </article>

        <AccountProfileForm
          currentFullName={admin.fullName}
          currentEmail={admin.email}
          currentPhone={admin.username ?? ""}
        />

        <article className="h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-semibold text-slate-900">Bảo mật tài khoản</h2>
          <p className="mt-1 text-sm text-slate-600">
            Mật khẩu đăng nhập:{" "}
            <span className="font-semibold text-slate-900">
              {admin.passwordHash ? "Đã thiết lập" : "Chưa thiết lập"}
            </span>
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Không chia sẻ tài khoản quản trị với người khác. Luôn dùng mật khẩu mạnh và đổi định kỳ.
          </p>
          <Link
            href="/admin/change-password"
            className="mt-4 inline-flex h-10 items-center rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
          >
            Đổi mật khẩu
          </Link>
        </article>

        <AccountSessionCard />

        <article className="h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-semibold text-slate-900">Hoạt động gần đây</h2>
          {!recentActivities.length ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
              Chưa có hoạt động gần đây.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recentActivities.map((item) => (
                <li key={item.id} className="rounded-xl border border-slate-200 px-3 py-2.5">
                  <p className="text-sm font-medium text-slate-900">
                    {item.action} - {item.entity}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-semibold text-slate-900">Quyền truy cập</h2>
          <p className="mt-1 text-sm text-slate-600">
            Vai trò hiện tại: <span className="font-semibold text-slate-900">{admin.role.name}</span>
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <li className="rounded-lg border border-slate-200 px-3 py-2">Quản lý sản phẩm</li>
            <li className="rounded-lg border border-slate-200 px-3 py-2">Quản lý đơn hàng</li>
            <li className="rounded-lg border border-slate-200 px-3 py-2">Quản lý banner</li>
            <li className="rounded-lg border border-slate-200 px-3 py-2">Quản lý bài viết</li>
            <li className="rounded-lg border border-slate-200 px-3 py-2">Quản lý cài đặt website</li>
            <li className="rounded-lg border border-slate-200 px-3 py-2">Xem thống kê</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
