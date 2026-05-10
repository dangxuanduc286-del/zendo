/** Loại ticket coi là kênh CTV (heuristic UI khi thiếu `participantKind`). */
const AFFILIATE_TICKET_TYPES = new Set(["AFFILIATE", "WITHDRAWAL", "AFFILIATE_APPLICATION"]);

export function isAffiliateTicketType(type: string): boolean {
  return AFFILIATE_TICKET_TYPES.has(type);
}
