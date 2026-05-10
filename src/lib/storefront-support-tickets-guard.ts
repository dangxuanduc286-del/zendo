/** Đang chạy trong app admin (URL trình duyệt). Chỉ gọi từ client. */
export function isAdminAppPathname(): boolean {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
}

/** Chuẩn hóa input fetch → chuỗi để nhận diện path API. */
export function requestInputToUrlString(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (typeof URL !== "undefined" && input instanceof URL) return `${input.pathname}${input.search}`;
  if (typeof Request !== "undefined" && input instanceof Request) {
    try {
      const u = new URL(input.url);
      return `${u.pathname}${u.search}`;
    } catch {
      return input.url;
    }
  }
  return String(input);
}

/** API ticket khách (storefront), không gọi trong /admin. */
export function isAccountSupportTicketsApiRequest(input: RequestInfo | URL): boolean {
  return requestInputToUrlString(input).includes("/api/account/support-tickets");
}
