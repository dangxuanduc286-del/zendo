/**
 * Shared normalization for comparing bank payloads (duplicate submit guard).
 */

export function normBankName(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function normAccountNumber(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

export function normHolder(value: string): string {
  return value.replace(/\s+/g, " ").trim().toUpperCase();
}

export function payoutBankFieldsDuplicate(
  a: { bankName: string; bankAccountNumber: string; bankAccountHolder: string },
  b: { bankName: string; bankAccountNumber: string; bankAccountHolder: string },
): boolean {
  return (
    normBankName(a.bankName) === normBankName(b.bankName) &&
    normAccountNumber(a.bankAccountNumber) === normAccountNumber(b.bankAccountNumber) &&
    normHolder(a.bankAccountHolder) === normHolder(b.bankAccountHolder)
  );
}

const DRAFT_TOKEN_RE = /^[a-zA-Z0-9-]{8,128}$/;

export function assertValidChangeDraftObjectKeys(input: {
  customerId: string;
  draftToken: string;
  frontKey: string;
  backKey: string;
}): void {
  if (!DRAFT_TOKEN_RE.test(input.draftToken)) throw new Error("INVALID_DRAFT");
  const prefix = `private/affiliate-payout-change-drafts/${input.customerId}/${input.draftToken}/`;
  if (!input.frontKey.startsWith(prefix) || !input.backKey.startsWith(prefix)) throw new Error("INVALID_OBJECT_KEYS");
}
