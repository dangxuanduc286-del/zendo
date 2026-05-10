import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Họ tên phải có ít nhất 2 ký tự.").max(80, "Họ tên quá dài."),
  email: z.string().trim().toLowerCase().email("Email không hợp lệ."),
  phone: z
    .string()
    .trim()
    .max(20, "Số điện thoại quá dài.")
    .regex(/^[0-9+().\-\s]*$/, "Số điện thoại không hợp lệ.")
    .optional()
    .default(""),
});

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Bạn cần đăng nhập." }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 });
    }

    const admin = await db.admin.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });
    if (!admin) {
      return NextResponse.json({ message: "Tài khoản quản trị không tồn tại." }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
    }

    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
        { status: 400 },
      );
    }

    const { fullName, email, phone } = parsed.data;
    const phoneValue = phone.trim();

    const emailInUse = await db.admin.findFirst({
      where: {
        email,
        id: { not: session.user.id },
      },
      select: { id: true },
    });
    if (emailInUse) {
      return NextResponse.json({ message: "Email đã được sử dụng bởi tài khoản khác." }, { status: 409 });
    }

    if (phoneValue) {
      const phoneInUse = await db.admin.findFirst({
        where: {
          username: phoneValue,
          id: { not: session.user.id },
        },
        select: { id: true },
      });
      if (phoneInUse) {
        return NextResponse.json(
          { message: "Số điện thoại đã được sử dụng bởi tài khoản khác." },
          { status: 409 },
        );
      }
    }

    await db.admin.update({
      where: { id: session.user.id },
      data: {
        fullName,
        email,
        username: phoneValue || null,
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, message: "Cập nhật hồ sơ thành công." });
  } catch {
    return NextResponse.json(
      { message: "Cập nhật hồ sơ thất bại do lỗi hệ thống. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
