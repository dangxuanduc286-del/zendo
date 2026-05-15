import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AccountProfileForm from "../../../../components/admin/account/account-profile-form";
import AccountSessionCard from "../../../../components/admin/account/account-session-card";
import { AdminEmptyState } from "../../../../components/admin/admin-empty-state";
import {
  adminCardBodyLoose,
  adminContentShellWide,
  adminPageSubtitle,
  adminPageTitle,
  adminSecondaryButton,
} from "../../../../lib/admin-ui";
import { authOptions } from "../../../../lib/auth";
import { db } from "../../../../lib/db";

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

const cardHeading =
  "mb-5 border-b border-slate-100 pb-4 text-lg font-semibold tracking-tight text-slate-900";

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
      ? "border border-emerald-200/80 bg-emerald-50 text-emerald-800"
      : "border border-rose-200/80 bg-rose-50 text-rose-800";

  return (
    <main className="w-full min-h-[min(100%,calc(100dvh-var(--admin-mobile-header-estimate)-2rem))] bg-slate-50 lg:min-h-[min(100%,calc(100dvh-2rem))]">
      <div className={adminContentShellWide}>
        <section className={adminCardBodyLoose}>
          <h1 className={adminPageTitle}>Tài khoản của tôi</h1>
          <p className={`${adminPageSubtitle} mt-2 max-w-3xl`}>
            Quản lý hồ sơ, bảo mật và phiên đăng nhập quản trị — đồng bộ với cài đặt tài khoản admin.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div className="flex min-w-0 flex-col gap-5">
            <article className={`${adminCardBodyLoose} flex flex-col`}>
              <h2 className={cardHeading}>Hồ sơ quản trị</h2>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-5">
                <div className="shrink-0">
                  {admin.avatarUrl ? (
                    <Image
                      src={admin.avatarUrl}
                      alt={fullName}
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-2xl border border-slate-200 object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50 text-xl font-bold text-slate-700 shadow-sm">
                      {initialsFromName(fullName)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xl font-semibold tracking-tight text-slate-900">{fullName}</p>
                  <p className="text-sm text-slate-500">{admin.email}</p>
                  <p className="pt-2">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}>{statusLabel}</span>
                  </p>
                </div>
              </div>

              <dl className="mt-8 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Mã tài khoản</dt>
                  <dd className="mt-1 font-medium text-slate-900">{shortId(admin.id)}</dd>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Vai trò</dt>
                  <dd className="mt-1 font-medium text-slate-900">Quản trị viên</dd>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Ngày tạo</dt>
                  <dd className="mt-1 font-medium text-slate-900">{formatDate(admin.createdAt)}</dd>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Cập nhật gần nhất</dt>
                  <dd className="mt-1 font-medium text-slate-900">{formatDate(admin.updatedAt)}</dd>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Lần đăng nhập gần nhất</dt>
                  <dd className="mt-1 font-medium text-slate-900">{formatDate(admin.lastLoginAt)}</dd>
                </div>
              </dl>
            </article>

            <article className={`${adminCardBodyLoose} flex min-h-[22rem] flex-col`}>
              <h2 className={cardHeading}>Hoạt động gần đây</h2>
              {!recentActivities.length ? (
                <div className="flex flex-1 items-stretch">
                  <AdminEmptyState
                    className="min-h-[20rem] w-full flex-1 gap-4 rounded-3xl border border-dashed border-slate-200/90 bg-slate-50/70 py-14"
                    title="Chưa có hoạt động gần đây"
                    description="Các thao tác quản trị sẽ hiển thị tại đây khi có bản ghi audit."
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" className="mx-auto" aria-hidden>
                        <path
                          d="M12 8v4l2.5 2.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    }
                  />
                </div>
              ) : (
                <ul className="mt-1 space-y-3">
                  {recentActivities.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <p className="text-sm font-medium text-slate-900">
                        {item.action} — {item.entity}
                      </p>
                      <p className="text-xs text-slate-500 sm:text-right">{formatDate(item.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <AccountProfileForm currentFullName={admin.fullName} currentEmail={admin.email} currentPhone={admin.username ?? ""} />

            <article className={`${adminCardBodyLoose} flex flex-col`}>
              <h2 className={cardHeading}>Bảo mật tài khoản</h2>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-sm text-slate-600">
                    Mật khẩu đăng nhập:{" "}
                    <span className="font-semibold text-slate-900">{admin.passwordHash ? "Đã thiết lập" : "Chưa thiết lập"}</span>
                  </p>
                  <p className="text-sm leading-relaxed text-slate-500">
                    Không chia sẻ tài khoản quản trị với người khác. Luôn dùng mật khẩu mạnh và đổi định kỳ.
                  </p>
                </div>
                <div className="shrink-0 border-t border-slate-100 pt-5 sm:w-full sm:pt-5 lg:w-auto lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                  <Link
                    href="/admin/change-password"
                    className={`${adminSecondaryButton} inline-flex h-12 w-full min-w-[11rem] items-center justify-center rounded-2xl px-6 text-sm font-semibold sm:w-auto`}
                  >
                    Đổi mật khẩu
                  </Link>
                </div>
              </div>
            </article>

            <AccountSessionCard />
          </div>

          <article className={`${adminCardBodyLoose} flex flex-col lg:col-span-2`}>
            <h2 className={cardHeading}>Quyền truy cập</h2>
            <p className="text-sm text-slate-500">
              Vai trò hiện tại: <span className="font-semibold text-slate-900">{admin.role.name}</span>
            </p>
            <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "Quản lý sản phẩm",
                "Quản lý đơn hàng",
                "Quản lý banner",
                "Quản lý bài viết",
                "Quản lý cài đặt website",
                "Xem thống kê",
              ].map((label) => (
                <li
                  key={label}
                  className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm"
                >
                  {label}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </main>
  );
}
