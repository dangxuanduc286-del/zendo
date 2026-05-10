import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";

type ParsedNotes = {
  [key: string]: unknown;
};

function parseNotes(notes: string | null): ParsedNotes {
  const raw = (notes || "").trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { legacyNotesText: raw };
    return parsed as ParsedNotes;
  } catch {
    return { legacyNotesText: raw };
  }
}

function toPhoneOrEmpty(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidVnPhone(value: string): boolean {
  return /^(\+84|84|0)(3|5|7|8|9)\d{8}$/.test(value);
}

function serializeNotes(input: ParsedNotes): string | null {
  const payload = Object.entries(input).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) acc[key] = trimmed;
      return acc;
    }
    if (value !== undefined && value !== null) acc[key] = value;
    return acc;
  }, {});
  if (Object.keys(payload).length === 0) return null;
  return JSON.stringify(payload);
}

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "USER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      fullName?: string;
      contact?: string;
      birthDate?: string;
      gender?: string;
    };
    const fullName = String(body.fullName || "").trim();
    const contact = String(body.contact || "").trim();
    const birthDate = String(body.birthDate || "").trim();
    const gender = String(body.gender || "").trim();

    if (!fullName || !contact) {
      return NextResponse.json({ message: "Thiếu thông tin bắt buộc." }, { status: 400 });
    }
    const genderAllowed = ["Nam", "Nữ", "Khác", ""];
    if (!genderAllowed.includes(gender)) {
      return NextResponse.json({ message: "Giới tính không hợp lệ." }, { status: 400 });
    }

    const isEmail = contact.includes("@");
    if (isEmail && !isValidEmail(contact)) {
      return NextResponse.json({ message: "Email không hợp lệ." }, { status: 400 });
    }
    if (!isEmail && !isValidVnPhone(toPhoneOrEmpty(contact))) {
      return NextResponse.json({ message: "Số điện thoại không hợp lệ." }, { status: 400 });
    }

    const dbModule = await import("../../../../lib/db");
    const db = dbModule.db;
    const sessionEmail = String(session.user.email || "").trim().toLowerCase();
    const sessionPhone = toPhoneOrEmpty(String(session.user.name || ""));
    const customer =
      (await db.customer.findUnique({
        where: { id: session.user.id },
        select: { id: true, notes: true },
      })) ??
      (sessionEmail
        ? await db.customer.findFirst({
            where: { email: sessionEmail },
            select: { id: true, notes: true },
          })
        : null) ??
      (sessionPhone
        ? await db.customer.findFirst({
            where: { phone: sessionPhone },
            select: { id: true, notes: true },
          })
        : null);
    if (!customer) return NextResponse.json({ message: "Không tìm thấy tài khoản." }, { status: 404 });

    const oldNotes = parseNotes(customer.notes);
    const nextNotes = serializeNotes({
      ...oldNotes,
      birthDate,
      gender,
    });

    await db.customer.update({
      where: { id: customer.id },
      data: {
        fullName,
        email: isEmail ? contact.toLowerCase() : null,
        phone: isEmail ? null : toPhoneOrEmpty(contact),
        notes: nextNotes,
      },
    });

    return NextResponse.json({
      ok: true,
      profile: {
        fullName,
        contact: isEmail ? contact.toLowerCase() : toPhoneOrEmpty(contact),
        birthDate,
        gender,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Không thể cập nhật thông tin. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
