import "server-only";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { resolveCustomerAffiliateProfile } from "@/lib/affiliate-customer-status";

/** Route giữ tương thích bookmark — chuyển về Thống kê hiệu suất. */
export default async function AffiliateAttributionPage(): Promise<never> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    redirect("/tai-khoan");
  }

  const profile = await resolveCustomerAffiliateProfile(String(session.user.id));
  if (!profile.active) {
    redirect("/tai-khoan?tab=affiliate");
  }

  redirect("/tai-khoan/affiliate/analytics");
}
