import type { ReactNode } from "react";
import AdminShell from "../../../components/admin/admin-shell";
import { getAffiliateApplicationPendingCountForAdminSafe } from "../../../lib/admin/affiliate";
import { getAdminOrdersUnreadCountForAdminLayoutSafe } from "../../../lib/admin-orders-unread-count";

export default async function AdminSectionLayout({
  children,
}: {
  children: ReactNode;
}): Promise<JSX.Element> {
  const [collaboratorsPendingBadgeCount, initialOrdersUnreadCount] = await Promise.all([
    getAffiliateApplicationPendingCountForAdminSafe(),
    getAdminOrdersUnreadCountForAdminLayoutSafe(),
  ]);
  return (
    <AdminShell
      collaboratorsPendingBadgeCount={collaboratorsPendingBadgeCount}
      initialOrdersUnreadCount={initialOrdersUnreadCount}
    >
      {children}
    </AdminShell>
  );
}
