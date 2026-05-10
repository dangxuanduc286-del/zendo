import { z } from "zod";
import { isPublicMediaUrl } from "./media-url";

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên danh mục phải có ít nhất 2 ký tự.")
    .max(120, "Tên danh mục tối đa 120 ký tự."),
  slug: z
    .string()
    .trim()
    .min(2, "Slug phải có ít nhất 2 ký tự.")
    .max(150, "Slug tối đa 150 ký tự.")
    .regex(/^[a-z0-9-]+$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang."),
  parentId: z.string().trim().max(191, "ID danh mục cha không hợp lệ.").optional().or(z.literal("")),
  sortOrder: z
    .number()
    .int("Thứ tự hiển thị phải là số nguyên.")
    .min(0, "Thứ tự hiển thị không được âm.")
    .max(9999, "Thứ tự hiển thị tối đa 9999."),
  image: z
    .string()
    .trim()
    .max(500, "URL ảnh quá dài.")
    .refine((value) => value === "" || isPublicMediaUrl(value), "Ảnh danh mục phải thuộc media.zendo.vn.")
    .optional()
    .or(z.literal("")),
  shortDescription: z
    .string()
    .trim()
    .max(500, "Mô tả ngắn tối đa 500 ký tự.")
    .optional()
    .or(z.literal("")),
  seoTitle: z
    .string()
    .trim()
    .max(160, "Tiêu đề SEO tối đa 160 ký tự.")
    .optional()
    .or(z.literal("")),
  seoDescription: z
    .string()
    .trim()
    .max(320, "Mô tả SEO tối đa 320 ký tự.")
    .optional()
    .or(z.literal("")),
  isActive: z.boolean(),
  showOnHome: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export interface CategoryAdminDto {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  level: 1 | 2;
  sortOrder: number;
  childCount: number;
  image: string;
  shortDescription: string;
  seoTitle: string;
  seoDescription: string;
  isActive: boolean;
  showOnHome: boolean;
  updatedAt: string;
  children?: CategoryAdminDto[];
}

