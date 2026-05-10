import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

function normalizeUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

export function resolveSiteUrl(): string {
  const fromEnv =
    normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeUrl(process.env.NEXTAUTH_URL) ??
    normalizeUrl(process.env.AUTH_URL) ??
    normalizeUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (fromEnv) return fromEnv;

  return process.env.NODE_ENV === "production" ? "https://zendo.vn" : "http://localhost:3000";
}

export function absoluteUrl(pathname = "/"): string {
  const baseUrl = resolveSiteUrl();
  return new URL(pathname, baseUrl).toString();
}
