/**
 * Chuỗi gợi ý cho thông báo đăng nhập — không cố chi tiết UA parser nặng.
 */

export type SignInUaHints = {
  browser: string;
  os: string;
  device: string;
};

/** Ẩn IPv4 hai octet cuối; IPv6 chỉ hiện hai khối đầu. */
export function maskIpForCustomerNotification(ipRaw: string | null | undefined): string | undefined {
  if (!ipRaw) return undefined;
  const ip = ipRaw.trim().replace(/^::ffff:/i, "");
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (v4) {
    return `${v4[1]}.${v4[2]}.xxx.xxx`;
  }
  if (ip.includes(":")) {
    const parts = ip.split(":").filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}:${parts[1]}:…`;
    return "IPv6 …";
  }
  return "***";
}

function pickBrowser(ua: string): string {
  const u = ua.toLowerCase();
  if (u.includes("edg/")) return "Edge";
  if (u.includes("opr/") || u.includes("opera")) return "Opera";
  if (u.includes("chrome") && !u.includes("edg")) return "Chrome";
  if (u.includes("safari") && !u.includes("chrome")) return "Safari";
  if (u.includes("firefox")) return "Firefox";
  if (u.includes("trident") || u.includes("msie")) return "Internet Explorer";
  return "Trình duyệt khác";
}

function pickOs(ua: string): string {
  const u = ua.toLowerCase();
  if (u.includes("windows nt")) return "Windows";
  if (u.includes("mac os x") || u.includes("macintosh")) return "macOS";
  if (u.includes("android")) return "Android";
  if (u.includes("iphone") || u.includes("ipad") || u.includes("ios")) return "iOS";
  if (u.includes("linux")) return "Linux";
  return "Hệ điều hành khác";
}

function pickDevice(ua: string): string {
  const u = ua.toLowerCase();
  if (u.includes("ipad")) return "Máy tính bảng";
  if (u.includes("iphone") || u.includes("android")) return "Điện thoại";
  if (u.includes("mobile")) return "Di động";
  return "Máy tính";
}

export function parseUserAgentHints(userAgent: string | null | undefined): SignInUaHints {
  const ua = (userAgent ?? "").trim();
  if (!ua) {
    return { browser: "Không xác định", os: "Không xác định", device: "Thiết bị" };
  }
  return {
    browser: pickBrowser(ua),
    os: pickOs(ua),
    device: pickDevice(ua),
  };
}

export type LoginProviderKind = "GOOGLE" | "FACEBOOK" | "CREDENTIALS" | "UNKNOWN";

export function loginProviderFromAccountProvider(provider: string | undefined | null): LoginProviderKind {
  const p = String(provider ?? "").toLowerCase();
  if (p === "google") return "GOOGLE";
  if (p === "facebook") return "FACEBOOK";
  if (p === "customer-credentials") return "CREDENTIALS";
  return "UNKNOWN";
}

export function loginProviderLabelVi(kind: LoginProviderKind): string {
  switch (kind) {
    case "GOOGLE":
      return "Google";
    case "FACEBOOK":
      return "Facebook";
    case "CREDENTIALS":
      return "Email / SĐT + mật khẩu";
    default:
      return "Đăng nhập";
  }
}
