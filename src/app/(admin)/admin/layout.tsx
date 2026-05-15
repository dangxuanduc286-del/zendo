import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import AdminShell from "../../../components/admin/admin-shell";
import { getAffiliateApplicationPendingCountForAdminSafe } from "../../../lib/admin/affiliate";
import { getAdminOrdersUnreadCountForAdminLayoutSafe } from "../../../lib/admin-orders-unread-count";
import { getAdminSupportDmUnreadCountSafe } from "../../../lib/admin-support-dm";
import { isAdminSupportTicketRole } from "../../../lib/admin-support-tickets";
import { authOptions } from "../../../lib/auth";

export default async function AdminSectionLayout({
  children,
}: {
  children: ReactNode;
}): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  const supportTicketSidebarEnabled = Boolean(
    session?.user?.id && isAdminSupportTicketRole(session.user.role),
  );
  const initialSupportTicketUnreadCount = supportTicketSidebarEnabled
    ? await getAdminSupportDmUnreadCountSafe()
    : 0;

  const [collaboratorsPendingBadgeCount, initialOrdersUnreadCount] = await Promise.all([
    getAffiliateApplicationPendingCountForAdminSafe(),
    getAdminOrdersUnreadCountForAdminLayoutSafe(),
  ]);
  return (
    <AdminShell
      collaboratorsPendingBadgeCount={collaboratorsPendingBadgeCount}
      initialOrdersUnreadCount={initialOrdersUnreadCount}
      supportTicketSidebarEnabled={supportTicketSidebarEnabled}
      initialSupportTicketUnreadCount={initialSupportTicketUnreadCount}
    >
      {children}
    </AdminShell>
  );
}
