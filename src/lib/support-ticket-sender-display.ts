import { STOREFRONT_DEFAULT_CHAT_SUBJECT } from "./support-ticket-constants";

type CustomerNameBits = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
};

type AffiliateAppBits = {
  fullName: string;
  phone: string;
  email: string | null;
} | null;

const pick = (v: string | null | undefined): string => (typeof v === "string" ? v.trim() : "");

export function deriveSupportTicketSenderDisplayName(
  customer: CustomerNameBits,
  affiliateApplication: AffiliateAppBits,
): string {
  if (pick(customer.fullName)) return pick(customer.fullName);
  if (pick(customer.phone)) return pick(customer.phone);
  if (pick(customer.email)) return pick(customer.email);
  if (affiliateApplication) {
    if (pick(affiliateApplication.fullName)) return pick(affiliateApplication.fullName);
    if (pick(affiliateApplication.phone)) return pick(affiliateApplication.phone);
    if (pick(affiliateApplication.email)) return pick(affiliateApplication.email);
  }
  return "Khách hàng không xác định";
}

export function isGenericSupportTicketSubject(subject: string): boolean {
  const t = pick(subject);
  return !t || t === STOREFRONT_DEFAULT_CHAT_SUBJECT;
}

export function buildSupportTicketDisplaySubject(subject: string, senderDisplayName: string): string {
  if (!isGenericSupportTicketSubject(subject)) return pick(subject);
  const name = pick(senderDisplayName) || "Khách hàng không xác định";
  return `Hỗ trợ - ${name}`;
}

export function supportTicketParticipantRoleVi(isAffiliate: boolean): "CTV" | "Khách hàng" {
  return isAffiliate ? "CTV" : "Khách hàng";
}
