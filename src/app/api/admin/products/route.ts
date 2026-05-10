import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { authOptions } from "../../../../lib/auth";
import { productFormSchema } from "../../../../lib/admin-product";
import { slugify } from "../../../../lib/slug";
import { normalizeMediaUrl } from "../../../../lib/media-url";

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

async function ensureUniqueSlug(
  db: Awaited<ReturnType<typeof getDbClient>>,
  requestedSlug: string,
): Promise<string> {
  if (!db) return requestedSlug;
  const base = slugify(requestedSlug);
  let candidate = base;
  let suffix = 1;
  while (true) {
    const exists = await db.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

function mapProduct(row: {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  brandId: string | null;
  vendorId: string | null;
  specifications: unknown;
  shortDescription: string | null;
  description: string | null;
  basePrice: unknown;
  salePrice: unknown;
  stockQuantity: number;
  soldCount: number;
  status: "DRAFT" | "ACTIVE" | "OUT_OF_STOCK" | "ARCHIVED";
  isFeatured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  images?: Array<{ url: string; isPrimary: boolean; sortOrder: number }>;
  category?: { name: string } | null;
  brand?: { name: string } | null;
  updatedAt: Date;
}) {
  const specs =
    row.specifications && typeof row.specifications === "object" && !Array.isArray(row.specifications)
      ? (row.specifications as Record<string, unknown>)
      : {};
  const fallbackBrandName = String(specs.brandName ?? "").trim();
  const orderedImages = [...(row.images ?? [])].sort((a, b) => {
    if (a.isPrimary === b.isPrimary) return a.sortOrder - b.sortOrder;
    return a.isPrimary ? -1 : 1;
  });
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    categoryId: row.categoryId,
    brandId: row.brandId ?? "",
    vendorId: row.vendorId ?? "",
    warrantyInfo: String(specs.warrantyInfo ?? ""),
    colors: Array.isArray(specs.colors) ? specs.colors.map((item) => String(item)).slice(0, 5) : [],
    soldCount: Number(row.soldCount ?? specs.soldCountAdmin ?? 0),
    saleEndAt: String(specs.saleEndAt ?? ""),
    shortDescription: row.shortDescription ?? "",
    description: row.description ?? "",
    basePrice: Number(row.basePrice),
    salePrice: row.salePrice == null ? null : Number(row.salePrice),
    stockQuantity: row.stockQuantity,
    status: row.status,
    isFeatured: row.isFeatured,
    isNew: row.isNew,
    isBestSeller: row.isBestSeller,
    seoTitle: row.seoTitle ?? "",
    seoDescription: row.seoDescription ?? "",
    seoKeywords: String(specs.seoKeywords ?? ""),
    ogImage: normalizeMediaUrl(String(specs.ogImage ?? "")),
    primaryImage: normalizeMediaUrl(orderedImages[0]?.url ?? ""),
    images: orderedImages.map((item) => normalizeMediaUrl(item.url)).filter(Boolean),
    categoryName: row.category?.name ?? "",
    brandName: row.brand?.name ?? fallbackBrandName,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function updateDefaultWarrantyIfNeeded(
  db: Awaited<ReturnType<typeof getDbClient>>,
  rememberWarrantyAsDefault: boolean,
  warrantyInfo: string,
): Promise<void> {
  if (!db || !rememberWarrantyAsDefault) return;
  const settingRow = await db.setting.findUnique({
    where: { key: "website_settings" },
    select: { value: true },
  });
  const existingValue =
    settingRow?.value && typeof settingRow.value === "object" && !Array.isArray(settingRow.value)
      ? (settingRow.value as Record<string, unknown>)
      : {};
  const merged = { ...existingValue, defaultProductWarranty: warrantyInfo.trim() };
  await db.setting.upsert({
    where: { key: "website_settings" },
    update: {
      value: JSON.parse(JSON.stringify(merged)),
      group: "website",
      description: "Website settings",
      isPublic: true,
    },
    create: {
      key: "website_settings",
      value: JSON.parse(JSON.stringify(merged)),
      group: "website",
      description: "Website settings",
      isPublic: true,
    },
  });
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const db = await getDbClient();
    if (!db) return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";
    const categoryId = searchParams.get("categoryId")?.trim() ?? "";
    const brandId = searchParams.get("brandId")?.trim() ?? "";
    const flag = searchParams.get("flag")?.trim() ?? "";

    const rows = await db.product.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
                { sku: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(status ? { status: status as "DRAFT" | "ACTIVE" | "OUT_OF_STOCK" | "ARCHIVED" } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(brandId ? { brandId } : {}),
        ...(flag === "featured"
          ? { isFeatured: true }
          : flag === "new"
            ? { isNew: true }
            : flag === "bestSeller"
              ? { isBestSeller: true }
              : {}),
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 100,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        categoryId: true,
        brandId: true,
        vendorId: true,
        specifications: true,
        shortDescription: true,
        description: true,
        basePrice: true,
        salePrice: true,
        stockQuantity: true,
        soldCount: true,
        status: true,
        isFeatured: true,
        isNew: true,
        isBestSeller: true,
        seoTitle: true,
        seoDescription: true,
        updatedAt: true,
        category: { select: { name: true } },
        brand: { select: { name: true } },
        images: { select: { url: true, isPrimary: true, sortOrder: true }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
      },
    });
    return NextResponse.json({ items: rows.map(mapProduct) });
  } catch {
    return NextResponse.json({ message: "Không thể tải danh sách sản phẩm." }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const db = await getDbClient();
    if (!db) return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });

    const parsed = productFormSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Du lieu khong hop le." }, { status: 400 });
    }
    const values = parsed.data;
    const nextBrandName = String(values.brandName ?? "").trim();
    const matchedBrand = nextBrandName
      ? await db.brand.findFirst({
          where: { name: { equals: nextBrandName, mode: "insensitive" } },
          select: { id: true, name: true },
        })
      : null;
    const resolvedBrandId = nextBrandName ? (matchedBrand?.id ?? null) : null;
    const uniqueSlug = await ensureUniqueSlug(db, values.slug);
    const nextImages = (values.images ?? []).map((item) => normalizeMediaUrl(item)).filter(Boolean).slice(0, 15);
    const primaryImageUrl =
      normalizeMediaUrl(values.primaryImage ?? "") || nextImages[0] || "";
    const imageRows = (primaryImageUrl ? [primaryImageUrl, ...nextImages.filter((item) => item !== primaryImageUrl)] : nextImages).slice(0, 15);
    const created = await db.product.create({
      data: {
        name: values.name,
        slug: uniqueSlug,
        sku: values.sku,
        categoryId: values.categoryId,
        brandId: resolvedBrandId,
        vendorId: values.vendorId || null,
        shortDescription: values.shortDescription || null,
        description: values.description || null,
        specifications: {
          warrantyInfo: values.warrantyInfo || "",
          colors: values.colors ?? [],
          soldCountAdmin: values.soldCount ?? 0,
          seoKeywords: values.seoKeywords || "",
          saleEndAt: values.saleEndAt || "",
          ogImage: normalizeMediaUrl(values.ogImage || ""),
          brandName: nextBrandName || "",
        },
        basePrice: values.basePrice,
        salePrice: values.salePrice ?? null,
        stockQuantity: values.stockQuantity,
        soldCount: values.soldCount ?? 0,
        status: values.status,
        isFeatured: values.isFeatured,
        isNew: values.isNew,
        isBestSeller: values.isBestSeller,
        seoTitle: values.seoTitle || null,
        seoDescription: values.seoDescription || null,
        images: imageRows.length
          ? {
              create: imageRows.map((url, index) => ({
                url,
                isPrimary: index === 0,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        categoryId: true,
        brandId: true,
        vendorId: true,
        specifications: true,
        shortDescription: true,
        description: true,
        basePrice: true,
        salePrice: true,
        stockQuantity: true,
        soldCount: true,
        status: true,
        isFeatured: true,
        isNew: true,
        isBestSeller: true,
        seoTitle: true,
        seoDescription: true,
        updatedAt: true,
        category: { select: { name: true } },
        brand: { select: { name: true } },
        images: { select: { url: true, isPrimary: true, sortOrder: true }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 15 },
      },
    });
    await updateDefaultWarrantyIfNeeded(db, values.rememberWarrantyAsDefault ?? false, values.warrantyInfo || "");
    revalidatePath("/admin/products");
    revalidatePath("/");
    revalidatePath("/cua-hang");
    revalidatePath("/shop");
    revalidatePath(`/san-pham/${created.slug}`);
    const category = await db.category.findUnique({ where: { id: created.categoryId }, select: { slug: true } });
    if (category?.slug) {
      revalidatePath(`/danh-muc/${category.slug}`);
    }
    revalidateTag("storefront-settings");
    revalidateTag("product");
    return NextResponse.json({ item: mapProduct(created) }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error && /unique|sku|slug/i.test(error.message)
        ? "SKU hoặc slug đã tồn tại."
        : "Không thể tạo sản phẩm.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

