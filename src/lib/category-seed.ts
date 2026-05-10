import type { ContentStatus, PrismaClient } from "@prisma/client";
import { slugify } from "./slug";

type CategorySeedNode = {
  name: string;
  children: string[];
};

const CANONICAL_CATEGORY_TREE: CategorySeedNode[] = [
  {
    name: "Làm đẹp",
    children: [
      "Chăm sóc da",
      "Trang điểm",
      "Chăm sóc tóc",
      "Chăm sóc cơ thể",
      "Nước hoa",
      "Thiết bị làm đẹp",
    ],
  },
  {
    name: "Nhà cửa/Đời sống",
    children: [
      "Nội thất",
      "Trang trí nhà cửa",
      "Nhà bếp",
      "Phòng tắm & giặt ủi",
      "Dụng cụ & thiết bị gia đình",
      "Văn phòng phẩm",
    ],
  },
  {
    name: "Thực phẩm/Bách hóa",
    children: [
      "Đồ khô & ngũ cốc",
      "Đồ uống",
      "Gia vị & chế biến",
      "Đồ ăn liền & snack",
      "Sữa & sản phẩm từ sữa",
      "Đông lạnh",
    ],
  },
  {
    name: "Điện tử/Điện gia dụng",
    children: [
      "Điện thoại & phụ kiện",
      "Máy tính & máy tính bảng",
      "TV & thiết bị nghe nhìn",
      "Điện gia dụng nhỏ",
      "Thiết bị nhà bếp điện",
      "Thiết bị thông minh",
    ],
  },
  {
    name: "Thời trang",
    children: ["Thời trang nam", "Thời trang nữ", "Đồ lót & đồ ngủ", "Giày dép", "Túi xách & ví", "Phụ kiện"],
  },
];

function canonicalParentSlug(name: string): string {
  return slugify(name);
}

function canonicalChildSlug(parentSlug: string, childName: string): string {
  return `${parentSlug}-${slugify(childName)}`;
}

type SeedCounters = { created: number; updated: number; skipped: number };

const PUBLISHED: ContentStatus = "PUBLISHED";

type RowShape = {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  status: ContentStatus;
  slug: string;
  imageUrl: string | null;
};

type SyncPatch = {
  sortOrder: number;
  status: ContentStatus;
  slug?: string;
  imageUrl?: string | null;
};

function needsWrite(row: RowShape, patch: SyncPatch): boolean {
  if (row.sortOrder !== patch.sortOrder || row.status !== patch.status) return true;
  if (patch.slug !== undefined && row.slug !== patch.slug) return true;
  if (patch.imageUrl !== undefined && (row.imageUrl ?? "") !== (patch.imageUrl ?? "")) return true;
  return false;
}

async function slugFreeFor(db: PrismaClient, slug: string, ownId: string): Promise<boolean> {
  const other = await db.category.findUnique({ where: { slug }, select: { id: true } });
  return !other || other.id === ownId;
}

export async function ensureDefaultCategorySeed(db: PrismaClient): Promise<void> {
  const stats: SeedCounters = { created: 0, updated: 0, skipped: 0 };

  for (const [parentIndex, parent] of CANONICAL_CATEGORY_TREE.entries()) {
    const parentSlug = canonicalParentSlug(parent.name);
    const sortOrder = parentIndex + 1;

    let bySlug = await db.category.findUnique({
      where: { slug: parentSlug },
      select: { id: true, parentId: true, name: true, sortOrder: true, status: true, slug: true, imageUrl: true },
    });
    if (bySlug && bySlug.parentId !== null) {
      bySlug = null;
    }

    const byNameRoot = await db.category.findFirst({
      where: { parentId: null, name: parent.name },
      select: { id: true, parentId: true, name: true, sortOrder: true, status: true, slug: true, imageUrl: true },
    });

    const parentRow = bySlug ?? (byNameRoot && byNameRoot.parentId === null ? byNameRoot : null);

    let parentId: string;

    if (parentRow) {
      parentId = parentRow.id;
      const patch: SyncPatch = { sortOrder, status: PUBLISHED };
      if (parentRow.slug !== parentSlug && (await slugFreeFor(db, parentSlug, parentRow.id))) {
        patch.slug = parentSlug;
      }
      if (!needsWrite(parentRow, patch)) {
        stats.skipped += 1;
      } else {
        await db.category.update({
          where: { id: parentRow.id },
          data: {
            sortOrder: patch.sortOrder,
            status: patch.status,
            ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
            ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl } : {}),
          },
        });
        stats.updated += 1;
      }
    } else {
      const slugTaken = await db.category.findUnique({ where: { slug: parentSlug }, select: { id: true } });
      const nameTaken = await db.category.findFirst({
        where: { parentId: null, name: parent.name },
        select: { id: true },
      });
      if (slugTaken || nameTaken) {
        stats.skipped += 1;
        continue;
      }

      const created = await db.category.create({
        data: {
          name: parent.name,
          slug: parentSlug,
          parentId: null,
          status: PUBLISHED,
          sortOrder,
        },
        select: { id: true },
      });
      parentId = created.id;
      stats.created += 1;
    }

    const { slug: resolvedParentSlug } = await db.category.findUniqueOrThrow({
      where: { id: parentId },
      select: { slug: true },
    });

    for (const [childIndex, childName] of parent.children.entries()) {
      const childSlug = canonicalChildSlug(resolvedParentSlug, childName);
      const childSort = childIndex + 1;

      let byChildSlug = await db.category.findUnique({
        where: { slug: childSlug },
        select: { id: true, parentId: true, name: true, sortOrder: true, status: true, slug: true, imageUrl: true },
      });
      if (byChildSlug && byChildSlug.parentId !== parentId) {
        byChildSlug = null;
      }

      const byChildName = await db.category.findFirst({
        where: { parentId, name: childName },
        select: { id: true, parentId: true, name: true, sortOrder: true, status: true, slug: true, imageUrl: true },
      });

      const childRow = byChildSlug ?? (byChildName && byChildName.parentId === parentId ? byChildName : null);

      if (childRow) {
        const patch: SyncPatch = { sortOrder: childSort, status: PUBLISHED };
        if (childRow.slug !== childSlug && (await slugFreeFor(db, childSlug, childRow.id))) {
          patch.slug = childSlug;
        }
        if (!needsWrite(childRow, patch)) {
          stats.skipped += 1;
        } else {
          await db.category.update({
            where: { id: childRow.id },
            data: {
              sortOrder: patch.sortOrder,
              status: patch.status,
              ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
              ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl } : {}),
            },
          });
          stats.updated += 1;
        }
        continue;
      }

      const slugTakenChild = await db.category.findUnique({ where: { slug: childSlug }, select: { id: true } });
      const nameTakenChild = await db.category.findFirst({
        where: { parentId, name: childName },
        select: { id: true },
      });
      if (slugTakenChild || nameTakenChild) {
        stats.skipped += 1;
        continue;
      }

      await db.category.create({
        data: {
          name: childName,
          slug: childSlug,
          parentId,
          status: PUBLISHED,
          sortOrder: childSort,
        },
      });
      stats.created += 1;
    }
  }

  void stats;
}
