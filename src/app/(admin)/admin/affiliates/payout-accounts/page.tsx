import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import { canViewPayoutAccounts } from "../../../../../lib/admin/permissions";
import {
  adminCard,
  adminInput,
  adminPage,
  adminPageHeader,
  adminPageSubtitle,
  adminPageTitle,
  adminTabActive,
  adminTabBase,
  adminTabInactive,
} from "../../../../../lib/admin-ui";
import AdminPayoutChangeRequestsTable from "./change-requests-table";
import AdminPayoutAccountsTable from "./table";

export const metadata: Metadata = {
  title: "Xác minh tài khoản nhận tiền | Quản trị Zendo.vn",
  robots: { index: false, follow: false },
};

type StatusTab = "PENDING" | "APPROVED" | "REJECTED";
type ModeTab = "accounts" | "change-requests";

export default async function AdminAffiliatePayoutAccountsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; q?: string; mode?: string }>;
}): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/affiliates/payout-accounts");
  }
  if (!canViewPayoutAccounts(session)) {
    redirect("/admin");
  }

  const sp = searchParams ? await searchParams : {};
  const status: StatusTab =
    sp.status === "APPROVED" || sp.status === "REJECTED" ? sp.status : "PENDING";
  const q = (sp.q ?? "").trim();
  const mode: ModeTab = sp.mode === "change-requests" ? "change-requests" : "accounts";

  const payoutTabs: Array<{ id: StatusTab; label: string }> = [
    { id: "PENDING", label: mode === "accounts" ? "Chờ xác minh" : "Đang chờ duyệt đổi TK" },
    { id: "APPROVED", label: mode === "accounts" ? "Đã duyệt TK" : "Đã duyệt yêu cầu" },
    { id: "REJECTED", label: "Từ chối" },
  ];

  const baseQuery = (nextMode: ModeTab): string => {
    const qs = new URLSearchParams();
    qs.set("mode", nextMode);
    qs.set("status", status);
    if (q) qs.set("q", q);
    return qs.toString();
  };

  return (
    <div className={adminPage}>
      <header className={adminPageHeader}>
        <h1 className={adminPageTitle}>Tài khoản nhận tiền CTV</h1>
        <p className={adminPageSubtitle}>
          Duyệt đăng ký lần đầu, hoặc duyệt yêu cầu thay đổi TK sau khi đã duyệt. Ảnh CCCD chỉ qua truy cập admin bảo mật.
        </p>
      </header>

      <section className={adminCard}>
        <div className="flex flex-col gap-3 border-b border-[#E2E8F0] p-4">
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/affiliates/payout-accounts?${baseQuery("accounts")}`}
              className={`${adminTabBase} ${mode === "accounts" ? adminTabActive : adminTabInactive}`}
            >
              Đăng ký / xác minh TK
            </Link>
            <Link
              href={`/admin/affiliates/payout-accounts?${baseQuery("change-requests")}`}
              className={`${adminTabBase} ${mode === "change-requests" ? adminTabActive : adminTabInactive}`}
            >
              Yêu cầu đổi TK
            </Link>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {payoutTabs.map((t) => {
                const active = t.id === status;
                const qs = new URLSearchParams();
                qs.set("mode", mode);
                qs.set("status", t.id);
                if (q) qs.set("q", q);
                const href = `/admin/affiliates/payout-accounts?${qs.toString()}`;
                return (
                  <Link
                    key={t.id}
                    href={href}
                    className={`${adminTabBase} ${active ? adminTabActive : adminTabInactive}`}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </div>

            <form
              className="flex w-full gap-2 sm:w-[420px]"
              action="/admin/affiliates/payout-accounts"
              method="GET"
            >
              <input type="hidden" name="status" value={status} />
              <input type="hidden" name="mode" value={mode} />
              <input
                name="q"
                defaultValue={q}
                placeholder={
                  mode === "accounts" ? "Tìm theo tên, email, ngân hàng…" : "Tìm CTV hoặc ngân hàng đề xuất…"
                }
                className={adminInput}
              />
              <button type="submit" className="hidden">
                Tìm
              </button>
            </form>
          </div>
        </div>

        <div>
          {mode === "accounts" ? (
            <AdminPayoutAccountsTable status={status} query={q} />
          ) : (
            <AdminPayoutChangeRequestsTable status={status} query={q} />
          )}
        </div>
      </section>
    </div>
  );
}
