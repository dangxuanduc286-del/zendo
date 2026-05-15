export type AffiliateBotSeverity = "low" | "medium" | "high";

export type AffiliateBotEvaluation = {
  severity: AffiliateBotSeverity;
  /** When false, skip inserting traffic analytics (bot / headless). */
  shouldRecord: boolean;
  reasons: string[];
};

const CRAWLER_UA_RE =
  /(bot|crawler|spider|scrape|slurp|facebookexternalhit|embedly|whatsapp|telegram|discord|preview|headless|phantom|selenium|puppeteer|playwright|axios|python-requests|curl\/|wget|httpclient|java\/|go-http|okhttp)/i;

export function evaluateAffiliateBotSignals(args: {
  userAgent: string | null;
}): AffiliateBotEvaluation {
  const reasons: string[] = [];
  let score = 0;
  const ua = (args.userAgent ?? "").trim();

  if (!ua) {
    score += 2;
    reasons.push("empty_ua");
  }
  if (ua && CRAWLER_UA_RE.test(ua)) {
    score += 4;
    reasons.push("crawler_ua");
  }
  if (ua.length > 0 && ua.length < 16) {
    score += 1;
    reasons.push("short_ua");
  }

  const severity: AffiliateBotSeverity = score >= 4 ? "high" : score >= 2 ? "medium" : "low";
  const shouldRecord = severity !== "high";

  return { severity, shouldRecord, reasons };
}
