import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { normalizeMediaUrl } from "../../../../lib/media-url";

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

function parseNotes(notes: string | null): { text?: string; avatarUrl?: string } {
  const raw = (notes || "").trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { text: raw };
    const obj = parsed as Record<string, unknown>;
    return {
      text: typeof obj.text === "string" ? obj.text : undefined,
      avatarUrl: typeof obj.avatarUrl === "string" ? normalizeMediaUrl(obj.avatarUrl) : undefined,
    };
  } catch {
    return { text: raw };
  }
}

function serializeNotes(input: { text?: string; avatarUrl?: string | null }): string | null {
  const text = (input.text || "").trim();
  const avatarUrl = input.avatarUrl ? normalizeMediaUrl(input.avatarUrl) : "";
  if (!text && !avatarUrl) return null;
  return JSON.stringify({ ...(text ? { text } : {}), ...(avatarUrl ? { avatarUrl } : {}) });
}

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "USER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const db = await getDbClient();
    if (!db) return NextResponse.json({ message: "Service unavailable" }, { status: 503 });

    const body = (await request.json()) as { avatarUrl?: string };
    const avatarUrl = normalizeMediaUrl(String(body.avatarUrl || ""));
    if (!avatarUrl) {
      return NextResponse.json({ message: "URL ảnh không hợp lệ." }, { status: 400 });
    }

    const customer = await db.customer.findUnique({
      where: { id: session.user.id },
      select: { notes: true },
    });
    if (!customer) return NextResponse.json({ message: "Không tìm thấy tài khoản." }, { status: 404 });

    const parsedNotes = parseNotes(customer.notes);
    const nextNotes = serializeNotes({ text: parsedNotes.text, avatarUrl });
    await db.customer.update({
      where: { id: session.user.id },
      data: { notes: nextNotes },
    });
    return NextResponse.json({ ok: true, avatarUrl });
  } catch {
    return NextResponse.json({ message: "Không thể cập nhật ảnh đại diện." }, { status: 500 });
  }
}

export async function DELETE(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "USER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const db = await getDbClient();
    if (!db) return NextResponse.json({ message: "Service unavailable" }, { status: 503 });

    const customer = await db.customer.findUnique({
      where: { id: session.user.id },
      select: { notes: true },
    });
    if (!customer) return NextResponse.json({ message: "Không tìm thấy tài khoản." }, { status: 404 });

    const parsedNotes = parseNotes(customer.notes);
    const nextNotes = serializeNotes({ text: parsedNotes.text, avatarUrl: null });
    await db.customer.update({
      where: { id: session.user.id },
      data: { notes: nextNotes },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Không thể xóa ảnh đại diện." }, { status: 500 });
  }
}
