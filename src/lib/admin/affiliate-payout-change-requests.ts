import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  canApprovePayoutAccount,
  canRejectPayoutAccount,
  canViewPayoutAccounts,
} from "@/lib/admin/permissions";
import type { AffiliatePayoutChangeRequestStatus, Prisma } from "@prisma/client";
import {
  publishAffiliatePayoutChangeRequestApproved,
  publishAffiliatePayoutChangeRequestRejected,
} from "@/lib/affiliate/customer-payout-notifications";

export type AdminChangeRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AdminPayoutChangeAuditItem = {
  id: string;
  createdAt: Date;
  action: string;
  admin: { id: string; fullName: string; email: string } | null;
  metadata: Record<string, unknown>;
};

export type AdminPayoutChangeRequestListItem = {
  id: string;
  status: AdminChangeRequestStatus;
  requestedAt: Date;
  reviewedAt: Date | null;
  payoutAccountId: string;
  requestedBankName: string;
  requestedBankAccountNumberMasked: string;
  requestedBankAccountHolder: string;
  customer: { id: string; fullName: string | null; email: string | null } | null;
};

export type AdminPayoutChangeRequestDetail = {
  id: string;
  status: AdminChangeRequestStatus;
  rejectionReason: string | null;
  requestedAt: Date;
  reviewedAt: Date | null;
  currentBankName: string;
  currentBankAccountNumber: string;
  currentBankAccountHolder: string;
  requestedBankName: string;
  requestedBankAccountNumber: string;
  requestedBankAccountHolder: string;
  citizenIdFrontObjectKey: string;
  citizenIdBackObjectKey: string;
  payoutAccountId: string;
  payoutVerificationStatus: string;
  customer: { id: string; fullName: string | null; email: string | null; phone: string | null } | null;
  reviewedByAdmin: { id: string; fullName: string; email: string } | null;
  auditLogs: AdminPayoutChangeAuditItem[];
  /** Prior resolved requests same payout account */
  siblingHistory: Array<{
    id: string;
    status: AdminChangeRequestStatus;
    requestedAt: Date;
    reviewedAt: Date | null;
  }>;
};

type AdminActor = { adminId: string; session: NonNullable<Awaited<ReturnType<typeof getServerSession>>> };

export async function requireAdminActorForChangeRequests(): Promise<AdminActor> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  if (!canViewPayoutAccounts(session)) throw new Error("FORBIDDEN");
  return { adminId: session.user.id, session };
}

function maskAccountNumber(value: string): string {
  const raw = (value || "").replace(/\s+/g, "").trim();
  if (!raw) return "";
  if (raw.length <= 4) return raw;
  return `${"*".repeat(Math.min(8, raw.length - 4))}${raw.slice(-4)}`;
}

export async function listAffiliatePayoutAccountChangeRequests(input: {
  status: AdminChangeRequestStatus;
  q?: string;
}): Promise<AdminPayoutChangeRequestListItem[]> {
  const q = (input.q ?? "").trim();
  const rows = await db.affiliatePayoutAccountChangeRequest.findMany({
    where: {
      status: input.status as AffiliatePayoutChangeRequestStatus,
      ...(q
        ? {
            OR: [
              { requestedBankName: { contains: q, mode: "insensitive" } },
              { requestedBankAccountHolder: { contains: q, mode: "insensitive" } },
              { currentBankName: { contains: q, mode: "insensitive" } },
              {
                affiliateProfile: {
                  customer: {
                    OR: [
                      { fullName: { contains: q, mode: "insensitive" } },
                      { email: { contains: q, mode: "insensitive" } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { requestedAt: "desc" },
    take: 500,
    select: {
      id: true,
      status: true,
      requestedAt: true,
      reviewedAt: true,
      payoutAccountId: true,
      requestedBankName: true,
      requestedBankAccountNumber: true,
      requestedBankAccountHolder: true,
      affiliateProfile: {
        select: {
          customer: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    status: r.status as AdminChangeRequestStatus,
    requestedAt: r.requestedAt,
    reviewedAt: r.reviewedAt,
    payoutAccountId: r.payoutAccountId,
    requestedBankName: r.requestedBankName,
    requestedBankAccountNumberMasked: maskAccountNumber(r.requestedBankAccountNumber),
    requestedBankAccountHolder: r.requestedBankAccountHolder,
    customer: r.affiliateProfile.customer,
  }));
}

async function auditRowsForChangeRequest(changeRequestId: string): Promise<AdminPayoutChangeAuditItem[]> {
  const auditRows = await db.auditLog.findMany({
    where: { entity: "AffiliatePayoutAccountChangeRequest", entityId: changeRequestId },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      createdAt: true,
      action: true,
      metadata: true,
      admin: { select: { id: true, fullName: true, email: true } },
    },
  });
  return auditRows.map((a) => ({
    id: a.id,
    createdAt: a.createdAt,
    action: a.action,
    admin: a.admin,
    metadata:
      a.metadata && typeof a.metadata === "object" && !Array.isArray(a.metadata)
        ? (a.metadata as Record<string, unknown>)
        : {},
  }));
}

export async function getAffiliatePayoutAccountChangeRequestDetail(id: string): Promise<AdminPayoutChangeRequestDetail | null> {
  const row = await db.affiliatePayoutAccountChangeRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      rejectionReason: true,
      requestedAt: true,
      reviewedAt: true,
      currentBankName: true,
      currentBankAccountNumber: true,
      currentBankAccountHolder: true,
      requestedBankName: true,
      requestedBankAccountNumber: true,
      requestedBankAccountHolder: true,
      citizenIdFrontObjectKey: true,
      citizenIdBackObjectKey: true,
      payoutAccountId: true,
      reviewedByAdmin: { select: { id: true, fullName: true, email: true } },
      payoutAccount: { select: { verificationStatus: true } },
      affiliateProfile: {
        select: {
          customer: { select: { id: true, fullName: true, email: true, phone: true } },
        },
      },
    },
  });
  if (!row) return null;

  const siblingHistory = await db.affiliatePayoutAccountChangeRequest.findMany({
    where: { payoutAccountId: row.payoutAccountId, id: { not: row.id } },
    orderBy: { requestedAt: "desc" },
    take: 20,
    select: { id: true, status: true, requestedAt: true, reviewedAt: true },
  });

  const auditLogs = await auditRowsForChangeRequest(row.id);

  return {
    id: row.id,
    status: row.status as AdminChangeRequestStatus,
    rejectionReason: row.rejectionReason,
    requestedAt: row.requestedAt,
    reviewedAt: row.reviewedAt,
    currentBankName: row.currentBankName,
    currentBankAccountNumber: row.currentBankAccountNumber,
    currentBankAccountHolder: row.currentBankAccountHolder,
    requestedBankName: row.requestedBankName,
    requestedBankAccountNumber: row.requestedBankAccountNumber,
    requestedBankAccountHolder: row.requestedBankAccountHolder,
    citizenIdFrontObjectKey: row.citizenIdFrontObjectKey,
    citizenIdBackObjectKey: row.citizenIdBackObjectKey,
    payoutAccountId: row.payoutAccountId,
    payoutVerificationStatus: row.payoutAccount.verificationStatus,
    customer: row.affiliateProfile.customer,
    reviewedByAdmin: row.reviewedByAdmin,
    auditLogs,
    siblingHistory: siblingHistory.map((s) => ({
      id: s.id,
      status: s.status as AdminChangeRequestStatus,
      requestedAt: s.requestedAt,
      reviewedAt: s.reviewedAt,
    })),
  };
}

async function writeAuditTx(
  tx: Prisma.TransactionClient,
  input: {
    adminId: string;
    customerId: string | null;
    entity: string;
    entityId: string;
    action: string;
    metadata: Record<string, unknown>;
  },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      adminId: input.adminId,
      customerId: input.customerId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      metadata: JSON.parse(JSON.stringify(input.metadata)),
    },
  });
}

export async function approveAffiliatePayoutAccountChangeRequest(id: string, actor: AdminActor): Promise<void> {
  if (!canApprovePayoutAccount(actor.session)) throw new Error("FORBIDDEN");

  await db.$transaction(async (tx) => {
    const cr = await tx.affiliatePayoutAccountChangeRequest.findUnique({
      where: { id },
      select: {
        status: true,
        affiliateProfileId: true,
        payoutAccountId: true,
        payoutAccount: {
          select: {
            id: true,
            verificationStatus: true,
            bankName: true,
            bankAccountNumber: true,
            bankAccountHolder: true,
            citizenIdFrontObjectKey: true,
            citizenIdBackObjectKey: true,
            affiliateProfile: { select: { customerId: true } },
          },
        },
        requestedBankName: true,
        requestedBankAccountNumber: true,
        requestedBankAccountHolder: true,
        citizenIdFrontObjectKey: true,
        citizenIdBackObjectKey: true,
      },
    });
    if (!cr || cr.status !== "PENDING") throw new Error("INVALID_STATE");
    if (cr.payoutAccount.verificationStatus !== "APPROVED") throw new Error("INVALID_PAYOUT_ACCOUNT");

    const payoutId = cr.payoutAccount.id;
    const snapshotBefore = {
      bankName: cr.payoutAccount.bankName,
      bankAccountNumber: cr.payoutAccount.bankAccountNumber,
      bankAccountHolder: cr.payoutAccount.bankAccountHolder,
      citizenIdFrontObjectKey: cr.payoutAccount.citizenIdFrontObjectKey,
      citizenIdBackObjectKey: cr.payoutAccount.citizenIdBackObjectKey,
    };
    const snapshotRequested = {
      bankName: cr.requestedBankName,
      bankAccountNumber: cr.requestedBankAccountNumber,
      bankAccountHolder: cr.requestedBankAccountHolder,
      citizenIdFrontObjectKey: cr.citizenIdFrontObjectKey,
      citizenIdBackObjectKey: cr.citizenIdBackObjectKey,
    };

    await tx.affiliatePayoutAccount.update({
      where: { id: payoutId },
      data: {
        bankName: cr.requestedBankName,
        bankAccountNumber: cr.requestedBankAccountNumber,
        bankAccountHolder: cr.requestedBankAccountHolder,
        citizenIdFrontObjectKey: cr.citizenIdFrontObjectKey,
        citizenIdBackObjectKey: cr.citizenIdBackObjectKey,
        verificationStatus: "APPROVED",
        rejectionReason: null,
        verifiedAt: new Date(),
        verifiedByAdminId: actor.adminId,
      },
    });

    await tx.affiliatePayoutAccountChangeRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedByAdminId: actor.adminId,
        rejectionReason: null,
      },
    });

    await writeAuditTx(tx, {
      adminId: actor.adminId,
      customerId: cr.payoutAccount.affiliateProfile.customerId,
      entity: "AffiliatePayoutAccount",
      entityId: payoutId,
      action: "payout_account:change_apply",
      metadata: {
        changeRequestId: id,
        before: snapshotBefore,
        after: snapshotRequested,
      },
    });

    await writeAuditTx(tx, {
      adminId: actor.adminId,
      customerId: cr.payoutAccount.affiliateProfile.customerId,
      entity: "AffiliatePayoutAccountChangeRequest",
      entityId: id,
      action: "change_request:approve",
      metadata: {
        payoutAccountId: payoutId,
        affiliateProfileId: cr.affiliateProfileId,
      },
    });
  });

  const crRow = await db.affiliatePayoutAccountChangeRequest.findUnique({
    where: { id },
    select: { affiliateProfile: { select: { customerId: true } } },
  });
  const cid = crRow?.affiliateProfile?.customerId;
  if (cid) publishAffiliatePayoutChangeRequestApproved({ customerId: cid, changeRequestId: id });
}

export async function rejectAffiliatePayoutAccountChangeRequest(
  id: string,
  reason: string,
  actor: AdminActor,
): Promise<void> {
  if (!canRejectPayoutAccount(actor.session)) throw new Error("FORBIDDEN");
  const trimmed = reason.trim();
  if (!trimmed) throw new Error("MISSING_REASON");

  await db.$transaction(async (tx) => {
    const cr = await tx.affiliatePayoutAccountChangeRequest.findUnique({
      where: { id },
      select: {
        status: true,
        affiliateProfileId: true,
        payoutAccountId: true,
        payoutAccount: {
          select: {
            affiliateProfile: { select: { customerId: true } },
          },
        },
      },
    });
    if (!cr || cr.status !== "PENDING") throw new Error("INVALID_STATE");

    await tx.affiliatePayoutAccountChangeRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: trimmed.slice(0, 2000),
        reviewedAt: new Date(),
        reviewedByAdminId: actor.adminId,
      },
    });

    await writeAuditTx(tx, {
      adminId: actor.adminId,
      customerId: cr.payoutAccount.affiliateProfile.customerId,
      entity: "AffiliatePayoutAccountChangeRequest",
      entityId: id,
      action: "change_request:reject",
      metadata: {
        payoutAccountId: cr.payoutAccountId,
        affiliateProfileId: cr.affiliateProfileId,
        reason: trimmed.slice(0, 2000),
      },
    });
  });

  const crRow = await db.affiliatePayoutAccountChangeRequest.findUnique({
    where: { id },
    select: { affiliateProfile: { select: { customerId: true } } },
  });
  const cid = crRow?.affiliateProfile?.customerId;
  if (cid) {
    publishAffiliatePayoutChangeRequestRejected({
      customerId: cid,
      changeRequestId: id,
      rejectionReason: trimmed.slice(0, 2000),
    });
  }
}
