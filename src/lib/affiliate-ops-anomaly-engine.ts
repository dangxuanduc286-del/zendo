import "server-only";

import type { AttributionStateBreakdown } from "@/lib/affiliate-attribution-account-queries";
import type { OpsAlertV1, OpsPixelHealthRow, OpsRollingCounts } from "@/lib/affiliate-ops-anomaly-types";

export type OpsAnomalyEngineInput = {
  rolling: OpsRollingCounts;
  redisOk: boolean;
  ingestLatencyP50Ms: number | null;
  ingestLatencyP90Ms: number | null;
  dlq24h: number;
  dlq1h: number;
  queueIngestWaiting: number | null;
  queueAttrWaiting: number | null;
  queueIngestFailed: number | null;
  queueAttrFailed: number | null;
  /** ORDER_PAID traffic rows last 2h */
  convTraffic2h: number;
  /** Legacy `AffiliateAttribution` rows last 2h (last_click + last_touch). */
  attrLastClick2h: number;
  /** Conversion match states last 24h (Phase 2.2 engine). */
  attribution24h?: AttributionStateBreakdown | null;
  /** Conversion dispatch (TikTok/Meta CAPI) — Bull queue depth. */
  conversionDispatchQueueWaiting: number | null;
  conversionDispatchQueueFailed: number | null;
  capiJobDlq24h: number;
  capiJobFailed24h: number;
  fraudOpenCases24h: number;
  pixels: OpsPixelHealthRow[];
};

function sevOrder(s: OpsAlertV1["severity"]): number {
  if (s === "critical") return 0;
  if (s === "warning") return 1;
  return 2;
}

function ratioDelta(cur: number, base: number): number {
  if (base <= 0) return cur > 0 ? 100 : 0;
  return ((cur - base) / base) * 100;
}

/**
 * Pure heuristic engine — O(1) over aggregates. Tune thresholds via env later.
 */
export function computeAffiliateOpsAnomalies(input: OpsAnomalyEngineInput): OpsAlertV1[] {
  const ts = input.rolling.now;
  const out: OpsAlertV1[] = [];

  if (!input.redisOk) {
    out.push({
      id: "infra:redis_down",
      severity: "critical",
      group: "infra",
      title: "Redis không phản hồi",
      detail: "Realtime cache / queue / SSE bridge có thể gián đoạn. Kiểm tra hạ tầng.",
      ts,
      score: 100,
      ai: { version: 1, features: { redisOk: 0 } },
    });
  }

  if (input.queueIngestWaiting != null && input.queueIngestWaiting > 40) {
    out.push({
      id: "queue:ingest_stall",
      severity: "critical",
      group: "queue",
      title: "Hàng đợi ingest quá lớn",
      detail: `~${input.queueIngestWaiting} job đang chờ — có thể worker ingest chậm hoặc tắc.`,
      ts,
      score: 95,
      ai: { version: 1, features: { ingestWaiting: input.queueIngestWaiting } },
    });
  } else if (input.queueIngestWaiting != null && input.queueIngestWaiting > 18) {
    out.push({
      id: "queue:ingest_lag",
      severity: "warning",
      group: "queue",
      title: "Ingest queue tăng",
      detail: `${input.queueIngestWaiting} job chờ xử lý.`,
      ts,
      score: 60,
      ai: { version: 1, features: { ingestWaiting: input.queueIngestWaiting } },
    });
  }

  if (input.queueAttrWaiting != null && input.queueAttrWaiting > 25) {
    out.push({
      id: "queue:attr_stall",
      severity: "warning",
      group: "queue",
      title: "Attribution chờ dài",
      detail: `${input.queueAttrWaiting} job attribution đang backlog.`,
      ts,
      score: 55,
    });
  }

  if ((input.queueIngestFailed ?? 0) > 8 || (input.queueAttrFailed ?? 0) > 6) {
    out.push({
      id: "queue:retry_storm",
      severity: "warning",
      group: "queue",
      title: "Failed jobs tăng",
      detail: `ingest failed=${input.queueIngestFailed ?? 0}, attr failed=${input.queueAttrFailed ?? 0} (Bull).`,
      ts,
      score: 58,
    });
  }

  if ((input.conversionDispatchQueueWaiting ?? 0) > 35) {
    out.push({
      id: "queue:capi_dispatch_stall",
      severity: "warning",
      group: "queue",
      title: "Hàng đợi CAPI (TikTok/Meta) lớn",
      detail: `${input.conversionDispatchQueueWaiting ?? 0} job chờ — kiểm tra worker conversion-dispatch.`,
      ts,
      score: 58,
    });
  } else if ((input.conversionDispatchQueueWaiting ?? 0) > 15) {
    out.push({
      id: "queue:capi_dispatch_lag",
      severity: "info",
      group: "queue",
      title: "CAPI dispatch đang xếp hàng",
      detail: `${input.conversionDispatchQueueWaiting ?? 0} job chờ xử lý.`,
      ts,
      score: 32,
    });
  }

  if ((input.conversionDispatchQueueFailed ?? 0) > 12) {
    out.push({
      id: "queue:capi_dispatch_failures",
      severity: "warning",
      group: "queue",
      title: "CAPI dispatch failed (Bull)",
      detail: `${input.conversionDispatchQueueFailed ?? 0} job failed trên queue conversion.`,
      ts,
      score: 56,
    });
  }

  if (input.capiJobDlq24h >= 4) {
    out.push({
      id: "conversion:capi_dlq_24h",
      severity: "warning",
      group: "conversion",
      title: "Nhiều CAPI DLQ (24h)",
      detail: `${input.capiJobDlq24h} dispatch hết retry — kiểm tra token, pixel id, hoặc từ chối từ nhà quảng cáo.`,
      ts,
      score: 62,
    });
  } else if (input.capiJobDlq24h > 0) {
    out.push({
      id: "conversion:capi_dlq_notice",
      severity: "info",
      group: "conversion",
      title: "Có CAPI DLQ (24h)",
      detail: `${input.capiJobDlq24h} job — có thể replay sau khi sửa cấu hình.`,
      ts,
      score: 28,
    });
  }

  if (input.capiJobFailed24h >= 25) {
    out.push({
      id: "conversion:capi_reject_spike",
      severity: "warning",
      group: "conversion",
      title: "CAPI từ chối / lỗi HTTP tăng (24h)",
      detail: `${input.capiJobFailed24h} lần failed (chưa DLQ) — quota, auth, hoặc payload.`,
      ts,
      score: 55,
    });
  }

  if (input.fraudOpenCases24h >= 3) {
    out.push({
      id: "fraud:open_cases_spike",
      severity: "warning",
      group: "fraud",
      title: "Nhiều case fraud đang mở (24h)",
      detail: `${input.fraudOpenCases24h} case OPEN — xem admin Fraud affiliate.`,
      ts,
      score: 52,
    });
  } else if (input.fraudOpenCases24h >= 1) {
    out.push({
      id: "fraud:open_cases_notice",
      severity: "info",
      group: "fraud",
      title: "Có case fraud mở (24h)",
      detail: "Theo dõi signal / replay trong dashboard admin.",
      ts,
      score: 22,
    });
  }

  if (input.dlq1h > 5) {
    out.push({
      id: "queue:dlq_spike_1h",
      severity: "warning",
      group: "queue",
      title: "DLQ tăng trong 1h",
      detail: `${input.dlq1h} sự kiện DLQ gần đây (24h tổng ${input.dlq24h}).`,
      ts,
      score: 62,
    });
  } else if (input.dlq24h > 0 && input.dlq24h <= 5) {
    out.push({
      id: "queue:dlq_notice",
      severity: "info",
      group: "queue",
      title: "Có bản ghi DLQ",
      detail: `${input.dlq24h} DLQ 24h — theo dõi worker.`,
      ts,
      score: 25,
    });
  }

  if (
    input.ingestLatencyP50Ms != null &&
    input.ingestLatencyP90Ms != null &&
    input.ingestLatencyP90Ms > 2500 &&
    input.ingestLatencyP90Ms > input.ingestLatencyP50Ms * 2.5
  ) {
    out.push({
      id: "infra:ingest_latency_tail",
      severity: "warning",
      group: "infra",
      title: "Đuôi latency ingest dài",
      detail: `p50 ${input.ingestLatencyP50Ms}ms · p90 ${input.ingestLatencyP90Ms}ms — có outlier hoặc DB chậm.`,
      ts,
      score: 52,
      ai: { version: 1, features: { p50: input.ingestLatencyP50Ms, p90: input.ingestLatencyP90Ms } },
    });
  }

  const dClick1 = ratioDelta(input.rolling.clicks1m, input.rolling.clicks1mBaseline);
  if (input.rolling.clicks1mBaseline >= 10 && dClick1 > 200) {
    out.push({
      id: "traffic:click_burst_1m",
      severity: "warning",
      group: "traffic",
      title: "Burst click (1 phút)",
      detail: `+${Math.round(dClick1)}% so với phút trước — kiểm tra campaign / bot.`,
      ts,
      score: Math.min(88, 45 + Math.round(dClick1 / 8)),
      ai: { version: 1, features: { clicks1m: input.rolling.clicks1m, base1m: input.rolling.clicks1mBaseline } },
    });
  }

  const dConv1 = ratioDelta(input.rolling.conv1m, input.rolling.conv1mBaseline);
  if (input.rolling.conv1mBaseline >= 1 && dConv1 > 200 && input.rolling.conv1m >= 3) {
    out.push({
      id: "conversion:burst_1m",
      severity: "info",
      group: "conversion",
      title: "Chuyển đổi burst (1 phút)",
      detail: `+${Math.round(dConv1)}% đơn paid so với phút trước.`,
      ts,
      score: 32,
    });
  }

  const dClick15 = ratioDelta(input.rolling.clicks15m, input.rolling.clicks15mBaseline);
  if (input.rolling.clicks15mBaseline >= 40 && dClick15 > 180) {
    out.push({
      id: "traffic:click_burst_15m",
      severity: "warning",
      group: "traffic",
      title: "Click tăng mạnh (15 phút)",
      detail: `+${Math.round(dClick15)}% so khối 15 phút trước.`,
      ts,
      score: Math.min(85, 40 + Math.round(dClick15 / 10)),
    });
  }

  const dDrop15 = ratioDelta(input.rolling.clicks15mBaseline, input.rolling.clicks15m);
  if (input.rolling.clicks15mBaseline >= 80 && dDrop15 > 55 && input.rolling.clicks15m < input.rolling.clicks15mBaseline * 0.45) {
    out.push({
      id: "traffic:drop_15m",
      severity: "warning",
      group: "traffic",
      title: "Traffic giảm (15 phút)",
      detail: "Click 15 phút thấp hơn rõ so với khối baseline trước đó.",
      ts,
      score: 54,
    });
  }

  const dRev5 = ratioDelta(input.rolling.revenue5mMinor, input.rolling.revenue5mBaselineMinor);
  if (input.rolling.revenue5mBaselineMinor >= 50_00 && dRev5 > 250) {
    out.push({
      id: "conversion:revenue_burst_5m",
      severity: "info",
      group: "conversion",
      title: "Doanh thu 5 phút tăng vọt",
      detail: `+${Math.round(dRev5)}% so baseline (rolling).`,
      ts,
      score: 30,
      ai: { version: 1, features: { rev5: input.rolling.revenue5mMinor, rev5b: input.rolling.revenue5mBaselineMinor } },
    });
  }

  if (input.rolling.distinctIp5mEstimate >= 3 && input.rolling.clicks5m > 50) {
    const cpi = input.rolling.clicks5m / Math.max(1, input.rolling.distinctIp5mEstimate);
    if (cpi > 90) {
      out.push({
        id: "fraud:ip_click_density",
        severity: "warning",
        group: "fraud",
        title: "Mật độ click / IP cao",
        detail: "Nhiều click trên ít IP (rolling HLL) — theo dõi burst / proxy.",
        ts,
        score: 62,
        ai: { version: 1, features: { clicksPerIpHll: cpi, ipEst: input.rolling.distinctIp5mEstimate } },
      });
    }
  }

  if (
    input.rolling.source === "redis" &&
    input.rolling.rollMeta?.writerLagMs != null &&
    input.rolling.rollMeta.writerLagMs > 120_000 &&
    input.rolling.clicks5m + input.rolling.conv5m > 0
  ) {
    out.push({
      id: "infra:roll_writer_lag",
      severity: "info",
      group: "infra",
      title: "Rolling counter trễ ghi",
      detail: `Lần incr cuối ~${Math.round(input.rolling.rollMeta.writerLagMs / 1000)}s trước — worker có thể backlog.`,
      ts,
      score: 28,
    });
  }

  const dClick5 = ratioDelta(input.rolling.clicks5m, input.rolling.clicks5mBaseline);
  if (input.rolling.clicks5mBaseline >= 8 && dClick5 > 120) {
    out.push({
      id: "traffic:click_spike_5m",
      severity: "warning",
      group: "traffic",
      title: "Click tăng đột biến (5m)",
      detail: `+${Math.round(dClick5)}% so với khối baseline trước đó.`,
      ts,
      score: Math.min(90, 40 + Math.round(dClick5 / 6)),
      ai: { version: 1, features: { clicks5m: input.rolling.clicks5m, base: input.rolling.clicks5mBaseline } },
    });
  }

  const dDrop5 = ratioDelta(input.rolling.clicks5mBaseline, input.rolling.clicks5m);
  if (input.rolling.clicks5mBaseline >= 15 && dDrop5 > 65 && input.rolling.clicks5m < input.rolling.clicks5mBaseline * 0.35) {
    out.push({
      id: "traffic:click_drop_5m",
      severity: "warning",
      group: "traffic",
      title: "Traffic giảm mạnh (5m)",
      detail: `Click hiện tại thấp hơn baseline đáng kể (~${Math.round(100 - (input.rolling.clicks5m / input.rolling.clicks5mBaseline) * 100)}%).`,
      ts,
      score: 55,
    });
  }

  const dConv5 = ratioDelta(input.rolling.conv5m, input.rolling.conv5mBaseline);
  if (input.rolling.conv5mBaseline >= 1 && dConv5 > 150) {
    out.push({
      id: "conversion:spike_5m",
      severity: "info",
      group: "conversion",
      title: "Chuyển đổi tăng (5m)",
      detail: `+${Math.round(dConv5)}% so baseline — kiểm tra nguồn traffic.`,
      ts,
      score: 35,
    });
  }

  if (input.rolling.clicks5m > 80 && input.rolling.conv5m === 0 && input.rolling.clicks5mBaseline < 30) {
    out.push({
      id: "fraud:burst_no_conv",
      severity: "warning",
      group: "fraud",
      title: "Burst click không đổi",
      detail: "Rất nhiều click 5m nhưng 0 đơn — có thể bot hoặc test traffic.",
      ts,
      score: 68,
      ai: { version: 1, features: { clicks5m: input.rolling.clicks5m, conv5m: 0 } },
    });
  }

  if (input.rolling.clicks5m > 20 && input.rolling.conv5m > 0) {
    const cr = input.rolling.conv5m / input.rolling.clicks5m;
    if (cr > 0.45) {
      out.push({
        id: "fraud:impossible_cr",
        severity: "warning",
        group: "fraud",
        title: "Tỷ lệ chuyển đổi bất thường",
        detail: `CR ~${(cr * 100).toFixed(0)}% trên cửa sổ 5m — kiểm tra double fire / test.`,
        ts,
        score: 72,
        ai: { version: 1, features: { cr5m: cr } },
      });
    }
  }

  if (input.rolling.clicks5m > 40 && input.rolling.sessions5mEstimate > 0) {
    const ctrish = input.rolling.clicks5m / Math.max(1, input.rolling.sessions5mEstimate);
    if (ctrish > 25) {
      out.push({
        id: "fraud:session_flood",
        severity: "warning",
        group: "fraud",
        title: "Session / click lệch thường",
        detail: "Nhiều click trên ít session — nghi flood hoặc thiếu session cookie.",
        ts,
        score: 58,
        ai: { version: 1, features: { clicksPerSession: ctrish } },
      });
    }
  }

  if (input.convTraffic2h > 5 && input.attrLastClick2h < Math.max(1, Math.floor(input.convTraffic2h * 0.4))) {
    out.push({
      id: "conversion:attr_mismatch",
      severity: "warning",
      group: "conversion",
      title: "Attribution chậm so traffic paid",
      detail: "Đơn paid trong 2h nhiều hơn bản ghi last_click/last_touch — kiểm tra worker attribution.",
      ts,
      score: 60,
      ai: { version: 1, features: { paid2h: input.convTraffic2h, attr2h: input.attrLastClick2h } },
    });
  }

  if (input.attribution24h) {
    const a = input.attribution24h;
    const total =
      (a.MATCHED ?? 0) +
      (a.PARTIAL_MATCH ?? 0) +
      (a.UNATTRIBUTED ?? 0) +
      (a.SUSPICIOUS ?? 0) +
      (a.DUPLICATE ?? 0);
    const weak = (a.UNATTRIBUTED ?? 0) + (a.PARTIAL_MATCH ?? 0);
    if (total >= 10 && weak / total > 0.35) {
      out.push({
        id: "conversion:attr_unmatched_rate_24h",
        severity: "warning",
        group: "conversion",
        title: "Tỷ lệ match attribution thấp (24h)",
        detail: `${Math.round((weak / total) * 100)}% đơn UNATTRIBUTED/PARTIAL trong cửa sổ conversion match.`,
        ts,
        score: 52,
        ai: { version: 1, features: { weak, total } },
      });
    }
    if ((a.DUPLICATE ?? 0) >= 4) {
      out.push({
        id: "conversion:attr_duplicate_spike",
        severity: "info",
        group: "conversion",
        title: "Nhiều conversion DUPLICATE (24h)",
        detail: "Pixel/order paid có thể double-fire — kiểm tra dedupe.",
        ts,
        score: 28,
      });
    }
    if ((a.SUSPICIOUS ?? 0) >= 2) {
      out.push({
        id: "fraud:attr_self_ref_signal",
        severity: "warning",
        group: "fraud",
        title: "Attribution đánh dấu rủi ro",
        detail: "Có conversion SUSPICIOUS (self-referral / policy) trong 24h.",
        ts,
        score: 55,
      });
    }
  }

  const staleMs = 36 * 60 * 60 * 1000;
  for (const p of input.pixels) {
    if (p.status !== "CONNECTED") continue;
    const last = p.lastEventAt ? new Date(p.lastEventAt).getTime() : 0;
    if (!last || ts - last > staleMs) {
      out.push({
        id: `pixel:silence:${p.provider}`,
        severity: "warning",
        group: "pixel",
        title: `Pixel ${p.provider} im lặng`,
        detail: last ? `Sự kiện cuối ${new Date(last).toLocaleString("vi-VN")}` : "Chưa có lastEventAt.",
        ts,
        score: 48,
      });
    }
  }

  out.sort(
    (a, b) => sevOrder(a.severity) - sevOrder(b.severity) || (b.score ?? 0) - (a.score ?? 0),
  );
  return out;
}
