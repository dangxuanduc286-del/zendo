import type { SupportTicketStatus } from "@prisma/client";

/** Trạng thái được coi là “còn sống” cho ticket GENERAL mặc định (ensure-default). */
export const ACTIVE_GENERAL_DEFAULT_STATUSES: readonly SupportTicketStatus[] = [
  "OPEN",
  "PENDING",
  "RESOLVED",
] as const;

export function formatSupportTicketStatusUi(status: string): string {
  const s = status.trim().toUpperCase();
  switch (s) {
    case "OPEN":
      return "Mở";
    case "PENDING":
      return "Chờ xử lý";
    case "WAITING_ADMIN":
      return "Chờ admin";
    case "WAITING_USER":
      return "Chờ khách";
    case "RESOLVED":
      return "Đã xử lý";
    case "CLOSED":
      return "Đã đóng";
    default:
      return s;
  }
}

/** UI bubble / meta: AFFILIATE → CTV (backend giữ AFFILIATE). */
export function formatSenderRoleForUi(role: string): string {
  const r = role.trim().toUpperCase();
  if (r === "AFFILIATE") return "CTV";
  if (r === "CUSTOMER") return "Khách";
  if (r === "ADMIN") return "Admin";
  return r;
}
