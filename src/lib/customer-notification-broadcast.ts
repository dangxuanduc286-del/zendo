import type { CustomerAccountNotificationCategory, PrismaClient } from "@prisma/client";
import { sanitizeCustomerNotificationText } from "@/lib/customer-account-notifications";
import { Prisma } from "@prisma/client";

export type BroadcastAudience = "ALL" | "AFFILIATE";

const BATCH = 400;

function sanitizeInternalHref(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s.startsWith("/") || s.startsWith("//")) return null;
  return s.slice(0, 512);
}

/**
 * Fan-out thông báo PROMOTION / SYSTEM tới khách (không guest) theo lô — idempotent theo dedupeKeyPrefix.
 */
export async function broadcastCustomerNotifications(args: {
  db: PrismaClient;
  category: CustomerAccountNotificationCategory;
  audience: BroadcastAudience;
  dedupeKeyPrefix: string;
  title: string;
  body: string;
  actionHref?: string | null;
  metadata: Record<string, unknown>;
}): Promise<{ inserted: number; scanned: number }> {
  const title = sanitizeCustomerNotificationText(args.title, 240);
  const body = sanitizeCustomerNotificationText(args.body, 8000);
  if (!title || !body) return { inserted: 0, scanned: 0 };

  const actionHref = sanitizeInternalHref(args.actionHref ?? null);
  const prefix = (args.dedupeKeyPrefix || "").trim().slice(0, 120);
  if (!prefix) return { inserted: 0, scanned: 0 };

  let cursor: { id: string } | undefined;
  let scanned = 0;
  let inserted = 0;

  for (;;) {
    const page = await args.db.customer.findMany({
      where: {
        isGuest: false,
        ...(args.audience === "AFFILIATE"
          ? { affiliateProfiles: { some: { status: "ACTIVE" } } }
          : {}),
      },
      take: BATCH,
      orderBy: { id: "asc" },
      ...(cursor ? { skip: 1, cursor } : {}),
      select: { id: true },
    });
    if (!page.length) break;
    cursor = { id: page[page.length - 1]!.id };
    scanned += page.length;

    const rows = page.map((c) => {
      const dedupeKey = `${prefix}:${c.id}`.slice(0, 180);
      return {
        customerId: c.id,
        category: args.category,
        dedupeKey,
        title,
        body,
        actionHref,
        metadata: args.metadata as Prisma.InputJsonValue,
      };
    });

    try {
      const r = await args.db.customerAccountNotification.createMany({
        data: rows,
        skipDuplicates: true,
      });
      inserted += r.count;
    } catch {
      /* noop — không làm fail toàn bộ broadcast */
    }

    if (page.length < BATCH) break;
  }

  return { inserted, scanned };
}
