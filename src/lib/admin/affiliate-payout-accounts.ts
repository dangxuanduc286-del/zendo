import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  canAccessAdminMediaProxy,
  canApprovePayoutAccount,
  canRejectPayoutAccount,
  canViewPayoutAccounts,
} from "@/lib/admin/permissions";
import {
  publishAffiliatePayoutAccountApproved,
  publishAffiliatePayoutAccountRejected,
} from "@/lib/affiliate/customer-payout-notifications";

export type AdminPayoutAccountStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AdminPayoutAuditLogItem = {
  id: string;
  createdAt: Date;
  action: "approve" | "reject" | "change_apply";
  admin: { id: string; fullName: string; email: string } | null;
  statusBefore: AdminPayoutAccountStatus | null;
  statusAfter: AdminPayoutAccountStatus | null;
  reason: string;
};

export type AdminPayoutAccountListItem = {
  id: string;
  verificationStatus: AdminPayoutAccountStatus;
  createdAt: Date;
  verifiedAt: Date | null;
  bankName: string;
  bankAccountNumberMasked: string;
  bankAccountHolder: string;
  customer: { id: string; fullName: string | null; email: string | null } | null;
};

export type AdminPayoutAccountDetail = {
  id: string;
  verificationStatus: AdminPayoutAccountStatus;
  createdAt: Date;
  verifiedAt: Date | null;
  rejectionReason: string | null;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  citizenIdFrontObjectKey: string;
  citizenIdBackObjectKey: string;
  verifiedByAdmin: { id: string; fullName: string; email: string } | null;
  customer: { id: string; fullName: string | null; email: string | null; phone: string | null } | null;
  auditLogs: AdminPayoutAuditLogItem[];
};

type AdminActor = { adminId: string; session: NonNullable<Awaited<ReturnType<typeof getServerSession>>> };

export async function requireAdminActor(): Promise<AdminActor> {
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

export async function listAffiliatePayoutAccounts(input: {
  status: AdminPayoutAccountStatus;
  q?: string;
}): Promise<AdminPayoutAccountListItem[]> {
  const q = (input.q ?? "").trim();

  const rows = await db.affiliatePayoutAccount.findMany({
    where: {
      verificationStatus: input.status,
      ...(q
        ? {
            OR: [
              { bankName: { contains: q, mode: "insensitive" } },
              { bankAccountHolder: { contains: q, mode: "insensitive" } },
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
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      verificationStatus: true,
      createdAt: true,
      verifiedAt: true,
      bankName: true,
      bankAccountNumber: true,
      bankAccountHolder: true,
      affiliateProfile: {
        select: {
          customer: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
    take: 500,
  });

  return rows.map((r) => ({
    id: r.id,
    verificationStatus: r.verificationStatus,
    createdAt: r.createdAt,
    verifiedAt: r.verifiedAt,
    bankName: r.bankName,
    bankAccountNumberMasked: maskAccountNumber(r.bankAccountNumber),
    bankAccountHolder: r.bankAccountHolder,
    customer: r.affiliateProfile.customer,
  }));
}

export async function getAffiliatePayoutAccountDetail(id: string): Promise<AdminPayoutAccountDetail | null> {
  const row = await db.affiliatePayoutAccount.findUnique({
    where: { id },
    select: {
      id: true,
      verificationStatus: true,
      createdAt: true,
      verifiedAt: true,
      rejectionReason: true,
      bankName: true,
      bankAccountNumber: true,
      bankAccountHolder: true,
      citizenIdFrontObjectKey: true,
      citizenIdBackObjectKey: true,
      verifiedByAdmin: { select: { id: true, fullName: true, email: true } },
      affiliateProfile: {
        select: {
          customer: { select: { id: true, fullName: true, email: true, phone: true } },
        },
      },
    },
  });
  if (!row) return null;

  const auditRows = await db.auditLog.findMany({
    where: { entity: "AffiliatePayoutAccount", entityId: row.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      action: true,
      metadata: true,
      admin: { select: { id: true, fullName: true, email: true } },
    },
  });

  const auditLogs: AdminPayoutAuditLogItem[] = auditRows
    .map((a) => {
      const meta =
        a.metadata && typeof a.metadata === "object" && !Array.isArray(a.metadata)
          ? (a.metadata as Record<string, unknown>)
          : {};
      const action: AdminPayoutAuditLogItem["action"] | null =
        a.action === "payout_account:approve"
          ? "approve"
          : a.action === "payout_account:reject"
            ? "reject"
            : a.action === "payout_account:change_apply"
              ? "change_apply"
              : null;
      if (!action) return null;
      const statusBefore = typeof meta.statusBefore === "string" ? (meta.statusBefore as AdminPayoutAccountStatus) : null;
      const statusAfter = typeof meta.statusAfter === "string" ? (meta.statusAfter as AdminPayoutAccountStatus) : null;
      const reasonBase = typeof meta.reason === "string" ? meta.reason : "";
      const reason =
        action === "change_apply" && typeof meta.changeRequestId === "string"
          ? `Yêu cầu đổi TK: ${meta.changeRequestId}`
          : reasonBase;
      return {
        id: a.id,
        createdAt: a.createdAt,
        action,
        admin: a.admin,
        statusBefore,
        statusAfter,
        reason,
      };
    })
    .filter(Boolean) as AdminPayoutAuditLogItem[];

  return {
    id: row.id,
    verificationStatus: row.verificationStatus,
    createdAt: row.createdAt,
    verifiedAt: row.verifiedAt,
    rejectionReason: row.rejectionReason,
    bankName: row.bankName,
    bankAccountNumber: row.bankAccountNumber,
    bankAccountHolder: row.bankAccountHolder,
    citizenIdFrontObjectKey: row.citizenIdFrontObjectKey,
    citizenIdBackObjectKey: row.citizenIdBackObjectKey,
    verifiedByAdmin: row.verifiedByAdmin,
    customer: row.affiliateProfile.customer,
    auditLogs,
  };
}

async function writePayoutAuditLog(input: {
  adminId: string;
  action: "payout_account:approve" | "payout_account:reject";
  payoutAccountId: string;
  targetUserId: string | null;
  statusBefore: AdminPayoutAccountStatus;
  statusAfter: AdminPayoutAccountStatus;
  reason?: string;
}): Promise<void> {
  const metadata = {
    payoutAccountId: input.payoutAccountId,
    targetUserId: input.targetUserId,
    statusBefore: input.statusBefore,
    statusAfter: input.statusAfter,
    reason: input.reason ?? "",
  };
  await db.auditLog.create({
    data: {
      adminId: input.adminId,
      customerId: input.targetUserId,
      action: input.action,
      entity: "AffiliatePayoutAccount",
      entityId: input.payoutAccountId,
      metadata: JSON.parse(JSON.stringify(metadata)),
    },
  });
}

export async function approveAffiliatePayoutAccount(id: string, actor: AdminActor): Promise<void> {
  if (!canApprovePayoutAccount(actor.session)) throw new Error("FORBIDDEN");
  const before = await db.affiliatePayoutAccount.findUnique({
    where: { id },
    select: {
      verificationStatus: true,
      affiliateProfile: { select: { customerId: true } },
    },
  });
  if (!before) throw new Error("NOT_FOUND");
  const statusBefore = before.verificationStatus;

  await db.affiliatePayoutAccount.update({
    where: { id },
    data: {
      verificationStatus: "APPROVED",
      rejectionReason: null,
      verifiedAt: new Date(),
      verifiedByAdminId: actor.adminId,
    },
    select: { id: true },
  });

  await writePayoutAuditLog({
    adminId: actor.adminId,
    action: "payout_account:approve",
    payoutAccountId: id,
    targetUserId: before.affiliateProfile.customerId ?? null,
    statusBefore,
    statusAfter: "APPROVED",
  });

  const customerId = before.affiliateProfile.customerId;
  if (customerId) {
    publishAffiliatePayoutAccountApproved({ customerId, payoutAccountId: id });
  }
}

export async function rejectAffiliatePayoutAccount(
  id: string,
  reason: string,
  actor: AdminActor,
): Promise<void> {
  if (!canRejectPayoutAccount(actor.session)) throw new Error("FORBIDDEN");
  const trimmed = reason.trim();
  if (!trimmed) throw new Error("MISSING_REASON");
  const before = await db.affiliatePayoutAccount.findUnique({
    where: { id },
    select: {
      verificationStatus: true,
      affiliateProfile: { select: { customerId: true } },
    },
  });
  if (!before) throw new Error("NOT_FOUND");
  const statusBefore = before.verificationStatus;

  await db.affiliatePayoutAccount.update({
    where: { id },
    data: {
      verificationStatus: "REJECTED",
      rejectionReason: trimmed.slice(0, 2000),
      verifiedAt: new Date(),
      verifiedByAdminId: actor.adminId,
    },
    select: { id: true },
  });

  await writePayoutAuditLog({
    adminId: actor.adminId,
    action: "payout_account:reject",
    payoutAccountId: id,
    targetUserId: before.affiliateProfile.customerId ?? null,
    statusBefore,
    statusAfter: "REJECTED",
    reason: trimmed.slice(0, 2000),
  });

  const customerId = before.affiliateProfile.customerId;
  if (customerId) {
    publishAffiliatePayoutAccountRejected({
      customerId,
      payoutAccountId: id,
      rejectionReason: trimmed.slice(0, 2000),
    });
  }
}

export async function requireAdminCanAccessKycMedia(): Promise<AdminActor> {
  const actor = await requireAdminActor();
  if (!canAccessAdminMediaProxy(actor.session)) throw new Error("FORBIDDEN");
  return actor;
}

