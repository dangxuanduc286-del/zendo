import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";

const confirmSchema = z
  .object({
    token: z.string().trim().min(20).max(512),
    password: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự.").max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Xác nhận mật khẩu không khớp.",
      });
    }
  });

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = confirmSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
      { status: 400 },
    );
  }

  let db: (typeof import("../../../../../lib/db"))["db"] | null = null;
  try {
    const dbModule = await import("../../../../../lib/db");
    db = dbModule.db;
  } catch (error) {
    console.error("[PASSWORD_RESET] cannot load database client", error);
    return NextResponse.json({ success: false, message: "Hệ thống tạm thời gián đoạn." }, { status: 503 });
  }

  const tokenHash = hashToken(parsed.data.token);
  const passwordResetToken = await db.customerPasswordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      customerId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!passwordResetToken) {
    return NextResponse.json(
      { success: false, message: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." },
      { status: 400 },
    );
  }

  if (passwordResetToken.usedAt || passwordResetToken.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { success: false, message: "Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng." },
      { status: 400 },
    );
  }

  const nextPasswordHash = await hash(parsed.data.password, 12);
  const now = new Date();

  await db.$transaction([
    db.customer.update({
      where: { id: passwordResetToken.customerId },
      data: { passwordHash: nextPasswordHash },
    }),
    db.customerPasswordResetToken.update({
      where: { id: passwordResetToken.id },
      data: { usedAt: now },
    }),
    db.customerPasswordResetToken.updateMany({
      where: {
        customerId: passwordResetToken.customerId,
        id: { not: passwordResetToken.id },
      },
      data: { usedAt: now },
    }),
  ]);

  return NextResponse.json({ success: true, message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập." });
}
