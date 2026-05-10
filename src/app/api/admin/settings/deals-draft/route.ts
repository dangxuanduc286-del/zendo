import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { safeParseJson } from "../../../../../lib/safe-json";
import { z } from "zod";

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

const dealsDraftPayloadSchema = z.object({
  dealsSectionsJson: z
    .string()
    .trim()
    .refine((value) => {
      if (!value) return true;
      const parsed = safeParseJson<unknown>(value, null, "admin:deals-draft");
      return Array.isArray(parsed);
    }, "Deals draft JSON không hợp lệ."),
});

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";
  if (!isAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const db = await getDbClient();
  if (!db) return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });

  const row = await db.setting.findUnique({ where: { key: "deals_sections_draft" }, select: { value: true, updatedAt: true } });
  return NextResponse.json({ value: row?.value ?? null, updatedAt: row?.updatedAt ?? null });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";
  if (!isAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as unknown;
  const parsed = dealsDraftPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dữ liệu draft không hợp lệ." },
      { status: 400 },
    );
  }

  const db = await getDbClient();
  if (!db) return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });

  const draftValue = safeParseJson<unknown>(parsed.data.dealsSectionsJson, [], "admin:deals-draft-parse");
  const safeDraft = Array.isArray(draftValue) ? draftValue : [];

  await db.setting.upsert({
    where: { key: "deals_sections_draft" },
    update: { value: safeDraft, group: "website", description: "Deals draft sections", isPublic: false },
    create: { key: "deals_sections_draft", value: safeDraft, group: "website", description: "Deals draft sections", isPublic: false },
  });

  return NextResponse.json({ success: true });
}

