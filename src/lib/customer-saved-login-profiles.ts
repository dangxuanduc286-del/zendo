export const CUSTOMER_SAVED_LOGIN_STORAGE_KEY = "zendo.storefront.savedLoginProfiles";

const MAX_PROFILES = 5;

export type CustomerSavedLoginProfile = {
  id: string;
  identifier: string;
  displayName: string;
  avatarUrl?: string;
  lastUsedAt: number;
};

export function normalizeSavedLoginProfileId(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function isValidProfile(value: unknown): value is CustomerSavedLoginProfile {
  if (!value || typeof value !== "object") return false;
  const row = value as CustomerSavedLoginProfile;
  return (
    typeof row.id === "string" &&
    typeof row.identifier === "string" &&
    row.identifier.trim().length > 0 &&
    typeof row.displayName === "string" &&
    typeof row.lastUsedAt === "number"
  );
}

export function readCustomerSavedLoginProfiles(): CustomerSavedLoginProfile[] {
  try {
    const raw = localStorage.getItem(CUSTOMER_SAVED_LOGIN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isValidProfile)
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .slice(0, MAX_PROFILES);
  } catch {
    return [];
  }
}

export function upsertCustomerSavedLoginProfile(input: {
  identifier: string;
  displayName?: string;
  avatarUrl?: string;
}): void {
  const identifier = input.identifier.trim();
  if (!identifier) return;

  const id = normalizeSavedLoginProfileId(identifier);
  const displayName = (input.displayName ?? identifier).trim() || identifier;
  const avatarUrl = input.avatarUrl?.trim() || undefined;
  const now = Date.now();

  const existing = readCustomerSavedLoginProfiles().filter((p) => p.id !== id);
  const next: CustomerSavedLoginProfile[] = [
    { id, identifier, displayName, ...(avatarUrl ? { avatarUrl } : {}), lastUsedAt: now },
    ...existing,
  ].slice(0, MAX_PROFILES);

  try {
    localStorage.setItem(CUSTOMER_SAVED_LOGIN_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function removeCustomerSavedLoginProfile(id: string): void {
  const normalized = id.trim();
  if (!normalized) return;
  const next = readCustomerSavedLoginProfiles().filter((p) => p.id !== normalized);
  try {
    if (next.length === 0) {
      localStorage.removeItem(CUSTOMER_SAVED_LOGIN_STORAGE_KEY);
    } else {
      localStorage.setItem(CUSTOMER_SAVED_LOGIN_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    /* ignore */
  }
}
