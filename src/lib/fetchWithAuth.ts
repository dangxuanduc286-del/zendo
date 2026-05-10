/** Thrown when the server responds 401 (sau khi đã cố redirect tài khoản phù hợp). */
export class FetchUnauthorizedError extends Error {
  override readonly name = "FetchUnauthorizedError";
  constructor() {
    super("Vui lòng đăng nhập");
  }
}

/** Tránh redirect lặp khi nhiều request 401 song song hoặc sau khi đã redirect. */
let hasRedirected = false;

function requestInputToUrlString(input: RequestInfo | URL): string {
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

function isAdminApiRequest(input: RequestInfo | URL): boolean {
  return requestInputToUrlString(input).includes("/api/admin");
}

function safeCallbackPathForAdminLogin(): string {
  if (typeof window === "undefined") return "/admin";
  const full = `${window.location.pathname}${window.location.search}`;
  if (!full.startsWith("/") || full.startsWith("//")) return "/admin";
  if (!full.startsWith("/admin") || full.startsWith("/admin/login")) return "/admin";
  return full;
}

/**
 * fetch với `credentials: "include"` để gửi cookie phiên NextAuth (`next-auth.session-token`).
 * Các route `/api/account/*` đọc session qua `getServerSession` — **không** dùng header `Authorization`.
 *
 * **401:** chỉ xử lý khi `res.status === 401`. Hướng redirect sau đăng nhập lại dựa trên **URL request**
 * (`input` có chứa `/api/admin` hay không), **không** dùng `window.location.pathname` để chặn hay cho phép gọi API.
 * Tránh vòng redirect: nếu đang ở `/tai-khoan` hoặc `/admin/login` thì ném `FetchUnauthorizedError` thay vì redirect.
 */
export async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, {
    ...init,
    credentials: "include",
  });
  if (res.status !== 401) return res;

  if (typeof window === "undefined") {
    throw new FetchUnauthorizedError();
  }

  const path = window.location.pathname;
  if (path === "/tai-khoan" || path === "/admin/login") {
    throw new FetchUnauthorizedError();
  }

  if (hasRedirected) {
    throw new FetchUnauthorizedError();
  }

  hasRedirected = true;

  if (isAdminApiRequest(input)) {
    const cb = safeCallbackPathForAdminLogin();
    window.location.replace(`/admin/login?callbackUrl=${encodeURIComponent(cb)}`);
  } else {
    window.location.replace("/tai-khoan");
  }

  throw new FetchUnauthorizedError();
}
