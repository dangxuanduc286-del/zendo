import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export function resolveSupportTicketAutoReplyBody(userBody: string): string {
  const t = userBody.trim().toLowerCase();
  if (t.includes("đơn hàng")) {
    return "Bạn vui lòng cung cấp mã đơn hàng để Zendo hỗ trợ nhanh hơn.";
  }
  if (t.includes("thanh toán")) {
    return "Bạn kiểm tra lại phương thức thanh toán hoặc cung cấp thêm thông tin giúp Zendo.";
  }
  return "Zendo đã nhận được yêu cầu, sẽ phản hồi sớm nhất.";
}

export async function getSupportAutoReplySenderAdminId(tx: Tx): Promise<string | null> {
  const envId = process.env.SUPPORT_AUTO_REPLY_ADMIN_ID?.trim();
  if (envId) {
    const hit = await tx.admin.findFirst({
      where: { id: envId, status: "ACTIVE" },
      select: { id: true },
    });
    if (hit) return hit.id;
  }
  const fallback = await tx.admin.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return fallback?.id ?? null;
}

export async function lockSupportTicketRowForUpdate(tx: Tx, ticketId: string): Promise<void> {
  await tx.$executeRaw(
    Prisma.sql`SELECT 1 FROM "SupportTicket" WHERE "SupportTicket"."id" = ${ticketId} FOR UPDATE`,
  );
}
