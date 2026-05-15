import type { SupportTicketSenderRole } from "@prisma/client";

export const SUPPORT_MESSAGE_DELETED_PUBLIC_TEXT = "Tin nhắn đã bị quản trị viên xóa";

export type SupportTicketMessageSerializeInput = {
  id: string;
  body: string;
  senderRole: SupportTicketSenderRole;
  senderAdminId: string | null;
  senderCustomerId: string | null;
  createdAt: Date;
  seenBy: string[];
  deletedAt: Date | null;
};

export function serializeSupportTicketMessageForApi(m: SupportTicketMessageSerializeInput): {
  id: string;
  body: string;
  senderRole: SupportTicketSenderRole;
  fromAdmin: boolean;
  createdAt: string;
  seenBy: string[];
  deletedAt?: string;
} {
  const isDeleted = m.deletedAt != null;
  return {
    id: m.id,
    body: isDeleted ? SUPPORT_MESSAGE_DELETED_PUBLIC_TEXT : m.body,
    senderRole: m.senderRole,
    fromAdmin: Boolean(m.senderAdminId),
    createdAt: m.createdAt.toISOString(),
    seenBy: m.seenBy,
    ...(isDeleted ? { deletedAt: m.deletedAt!.toISOString() } : {}),
  };
}
