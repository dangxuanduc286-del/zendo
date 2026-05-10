import { fetchWithAuth, FetchUnauthorizedError } from "@/lib/fetchWithAuth";

const ENSURE_DEFAULT_URL = "/api/account/support-tickets/ensure-default";

export type EnsureDefaultSupportTicketResult =
  | { ok: true; status: number; id?: string }
  | { ok: false; status: number; message?: string };

/**
 * Đảm bảo có ticket GENERAL mặc định cho khách đang đăng nhập (idempotent).
 * Gọi **trước** GET list (không dùng pattern list rỗng → POST).
 */
export async function postEnsureDefaultSupportTicketForStorefront(): Promise<EnsureDefaultSupportTicketResult> {
  try {
    const res = await fetchWithAuth(ENSURE_DEFAULT_URL, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    let j: { ok?: boolean; message?: string; id?: string } = {};
    try {
      j = (await res.json()) as { ok?: boolean; message?: string; id?: string };
    } catch {
      /* empty body */
    }
    if (res.ok && j.ok === true) {
      return { ok: true, status: res.status, ...(typeof j.id === "string" ? { id: j.id } : {}) };
    }
    return { ok: false, status: res.status, message: j.message ?? res.statusText };
  } catch (e) {
    if (e instanceof FetchUnauthorizedError) {
      return { ok: false, status: 401, message: e.message };
    }
    return { ok: false, status: 0, message: "network_error" };
  }
}
