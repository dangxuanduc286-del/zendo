import type { DealsSectionConfig } from "../settings";

type SectionKey = keyof DealsSectionConfig;

function byId(sections: DealsSectionConfig[]): Map<string, DealsSectionConfig> {
  const m = new Map<string, DealsSectionConfig>();
  for (const s of sections) {
    if (s?.id) m.set(s.id, s);
  }
  return m;
}

function pickSummary(s: DealsSectionConfig): Record<string, unknown> {
  return {
    id: s.id,
    type: s.type,
    title: s.title,
    subtitle: s.subtitle ?? "",
    enabled: Boolean(s.enabled),
    sortOrder: Number(s.sortOrder ?? 0),
    theme: s.theme ?? null,
    banner: s.banner ?? null,
    countdown: s.countdown ?? null,
    productSource: s.productSource ?? null,
    voucherSource: s.voucherSource ?? null,
  };
}

export function diffDealsSectionsSummary(args: {
  from: DealsSectionConfig[];
  to: DealsSectionConfig[];
  maxLines?: number;
}): string[] {
  const maxLines = Math.max(5, Math.min(50, args.maxLines ?? 15));
  const from = Array.isArray(args.from) ? args.from : [];
  const to = Array.isArray(args.to) ? args.to : [];

  const fromMap = byId(from);
  const toMap = byId(to);

  const lines: string[] = [];

  for (const s of to) {
    if (!fromMap.has(s.id)) lines.push(`+ Added section: ${s.title || s.id}`);
  }
  for (const s of from) {
    if (!toMap.has(s.id)) lines.push(`- Removed section: ${s.title || s.id}`);
  }

  for (const s of to) {
    const prev = fromMap.get(s.id);
    if (!prev) continue;
    const a = pickSummary(prev);
    const b = pickSummary(s);
    const changed: SectionKey[] = [];
    for (const key of Object.keys(a) as SectionKey[]) {
      const av = (a as Record<string, unknown>)[key as string];
      const bv = (b as Record<string, unknown>)[key as string];
      if (JSON.stringify(av) !== JSON.stringify(bv)) changed.push(key);
    }
    if (changed.length) lines.push(`~ Updated section: ${s.title || s.id} (${changed.join(", ")})`);
  }

  if (!lines.length) return ["No changes."];
  return lines.slice(0, maxLines);
}

