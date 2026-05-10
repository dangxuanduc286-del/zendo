import type { Prisma } from "@prisma/client";

export type DealsAuditAction =
  | "publish"
  | "rollback"
  | "schedule"
  | "cancel_schedule"
  | "discard_draft"
  | "auto_activate"
  | "auto_expire";

export type DealsAuditEntry = {
  id: string;
  action: DealsAuditAction;
  actorId?: string;
  actorName?: string;
  createdAt: string;
  metadata?: {
    versionId?: string;
    publishAt?: string;
    unpublishAt?: string;
    warningsCount?: number;
  };
};

export function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

type SettingRow = { value?: unknown } | null;
type DealsDbLike = {
  setting: {
    findUnique: (args: Record<string, unknown>) => Promise<SettingRow>;
    upsert: (args: Record<string, unknown>) => Promise<unknown>;
  };
};

export async function appendDealsAuditEntry(
  db: DealsDbLike,
  entry: Omit<DealsAuditEntry, "id" | "createdAt"> & { id?: string; createdAt?: string },
  opts?: { retain?: number },
): Promise<DealsAuditEntry> {
  const retain = Math.max(50, Math.min(200, opts?.retain ?? 200));
  const now = new Date();
  const row = await db.setting.findUnique({ where: { key: "deals_audit_logs" }, select: { value: true } });
  const existingRaw = row && "value" in row ? (row.value as unknown) : null;
  const existing = Array.isArray(existingRaw) ? (existingRaw as DealsAuditEntry[]) : [];

  const full: DealsAuditEntry = {
    id: entry.id || `a_${now.getTime()}_${Math.random().toString(16).slice(2)}`,
    action: entry.action,
    actorId: entry.actorId,
    actorName: entry.actorName,
    createdAt: entry.createdAt || now.toISOString(),
    metadata: entry.metadata,
  };

  const next = [full, ...existing].slice(0, retain);
  await db.setting.upsert({
    where: { key: "deals_audit_logs" },
    update: { value: toJson(next), group: "website", description: "Deals audit logs", isPublic: false },
    create: { key: "deals_audit_logs", value: toJson(next), group: "website", description: "Deals audit logs", isPublic: false },
  });
  return full;
}

