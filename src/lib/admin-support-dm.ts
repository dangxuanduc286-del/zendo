/** Tổng tin chưa đọc phía admin — hội thoại hỗ trợ trực tiếp (SupportDm). */
export async function getAdminSupportDmUnreadTotalDb(): Promise<number> {
  if (!process.env.DATABASE_URL) return 0;
  const { db } = await import("./db");
  const agg = await db.supportDmConversation.aggregate({
    where: { hiddenByAdminAt: null },
    _sum: { adminUnreadCount: true },
  });
  const n = agg._sum.adminUnreadCount ?? 0;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export async function getAdminSupportDmUnreadCountSafe(): Promise<number> {
  try {
    return await getAdminSupportDmUnreadTotalDb();
  } catch {
    return 0;
  }
}
