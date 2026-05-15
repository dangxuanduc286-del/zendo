import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../lib/auth";
import {
  getAffiliateApplicationsForAdmin,
  type AffiliateApplicationAdminFilter,
} from "../../../../lib/admin/affiliate";
import { ADMIN_AFFILIATE_APPLICATIONS_HREF } from "../../../../lib/admin-menu";
import {
  AdminAffiliateApplicationsClient,
  type AffiliateApplicationClientRow,
} from "../../../../components/admin/admin-affiliate-applications-client";
import { adminCardBody, adminContentShell, adminPageHeader, adminPageSubtitle, adminPageTitle } from "../../../../lib/admin-ui";

export const metadata: Metadata = {
  title: "Đăng ký CTV | Quản trị Zendo.vn",
  description: "Danh sách yêu cầu đăng ký cộng tác viên / affiliate.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams?: Promise<{ status?: string; app_error?: string }>;
};

function mapRows(rows: Awaited<ReturnType<typeof getAffiliateApplicationsForAdmin>>): AffiliateApplicationClientRow[] {
  return rows.map((r) => ({
    id: r.id,
    customerId: r.customerId,
    fullName: r.fullName,
    phone: r.phone,
    trafficSource: r.trafficSource,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    email: r.email,
    socialLink: r.socialLink,
    experience: r.experience,
    note: r.note,
    followerCount: r.followerCount,
    sellingCategories: r.sellingCategories,
    score: r.score,
    scoreReason: r.scoreReason,
    quickReviewNote: r.quickReviewNote,
    adminNote: r.adminNote,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    reviewedByAdmin: r.reviewedByAdmin,
    customer: r.customer,
  }));
}

export default async function AdminAffiliateApplicationsPage({ searchParams }: PageProps): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/admin/login?callbackUrl=${encodeURIComponent(ADMIN_AFFILIATE_APPLICATIONS_HREF)}`);
  }

  const resolved = searchParams ? await searchParams : {};
  const statusRaw = resolved.status ?? "ALL";
  const statusFilter: AffiliateApplicationAdminFilter =
    statusRaw === "PENDING" || statusRaw === "APPROVED" || statusRaw === "REJECTED" ? statusRaw : "ALL";

  const appErrorCode = (resolved.app_error ?? "").trim();
  const appErrorMessage =
    appErrorCode === "not_found"
      ? "Không tìm thấy đơn đăng ký hoặc đơn đã bị xóa."
      : appErrorCode === "invalid_status"
        ? "Đơn không còn ở trạng thái chờ duyệt (có thể đã được xử lý)."
        : appErrorCode === "server_error"
          ? "Không thể xử lý yêu cầu. Vui lòng thử lại sau."
          : "";

  const rows = await getAffiliateApplicationsForAdmin({ status: statusFilter, scoreTier: "ALL" });
  const serialized = mapRows(rows);

  const redirectQs = new URLSearchParams();
  if (statusFilter !== "ALL") redirectQs.set("status", statusFilter);
  const redirectPath = `${ADMIN_AFFILIATE_APPLICATIONS_HREF}${redirectQs.toString() ? `?${redirectQs.toString()}` : ""}`;

  return (
    <main className="w-full bg-slate-50 py-6">
      <div className={adminContentShell}>
        <header className={adminPageHeader}>
          <h1 className={adminPageTitle}>Đăng ký CTV</h1>
          <p className={adminPageSubtitle}>
            Xem và xử lý yêu cầu đăng ký làm cộng tác viên. Đơn mới cũng hiển thị trong mục Cộng tác viên → Yêu cầu CTV.
          </p>
        </header>

        <section className={adminCardBody}>
          <AdminAffiliateApplicationsClient
            rows={serialized}
            statusFilter={statusFilter}
            appErrorMessage={appErrorMessage}
            redirectPath={redirectPath}
          />
        </section>
      </div>
    </main>
  );
}
