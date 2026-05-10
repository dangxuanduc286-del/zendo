import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";

function normalizePhone(input: string): string {
  const value = input.trim().replace(/[^\d+]/g, "");
  if (!value) return "";
  if (value.startsWith("+84")) return `0${value.slice(3)}`;
  if (value.startsWith("84")) return `0${value.slice(2)}`;
  return value;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as {
      fullName?: string;
      identifier?: string;
      password?: string;
      confirmPassword?: string;
    };
    const fullName = String(body.fullName ?? "").trim();
    const identifier = String(body.identifier ?? "").trim();
    const password = String(body.password ?? "");
    const confirmPassword = String(body.confirmPassword ?? "");
    const lowered = identifier.toLowerCase();
    const phone = normalizePhone(identifier);
    const isEmail = lowered.includes("@");

    if (!identifier) {
      return NextResponse.json(
        { ok: false, message: "Vui lòng nhập email hoặc số điện thoại." },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json({ ok: false, message: "Mật khẩu phải có ít nhất 8 ký tự." }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ ok: false, message: "Mật khẩu xác nhận không khớp." }, { status: 400 });
    }

    if (!isEmail && !/^0\d{9}$/.test(phone)) {
      return NextResponse.json({ ok: false, message: "Số điện thoại không hợp lệ." }, { status: 400 });
    }

    const existed = await db.customer.findFirst({
      where: {
        OR: [
          isEmail ? { email: lowered } : { phone },
        ],
      },
      select: { id: true },
    });
    if (existed) {
      return NextResponse.json({ ok: false, message: "Tài khoản đã tồn tại. Vui lòng đăng nhập." }, { status: 409 });
    }

    const passwordHash = await hash(password, 10);
    await db.customer.create({
      data: {
        fullName: fullName || null,
        email: isEmail ? lowered : null,
        phone: isEmail ? null : phone,
        passwordHash,
        isGuest: false,
      },
    });
    return NextResponse.json({ ok: true, message: "Đăng ký thành công. Vui lòng đăng nhập." });
  } catch {
    return NextResponse.json({ ok: false, message: "Không thể đăng ký tài khoản." }, { status: 500 });
  }
}
