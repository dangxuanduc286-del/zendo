const DEFAULT_PUBLIC_MEDIA_BASE = "https://media.zendo.vn";
const KNOWN_DEAD_MEDIA_PATHS = new Set([
  "images/theme/home-banner-mobile.jpg",
  "images/theme/home-banner-desktop.jpg",
]);
const mediaReachabilityCache = new Map<string, { expiresAt: number; ok: boolean }>();

function getConfiguredMediaBase(): string {
  const raw =
    process.env.R2_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.trim() ||
    DEFAULT_PUBLIC_MEDIA_BASE;
  return raw.replace(/\/+$/g, "");
}

function sanitizePathname(pathname: string): string {
  return pathname.replace(/^\/+/g, "").replace(/\\/g, "/").replace(/\.\./g, "").trim();
}

function isLikelyImagePath(pathname: string): boolean {
  return /\.(png|jpe?g|webp|gif|svg|avif|ico)$/i.test(pathname);
}

export function getPublicMediaBaseUrl(): string {
  return getConfiguredMediaBase();
}

export function isPublicMediaUrl(value: string): boolean {
  const normalized = normalizeMediaUrl(value);
  if (!normalized) return false;
  try {
    const input = new URL(normalized);
    const base = new URL(getConfiguredMediaBase());
    return input.protocol === "https:" && input.host === base.host;
  } catch {
    return false;
  }
}

export function normalizeMediaUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return "";

  if (/^(blob:|data:|javascript:)/i.test(raw)) {
    return "";
  }

  const base = getConfiguredMediaBase();
  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      const cleanPath = sanitizePathname(parsed.pathname);
      if (!cleanPath) return "";
      if (!isLikelyImagePath(cleanPath)) return "";
      return `${base}/${cleanPath}`;
    } catch {
      return "";
    }
  }

  const cleanPath = sanitizePathname(raw);
  if (!cleanPath) return "";
  if (!isLikelyImagePath(cleanPath)) return "";
  return `${base}/${cleanPath}`;
}

export function isKnownDeadMediaUrl(value: string): boolean {
  const normalized = normalizeMediaUrl(value);
  if (!normalized) return false;
  try {
    const parsed = new URL(normalized);
    const cleanPath = sanitizePathname(parsed.pathname);
    return KNOWN_DEAD_MEDIA_PATHS.has(cleanPath);
  } catch {
    return false;
  }
}

async function checkMediaUrlReachable(url: string): Promise<boolean> {
  const now = Date.now();
  const cached = mediaReachabilityCache.get(url);
  if (cached && cached.expiresAt > now) return cached.ok;

  let ok = false;
  try {
    const head = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (head.ok) {
      ok = true;
    } else if (head.status === 405 || head.status === 403) {
      const get = await fetch(url, { method: "GET", cache: "no-store" });
      ok = get.ok;
    } else {
      ok = false;
    }
  } catch {
    ok = false;
  }
  mediaReachabilityCache.set(url, { ok, expiresAt: now + 5 * 60 * 1000 });
  return ok;
}

export async function normalizeBannerMediaUrl(value: string): Promise<string> {
  const normalized = normalizeMediaUrl(value);
  if (!normalized) return "";
  if (!isPublicMediaUrl(normalized)) return "";
  if (isKnownDeadMediaUrl(normalized)) return "";
  const reachable = await checkMediaUrlReachable(normalized);
  return reachable ? normalized : "";
}

export function toNullableMediaUrl(value: string): string | null {
  const normalized = normalizeMediaUrl(value);
  return normalized || null;
}
