import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveCustomerAffiliateProfile } from "@/lib/affiliate-customer-status";
import { db } from "@/lib/db";
import { AFFILIATE_DB_QUERY_CONCURRENCY, runQueriesInChunks } from "@/lib/server/run-queries-in-chunks";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function vnWallClockParts(d: Date): { y: number; m: number; day: number } {
  const t = new Date(d.getTime() + VN_OFFSET_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

function vnStartOfDay(d: Date): Date {
  const { y, m, day } = vnWallClockParts(d);
  const utcMid = Date.UTC(y, m - 1, day, 0, 0, 0, 0);
  return new Date(utcMid - VN_OFFSET_MS);
}

function vnStartOfMonth(d: Date): Date {
  const { y, m } = vnWallClockParts(d);
  const utcMid = Date.UTC(y, m - 1, 1, 0, 0, 0, 0);
  return new Date(utcMid - VN_OFFSET_MS);
}

/** Thu nhập CTV thật (aggregate DB) — chỉ profile ACTIVE của chính user. */
export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const customerId = String(session.user.id);

  try {
    const snapshot = await resolveCustomerAffiliateProfile(customerId);
    if (!snapshot.active || !snapshot.profileId) {
      return NextResponse.json(
        {
          ok: true,
          hasProfile: false,
          todayCommission: 0,
          monthCommission: 0,
          pendingTotal: 0,
          paidTotal: 0,
          affiliateOrderCount: 0,
          statusTotals: {
            PENDING: 0,
            WAITING_RELEASE: 0,
            AVAILABLE: 0,
            PAID: 0,
            CANCELLED: 0,
          },
        },
        { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0" } },
      );
    }

    const now = new Date();
    const dayStart = vnStartOfDay(now);
    const monthStart = vnStartOfMonth(now);

    const profileId = snapshot.profileId;
    const [
      todayAgg,
      monthAgg,
      pendingAgg,
      paidAgg,
      orderCount,
      pendingRows,
      waitingReleaseRows,
      availableRows,
      paidRows,
      cancelledRows,
    ] = await runQueriesInChunks(
      [
        () =>
          db.affiliateCommission.aggregate({
            where: { affiliateProfileId: profileId, createdAt: { gte: dayStart } },
            _sum: { amount: true },
          }),
        () =>
          db.affiliateCommission.aggregate({
            where: { affiliateProfileId: profileId, createdAt: { gte: monthStart } },
            _sum: { amount: true },
          }),
        () =>
          db.affiliateCommission.aggregate({
            where: { affiliateProfileId: profileId, status: "PENDING" },
            _sum: { amount: true },
          }),
        () =>
          db.affiliateCommission.aggregate({
            where: { affiliateProfileId: profileId, status: "PAID" },
            _sum: { amount: true },
          }),
        () => db.order.count({ where: { affiliateProfileId: profileId } }),
        () =>
          db.affiliateCommission.aggregate({
            where: { affiliateProfileId: profileId, status: "PENDING" },
            _count: { _all: true },
          }),
        () =>
          db.affiliateCommission.aggregate({
            where: { affiliateProfileId: profileId, status: "WAITING_RELEASE" },
            _count: { _all: true },
          }),
        () =>
          db.affiliateCommission.aggregate({
            where: { affiliateProfileId: profileId, status: "AVAILABLE" },
            _count: { _all: true },
          }),
        () =>
          db.affiliateCommission.aggregate({
            where: { affiliateProfileId: profileId, status: "PAID" },
            _count: { _all: true },
          }),
        () =>
          db.affiliateCommission.aggregate({
            where: { affiliateProfileId: profileId, status: "CANCELLED" },
            _count: { _all: true },
          }),
      ] as const,
      AFFILIATE_DB_QUERY_CONCURRENCY,
    );

    return NextResponse.json(
      {
        ok: true,
        hasProfile: true,
        todayCommission: Number(todayAgg._sum.amount ?? 0),
        monthCommission: Number(monthAgg._sum.amount ?? 0),
        pendingTotal: Number(pendingAgg._sum.amount ?? 0),
        paidTotal: Number(paidAgg._sum.amount ?? 0),
        affiliateOrderCount: orderCount,
        statusTotals: {
          PENDING: Number(pendingRows._count._all ?? 0),
          WAITING_RELEASE: Number(waitingReleaseRows._count._all ?? 0),
          AVAILABLE: Number(availableRows._count._all ?? 0),
          PAID: Number(paidRows._count._all ?? 0),
          CANCELLED: Number(cancelledRows._count._all ?? 0),
        },
      },
      { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json({ message: "Không tải được dữ liệu thu nhập." }, { status: 500 });
  }
}
