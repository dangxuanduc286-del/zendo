export type CampaignStatus = "draft" | "scheduled" | "live" | "expired" | "unpublished";

export function parseIsoOrNull(value?: string | null): Date | null {
  const v = (value || "").trim();
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function resolveCampaignStatus(args: {
  now: Date;
  publishAt?: string | null;
  unpublishAt?: string | null;
  hasContent: boolean;
  unpublished?: boolean;
}): CampaignStatus {
  const publishAt = parseIsoOrNull(args.publishAt);
  const unpublishAt = parseIsoOrNull(args.unpublishAt);
  const now = args.now;
  if (!args.hasContent) return "unpublished";
  if (args.unpublished) return "unpublished";
  if (publishAt && now < publishAt) return "scheduled";
  if (unpublishAt && now > unpublishAt) return "expired";
  if (publishAt || unpublishAt) return "live";
  return "live";
}

export function validateSchedule(args: {
  publishAt?: string | null;
  unpublishAt?: string | null;
}): { ok: true } | { ok: false; warning: string } {
  const publishAt = parseIsoOrNull(args.publishAt);
  const unpublishAt = parseIsoOrNull(args.unpublishAt);
  if ((args.publishAt || "").trim() && !publishAt) return { ok: false as const, warning: "Invalid publishAt ISO date." };
  if ((args.unpublishAt || "").trim() && !unpublishAt) return { ok: false as const, warning: "Invalid unpublishAt ISO date." };
  if (publishAt && unpublishAt && publishAt.getTime() >= unpublishAt.getTime()) {
    return { ok: false as const, warning: "publishAt must be before unpublishAt." };
  }
  return { ok: true as const };
}

