import type { DealsSectionConfig } from "../settings";

function parseIsoOrNull(value?: string): Date | null {
  const v = (value || "").trim();
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function resolveDealsSections(sections: DealsSectionConfig[], now = new Date()): DealsSectionConfig[] {
  const rows = Array.isArray(sections) ? sections : [];
  return rows
    .filter((s) => Boolean(s.enabled))
    .filter((s) => {
      const c = s.countdown;
      if (!c?.enabled) return true;
      const startsAt = parseIsoOrNull(c.startsAt);
      const endsAt = parseIsoOrNull(c.endsAt);
      if (startsAt && now < startsAt) return false;
      if (endsAt && now > endsAt) return false;
      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

