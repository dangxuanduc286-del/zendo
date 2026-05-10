import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { invalidateDealsCaches } from "../../../../../lib/deals/invalidate";
import type { DealsSectionConfig } from "../../../../../lib/settings";
import { validateDealsSectionsDraft } from "../../../../../lib/deals/validate";
import { CouponStatus, Prisma } from "@prisma/client";
import { validateSchedule } from "../../../../../lib/deals/schedule";
import { appendDealsAuditEntry } from "../../../../../lib/deals/audit";
import { diffDealsSectionsSummary } from "../../../../../lib/deals/diff";

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

function isAdminRole(role?: string | null): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeSections(value: unknown): DealsSectionConfig[] {
  const rows = asArray(value);
  return rows as unknown as DealsSectionConfig[];
}

type DealsActor = { id: string; role: string };
type DealsVersionEntry = {
  id: string;
  capturedAt: string;
  actor: DealsActor;
  sections: DealsSectionConfig[];
  kind: "auto-before-publish" | "auto-before-rollback";
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseVersionEntry(value: unknown): DealsVersionEntry | null {
  const obj = asObject(value);
  if (!obj) return null;
  const id = typeof obj.id === "string" ? obj.id : "";
  const capturedAt = typeof obj.capturedAt === "string" ? obj.capturedAt : "";
  const kind = obj.kind === "auto-before-publish" || obj.kind === "auto-before-rollback" ? obj.kind : null;
  const actorObj = asObject(obj.actor);
  const actor: DealsActor | null =
    actorObj && typeof actorObj.id === "string" ? { id: actorObj.id, role: typeof actorObj.role === "string" ? actorObj.role : "" } : null;
  const sections = Array.isArray(obj.sections) ? (obj.sections as unknown as DealsSectionConfig[]) : null;
  if (!id || !capturedAt || !kind || !actor || !sections) return null;
  return { id, capturedAt, kind, actor, sections };
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function jsonEqual(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(session.user.role)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const db = await getDbClient();
  if (!db) return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });

  const [draftRow, publishedRow, metaRow, versionsRow, scheduledRow] = await Promise.all([
    db.setting.findUnique({ where: { key: "deals_sections_draft" }, select: { value: true, updatedAt: true } }),
    db.setting.findUnique({ where: { key: "website_settings" }, select: { value: true, updatedAt: true } }),
    db.setting.findUnique({ where: { key: "deals_sections_published_meta" }, select: { value: true, updatedAt: true } }),
    db.setting.findUnique({ where: { key: "deals_sections_versions" }, select: { value: true, updatedAt: true } }),
    db.setting.findUnique({ where: { key: "deals_sections_scheduled" }, select: { value: true, updatedAt: true } }),
  ]);

  const publishedValue =
    publishedRow?.value && typeof publishedRow.value === "object" && !Array.isArray(publishedRow.value)
      ? (publishedRow.value as Record<string, unknown>)
      : {};
  const publishedSections = normalizeSections(publishedValue.dealsSections);
  const draftSections = normalizeSections(draftRow?.value);
  const draftExists = Boolean(draftRow);
  const scheduledValue =
    scheduledRow?.value && typeof scheduledRow.value === "object" && !Array.isArray(scheduledRow.value)
      ? (scheduledRow.value as Record<string, unknown>)
      : null;
  const scheduledSections =
    Array.isArray(scheduledValue?.sections) ? (scheduledValue?.sections as unknown as DealsSectionConfig[]) : [];

  return NextResponse.json({
    draft: { exists: draftExists, updatedAt: draftRow?.updatedAt ?? null, count: draftSections.length },
    published: { updatedAt: publishedRow?.updatedAt ?? null, count: publishedSections.length },
    meta: { value: metaRow?.value ?? null, updatedAt: metaRow?.updatedAt ?? null },
    versions: { value: versionsRow?.value ?? [], updatedAt: versionsRow?.updatedAt ?? null },
    scheduled: { value: scheduledRow?.value ?? null, updatedAt: scheduledRow?.updatedAt ?? null },
    draftDiffersFromPublished: draftExists ? !jsonEqual(draftSections, publishedSections) : false,
    diffs: {
      draftVsPublished: diffDealsSectionsSummary({ from: publishedSections, to: draftSections }),
      scheduledVsPublished: diffDealsSectionsSummary({ from: publishedSections, to: scheduledSections }),
    },
  });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(session.user.role)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as unknown;
  const action =
    body && typeof body === "object" && "action" in body ? String((body as Record<string, unknown>).action) : "";
  const force =
    body && typeof body === "object" && "force" in body ? Boolean((body as Record<string, unknown>).force) : false;
  const versionId =
    body && typeof body === "object" && "versionId" in body ? String((body as Record<string, unknown>).versionId) : "";
  const publishAt =
    body && typeof body === "object" && "publishAt" in body ? String((body as Record<string, unknown>).publishAt ?? "") : "";
  const unpublishAt =
    body && typeof body === "object" && "unpublishAt" in body ? String((body as Record<string, unknown>).unpublishAt ?? "") : "";

  const db = await getDbClient();
  if (!db) return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });

  if (action === "discard") {
    await db.setting.deleteMany({ where: { key: "deals_sections_draft" } });
    await appendDealsAuditEntry(db, {
      action: "discard_draft",
      actorId: session.user.id,
      actorName: session.user.email ?? session.user.name ?? session.user.id,
    });
    return NextResponse.json({ success: true });
  }

  const now = new Date();

  if (action === "schedule") {
    const scheduleCheck = validateSchedule({ publishAt, unpublishAt });
    if (!scheduleCheck.ok) {
      const msg = "warning" in scheduleCheck ? String((scheduleCheck as Record<string, unknown>).warning ?? "") : "";
      return NextResponse.json({ success: false, warnings: [{ message: msg }] }, { status: 200 });
    }
    const draftRow = await db.setting.findUnique({ where: { key: "deals_sections_draft" }, select: { value: true } });
    const draftSections = normalizeSections(draftRow?.value);
    const scheduledValue = toJson({ publishAt: publishAt || null, unpublishAt: unpublishAt || null, sections: draftSections });
    await db.setting.upsert({
      where: { key: "deals_sections_scheduled" },
      update: { value: scheduledValue, group: "website", description: "Deals scheduled campaign", isPublic: false },
      create: { key: "deals_sections_scheduled", value: scheduledValue, group: "website", description: "Deals scheduled campaign", isPublic: false },
    });
    await appendDealsAuditEntry(db, {
      action: "schedule",
      actorId: session.user.id,
      actorName: session.user.email ?? session.user.name ?? session.user.id,
      metadata: { publishAt: publishAt || undefined, unpublishAt: unpublishAt || undefined },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "cancelSchedule") {
    await db.setting.deleteMany({ where: { key: "deals_sections_scheduled" } });
    await appendDealsAuditEntry(db, {
      action: "cancel_schedule",
      actorId: session.user.id,
      actorName: session.user.email ?? session.user.name ?? session.user.id,
    });
    return NextResponse.json({ success: true });
  }

  if (action === "rollback") {
    if (!versionId) return NextResponse.json({ message: "Missing versionId" }, { status: 400 });
    const versionsRow = await db.setting.findUnique({ where: { key: "deals_sections_versions" }, select: { value: true } });
    const versionsRaw = asArray(versionsRow?.value);
    const versions = versionsRaw.map(parseVersionEntry).filter(Boolean) as DealsVersionEntry[];
    const match = versions.find((v) => v.id === versionId) ?? null;
    if (!match) {
      return NextResponse.json({ message: "Invalid version" }, { status: 400 });
    }
    const nextSections = match.sections;

    await db.$transaction(async (tx) => {
      const publishedRow = await tx.setting.findUnique({ where: { key: "website_settings" }, select: { value: true } });
      const publishedValue =
        publishedRow?.value && typeof publishedRow.value === "object" && !Array.isArray(publishedRow.value)
          ? (publishedRow.value as Record<string, unknown>)
          : {};
      const prevSections = normalizeSections(publishedValue.dealsSections);

      const nextValue = { ...publishedValue, dealsSections: nextSections };

      const prevEntry = {
        id: `v_${now.getTime()}_${Math.random().toString(16).slice(2)}`,
        capturedAt: now.toISOString(),
        actor: { id: session.user.id, role: session.user.role ?? "" },
        sections: prevSections,
        kind: "auto-before-rollback",
      };

      const nextVersions = [prevEntry, ...versions].slice(0, 15);

      await tx.setting.upsert({
        where: { key: "website_settings" },
        update: { value: toJson(nextValue), group: "website", description: "Website settings", isPublic: true },
        create: { key: "website_settings", value: toJson(nextValue), group: "website", description: "Website settings", isPublic: true },
      });
      await tx.setting.upsert({
        where: { key: "deals_sections_versions" },
        update: { value: toJson(nextVersions), group: "website", description: "Deals versions", isPublic: false },
        create: { key: "deals_sections_versions", value: toJson(nextVersions), group: "website", description: "Deals versions", isPublic: false },
      });
      await tx.setting.upsert({
        where: { key: "deals_sections_published_meta" },
        update: { value: toJson({ publishedAt: now.toISOString(), publishedBy: { id: session.user.id, role: session.user.role ?? "" } }), group: "website", description: "Deals publish meta", isPublic: false },
        create: { key: "deals_sections_published_meta", value: toJson({ publishedAt: now.toISOString(), publishedBy: { id: session.user.id, role: session.user.role ?? "" } }), group: "website", description: "Deals publish meta", isPublic: false },
      });
    });

    invalidateDealsCaches();
    await appendDealsAuditEntry(db, {
      action: "rollback",
      actorId: session.user.id,
      actorName: session.user.email ?? session.user.name ?? session.user.id,
      metadata: { versionId },
    });
    return NextResponse.json({ success: true });
  }

  if (action !== "publish") return NextResponse.json({ message: "Invalid action" }, { status: 400 });

  const [draftRow, publishedRow, versionsRow] = await Promise.all([
    db.setting.findUnique({ where: { key: "deals_sections_draft" }, select: { value: true } }),
    db.setting.findUnique({ where: { key: "website_settings" }, select: { value: true } }),
    db.setting.findUnique({ where: { key: "deals_sections_versions" }, select: { value: true } }),
  ]);

  const draftSections = normalizeSections(draftRow?.value);
  const publishedValue =
    publishedRow?.value && typeof publishedRow.value === "object" && !Array.isArray(publishedRow.value)
      ? (publishedRow.value as Record<string, unknown>)
      : {};
  const publishedSections = normalizeSections(publishedValue.dealsSections);

  const deps = {
    findExistingProductIds: async (ids: string[]) => {
      const rows = await db.product.findMany({ where: { id: { in: ids } }, select: { id: true } });
      return new Set(rows.map((r) => r.id));
    },
    findExistingCouponIds: async (ids: string[]) => {
      const rows = await db.coupon.findMany({ where: { id: { in: ids } }, select: { id: true } });
      return new Set(rows.map((r) => r.id));
    },
    findExpiredCouponIds: async (ids: string[], nowDate: Date) => {
      const rows = await db.coupon.findMany({
        where: {
          id: { in: ids },
          OR: [
            { status: { not: ("ACTIVE" as CouponStatus) } },
            { endsAt: { lt: nowDate } },
          ],
        },
        select: { id: true },
      });
      return new Set(rows.map((r) => r.id));
    },
  };

  const warnings = await validateDealsSectionsDraft(draftSections, deps, { publishAt, unpublishAt }, now);

  if (warnings.length && !force) {
    return NextResponse.json({ success: false, warnings }, { status: 200 });
  }

  const versionsRaw = asArray(versionsRow?.value);
  const versions = versionsRaw.map(parseVersionEntry).filter(Boolean) as DealsVersionEntry[];
  const beforeEntry = {
    id: `v_${now.getTime()}_${Math.random().toString(16).slice(2)}`,
    capturedAt: now.toISOString(),
    actor: { id: session.user.id, role: session.user.role ?? "" },
    sections: publishedSections,
    kind: "auto-before-publish",
  };
  const nextVersions = [beforeEntry, ...versions].slice(0, 15);

  await db.$transaction(async (tx) => {
    const nextValue = { ...publishedValue, dealsSections: draftSections };
    await tx.setting.upsert({
      where: { key: "website_settings" },
      update: { value: toJson(nextValue), group: "website", description: "Website settings", isPublic: true },
      create: { key: "website_settings", value: toJson(nextValue), group: "website", description: "Website settings", isPublic: true },
    });
    await tx.setting.upsert({
      where: { key: "deals_sections_published_meta" },
      update: {
        value: {
          publishedAt: now.toISOString(),
          publishedBy: { id: session.user.id, role: session.user.role ?? "" },
          publishAt: publishAt || null,
          unpublishAt: unpublishAt || null,
          rollbackVersionId: beforeEntry.id,
          prevSections: publishedSections,
        },
        group: "website",
        description: "Deals publish meta",
        isPublic: false,
      },
      create: {
        key: "deals_sections_published_meta",
        value: {
          publishedAt: now.toISOString(),
          publishedBy: { id: session.user.id, role: session.user.role ?? "" },
          publishAt: publishAt || null,
          unpublishAt: unpublishAt || null,
          rollbackVersionId: beforeEntry.id,
          prevSections: publishedSections,
        },
        group: "website",
        description: "Deals publish meta",
        isPublic: false,
      },
    });
    await tx.setting.upsert({
      where: { key: "deals_sections_versions" },
      update: { value: toJson(nextVersions), group: "website", description: "Deals versions", isPublic: false },
      create: { key: "deals_sections_versions", value: toJson(nextVersions), group: "website", description: "Deals versions", isPublic: false },
    });
    await tx.setting.deleteMany({ where: { key: "deals_sections_draft" } });
  });

  invalidateDealsCaches();
  await appendDealsAuditEntry(db, {
    action: "publish",
    actorId: session.user.id,
    actorName: session.user.email ?? session.user.name ?? session.user.id,
    metadata: { publishAt: publishAt || undefined, unpublishAt: unpublishAt || undefined, warningsCount: warnings.length },
  });
  return NextResponse.json({ success: true, warnings });
}

