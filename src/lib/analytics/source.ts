function catChuoi(value: string, maxLength = 512): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

export function chuanHoaPathname(rawPathname: string | null | undefined): string {
  if (!rawPathname) return "/";
  const pathname = rawPathname.trim();
  if (!pathname) return "/";
  if (pathname.startsWith("http://") || pathname.startsWith("https://")) {
    try {
      const parsed = new URL(pathname);
      return parsed.pathname || "/";
    } catch {
      return "/";
    }
  }
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export function chuanHoaReferrer(
  rawReferrer: string | null | undefined,
): string | null {
  if (!rawReferrer) return null;
  const value = rawReferrer.trim();
  if (!value) return null;
  return catChuoi(value, 1024);
}

export function xacDinhLandingPathAnToan(
  landingPath: string | null | undefined,
  pathname: string,
): string {
  const normalizedLanding = chuanHoaPathname(landingPath);
  return normalizedLanding || chuanHoaPathname(pathname);
}

