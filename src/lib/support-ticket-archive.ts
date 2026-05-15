import type { Prisma } from "@prisma/client";

/** Ticket chưa bị admin lưu trữ (soft delete) — chỉ ẩn khỏi danh sách admin, không khóa khách nhắn. */
export const supportTicketNotArchivedWhere: Prisma.SupportTicketWhereInput = {
  deletedAt: null,
};

/** Ticket chưa bị admin chặn — dùng cho luồng khách / Pusher (khác với lưu trữ). */
export const supportTicketNotBlockedWhere: Prisma.SupportTicketWhereInput = {
  blockedAt: null,
};
