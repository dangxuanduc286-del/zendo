import { z } from "zod";
import { isPublicMediaUrl } from "./media-url";

export const PRODUCT_STATUS_OPTIONS = ["DRAFT", "ACTIVE", "OUT_OF_STOCK", "ARCHIVED"] as const;

const mediaUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === "" || isPublicMediaUrl(value), "Ảnh sản phẩm phải thuộc media.zendo.vn.");

export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, "Tên sản phẩm không được để trống.").max(200),
    slug: z
      .string()
      .trim()
      .min(3, "Slug phải có ít nhất 3 ký tự.")
      .max(220)
      .regex(/^[a-z0-9-]+$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang."),
    sku: z.string().trim().min(2, "SKU phải có ít nhất 2 ký tự.").max(80),
    categoryId: z.string().trim().min(1, "Vui lòng chọn danh mục."),
    brandId: z.string().trim().optional().or(z.literal("")),
    brandName: z.string().trim().max(120).optional().or(z.literal("")),
    vendorId: z.string().trim().max(100).optional().or(z.literal("")),
    shortDescription: z.string().trim().max(500).optional().or(z.literal("")),
    description: z.string().trim().max(20000).optional().or(z.literal("")),
    warrantyInfo: z.string().trim().max(1000, "Bảo hành tối đa 1000 ký tự.").optional().or(z.literal("")),
    colors: z.array(z.string().trim().min(1).max(40)).max(5, "Tối đa 5 màu sắc.").optional().default([]),
    rememberWarrantyAsDefault: z.boolean().optional().default(false),
    basePrice: z.number().min(0, "Giá gốc không hợp lệ."),
    salePrice: z.number().min(0, "Giá bán không hợp lệ.").optional(),
    saleEndAt: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Ngày kết thúc giảm giá không hợp lệ."),
    stockQuantity: z.number().int().min(0, "Tồn kho không hợp lệ."),
    soldCount: z.number().int().min(0, "Số lượng đã bán không hợp lệ.").optional().default(0),
    status: z.enum(PRODUCT_STATUS_OPTIONS),
    isFeatured: z.boolean(),
    isNew: z.boolean(),
    isBestSeller: z.boolean(),
    seoTitle: z.string().trim().max(60, "SEO title nên dưới 60 ký tự.").optional().or(z.literal("")),
    seoDescription: z.string().trim().max(160, "SEO description nên dưới 160 ký tự.").optional().or(z.literal("")),
    seoKeywords: z.string().trim().max(300).optional().or(z.literal("")),
    ogImage: mediaUrlSchema.optional().or(z.literal("")),
    images: z.array(mediaUrlSchema).max(15, "Mỗi sản phẩm chỉ được đăng tối đa 15 ảnh.").optional().default([]),
    primaryImage: mediaUrlSchema.optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.salePrice != null && value.salePrice > 0 && value.basePrice > 0 && value.salePrice >= value.basePrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salePrice"],
        message: "Giá bán phải nhỏ hơn giá gốc.",
      });
    }
  });

export type ProductFormValues = z.input<typeof productFormSchema>;

export interface ProductAdminDto {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  brandId: string;
  brandName: string;
  vendorId: string;
  basePrice: number;
  salePrice: number | null;
  stockQuantity: number;
  soldCount: number;
  warrantyInfo: string;
  colors: string[];
  status: (typeof PRODUCT_STATUS_OPTIONS)[number];
  shortDescription: string;
  description: string;
  isFeatured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogImage: string;
  saleEndAt: string;
  primaryImage: string;
  images: string[];
  categoryName?: string;
  updatedAt: string;
}

