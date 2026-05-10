import type { Prisma } from "@prisma/client";
import type { DealsAggregateRow } from "./aggregation";

export type DealsDailySnapshot = {
  day: string; // YYYY-MM-DD in UTC
  createdAt: string;
  windowDays: number;
  totals: { impressions: number; clicks: number; ctr: number; couponUsage: number };
  bySection: DealsAggregateRow[];
};

export type DealsSnapshotCompactionResult = {
  before: number;
  after: number;
  keptDaily: number;
  keptWeekly: number;
  keptMonthly: number;
};

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function utcDayString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseUtcDay(day: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, mo - 1, d));
}

function weekKeyUtc(date: Date): string {
  // ISO-ish week key using UTC Thursday anchor (good enough, deterministic, UTC-safe)
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + (4 - day));
  const year = tmp.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function monthKeyUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function compactDealsSnapshots(
  snapshots: DealsDailySnapshot[],
  now: Date = new Date(),
  retention: { dailyDays: number; weeklyMonths: number; monthlyYears: number } = { dailyDays: 60, weeklyMonths: 6, monthlyYears: 1 },
): { snapshots: DealsDailySnapshot[]; result: DealsSnapshotCompactionResult } {
  const before = Array.isArray(snapshots) ? snapshots.length : 0;
  const safe = (Array.isArray(snapshots) ? snapshots : []).filter((s) => s && typeof s === "object" && typeof s.day === "string");
  const uniqByDay = new Map<string, DealsDailySnapshot>();
  for (const s of safe) {
    if (!s.day) continue;
    const existing = uniqByDay.get(s.day);
    // keep newest createdAt for same day
    if (!existing || String(s.createdAt) > String(existing.createdAt)) uniqByDay.set(s.day, s);
  }
  const all = [...uniqByDay.values()].sort((a, b) => String(b.day).localeCompare(String(a.day)));

  const msDay = 24 * 60 * 60 * 1000;
  const dailyCutoff = new Date(now.getTime() - retention.dailyDays * msDay);
  const weeklyCutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - retention.weeklyMonths, now.getUTCDate()));
  const monthlyCutoff = new Date(Date.UTC(now.getUTCFullYear() - retention.monthlyYears, now.getUTCMonth(), now.getUTCDate()));

  const keep: DealsDailySnapshot[] = [];
  const keptDays = new Set<string>();
  const keptWeeks = new Set<string>();
  const keptMonths = new Set<string>();

  for (const s of all) {
    const dt = parseUtcDay(s.day);
    if (!dt) continue;

    if (dt >= dailyCutoff) {
      keep.push(s);
      keptDays.add(s.day);
      continue;
    }

    if (dt >= weeklyCutoff) {
      const wk = weekKeyUtc(dt);
      if (keptWeeks.has(wk)) continue;
      keptWeeks.add(wk);
      keep.push(s);
      continue;
    }

    if (dt >= monthlyCutoff) {
      const mk = monthKeyUtc(dt);
      if (keptMonths.has(mk)) continue;
      keptMonths.add(mk);
      keep.push(s);
      continue;
    }
  }

  const after = keep.length;
  return {
    snapshots: keep.sort((a, b) => String(b.day).localeCompare(String(a.day))),
    result: { before, after, keptDaily: keptDays.size, keptWeekly: keptWeeks.size, keptMonthly: keptMonths.size },
  };
}

export async function saveDealsDailySnapshot(
  db: { setting: { findUnique: (args: Record<string, unknown>) => Promise<{ value?: unknown } | null>; upsert: (args: Record<string, unknown>) => Promise<unknown> } },
  snapshot: DealsDailySnapshot,
): Promise<void> {
  const row = await db.setting.findUnique({ where: { key: "deals_metrics_snapshots" }, select: { value: true } });
  const existing = Array.isArray(row?.value) ? (row?.value as DealsDailySnapshot[]) : [];
  const nextRaw = [snapshot, ...existing.filter((s) => s?.day !== snapshot.day)];
  const compacted = compactDealsSnapshots(nextRaw, new Date(), { dailyDays: 60, weeklyMonths: 6, monthlyYears: 1 }).snapshots;
  await db.setting.upsert({
    where: { key: "deals_metrics_snapshots" },
    update: { value: toJson(compacted), group: "website", description: "Deals metrics daily snapshots", isPublic: false },
    create: { key: "deals_metrics_snapshots", value: toJson(compacted), group: "website", description: "Deals metrics daily snapshots", isPublic: false },
  });
}

