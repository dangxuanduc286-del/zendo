import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth";
import { broadcastCustomerNotifications } from "@/lib/customer-notification-broadcast";

const bodySchema = z.object({
  kind: z.enum(["PROMOTION", "SYSTEM"]),
  audience: z.enum(["ALL", "AFFILIATE"]),
  title: z.string().min(1).max(220),
  body: z.string().min(1).max(8000),
  actionHref: z.string().max(512).optional().nullable(),
  banner: z.string().max(512).optional().nullable(),
  ctaLabel: z.string().max(80).optional().nullable(),
  expireAt: z.string().max(40).optional().nullable(),
  systemType: z.string().max(64).optional().nullable(),
  severity: z.enum(["info", "warning", "critical"]).optional().nullable(),
});

function isAdminStaff(role?: string | null): boolean {
  return ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role ?? "");
}

async function getDb() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const mod = await import("@/lib/db");
    return mod.db;
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdminStaff(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const json = (await request.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
        { status: 400 },
      );
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });
    }

    const v = parsed.data;
    const campaignId = randomUUID();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const prefix = v.kind === "PROMOTION" ? `promo:${campaignId}:${stamp}` : `sysblast:${campaignId}:${stamp}`;

    const actionHref = (v.actionHref ?? "").trim() || (v.kind === "PROMOTION" ? "/" : "/tai-khoan?tab=notifications");

    const metadata =
      v.kind === "PROMOTION"
        ? {
            type: "PROMOTION_CAMPAIGN",
            notificationVersion: 1,
            campaignId,
            title: v.title,
            banner: v.banner ?? null,
            ctaLabel: v.ctaLabel ?? "Xem ưu đãi",
            deepLink: actionHref,
            expireAt: v.expireAt ?? null,
          }
        : {
            type: "SYSTEM_CUSTOMER",
            notificationVersion: 1,
            systemType: v.systemType ?? "ANNOUNCEMENT",
            severity: v.severity ?? "info",
            deepLink: actionHref,
          };

    const result = await broadcastCustomerNotifications({
      db,
      category: v.kind,
      audience: v.audience,
      dedupeKeyPrefix: prefix,
      title: v.title,
      body: v.body,
      actionHref,
      metadata,
    });

    return NextResponse.json({
      ok: true,
      campaignId,
      inserted: result.inserted,
      scanned: result.scanned,
    });
  } catch {
    return NextResponse.json({ message: "Không thể gửi thông báo." }, { status: 500 });
  }
}
