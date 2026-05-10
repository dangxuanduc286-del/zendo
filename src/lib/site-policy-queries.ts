import "server-only";

import { unstable_cache } from "next/cache";
import type { Session } from "next-auth";

import type { PolicyHubCard, SitePolicyPublicType } from "./site-policy-public";

export type { PolicyHubCard } from "./site-policy-public";

export const SITE_POLICIES_CACHE_TAG = "site-policies";

export type StorefrontSitePolicyRow = {
  id: string;
  title: string;
  slug: string;
  type: SitePolicyPublicType;
  content: string;
  excerpt: string;
  updatedAt: Date;
};

const STAFF_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"]);

export function canViewAffiliatePolicyOnStorefront(session: Session | null): boolean {
  const role = session?.user?.role ?? "";
  if (STAFF_ROLES.has(role)) return true;
  if (role === "USER" && session?.user?.affiliateActive) return true;
  return false;
}

function policyPath(slug: string): string {
  return `/chinh-sach/${encodeURIComponent(slug)}`;
}

/** Danh sách chính sách trong Tài khoản — đã lọc AFFILIATE nếu user không phải CTV. */
export async function listPolicyHubCardsForAccount(affiliateActive: boolean): Promise<PolicyHubCard[]> {
  const { db } = await import("./db");
  const rows = await db.sitePolicy.findMany({
    where: {
      deletedAt: null,
      isPublished: true,
      ...(affiliateActive ? {} : { type: { not: "AFFILIATE_POLICY" as const } }),
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    select: {
      title: true,
      slug: true,
      excerpt: true,
      type: true,
    },
  });
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    excerpt: (r.excerpt ?? "").trim(),
    href: policyPath(r.slug),
    type: r.type as SitePolicyPublicType,
  }));
}

const getPublishedBySlugUncached = async (slug: string): Promise<StorefrontSitePolicyRow | null> => {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  const { db } = await import("./db");
  const row = await db.sitePolicy.findFirst({
    where: { slug: normalized, isPublished: true, deletedAt: null },
    select: {
      id: true,
      title: true,
      slug: true,
      type: true,
      content: true,
      excerpt: true,
      updatedAt: true,
    },
  });
  return row ? { ...row, type: row.type as SitePolicyPublicType } : null;
};

export function getPublishedSitePolicyCached(slug: string): Promise<StorefrontSitePolicyRow | null> {
  const normalized = slug.trim().toLowerCase();
  return unstable_cache(
    () => getPublishedBySlugUncached(normalized),
    ["site-policy", normalized],
    { tags: [SITE_POLICIES_CACHE_TAG], revalidate: 300 },
  )();
}

export function excerptPlain(text: string, max = 160): string {
  const t = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
