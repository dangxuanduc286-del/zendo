import "server-only";

import type { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function assertAdminAccess(): Promise<void> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? "";
  if (!session?.user?.id || !["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role)) {
    throw new Error("Unauthorized");
  }
}

export type CtvNotificationListParams = {
  query?: string;
  type?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export type CtvNotificationRow = {
  id: string;
  customerId: string;
  customerLabel: string;
  title: string;
  body: string;
  dedupeKey: string;
  notificationType: string | null;
  createdAt: Date;
  readAt: Date | null;
};

const CTV_DEDUPE_PREFIXES = ["ctv-revenue-reward:", "ctv-tier-up:", "ctv-tier-down:"];

function buildWhere(params: CtvNotificationListParams): Prisma.CustomerAccountNotificationWhereInput {
  const parts: Prisma.CustomerAccountNotificationWhereInput[] = [
    {
      OR: CTV_DEDUPE_PREFIXES.map((prefix) => ({ dedupeKey: { startsWith: prefix } })),
    },
  ];
  const type = (params.type ?? "").trim();
  if (type) {
    parts.push({
      metadata: {
        path: ["type"],
        equals: type,
      },
    });
  }
  const from = (params.from ?? "").trim();
  const to = (params.to ?? "").trim();
  if (from || to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) createdAt.gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        createdAt.lte = d;
      }
    }
    if (Object.keys(createdAt).length > 0) parts.push({ createdAt });
  }
  const q = (params.query ?? "").trim();
  if (q) {
    parts.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { body: { contains: q, mode: "insensitive" } },
        { dedupeKey: { contains: q, mode: "insensitive" } },
        { customer: { fullName: { contains: q, mode: "insensitive" } } },
        { customer: { email: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  return { AND: parts };
}

export async function getCtvNotificationList(
  params?: CtvNotificationListParams,
): Promise<{ rows: CtvNotificationRow[]; total: number }> {
  await assertAdminAccess();
  const where = buildWhere(params ?? {});
  const limit = Math.max(1, Math.min(params?.limit ?? 200, 500));
  const [rows, total] = await Promise.all([
    db.customerAccountNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        customerId: true,
        title: true,
        body: true,
        dedupeKey: true,
        metadata: true,
        createdAt: true,
        readAt: true,
        customer: { select: { fullName: true, email: true, phone: true } },
      },
    }),
    db.customerAccountNotification.count({ where }),
  ]);

  return {
    rows: rows.map((r) => {
      const meta = r.metadata as { type?: string } | null;
      const label =
        r.customer.fullName?.trim() ||
        r.customer.email?.trim() ||
        r.customer.phone?.trim() ||
        r.customerId;
      return {
        id: r.id,
        customerId: r.customerId,
        customerLabel: label,
        title: r.title,
        body: r.body,
        dedupeKey: r.dedupeKey,
        notificationType: meta?.type ?? null,
        createdAt: r.createdAt,
        readAt: r.readAt,
      };
    }),
    total,
  };
}

export function formatCtvNotificationsCsv(rows: CtvNotificationRow[]): string {
  const header = ["createdAt", "customerLabel", "type", "title", "body", "dedupeKey", "readAt"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const body = rows.map((r) =>
    [
      r.createdAt.toISOString(),
      r.customerLabel,
      r.notificationType ?? "",
      r.title,
      r.body,
      r.dedupeKey,
      r.readAt?.toISOString() ?? "",
    ]
      .map((c) => esc(String(c)))
      .join(","),
  );
  return [header.join(","), ...body].join("\n");
}
