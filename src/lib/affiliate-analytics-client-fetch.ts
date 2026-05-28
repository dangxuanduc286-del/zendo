/**
 * Parse phản hồi fetch analytics — tránh crash khi server trả HTML (404/500/redirect).
 */

export type AffiliateAnalyticsJsonPayload = {
  ok?: boolean;
  message?: string;
};

function looksLikeHtmlBody(text: string): boolean {
  const t = text.trimStart().toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html") || t.startsWith("<");
}

export async function parseAffiliateAnalyticsResponse<T extends AffiliateAnalyticsJsonPayload>(
  res: Response,
): Promise<T> {
  const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
  const text = await res.text();

  if (!text.trim()) {
    throw new Error("AFFILIATE_ANALYTICS_EMPTY");
  }

  if (looksLikeHtmlBody(text) || (!contentType.includes("json") && text.length > 0 && !text.trimStart().startsWith("{"))) {
    throw new Error("AFFILIATE_ANALYTICS_HTML");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("AFFILIATE_ANALYTICS_PARSE");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AFFILIATE_ANALYTICS_INVALID");
  }

  return parsed as T;
}

/** Không hiển thị lỗi kỹ thuật (JSON/HTML) ra UI — chỉ empty state. */
export function isAffiliateAnalyticsFetchFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return true;
  const m = err.message;
  if (m.startsWith("AFFILIATE_ANALYTICS_")) return true;
  if (m.includes("Unexpected token") || m.includes("is not valid JSON") || m.includes("<!DOCTYPE")) return true;
  return false;
}

export function logAffiliateAnalyticsFetchIssue(url: string, err: unknown, status?: number): void {
  if (process.env.NODE_ENV !== "development") return;
  // eslint-disable-next-line no-console
  console.warn("[affiliate-analytics] fetch issue", { url, status, err });
}
