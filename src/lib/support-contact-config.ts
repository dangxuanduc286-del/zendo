export type PublicSupportAudience = "guest" | "customer" | "collaborator" | "admin";

export type SupportContactChannels = {
  facebook: string;
  zalo: string;
  hotline: string;
};

export type RoleSupportConfig = Record<PublicSupportAudience, SupportContactChannels>;

export type PublicSupportSession = {
  user?: {
    id?: string | null;
    role?: string | null;
    affiliateActive?: boolean | null;
  } | null;
} | null;

export type ResolvedSupportContactConfig = {
  audience: PublicSupportAudience;
  title: string;
  tone: "customer" | "collaborator";
  facebook: string;
  zalo: string;
  hotline: string;
  telHref: string;
};

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "CONTENT_MANAGER", "ADMIN"]);
const AUDIENCE_FALLBACKS: Record<PublicSupportAudience, PublicSupportAudience[]> = {
  guest: ["guest"],
  customer: ["customer", "guest"],
  collaborator: ["collaborator", "customer", "guest"],
  admin: ["admin", "customer", "guest"],
};

export const EMPTY_SUPPORT_CHANNELS: SupportContactChannels = {
  facebook: "",
  zalo: "",
  hotline: "",
};

export const DEFAULT_ROLE_SUPPORT_CONFIG: RoleSupportConfig = {
  guest: { ...EMPTY_SUPPORT_CHANNELS },
  customer: { ...EMPTY_SUPPORT_CHANNELS },
  collaborator: { ...EMPTY_SUPPORT_CHANNELS },
  admin: { ...EMPTY_SUPPORT_CHANNELS },
};

function trimString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAllowedHttpUrl(raw: unknown, allowedHosts: readonly string[]): string {
  const value = trimString(raw);
  if (!value) return "";
  const candidate = /^[a-z][a-z\d+\-.]*:\/\//i.test(value) ? value : `https://${value.replace(/^\/+/, "")}`;
  try {
    const url = new URL(candidate);
    const protocolAllowed = url.protocol === "https:" || url.protocol === "http:";
    const host = url.hostname.toLowerCase();
    if (!protocolAllowed || !allowedHosts.includes(host)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function sanitizeSupportFacebookUrl(raw: unknown): string {
  return normalizeAllowedHttpUrl(raw, ["facebook.com", "www.facebook.com", "m.me"]);
}

export function sanitizeSupportZaloUrl(raw: unknown): string {
  const value = trimString(raw);
  if (!value) return "";
  const zaloUrl = normalizeAllowedHttpUrl(value, ["zalo.me", "www.zalo.me"]);
  if (zaloUrl) return zaloUrl;
  if (!/^[\d+()\-\s.]+$/.test(value)) return "";
  const digits = value.replace(/\D/g, "");
  return digits ? `https://zalo.me/${digits}` : "";
}

export function sanitizeSupportHotline(raw: unknown): string {
  return trimString(raw).replace(/[^\d+()\-\s.]/g, "").slice(0, 80).trim();
}

export function normalizeSupportChannels(raw: unknown, fallback?: Partial<SupportContactChannels>): SupportContactChannels {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    facebook: sanitizeSupportFacebookUrl(source.facebook) || sanitizeSupportFacebookUrl(fallback?.facebook),
    zalo: sanitizeSupportZaloUrl(source.zalo) || sanitizeSupportZaloUrl(fallback?.zalo),
    hotline: sanitizeSupportHotline(source.hotline) || sanitizeSupportHotline(fallback?.hotline),
  };
}

export function normalizeRoleSupportConfig(
  raw: unknown,
  fallback?: Partial<Record<PublicSupportAudience, Partial<SupportContactChannels>>>,
): RoleSupportConfig {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    guest: normalizeSupportChannels(source.guest, fallback?.guest),
    customer: normalizeSupportChannels(source.customer, fallback?.customer),
    collaborator: normalizeSupportChannels(source.collaborator, fallback?.collaborator),
    admin: normalizeSupportChannels(source.admin, fallback?.admin),
  };
}

export function hotlineTelHref(hotlineNumber: string): string {
  const digits = sanitizeSupportHotline(hotlineNumber).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("84")) return `tel:+${digits}`;
  if (digits.startsWith("0")) return `tel:${digits}`;
  return `tel:${digits}`;
}

export function classifyPublicSupportAudience(session: PublicSupportSession): PublicSupportAudience {
  const user = session?.user;
  if (!user?.id) return "guest";
  const role = String(user.role ?? "USER").trim();
  if (ADMIN_ROLES.has(role)) return "admin";
  if (role === "USER" && user.affiliateActive === true) return "collaborator";
  return "customer";
}

function hasAnyChannel(channels: SupportContactChannels): boolean {
  return Boolean(channels.facebook || channels.zalo || channels.hotline);
}

function resolveChannels(config: RoleSupportConfig, audience: PublicSupportAudience): SupportContactChannels {
  for (const key of AUDIENCE_FALLBACKS[audience]) {
    const channels = config[key];
    if (channels && hasAnyChannel(channels)) return channels;
  }
  return EMPTY_SUPPORT_CHANNELS;
}

export function resolveSupportContactConfig(
  config: RoleSupportConfig,
  audience: PublicSupportAudience,
): ResolvedSupportContactConfig {
  const channels = resolveChannels(config, audience);
  const collaborator = audience === "collaborator";
  return {
    audience,
    title: collaborator ? "Hỗ trợ cộng tác viên" : "Hỗ trợ khách hàng",
    tone: collaborator ? "collaborator" : "customer",
    facebook: channels.facebook,
    zalo: channels.zalo,
    hotline: channels.hotline,
    telHref: hotlineTelHref(channels.hotline),
  };
}
